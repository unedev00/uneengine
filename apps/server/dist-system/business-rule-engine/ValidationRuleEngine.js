import { resolveDefaultValues } from './DefaultValueResolver.js';
import { evaluateFlowFormula, flowFormulaReferences, validateFlowFormula } from '../system-files/flow-formula-runtime.js';
const api = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
export class DeclarativeRuleError extends Error {
    ruleApi;
    fieldApi;
    constructor(rule) {
        super(rule.error_message);
        this.name = 'DeclarativeRuleError';
        this.ruleApi = rule.api_name;
        this.fieldApi = rule.error_field_api;
    }
}
/** Shared, server-enforced rule evaluation. No eval(), separate expression language or app logic. */
export class DeclarativeRules {
    rbac;
    constructor(rbac) {
        this.rbac = rbac;
    }
    async context(client, tenantId, userId, objectApi, current, prior, expression) {
        validateFlowFormula(expression);
        const references = flowFormulaReferences(expression);
        const { rows } = await client.query(`SELECT u.id,u.email,u.display_name,u.time_zone,p.api_name AS profile_name
       FROM md_users u LEFT JOIN md_user_profiles up ON up.tenant_id=u.tenant_id AND up.user_id=u.id
       LEFT JOIN md_profiles p ON p.tenant_id=up.tenant_id AND p.id=up.profile_id
       WHERE u.tenant_id=$1 AND u.id=$2 AND u.enabled=true LIMIT 1`, [tenantId, userId]);
        const actor = rows[0];
        if (!actor)
            throw new Error('Rule execution actor is unavailable');
        const user = { Id: actor.id, Name: actor.display_name, Email: actor.email, TimeZone: actor.time_zone };
        const profile = { Name: actor.profile_name };
        for (const reference of references) {
            let field = null;
            if (reference.startsWith('$Record.'))
                field = reference.slice(8);
            else if (reference.startsWith('$Record__Prior.'))
                field = reference.slice(15);
            else if (reference.startsWith(objectApi + '.'))
                field = reference.slice(objectApi.length + 1);
            else if (api.test(reference) && Object.hasOwn(current, reference))
                field = reference;
            else if (reference.startsWith('$') && !reference.startsWith('$User.')
                && !reference.startsWith('$Profile.')
                && !['$Record', '$Record__Prior'].includes(reference))
                throw new Error('Unsupported rule global reference: ' + reference);
            if (field) {
                if (!api.test(field))
                    throw new Error('Invalid rule field reference');
                await this.rbac.require(tenantId, userId, objectApi + '.' + field, 'read');
            }
        }
        const resolve = (name) => {
            if (name === '$Record')
                return current;
            if (name === '$Record__Prior')
                return prior;
            if (name === '$User')
                return user;
            if (name === '$Profile')
                return profile;
            if (name.startsWith('$Record.'))
                return current[name.slice(8)] ?? null;
            if (name.startsWith('$Record__Prior.'))
                return prior?.[name.slice(15)] ?? null;
            if (name.startsWith(objectApi + '.'))
                return current[name.slice(objectApi.length + 1)] ?? null;
            if (name.startsWith('$User.'))
                return user[name.slice(6)] ?? null;
            if (name.startsWith('$Profile.'))
                return profile[name.slice(9)] ?? null;
            return current[name] ?? null;
        };
        return { resolve, timeZone: actor.time_zone };
    }
    async defaults(client, tenantId, userId, objectApi, values, literals = {}) {
        return resolveDefaultValues(client, tenantId, userId, objectApi, values, literals, (expression, current) => this.context(client, tenantId, userId, objectApi, current, null, expression));
    }
    async validate(client, tenantId, userId, objectApi, current, prior) {
        const { rows } = await client.query(`SELECT api_name,expression,error_message,error_field_api FROM md_validation_rules
       WHERE tenant_id=$1 AND object_api=$2 AND active=true ORDER BY sort_order,api_name`, [tenantId, objectApi]);
        if (!rows.length)
            return;
        const currentValues = typeof current === 'function' ? await current() : current;
        const priorValues = typeof prior === 'function' ? await prior() : prior;
        for (const rule of rows) {
            const ctx = await this.context(client, tenantId, userId, objectApi, currentValues, priorValues, rule.expression);
            const invalid = evaluateFlowFormula(rule.expression, ctx.resolve, { timeZone: ctx.timeZone });
            if (typeof invalid !== 'boolean')
                throw new Error('Validation rule must return Checkbox: ' + rule.api_name);
            if (invalid)
                throw new DeclarativeRuleError(rule);
        }
    }
}
