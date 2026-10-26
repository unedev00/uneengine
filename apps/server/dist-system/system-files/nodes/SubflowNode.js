import { decodeMetadataValues } from '../component-runtime.js';
import { auditSystemFlowContext, flowExecutionMode, resolveFlowExecutionActor } from '../flow-execution-context.js';
import { flowAppIsEntitled } from '../flow-validation.js';
const apiName = /^[A-Za-z][A-Za-z0-9_]*$/;
const scalar = (value) => value === null || typeof value === 'string'
    || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value);
export function subflowScalarTypeMatches(resource, value) {
    if (!scalar(value))
        return false;
    if (value === null)
        return true;
    const type = String(resource.dataType ?? 'Text');
    if (['Number', 'Currency', 'Percent'].includes(type))
        return typeof value === 'number';
    if (['Boolean', 'Checkbox'].includes(type))
        return typeof value === 'boolean';
    return typeof value === 'string';
}
function mappings(value) {
    if (typeof value !== 'string' || value.length > 8192)
        throw new Error('Invalid Subflow resource mappings');
    const result = [];
    for (const line of value.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
        const separator = line.indexOf('=');
        if (separator < 1)
            throw new Error('Invalid Subflow resource mapping');
        const source = line.slice(0, separator).trim(), target = line.slice(separator + 1).trim();
        if (!apiName.test(source) || !target || target.length > 4096 || result.some(([name]) => name === source))
            throw new Error('Invalid Subflow resource mapping');
        result.push([source, target]);
    }
    return result;
}
export async function executeFlowSubflow(context) {
    const { client, tenantId, userId, config, rbac, callStack, evaluate, set, advance } = context;
    const initiatingUserId = context.initiatingUserId ?? userId;
    const flowApiName = String(config.flowApiName ?? '');
    if (!apiName.test(flowApiName))
        throw new Error('Subflow requires an active Autolaunched Flow');
    if (callStack.includes(flowApiName))
        throw new Error('Recursive Subflow invocation is not allowed');
    if (callStack.length >= 16)
        throw new Error('Subflow nesting limit exceeded');
    await rbac.require(tenantId, userId, 'Flow:' + flowApiName, 'execute');
    const { rows: definitions } = await client.query(`
  SELECT id,flow_type,system_context_approved_by FROM md_flow_definitions
  WHERE tenant_id=$1 AND api_name=$2 AND active=true AND archived=false
  ORDER BY version DESC LIMIT 1
 `, [tenantId, flowApiName]);
    const definition = definitions[0];
    if (!definition || definition.flow_type !== 'Autolaunched Flow')
        throw new Error('Subflow must reference an active Autolaunched Flow');
    const { rows: metadata } = await client.query(`
  SELECT property_path,value_kind,value_text FROM md_flow_editor_values
  WHERE tenant_id=$1 AND flow_id=$2
 `, [tenantId, definition.id]);
    const graph = decodeMetadataValues(metadata).builder;
    if (!graph || !Array.isArray(graph.elements) || !Array.isArray(graph.resources))
        throw new Error('Subflow definition has no executable Builder graph');
    if (!await flowAppIsEntitled(client, tenantId, typeof graph.appApiName === 'string' ? graph.appApiName : null))
        throw new Error('Subflow app is not installed or entitled for this tenant');
    const starts = graph.elements.filter(element => element.type === 'Start');
    if (starts.length !== 1)
        throw new Error('Subflow definition has an invalid Start element');
    const executionActor = await resolveFlowExecutionActor(client, rbac, tenantId, flowApiName, userId, flowExecutionMode(starts[0].config?.executionContext), definition.system_context_approved_by);
    const inputs = new Map(graph.resources.filter(resource => resource.availableForInput)
        .map(resource => [resource.name, resource]));
    const outputs = new Map(graph.resources.filter(resource => resource.availableForOutput)
        .map(resource => [resource.name, resource]));
    const inputValues = new Map();
    for (const [childName, parentExpression] of mappings(config.inputValues ?? '')) {
        const child = inputs.get(childName);
        if (!child)
            throw new Error('Subflow input is not enabled: ' + childName);
        const value = evaluate(parentExpression);
        if (!subflowScalarTypeMatches(child, value))
            throw new Error('Subflow input type does not match child resource: ' + childName);
        const parentReference = /^\{!([A-Za-z][A-Za-z0-9_]*)\}$/.exec(parentExpression);
        if (parentReference && context.parentResources) {
            const parent = context.parentResources.find(resource => resource.name === parentReference[1]);
            if (!parent || parent.dataType !== child.dataType || parent.type === 'Record'
                || parent.type === 'Record Collection')
                throw new Error('Subflow input resource types do not match: ' + childName);
        }
        inputValues.set(childName, value);
    }
    const outputValues = mappings(config.outputValues ?? '');
    for (const [childName, parentName] of outputValues) {
        const child = outputs.get(childName);
        if (!child || !apiName.test(parentName))
            throw new Error('Subflow output mapping is invalid: ' + childName);
        if (context.parentResources) {
            const parent = context.parentResources.find(resource => resource.name === parentName);
            if (!parent || parent.type !== 'Variable' || parent.dataType !== child.dataType)
                throw new Error('Subflow output resource types do not match: ' + childName);
        }
    }
    const { rows: runs } = await client.query(`
  INSERT INTO md_flow_runs
   (tenant_id,flow_id,started_by,initiated_by,execution_context,status)
  VALUES($1,$2,$3,$4,$5,'pending') RETURNING id
  `, [tenantId, definition.id, executionActor.actorUserId, initiatingUserId, executionActor.mode]);
    const runId = runs[0]?.id;
    if (!runId)
        throw new Error('Unable to create Subflow interview');
    if (executionActor.mode === 'System')
        await auditSystemFlowContext(client, tenantId, definition.id, executionActor.actorUserId, initiatingUserId, 'system-context-run', runId);
    for (const [name, value] of inputValues)
        await client.query(`
   INSERT INTO md_flow_run_inputs(tenant_id,run_id,api_name,value_text,data_type)
   VALUES($1,$2,$3,$4,$5)
  `, [tenantId, runId, name, value === null ? null : String(value), value === null ? 'null' : typeof value]);
    await client.query(`
  INSERT INTO md_flow_interview_state(tenant_id,run_id,current_element)
  VALUES($1,$2,$3)
 `, [tenantId, runId, starts[0].id]);
    const result = await advance(runId, [...callStack, flowApiName], executionActor.actorUserId);
    if (result.status !== 'completed' || !result.outputs)
        throw new Error('Subflow did not complete synchronously');
    for (const [childName, parentName] of outputValues) {
        if (!Object.hasOwn(result.outputs, childName)
            || !subflowScalarTypeMatches(outputs.get(childName), result.outputs[childName]))
            throw new Error('Subflow output is missing or has an incompatible scalar type: ' + childName);
        set(parentName, result.outputs[childName]);
    }
}
