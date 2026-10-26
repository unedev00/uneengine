-- Field history selection is metadata, not an audit-logging bypass.
ALTER TABLE md_field_definitions
 ADD COLUMN IF NOT EXISTS track_history boolean NOT NULL DEFAULT false;
