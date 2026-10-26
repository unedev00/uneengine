-- Four independently assignable page form factors. Existing Desktop/Phone
-- assignments remain functional; Tablet/Custom use a safe legacy Desktop
-- fallback until explicitly assigned by a tenant administrator.
ALTER TABLE md_lightning_page_activation
 ADD COLUMN IF NOT EXISTS tablet boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS custom boolean NOT NULL DEFAULT false;
ALTER TABLE md_page_layout_version_activation
 ADD COLUMN IF NOT EXISTS tablet boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS custom boolean NOT NULL DEFAULT false;

ALTER TABLE md_lightning_page_activation
 DROP CONSTRAINT IF EXISTS md_lightning_page_activation_check;
ALTER TABLE md_lightning_page_activation
 DROP CONSTRAINT IF EXISTS md_lightning_page_activation_form_factors_check;
ALTER TABLE md_lightning_page_activation
 ADD CONSTRAINT md_lightning_page_activation_form_factors_check
 CHECK(desktop OR phone OR tablet OR custom);
ALTER TABLE md_page_layout_version_activation
 DROP CONSTRAINT IF EXISTS md_page_layout_version_activation_check;
ALTER TABLE md_page_layout_version_activation
 DROP CONSTRAINT IF EXISTS md_page_layout_version_activation_form_factors_check;
ALTER TABLE md_page_layout_version_activation
 ADD CONSTRAINT md_page_layout_version_activation_form_factors_check
 CHECK(desktop OR phone OR tablet OR custom);
