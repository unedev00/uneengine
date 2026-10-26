ALTER TABLE md_app_home_pages
  DROP CONSTRAINT IF EXISTS md_app_home_pages_form_factor_check;
ALTER TABLE md_app_home_pages
  ADD CONSTRAINT md_app_home_pages_form_factor_check
  CHECK (form_factor IN ('desktop','tablet','phone','custom'));

ALTER TABLE md_app_package_home_page_templates
  DROP CONSTRAINT IF EXISTS md_app_package_home_page_templates_form_factor_check;
ALTER TABLE md_app_package_home_page_templates
  ADD CONSTRAINT md_app_package_home_page_templates_form_factor_check
  CHECK (form_factor IN ('desktop','tablet','phone','custom'));

ALTER TABLE md_lightning_page_details
  DROP CONSTRAINT IF EXISTS md_lightning_page_details_devices_check;
ALTER TABLE md_lightning_page_details
  ADD CONSTRAINT md_lightning_page_details_devices_check
  CHECK (cardinality(devices) BETWEEN 1 AND 4);

ALTER TABLE md_lightning_page_activation
  ADD COLUMN IF NOT EXISTS tablet boolean,
  ADD COLUMN IF NOT EXISTS custom boolean;
UPDATE md_lightning_page_activation SET tablet=desktop WHERE tablet IS NULL;
UPDATE md_lightning_page_activation SET custom=false WHERE custom IS NULL;
ALTER TABLE md_lightning_page_activation
  ALTER COLUMN tablet SET DEFAULT false,
  ALTER COLUMN tablet SET NOT NULL,
  ALTER COLUMN custom SET DEFAULT false,
  ALTER COLUMN custom SET NOT NULL;
ALTER TABLE md_lightning_page_activation
  DROP CONSTRAINT IF EXISTS md_lightning_page_activation_check;
ALTER TABLE md_lightning_page_activation
  DROP CONSTRAINT IF EXISTS md_lightning_page_activation_form_factor_check;
ALTER TABLE md_lightning_page_activation
  ADD CONSTRAINT md_lightning_page_activation_form_factor_check
  CHECK (desktop OR tablet OR phone OR custom);

ALTER TABLE md_page_layout_version_activation
  ADD COLUMN IF NOT EXISTS tablet boolean,
  ADD COLUMN IF NOT EXISTS custom boolean;
UPDATE md_page_layout_version_activation SET tablet=desktop WHERE tablet IS NULL;
UPDATE md_page_layout_version_activation SET custom=false WHERE custom IS NULL;
ALTER TABLE md_page_layout_version_activation
  ALTER COLUMN tablet SET DEFAULT false,
  ALTER COLUMN tablet SET NOT NULL,
  ALTER COLUMN custom SET DEFAULT false,
  ALTER COLUMN custom SET NOT NULL;
ALTER TABLE md_page_layout_version_activation
  DROP CONSTRAINT IF EXISTS md_page_layout_version_activation_check;
ALTER TABLE md_page_layout_version_activation
  DROP CONSTRAINT IF EXISTS md_page_layout_version_activation_form_factor_check;
ALTER TABLE md_page_layout_version_activation
  ADD CONSTRAINT md_page_layout_version_activation_form_factor_check
  CHECK (desktop OR tablet OR phone OR custom);

UPDATE md_lightning_page_details
SET devices=devices||ARRAY(
  SELECT factor FROM unnest(ARRAY['Tablet','Custom']::text[]) WITH ORDINALITY AS factors(factor,position)
  WHERE NOT factor=ANY(md_lightning_page_details.devices)
  ORDER BY position
)
WHERE NOT ('Tablet'=ANY(devices) AND 'Custom'=ANY(devices));
