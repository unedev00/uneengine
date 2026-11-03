-- Desktop is the shared parent. Device layout revisions may store only
-- visual/component deltas; historical full snapshots remain immutable.
ALTER TABLE md_page_layout_versions
 ADD COLUMN IF NOT EXISTS inherits_desktop boolean NOT NULL DEFAULT false;
ALTER TABLE md_page_layout_versions
 ADD COLUMN IF NOT EXISTS canvas_fill_override boolean NOT NULL DEFAULT false;
