-- Additive tenant-scoped matching mode; existing rules remain exact.
ALTER TABLE md_matching_rule_fields
 ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT 'Exact';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
   WHERE conrelid='md_matching_rule_fields'::regclass
   AND conname='md_matching_rule_fields_match_type_check') THEN
  ALTER TABLE md_matching_rule_fields ADD CONSTRAINT md_matching_rule_fields_match_type_check
   CHECK(match_type IN ('Exact','Normalized'));
 END IF;
END $$;
