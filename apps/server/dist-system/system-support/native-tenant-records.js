/**
 * Tenant is backed by md_tenants, not md_records. Expose only the current
 * tenant through the same record-shaped contract used by reference pickers.
 * The platform tenant-management APIs remain responsible for administration.
 */
export class NativeTenantRecordReader {
    db;
    rbac;
    constructor(db, rbac) {
        this.db = db;
        this.rbac = rbac;
    }
    async current(actor) {
        await this.rbac.require(actor.tenant_id, actor.user_id, 'Tenant', 'read');
        const { rows } = await this.db.query('SELECT id,name,slug FROM md_tenants WHERE id=$1', [actor.tenant_id]);
        if (!rows[0])
            throw new Error('Record not found');
        const checks = ['Name', 'Slug'].map(field => ({ resource: 'Tenant.' + field, action: 'read' }));
        const allowed = await this.rbac.allowedMany(actor.tenant_id, actor.user_id, checks);
        const record = { Id: rows[0].id };
        if (allowed[0])
            record.Name = rows[0].name;
        if (allowed[1])
            record.Slug = rows[0].slug;
        return record;
    }
    async list(actor, limit, offset, search) {
        if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(offset) || offset < 0)
            throw new Error('Invalid pagination');
        if (search !== undefined && (typeof search !== 'string' || search.length > 256))
            throw new Error('Invalid record list query');
        const record = await this.current(actor);
        const term = (typeof search === 'string' ? search : '').trim().toLocaleLowerCase();
        const matched = !term || Object.entries(record).some(([field, value]) => field !== 'Id' && value.toLocaleLowerCase().includes(term));
        const total = matched ? 1 : 0;
        return { records: matched && offset === 0 ? [record] : [], total };
    }
    async get(actor, id) {
        // Never turn a platform Tenant lookup into cross-tenant discovery.
        if (id !== actor.tenant_id)
            throw new Error('Record not found');
        return { record: await this.current(actor) };
    }
}
