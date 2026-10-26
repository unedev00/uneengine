-- Make Import a configurable list action; imports continue through shared Record Engine RBAC.
ALTER TABLE md_object_list_view_buttons
 DROP CONSTRAINT IF EXISTS md_object_list_view_buttons_button_name_check;
ALTER TABLE md_object_list_view_buttons
 ADD CONSTRAINT md_object_list_view_buttons_button_name_check
 CHECK(button_name IN ('New','Change Owner','Import','Printable View'));
