import { saveDuplicateMatches } from './DuplicateDetectionEngine.js';
export class DuplicateMatchError extends Error {
    ruleApi;
    constructor(ruleApi) {
        super('Potential duplicate record matches rule: ' + ruleApi);
        this.ruleApi = ruleApi;
        this.name = 'DuplicateMatchError';
    }
}
/** One SQL matching engine. Enforces matches against all tenant records, without exposing inaccessible IDs. */
export class RecordMatching {
    rbac;
    constructor(rbac) {
        this.rbac = rbac;
    }
    async check(client, tenantId, userId, objectApi, values, excludeId) {
        const result = await client.query('SELECT api_name,match_mode,action FROM md_matching_rules WHERE tenant_id=$1 AND object_api=$2 AND active=true ORDER BY api_name', [tenantId, objectApi]);
        if (!result.rows.length)
            return null;
        const current = typeof values === 'function' ? await values() : values;
        const columns = await client.query(`SELECT rule_api,field_api,case_sensitive
    FROM md_matching_rule_fields WHERE tenant_id=$1 AND object_api=$2 ORDER BY rule_api,field_api`, [tenantId, objectApi]);
        const matches = [];
        for (const rule of result.rows) {
            const fields = columns.rows.filter(x => x.rule_api === rule.api_name);
            if (!fields.length)
                continue;
            const clauses = [];
            const params = [tenantId, objectApi, excludeId ?? null];
            for (const field of fields) {
                const value = current[field.field_api];
                if (value === null || value === undefined || typeof value !== 'string' || !value.trim()) {
                    if (rule.match_mode === 'All') {
                        clauses.length = 0;
                        break;
                    }
                    continue;
                }
                await this.rbac.require(tenantId, userId, objectApi + '.' + field.field_api, 'read');
                params.push(field.field_api, value.trim());
                const col = params.length - 1, val = params.length;
                clauses.push(`EXISTS(SELECT 1 FROM md_record_values v WHERE v.tenant_id=r.tenant_id
     AND v.object_api=r.object_api AND v.record_id=r.id AND v.field_api=$${col}
     AND ${field.case_sensitive ? 'v.value_text=$' + val : 'lower(v.value_text)=lower($' + val + ')'})`);
            }
            if (!clauses.length)
                continue;
            const filter = rule.match_mode === 'All' ? clauses.join(' AND ') : '(' + clauses.join(' OR ') + ')';
            const records = await client.query(`SELECT r.id FROM md_records r WHERE
     r.tenant_id=$1 AND r.object_api=$2 AND r.is_deleted=false
     AND ($3::uuid IS NULL OR r.id<>$3::uuid)
     AND (${filter}) ORDER BY r.id LIMIT 20`, params);
            if (!records.rows.length)
                continue;
            if (rule.action === 'Block')
                throw new DuplicateMatchError(rule.api_name);
            for (const record of records.rows)
                matches.push({ ruleApi: rule.api_name, recordId: record.id });
        }
        return matches;
    }
    async save(client, tenantId, objectApi, recordId, matches) {
        return saveDuplicateMatches(client, tenantId, objectApi, recordId, matches);
    }
}
