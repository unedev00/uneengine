-- Additive phone-list presentation metadata. Applied after 20261115-list-views-record-search.sql.
-- The role does not change SQL row visibility, record permissions or desktop columns.
ALTER TABLE md_list_view_columns
  ADD COLUMN IF NOT EXISTS phone_role text;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='md_list_view_columns_phone_role_chk'
  ) THEN
    ALTER TABLE md_list_view_columns ADD CONSTRAINT md_list_view_columns_phone_role_chk
      CHECK (phone_role IS NULL OR phone_role IN ('title','subtitle','badge','trailing','hidden'));
  END IF;
END $$;
