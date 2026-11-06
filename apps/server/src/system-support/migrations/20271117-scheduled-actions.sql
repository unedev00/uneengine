-- Persistent, tenant-scoped delayed action sequences. The durable job is the
-- scheduler; Scheduledaction is the audited record/workspace projection.
CREATE TABLE IF NOT EXISTS md_scheduled_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  job_id uuid NOT NULL,
  initiated_by uuid NOT NULL,
  session_id text NOT NULL CHECK(length(session_id) BETWEEN 1 AND 200),
  source_page_api text,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','running','completed','cancelled','manually_completed','failed')),
  current_step integer NOT NULL DEFAULT 0 CHECK(current_step>=0),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,id),
  UNIQUE(tenant_id,job_id),
  FOREIGN KEY (tenant_id,job_id) REFERENCES md_durable_jobs(tenant_id,id),
  FOREIGN KEY (tenant_id,initiated_by) REFERENCES md_users(tenant_id,id),
  CHECK (source_page_api IS NULL OR source_page_api ~ '^[A-Za-z][A-Za-z0-9_]*$')
);
CREATE INDEX IF NOT EXISTS md_scheduled_actions_by_initiator
  ON md_scheduled_actions(tenant_id,initiated_by,created_at DESC);
CREATE INDEX IF NOT EXISTS md_scheduled_actions_pending
  ON md_scheduled_actions(tenant_id,due_at) WHERE status='pending';

-- Immutable, ordered remaining actions. Never use JSONB blobs of unbounded
-- page state, cookies, tokens or Named Credential secrets as a job payload.
CREATE TABLE IF NOT EXISTS md_scheduled_action_steps (
  tenant_id uuid NOT NULL,
  scheduled_action_id uuid NOT NULL,
  step_index integer NOT NULL CHECK(step_index>=0 AND step_index<512),
  formula_text text NOT NULL CHECK(length(formula_text) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','completed','failed')),
  finished_at timestamptz,
  PRIMARY KEY (tenant_id,scheduled_action_id,step_index),
  FOREIGN KEY(tenant_id,scheduled_action_id) REFERENCES md_scheduled_actions(tenant_id,id)
);

-- Only bounded scalar inputs survive the browser session. Action responses
-- and file references must be represented by typed fields, not arbitrary JSON.
CREATE TABLE IF NOT EXISTS md_scheduled_action_values(
  tenant_id uuid NOT NULL,
  scheduled_action_id uuid NOT NULL,
  name text NOT NULL CHECK(name ~ '^[A-Za-z_$][A-Za-z0-9_$.]{0,127}  value_text text,
  value_number double precision,
  value_boolean boolean,
  PRIMARY KEY(tenant_id,scheduled_action_id,name),
  FOREIGN KEY(tenant_id,scheduled_action_id) REFERENCES md_scheduled_actions(tenant_id,id),
  CHECK (num_nonnulls(value_text,value_number,value_boolean)<=1),
  CHECK (value_text IS NULL OR length(value_text)<=4096),
  CHECK (value_number IS NULL OR (value_number >= -1e308 AND value_number <= 1e308))
);
