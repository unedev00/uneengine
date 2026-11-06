-- ScheduledAction: persistent, tenant-scoped action-sequence continuation.
-- The existing md_durable_jobs worker owns execution; no client timer or login
-- session is needed. Keep terminal rows for audit and reconciliation.
CREATE TABLE IF NOT EXISTS md_scheduled_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 job_id uuid NOT NULL,
 scheduled_by uuid NOT NULL,
 origin_session_id text,
 action_formula text NOT NULL CHECK(length(action_formula) BETWEEN 1 AND 4000),
 next_step integer NOT NULL CHECK(next_step>=0),
 -- JSON snapshot is only a bounded set of already-authorised formula inputs;
 -- never store bearer tokens, Named Credential secrets or browser cookies here.
 input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 result_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'Pending'
   CHECK(status IN ('Pending','Running','Completed','Cancelled','Failed','ManuallyCompleted')),
 execute_at timestamptz NOT NULL,
 finished_at timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 UNIQUE(tenant_id,job_id),
 FOREIGN KEY(tenant_id,job_id) REFERENCES md_durable_jobs(tenant_id,id),
 FOREIGN KEY(tenant_id,scheduled_by) REFERENCES md_users(tenant_id,id),
 CHECK(octet_length(input_snapshot::text)<=32768),
 CHECK(octet_length(result_snapshot::text)<=32768)
);
CREATE INDEX IF NOT EXISTS md_scheduled_actions_due ON md_scheduled_actions(execute_at,id)
 WHERE status='Pending';
CREATE INDEX IF NOT EXISTS md_scheduled_actions_tenant ON md_scheduled_actions(tenant_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS md_scheduled_action_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 scheduled_action_id uuid NOT NULL,
 step_number integer,
 action_name text,
 event_type text NOT NULL,
 actor_user_id uuid,
 detail_code text,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,scheduled_action_id) REFERENCES md_scheduled_actions(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_scheduled_action_history_order
 ON md_scheduled_action_history(tenant_id,scheduled_action_id,id);
