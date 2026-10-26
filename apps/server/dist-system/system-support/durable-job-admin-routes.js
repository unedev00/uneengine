import { DurableJobService } from './durable-job-service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const wrap = (fn) => (req, res, next) => { void fn(req, res).catch(next); };
export function registerDurableJobAdminRoutes(app, db, rbac) {
    const jobs = new DurableJobService(db);
    const operator = async (req) => {
        const actor = req.actor;
        if (!actor?.tenant_id || !actor.user_id)
            throw new Error('Authenticated tenant required');
        // Reuse the centrally revocable tenant-administration permission.
        await rbac.require(actor.tenant_id, actor.user_id, 'Tenant', 'manage');
        return actor;
    };
    const jobId = (req) => {
        const id = req.params.id;
        if (!uuid.test(id))
            throw new Error('Invalid job identifier');
        return id;
    };
    app.get('/api/job-admin/jobs', wrap(async (req, res) => {
        const actor = await operator(req);
        const status = req.query.status;
        if (typeof status !== 'string' || !['failed', 'cancelled', 'completed', 'queued', 'leased'].includes(status))
            throw new Error('Invalid job status');
        const { rows } = await db.query(`SELECT id,job_type,app_api_name,resource_id,resource_version,
   status,attempt,max_attempts,scheduled_at,lease_until,error_code,created_at,updated_at
   FROM md_durable_jobs WHERE tenant_id=$1 AND status=$2
   ORDER BY updated_at DESC,id DESC LIMIT 100`, [actor.tenant_id, status]);
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ jobs: rows });
    }));
    app.get('/api/job-admin/jobs/:id', wrap(async (req, res) => {
        const actor = await operator(req), id = jobId(req);
        const job = await jobs.inspect(actor.tenant_id, id);
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ job });
    }));
    app.get('/api/job-admin/jobs/:id/history', wrap(async (req, res) => {
        const actor = await operator(req), id = jobId(req);
        await jobs.inspect(actor.tenant_id, id);
        const { rows } = await db.query(`SELECT id,status,attempt,worker_id,error_code,observed_at
   FROM md_durable_job_history WHERE tenant_id=$1 AND job_id=$2 ORDER BY id DESC LIMIT 200`, [actor.tenant_id, id]);
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ history: rows });
    }));
    app.post('/api/job-admin/jobs/:id/reconcile', wrap(async (req, res) => {
        const actor = await operator(req), id = jobId(req);
        const decision = req.body?.decision;
        if (decision !== 'acknowledge' && decision !== 'retry')
            throw new Error('Invalid job reconciliation');
        await jobs.reconcileFailed(actor.tenant_id, id, actor.user_id, decision);
        res.json({ job: await jobs.inspect(actor.tenant_id, id) });
    }));
    app.post('/api/job-admin/jobs/:id/cancel', wrap(async (req, res) => {
        const actor = await operator(req), id = jobId(req);
        await jobs.cancelFailed(actor.tenant_id, id, actor.user_id);
        res.json({ job: await jobs.inspect(actor.tenant_id, id) });
    }));
}
