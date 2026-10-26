export function flowExecutionMode(value) {
    if (value === undefined || value === null || value === 'User')
        return 'User';
    if (value === 'System')
        return 'System';
    throw new Error('Unsupported Flow execution context');
}
export async function resolveFlowExecutionActor(db, rbac, tenantId, flowApi, requestedBy, mode, approvedBy) {
    if (mode === 'User')
        return { mode, actorUserId: requestedBy };
    if (!db)
        throw new Error('System-context Flow execution is not configured');
    if (!approvedBy)
        throw new Error('System-context Flow has no recorded administrator approval');
    await rbac.require(tenantId, approvedBy, 'FlowDefinition', 'system-context');
    const { rows } = await db.query(`
  SELECT s.flow_service_user_id FROM md_tenant_automation_settings s
  JOIN md_users u ON u.tenant_id=s.tenant_id AND u.id=s.flow_service_user_id AND u.enabled=true
  WHERE s.tenant_id=$1 AND s.flow_service_user_id IS NOT NULL`, [tenantId]);
    const actorUserId = rows[0]?.flow_service_user_id;
    if (!actorUserId)
        throw new Error('System-context Flow requires an enabled tenant automation user');
    await rbac.require(tenantId, actorUserId, 'Flow:' + flowApi, 'execute');
    return { mode, actorUserId };
}
export async function authorizeSystemFlowContext(db, rbac, tenantId, flowApi, approvedBy) {
    await rbac.require(tenantId, approvedBy, 'FlowDefinition', 'system-context');
    const { rows } = await db.query(`
  SELECT s.flow_service_user_id FROM md_tenant_automation_settings s
  JOIN md_users u ON u.tenant_id=s.tenant_id AND u.id=s.flow_service_user_id AND u.enabled=true
  WHERE s.tenant_id=$1 AND s.flow_service_user_id IS NOT NULL`, [tenantId]);
    const actorUserId = rows[0]?.flow_service_user_id;
    if (!actorUserId)
        throw new Error('System-context Flow requires an enabled tenant automation user');
    await rbac.require(tenantId, actorUserId, 'Flow:' + flowApi, 'execute');
    return actorUserId;
}
export async function auditSystemFlowContext(client, tenantId, flowId, actorUserId, initiatingUserId, event, runId) {
    await client.query(`
  INSERT INTO md_flow_execution_audit
   (tenant_id,flow_id,run_id,actor_user_id,initiating_user_id,event)
  VALUES($1,$2,$3,$4,$5,$6)`, [tenantId, flowId, runId ?? null, actorUserId, initiatingUserId, event]);
}
