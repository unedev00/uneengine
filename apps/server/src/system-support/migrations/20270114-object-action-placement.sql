-- Additive action placement metadata. Existing tenant actions keep their
-- pre-upgrade record header/highlights behavior; no routes or records removed.
ALTER TABLE md_object_actions
 ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'Default';
ALTER TABLE md_object_actions
 DROP CONSTRAINT IF EXISTS md_object_actions_placement_check;
ALTER TABLE md_object_actions
 ADD CONSTRAINT md_object_actions_placement_check
 CHECK(placement IN ('Default','Header','Highlights','Publisher','Everywhere'));
