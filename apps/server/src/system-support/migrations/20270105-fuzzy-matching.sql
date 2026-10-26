-- Tenant rules retain Exact/Normalized defaults; fuzzy mode is opt-in.
ALTER TABLE md_matching_rule_fields
 ADD COLUMN IF NOT EXISTS max_distance smallint NOT NULL DEFAULT 1;
ALTER TABLE md_matching_rule_fields
 DROP CONSTRAINT IF EXISTS md_matching_rule_fields_match_type_check;
ALTER TABLE md_matching_rule_fields ADD CONSTRAINT md_matching_rule_fields_match_type_check
 CHECK (match_type IN ('Exact','Normalized','Fuzzy'));
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='md_matching_rule_fields'::regclass
  AND conname='md_matching_rule_fields_max_distance_check') THEN
  ALTER TABLE md_matching_rule_fields ADD CONSTRAINT md_matching_rule_fields_max_distance_check
   CHECK (max_distance IN (1,2));
 END IF;
END $$;
-- Bounded edit distance. Never called on more than 64 significant ASCII chars.
-- No extension dependency and no cross-tenant reads; used inside scoped record query.
CREATE OR REPLACE FUNCTION md_fuzzy_ascii_match(actual text, expected text, max_edits integer)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $$
DECLARE
 a text:=regexp_replace(lower(actual),'[^a-z0-9]','','g');
 b text:=regexp_replace(lower(expected),'[^a-z0-9]','','g');
 previous integer[]; current_row integer[];
 i integer; j integer; cost integer; row_min integer;
BEGIN
 IF length(a)<4 OR length(b)<4 OR length(a)>64 OR length(b)>64
  OR max_edits NOT IN(1,2) OR abs(length(a)-length(b))>max_edits
  OR left(a,1)<>left(b,1) THEN RETURN false; END IF;
 previous:=ARRAY(SELECT generate_series(0,length(b)));
 FOR i IN 1..length(a) LOOP
  current_row:=ARRAY[i];row_min:=i;
  FOR j IN 1..length(b) LOOP
   cost:=CASE WHEN substr(a,i,1)=substr(b,j,1) THEN 0 ELSE 1 END;
   current_row:=current_row||LEAST(previous[j+1]+1,current_row[j]+1,previous[j]+cost);
   row_min:=LEAST(row_min,current_row[j+1]);
  END LOOP;
  IF row_min>max_edits THEN RETURN false; END IF;
  previous:=current_row;
 END LOOP;
 RETURN previous[length(b)+1]<=max_edits;
END $$;
