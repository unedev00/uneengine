import { readRbac } from '../system-support/rbac-description.js';
/** One central SQL RBAC evaluator. OneEngine is an ordinary configurable permission set. */
export class RbacEngine {
    db;
    constructor(db) {
        this.db = db;
    }
    async allowedMany(tenantId, userId, checks) {
        if (!checks.length)
            return [];
        const { rows } = await this.db.query('SELECT q.ordinal::integer AS ordinal,d.allow_granted,d.deny_granted FROM unnest($3::text[],$4::text[]) WITH ORDINALITY AS q(resource,action,ordinal) CROSS JOIN LATERAL md_rbac_decision($1,$2,q.resource,q.action) d ORDER BY q.ordinal', [tenantId, userId, checks.map(c => c.resource), checks.map(c => c.action)]);
        const byIndex = new Map(rows.map(row => [Number(row.ordinal) - 1, row]));
        return checks.map((_, index) => byIndex.get(index)?.allow_granted === true && byIndex.get(index)?.deny_granted !== true);
    }
    async allowed(tenantId, userId, resource, action) {
        return (await this.allowedMany(tenantId, userId, [{ resource, action }]))[0];
    }
    async require(tenantId, userId, resource, action) {
        if (!await this.allowed(tenantId, userId, resource, action))
            throw Error('Permission denied');
    }
    async describe(tenantId, userId) {
        await this.require(tenantId, userId, 'Security', 'read');
        return this.db.transaction(async (tx) => {
            await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
            await new RbacEngine(tx).require(tenantId, userId, 'Security', 'read');
            return readRbac(tx, tenantId);
        });
    }
    async requireRecord(tenantId, userId, objectApi, id, action) {
        const { rows } = await this.db.query('SELECT md_record_access($1,$2,id,$5) AS allowed FROM md_records WHERE tenant_id=$1 AND object_api=$3 AND id=$4', [tenantId, userId, objectApi, id, action]);
        if (!rows[0]?.allowed)
            throw Error('Permission denied');
    }
}
