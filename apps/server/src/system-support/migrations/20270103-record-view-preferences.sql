-- Tenant/user-scoped reusable record list/detail presentation state.
-- Independent of saved list view visibility and tenant-authored page metadata.
-- This table stores UI-only widths; no customer business records are mutated.
CREATE TABLE IF NOT EXISTS md_record_view_preferences (
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  object_api text NOT NULL,
  split_width_px integer NOT NULL DEFAULT 440 CHECK(split_width_px BETWEEN 320 AND 800),
  column_widths jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(column_widths)='object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,user_id,object_api),
  FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name)
    ON DELETE CASCADE
);
