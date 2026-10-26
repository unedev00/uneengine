import { persistPlatformEvent } from '../system-files/platform-event-runtime.js';
const api = /^[A-Za-z][A-Za-z0-9_]*$/;
export class PlatformEventService {
    db;
    rbac;
    constructor(db, rbac) {
        this.db = db;
        this.rbac = rbac;
    }
    async publish(tenantId, userId, eventApiName, raw) {
        if (!api.test(eventApiName) || !raw || typeof raw !== 'object' || Array.isArray(raw))
            throw new Error('Invalid Platform Event request');
        const request = raw;
        const idempotencyKey = request.idempotencyKey;
        if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || !idempotencyKey
            || idempotencyKey.length > 128))
            throw new Error('Invalid Platform Event idempotency key');
        const values = request.values;
        if (!values || typeof values !== 'object' || Array.isArray(values))
            throw new Error('Platform Event values must be an object');
        const eventId = await this.db.transaction((client) => persistPlatformEvent(client, this.rbac, tenantId, userId, eventApiName, values, typeof idempotencyKey === 'string' ? idempotencyKey : undefined));
        return { eventId, status: 'pending' };
    }
}
