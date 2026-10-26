import { evaluateFlowDecisionOutcome } from '../flow-decision-runtime.js';
export function executeFilterCollectionNode(config, records, evaluate, conditionsFrom) {
    const conditions = conditionsFrom(config.conditions, evaluate);
    if (conditions.length === 0)
        throw new Error('Collection Filter requires at least one condition');
    return records.filter(item => {
        const rows = conditions.map(condition => ({ ...condition, field: item[String(condition.field)] }));
        return evaluateFlowDecisionOutcome(rows, typeof config.conditionLogic === 'string' ? config.conditionLogic : undefined, value => value);
    });
}
