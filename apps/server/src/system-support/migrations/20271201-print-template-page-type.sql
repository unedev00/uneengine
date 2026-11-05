-- In-screen page definitions share the existing SQL Page engine.
ALTER TABLE md_lightning_page_details DROP CONSTRAINT IF EXISTS md_lightning_page_details_page_type_check;
ALTER TABLE md_lightning_page_details ADD CONSTRAINT md_lightning_page_details_page_type_check
 CHECK(page_type IN ('Record Page','App Page','Home Page','In-Screen Page','Print Template'));
