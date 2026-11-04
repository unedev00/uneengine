-- Retire the component Layout ribbon after its supported controls have
-- Design 2 editors. The canonical property keys and component rules stay
-- unchanged, preserving all existing page values and formulas.
--
-- Design 2 renders its own fixed slot matrix plus contextual count, calendar,
-- image and canvas controls. No separate Layout property tab is needed.
UPDATE md_builder_shared_properties
SET tab='Design2'
WHERE tab='Layout' AND scope='component';
