-- Published Custom layouts support an explicit responsive activation interval.
-- Additive only: older published layouts remain disabled for automatic targeting.
ALTER TABLE md_page_layout_versions
  ADD COLUMN IF NOT EXISTS custom_target_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE md_page_layout_versions
  ADD COLUMN IF NOT EXISTS custom_target_min_width integer NOT NULL DEFAULT 320;
ALTER TABLE md_page_layout_versions
  ADD COLUMN IF NOT EXISTS custom_target_max_width integer NOT NULL DEFAULT 10000;
