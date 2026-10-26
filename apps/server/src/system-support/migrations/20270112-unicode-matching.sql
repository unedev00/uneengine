-- Unicode-aware matching in existing tenant-isolated duplicate rules.
-- PostgreSQL NFC and Unicode classes, no extensions or runtime app loading.
CREATE OR REPLACE FUNCTION md_fuzzy_unicode_match(actual text, expected text, max_edits integer)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $$
DECLARE
 a text:=regexp_replace(lower(normalize(actual,NFC)),'[^[:alnum:]]','','g');
 b text:=regexp_replace(lower(normalize(expected,NFC)),'[^[:alnum:]]','','g');
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
-- Keep the legacy ASCII-only entry point for older callers.
CREATE OR REPLACE FUNCTION md_fuzzy_ascii_match(actual text, expected text, max_edits integer)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT CASE WHEN
  regexp_replace(lower(actual),'[^a-z0-9]','','g') =
   regexp_replace(lower(normalize(actual,NFC)),'[^[:alnum:]]','','g')
  AND regexp_replace(lower(expected),'[^a-z0-9]','','g') =
   regexp_replace(lower(normalize(expected,NFC)),'[^[:alnum:]]','','g')
  THEN md_fuzzy_unicode_match(actual,expected,max_edits) ELSE false END;
$$;
