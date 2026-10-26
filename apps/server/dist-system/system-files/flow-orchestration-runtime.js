import { decodeMetadataValues } from './component-runtime.js';
export function resolveFlowApprovalOutcome(rule, statuses) {
    if (!statuses.length)
        throw new Error('Orchestration stage has no approval requests');
    if (!statuses.every(status => ['Pending', 'Approved', 'Rejected', 'Canceled'].includes(status)))
        throw new Error('Invalid orchestration approval decision');
    if (rule === 'ANY') {
        if (statuses.includes('Approved'))
            return 'Approved';
        if (statuses.every(status => status !== 'Pending'))
            return 'Rejected';
    }
    else {
        if (statuses.includes('Rejected'))
            return 'Rejected';
        if (statuses.every(status => status === 'Approved'))
            return 'Approved';
    }
    return null;
}
/** One committed decision advances the interview at most once. */
export async function finishFlowOrchestrationDecision(client, tenantId, groupId) {
    const { rows: stages } = await client.query(`
  SELECT group_id,run_id,element_id,rule,status FROM md_flow_approval_stages
  WHERE tenant_id=$1 AND group_id=$2 FOR UPDATE
 `, [tenantId, groupId]);
    const stage = stages[0];
    if (!stage || stage.status !== 'waiting')
        return null;
    const { rows: decisions } = await client.query(`
  SELECT status FROM md_approval_requests WHERE tenant_id=$1 AND group_id=$2
  ORDER BY id
 `, [tenantId, groupId]);
    const outcome = resolveFlowApprovalOutcome(stage.rule, decisions.map(item => item.status));
    if (!outcome)
        return null;
    const { rows: running } = await client.query(`
  SELECT r.started_by AS actor_id,f.api_name AS flow_api,f.version
  FROM md_flow_runs r JOIN md_flow_definitions f
   ON f.id=r.flow_id AND f.tenant_id=r.tenant_id
  WHERE r.tenant_id=$1 AND r.id=$2 AND r.status='waiting'
   AND r.wait_kind='orchestration' AND f.active=true AND f.archived=false
  FOR UPDATE OF r
 `, [tenantId, stage.run_id]);
    if (!running[0]) {
        await client.query(`UPDATE md_flow_approval_stages SET status='cancelled',finished_at=now()
   WHERE tenant_id=$1 AND group_id=$2 AND status='waiting'`, [tenantId, groupId]);
        await client.query(`UPDATE md_approval_requests SET status='Canceled'
   WHERE tenant_id=$1 AND group_id=$2 AND status='Pending'`, [tenantId, groupId]);
        return null;
    }
    const { rows: metadata } = await client.query(`
  SELECT property_path,value_kind,value_text FROM md_flow_editor_values
  WHERE tenant_id=$1 AND flow_id=(
   SELECT flow_id FROM md_flow_runs WHERE tenant_id=$1 AND id=$2)
 `, [tenantId, stage.run_id]);
    const graph = decodeMetadataValues(metadata).builder;
    const appApiName = typeof graph?.appApiName === 'string' && graph.appApiName
        ? graph.appApiName : null;
    await client.query(`UPDATE md_flow_approval_stages
  SET status=$3,finished_at=now() WHERE tenant_id=$1 AND group_id=$2 AND status='waiting'`, [tenantId, groupId, outcome]);
    await client.query(`UPDATE md_approval_requests SET status='Canceled'
  WHERE tenant_id=$1 AND group_id=$2 AND status='Pending'`, [tenantId, groupId]);
    await client.query(`UPDATE md_flow_runs SET wait_until=now()
  WHERE tenant_id=$1 AND id=$2 AND status='waiting' AND wait_kind='orchestration'`, [tenantId, stage.run_id]);
    return { tenantId, runId: stage.run_id, actorUserId: running[0].actor_id,
        version: running[0].version, appApiName };
}
