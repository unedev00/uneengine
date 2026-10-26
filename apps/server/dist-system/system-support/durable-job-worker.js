import { withAuditContext } from './audit-context.js';
/**
 * Shared worker dispatcher. Registration is explicit: an unknown job cannot run.
 * Authorizer must check active tenant/app/licence, published flow and current RBAC.
 * Workers execute jobs only after that check; no implicit system access.
 */
export class DurableJobWorker {
    jobs;
    authorize;
    workerId;
    handlers = new Map();
    constructor(jobs, authorize, workerId) {
        this.jobs = jobs;
        this.authorize = authorize;
        this.workerId = workerId;
        if (!workerId || workerId.length > 128)
            throw new Error('Invalid worker ID');
    }
    register(kind, handler) {
        if (this.handlers.has(kind))
            throw new Error('Duplicate job handler: ' + kind);
        if (!/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(kind))
            throw new Error('Invalid job kind');
        this.handlers.set(kind, job => withAuditContext({ actorTenant: job.tenant_id, actorUser: job.actor_user_id ?? undefined }, () => handler(job)));
    }
    async runOnce(batch = 10) {
        const due = await this.jobs.claim(this.workerId, batch);
        let completed = 0, failed = 0;
        for (const job of due) {
            let replayBlocked = false;
            try {
                if (['flow.execute', 'flow.resume', 'flow.scheduled', 'flow.platform-event'].includes(job.job_type) && job.attempt > 1)
                    replayBlocked = true;
                const handler = this.handlers.get(job.job_type);
                if (!handler)
                    throw new Error('Unregistered job type');
                if (!await this.authorize(job))
                    throw new Error('Job no longer authorised');
                await handler(job);
                await this.jobs.complete(job.tenant_id, job.id, this.workerId);
                completed++;
            }
            catch {
                // Never serialize arbitrary error text, secrets or other tenant information.
                try {
                    await this.jobs.fail(job.tenant_id, job.id, this.workerId, replayBlocked ? 'FLOW_RECONCILIATION_REQUIRED' : 'JOB_EXECUTION_FAILED', Math.min(3600, Math.pow(2, Math.min(job.attempt, 10)) * 15));
                }
                catch {
                    // Failed leases are reclaimable by a subsequent worker after expiration.
                }
                failed++;
            }
        }
        return { claimed: due.length, completed, failed };
    }
}
