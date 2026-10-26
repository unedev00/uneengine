const objectName = /^[A-Za-z][A-Za-z0-9_]*$/;
const actionName = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One server-side entrypoint for metadata-configured object quick actions. */
export class ObjectQuickActionRuntime {
    db;
    rbac;
    records;
    collaboration;
    flows;
    namedCredentials;
    constructor(db, rbac, records, collaboration, flows, namedCredentials) {
        this.db = db;
        this.rbac = rbac;
        this.records = records;
        this.collaboration = collaboration;
        this.flows = flows;
        this.namedCredentials = namedCredentials;
    }
    /** The browser only receives action identifiers it can currently execute. */
    async available(actor, objectApi, recordId) {
        if (!objectName.test(objectApi) || !uuid.test(recordId))
            throw new Error('Invalid record request');
        const tenant = actor.tenant_id, user = actor.user_id;
        await this.rbac.require(tenant, user, objectApi, 'read');
        await this.rbac.requireRecord(tenant, user, objectApi, recordId, 'read');
        const { rows } = await this.db.query(`
   SELECT action_id,behavior,flow_api_name,field_api,target_object_api,relationship_field_api FROM md_object_actions
   WHERE tenant_id=$1 AND object_api=$2 AND action_type='Custom' AND enabled=true
   ORDER BY sort_order,action_id`, [tenant, objectApi]);
        const granted = await this.rbac.allowedMany(tenant, user, rows.map(row => ({
            resource: 'Action:' + objectApi + '.' + row.action_id, action: 'execute'
        })));
        const ids = [];
        let canEditRecord;
        for (const [index, action] of rows.entries()) {
            if (!granted[index])
                continue;
            if (action.behavior === 'Send Email' && (!await this.rbac.allowed(tenant, user, 'Email', 'send')
                || !await this.rbac.allowed(tenant, user, 'NamedCredential', 'read')))
                continue;
            if (action.behavior === 'Run Flow' && (!action.flow_api_name
                || !await this.rbac.allowed(tenant, user, 'Flow:' + action.flow_api_name, 'execute')))
                continue;
            if (action.behavior === 'Set Field Value' || action.behavior === 'Log Call') {
                if (canEditRecord === undefined) {
                    canEditRecord = await this.rbac.allowed(tenant, user, objectApi, 'edit');
                    if (canEditRecord)
                        try {
                            await this.rbac.requireRecord(tenant, user, objectApi, recordId, 'edit');
                        }
                        catch {
                            canEditRecord = false;
                        }
                }
                if (!canEditRecord)
                    continue;
                if (action.behavior === 'Set Field Value' && (!action.field_api
                    || !await this.rbac.allowed(tenant, user, objectApi + '.' + action.field_api, 'edit')))
                    continue;
            }
            if (action.behavior === 'Create Related' && (!action.target_object_api || !action.relationship_field_api
                || !await this.rbac.allowed(tenant, user, action.target_object_api, 'create')
                || !await this.rbac.allowed(tenant, user, action.target_object_api + '.' + action.relationship_field_api, 'create')))
                continue;
            ids.push(action.action_id);
        }
        return { actionIds: ids };
    }
    async authorizeFlow(actor, objectApi, recordId, actionId) {
        if (!objectName.test(objectApi) || !uuid.test(recordId) || !actionName.test(actionId))
            throw new Error('Invalid action request');
        const tenant = actor.tenant_id, user = actor.user_id;
        await this.rbac.require(tenant, user, objectApi, 'read');
        await this.rbac.requireRecord(tenant, user, objectApi, recordId, 'read');
        await this.rbac.require(tenant, user, 'Action:' + objectApi + '.' + actionId, 'execute');
        const { rows } = await this.db.query(`SELECT flow_api_name
   FROM md_object_actions WHERE tenant_id=$1 AND object_api=$2 AND action_id=$3
    AND action_type='Custom' AND enabled=true AND behavior='Run Flow'`, [tenant, objectApi, actionId]);
        const flowApiName = rows[0]?.flow_api_name;
        if (!flowApiName)
            throw new Error('Quick action Flow is unavailable');
        await this.rbac.require(tenant, user, 'Flow:' + flowApiName, 'execute');
        return { flowApiName, inputs: { recordId, objectApiName: objectApi } };
    }
    /** Global actions share the same runtime, SQL metadata and OneEngine checks. */
    async globalAvailable(actor) {
        const tenant = actor.tenant_id, user = actor.user_id;
        const { rows } = await this.db.query(`SELECT action_id,label,behavior,target_object_api,flow_api_name
    FROM md_global_quick_actions WHERE tenant_id=$1 AND enabled=true
    ORDER BY sort_order,action_id`, [tenant]);
        const permitted = await this.rbac.allowedMany(tenant, user, rows.map(a => ({
            resource: 'Action:Global.' + a.action_id, action: 'execute'
        })));
        const actions = [];
        for (const [index, a] of rows.entries()) {
            if (!permitted[index])
                continue;
            if (a.behavior === 'Create Record' && (!a.target_object_api
                || !await this.rbac.allowed(tenant, user, a.target_object_api, 'create')))
                continue;
            if (a.behavior === 'Run Flow' && (!a.flow_api_name
                || !await this.rbac.allowed(tenant, user, 'Flow:' + a.flow_api_name, 'execute')))
                continue;
            if (a.behavior === 'Send Email' && (!await this.rbac.allowed(tenant, user, 'Email', 'send')
                || !await this.rbac.allowed(tenant, user, 'NamedCredential', 'read')))
                continue;
            actions.push({ id: a.action_id, label: a.label, behavior: a.behavior,
                ...(a.target_object_api ? { targetObjectApi: a.target_object_api } : {}) });
        }
        return { actions };
    }
    async authorizeGlobalFlow(actor, actionId) {
        if (!actionName.test(actionId))
            throw new Error('Invalid global action');
        const tenant = actor.tenant_id, user = actor.user_id;
        await this.rbac.require(tenant, user, 'Action:Global.' + actionId, 'execute');
        const { rows } = await this.db.query(`
   SELECT flow_api_name FROM md_global_quick_actions
   WHERE tenant_id=$1 AND action_id=$2 AND behavior='Run Flow' AND enabled=true`, [tenant, actionId]);
        const flowApiName = rows[0]?.flow_api_name;
        if (!flowApiName)
            throw new Error('Global Flow action is unavailable');
        await this.rbac.require(tenant, user, 'Flow:' + flowApiName, 'execute');
        return { flowApiName, inputs: {} };
    }
    async executeGlobal(actor, actionId, input) {
        if (!actionName.test(actionId) || !input || typeof input !== 'object' || Array.isArray(input))
            throw new Error('Invalid global action request');
        const values = input;
        if (Object.keys(values).length > 100)
            throw new Error('Invalid global action input');
        const tenant = actor.tenant_id, user = actor.user_id;
        await this.rbac.require(tenant, user, 'Action:Global.' + actionId, 'execute');
        const { rows } = await this.db.query(`SELECT behavior,target_object_api,flow_api_name,credential_id,from_email
    FROM md_global_quick_actions WHERE tenant_id=$1 AND action_id=$2 AND enabled=true`, [tenant, actionId]);
        const action = rows[0];
        if (!action)
            throw new Error('Global action is unavailable');
        if (action.behavior === 'Create Record') {
            if (!action.target_object_api || !objectName.test(action.target_object_api))
                throw new Error('Global target Object is unavailable');
            const id = await this.records.create(tenant, user, action.target_object_api, values);
            return { status: 'completed', recordId: id, objectApiName: action.target_object_api };
        }
        if (action.behavior === 'Run Flow') {
            if (!action.flow_api_name || !objectName.test(action.flow_api_name)
                || Object.keys(values).length)
                throw new Error('Invalid global Flow action request');
            return { status: 'started', result: await this.flows.execute(tenant, action.flow_api_name, user, {}) };
        }
        if (action.behavior === 'Send Email') {
            if (!this.namedCredentials || !action.credential_id || !action.from_email)
                throw new Error('Global email action is unavailable');
            if (Object.keys(values).some(key => !['to', 'subject', 'body', 'requestKey'].includes(key))
                || typeof values.to !== 'string' || typeof values.subject !== 'string'
                || typeof values.body !== 'string')
                throw new Error('Invalid global email input');
            await this.namedCredentials.sendQuickActionEmail(tenant, user, 'Global', '', actionId, action.credential_id, action.from_email, values.to, values.subject, values.body, typeof values.requestKey === 'string' ? values.requestKey : undefined);
            return { status: 'queued' };
        }
        throw new Error('Unsupported global action');
    }
    async execute(actor, objectApi, recordId, actionId, input) {
        if (!objectName.test(objectApi) || !actionName.test(actionId) || !uuid.test(recordId))
            throw new Error('Invalid quick action request');
        if (input === null || typeof input !== 'object' || Array.isArray(input))
            throw new Error('Invalid quick action input');
        const values = input;
        if (Object.keys(values).length > 100)
            throw new Error('Quick action input too large');
        const tenantId = actor.tenant_id, userId = actor.user_id;
        await this.rbac.require(tenantId, userId, objectApi, 'read');
        await this.rbac.requireRecord(tenantId, userId, objectApi, recordId, 'read');
        await this.rbac.require(tenantId, userId, 'Action:' + objectApi + '.' + actionId, 'execute');
        const { rows } = await this.db.query(`
    SELECT behavior,field_api,value_text,target_object_api,relationship_field_api,flow_api_name,credential_id,from_email
    FROM md_object_actions WHERE tenant_id=$1 AND object_api=$2 AND action_id=$3
      AND enabled=true AND action_type='Custom'`, [tenantId, objectApi, actionId]);
        const action = rows[0];
        if (!action)
            throw new Error('Quick action is unavailable');
        if (action.behavior === 'Set Field Value') {
            if (Object.keys(values).length)
                throw new Error('This action accepts no user input');
            if (!action.field_api || action.value_text === null)
                throw new Error('Quick action configuration is invalid');
            await this.records.update(tenantId, userId, objectApi, recordId, { [action.field_api]: action.value_text });
            return { status: 'completed', recordId };
        }
        if (action.behavior === 'Log Call') {
            const subject = values.subject ?? action.value_text ?? 'Call';
            const description = values.description ?? '';
            if (Object.keys(values).some(key => !['subject', 'description'].includes(key)))
                throw new Error('Invalid call input');
            const { activity } = await this.collaboration.addActivity(actor, objectApi, recordId, {
                kind: 'Call', subject, description, status: 'Completed'
            });
            return { status: 'completed', activity };
        }
        if (action.behavior === 'Create Related') {
            const childObject = action.target_object_api, relationshipField = action.relationship_field_api;
            if (!childObject || !relationshipField)
                throw new Error('Quick action relationship is not configured');
            if (!objectName.test(childObject) || !objectName.test(relationshipField)
                || Object.hasOwn(values, relationshipField))
                throw new Error('Invalid related-record values');
            const relation = await this.db.query(`
     SELECT 1 FROM md_field_definitions
     WHERE tenant_id=$1 AND object_api=$2 AND api_name=$3 AND related_object=$4
       AND data_type='reference' AND deleted_at IS NULL`, [tenantId, childObject, relationshipField, objectApi]);
            if (!relation.rowCount)
                throw new Error('Configured relationship is no longer available');
            const id = await this.records.create(tenantId, userId, childObject, {
                ...values, [relationshipField]: recordId
            });
            return { status: 'completed', recordId: id, objectApiName: childObject };
        }
        if (action.behavior === 'Send Email') {
            if (!this.namedCredentials || !action.credential_id || !action.from_email)
                throw new Error('Quick Action email transport is unavailable');
            if (Object.keys(values).some(key => !['to', 'subject', 'body', 'requestKey'].includes(key)))
                throw new Error('Invalid email action input');
            if (typeof values.to !== 'string' || typeof values.subject !== 'string'
                || typeof values.body !== 'string')
                throw new Error('Email recipient, subject and body required');
            await this.namedCredentials.sendQuickActionEmail(tenantId, userId, objectApi, recordId, actionId, action.credential_id, action.from_email, values.to, values.subject, values.body, typeof values.requestKey === 'string' ? values.requestKey : undefined);
            return { status: 'queued', recordId };
        }
        if (action.behavior === 'Run Flow') {
            if (!action.flow_api_name || !objectName.test(action.flow_api_name))
                throw new Error('Quick action Flow is not configured');
            if (Object.keys(values).length)
                throw new Error('Flow action accepts no user input');
            const result = await this.flows.execute(tenantId, action.flow_api_name, userId, {
                recordId, objectApiName: objectApi
            });
            return { status: 'started', result };
        }
        throw new Error('Unsupported quick action behavior');
    }
}
