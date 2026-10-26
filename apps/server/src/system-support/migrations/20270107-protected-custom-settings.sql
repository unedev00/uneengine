-- SQL source-of-truth for protected settings. Existing tenant settings stay public.
ALTER TABLE md_custom_settings
 ADD COLUMN IF NOT EXISTS protection_mode text NOT NULL DEFAULT 'Public';
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint WHERE conrelid='md_custom_settings'::regclass
    AND conname='md_custom_settings_protection_check'
 ) THEN
  ALTER TABLE md_custom_settings ADD CONSTRAINT md_custom_settings_protection_check
    CHECK (protection_mode IN ('Public','Protected'));
 END IF;
END $$;
