import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
const storage = new AsyncLocalStorage();
export const auditContext = () => storage.getStore();
export const withAuditContext = (context, run) => storage.run({ correlationId: randomUUID(), ...context }, run);
export function setAuditActor(tenant, user) { const context = auditContext(); if (context) {
    context.actorTenant = tenant;
    context.actorUser = user;
} }
export async function setSqlAuditContext(client, context) {
    // SET LOCAL preserves callers' ability to choose isolation before their first query.
    const literal = (v) => "E'" + v.replaceAll('\\', '\\\\').replaceAll("'", "''") + "'";
    await client.query('SET LOCAL metadrive.actor_tenant = ' + literal(context.actorTenant ?? '') + '; SET LOCAL metadrive.actor_user = ' + literal(context.actorUser ?? '') + '; SET LOCAL metadrive.correlation_id = ' + literal(context.correlationId), []);
}
