-- Record the original design mode once; layout edits must never change it.
-- Existing pages stay NULL because historical creation mode cannot be recovered
-- with certainty from mutable draft revision timestamps.
ALTER TABLE md_lightning_page_details
 ADD COLUMN IF NOT EXISTS creation_layout_variant text;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='md_page_creation_layout_variant_valid') THEN
  ALTER TABLE md_lightning_page_details
   ADD CONSTRAINT md_page_creation_layout_variant_valid
   CHECK (creation_layout_variant IS NULL OR creation_layout_variant IN ('Desktop','Mobile','Tablet','Custom'));
 END IF;
END $$;
