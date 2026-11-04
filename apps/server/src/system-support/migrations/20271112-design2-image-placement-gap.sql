-- Close the empty R2C5 gap between Width (R2C4) and Image Placement.
-- This changes only the shared SQL-backed Design 2 presentation slot;
-- no property values, tenant page records, permissions or ribbon heights change.
-- Safe to replay; leave any subsequently customised placement untouched.
UPDATE md_builder_design2_slots
SET order_no = 5
WHERE area = 'Image'
  AND slot_key = 'placement'
  AND row_no = 2
  AND order_no = 6;
