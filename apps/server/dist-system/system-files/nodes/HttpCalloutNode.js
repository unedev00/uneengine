import { isFlowScalar } from '../flow-scalar-runtime.js';
import { resolveFlowHttpCalloutKey, mapFlowHttpResponse } from '../flow-http-mapping.js';
/** Execute a Flow HTTP node, preserving idempotency, async delivery and fault semantics. */
export async function executeHttpCalloutNode(input) {
    const { transport, tenantId, userId, client, runId, node, current, vars, evaluate, set, resources, faultTarget } = input;
    if (!transport)
        throw new Error('HTTP Callout transport is unavailable');
    const asynchronous = node.config.deliveryMode === 'DURABLE_ASYNC';
    try {
        const scalarVars = Object.fromEntries(Object.entries(vars).filter((entry) => !entry[0].includes('.') && isFlowScalar(entry[1])));
        // Reuse the same server-side Get Records output for HTTP mappings. Only
        // scalar properties of records already fetched under OneEngine may be used.
        // Never accept dotted browser input or flatten arbitrary collections.
        for (const [resource, value] of Object.entries(vars)) {
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(resource) || !value
                || typeof value !== 'object' || Array.isArray(value))
                continue;
            for (const [field, fieldValue] of Object.entries(value)) {
                if (/^[A-Za-z][A-Za-z0-9_]*$/.test(field) && isFlowScalar(fieldValue))
                    scalarVars[resource + '.' + field] = fieldValue;
            }
        }
        const stableKey = resolveFlowHttpCalloutKey(node.config.idempotencyKey, runId + '-' + node.id, evaluate);
        const response = await transport(tenantId, userId, node.config, scalarVars, stableKey, asynchronous ? { client, runId, nodeId: current } : undefined);
        if (!asynchronous) {
            if (node.config.statusVariable)
                set(node.config.statusVariable, response.status);
            if (node.config.responseVariable)
                set(node.config.responseVariable, response.body);
            if (node.config.responseMapping) {
                const mapped = mapFlowHttpResponse(node.config.responseMapping, response.body, resources.filter(item => item.type === 'Variable').map(item => ({ name: item.name, dataType: item.dataType })));
                for (const [name, value] of Object.entries(mapped))
                    set(name, value);
            }
        }
    }
    catch (error) {
        if (node.config.onError === 'FAULT_PATH' && faultTarget !== undefined) {
            vars['$Flow.FaultMessage'] = error instanceof Error ? error.message : 'Unknown Flow error';
            vars['$Flow.FaultCode'] = error instanceof Error ? error.name : 'UNKNOWN';
            return faultTarget;
        }
        if (node.config.onError !== 'CONTINUE')
            throw error;
    }
    return undefined;
}
