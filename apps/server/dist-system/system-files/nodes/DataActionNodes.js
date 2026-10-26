import { executeCountCollectionNode } from './CountCollectionNode.js';
import { executeFilterCollectionNode } from './FilterCollectionNode.js';
import { executeSortCollectionNode } from './SortCollectionNode.js';
import { executeTransformNode } from './TransformNode.js';
import { executeDeleteRecordsNode } from './DeleteRecordsNode.js';
import { executeUpdateRecordsNode } from './UpdateRecordsNode.js';
import { executeGetRecordsNode } from './GetRecordsNode.js';
import { executeParseJsonNode } from './ParseJsonNode.js';
import { executeCreateRecordsNode } from './CreateRecordsNode.js';
import { executeLoopNode } from './LoopNode.js';
import { conditionsFrom, recordValues, isFlowRecordScalar as scalar } from './RecordNodeValidation.js';
const apiName = /^[A-Za-z][A-Za-z0-9_]*$/;
/** Shared pure collection operations, used by both execution and read-only debug. */
export function evaluateFlowCollectionStep(type, config, source, evaluate) {
    const records = recordValues(source);
    if (type === 'Collection Filter')
        return executeFilterCollectionNode(config, records, evaluate, conditionsFrom);
    if (type === 'Collection Sort')
        return executeSortCollectionNode(config, records);
    return executeTransformNode(config, records);
}
export async function executeFlowDataAction(context) {
    const { tenantId, userId, client, node, records, recordQuery, vars, loops, evaluate, set } = context;
    const config = node.config;
    if (node.type === 'Parse JSON')
        return executeParseJsonNode({ ...context, conditionsFrom, recordValues, scalar });
    if (node.type === 'Get Records')
        return executeGetRecordsNode({ ...context, conditionsFrom, recordValues, scalar });
    if (node.type === 'Update Records')
        return executeUpdateRecordsNode({ ...context, conditionsFrom, recordValues, scalar });
    if (node.type === 'Delete Records')
        return executeDeleteRecordsNode({ ...context, conditionsFrom, recordValues, scalar });
    if (node.type === 'Loop')
        return executeLoopNode({ node, vars, loops });
    if (node.type === 'Count Collection') {
        const output = String(config.outputVariable ?? '');
        if (!apiName.test(output))
            throw new Error('Invalid Count Collection output variable');
        vars[output] = executeCountCollectionNode(vars[String(config.collection ?? '')]);
        return { handled: true };
    }
    if (node.type === 'Collection Filter' || node.type === 'Collection Sort' || node.type === 'Transform') {
        const output = String(config.outputCollection ?? '');
        if (!apiName.test(output))
            throw new Error('Invalid collection output variable');
        vars[output] = evaluateFlowCollectionStep(node.type, config, vars[String(config.collection ?? '')], evaluate);
        return { handled: true };
    }
    if (node.type === 'Create Records' || node.type === 'CreateRecord')
        return executeCreateRecordsNode({ ...context, conditionsFrom, recordValues, scalar });
    return { handled: false };
}
