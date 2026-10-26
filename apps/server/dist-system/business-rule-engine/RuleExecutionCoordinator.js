/** Keep validation and matching in one transaction; Record Engine still owns SQL writes. */
export async function validateAndMatchRecord(rules, matching, client, tenantId, userId, objectApi, current, prior, excludeId) {
    await rules.validate(client, tenantId, userId, objectApi, current, prior);
    return matching.check(client, tenantId, userId, objectApi, current, excludeId);
}
