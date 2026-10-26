/** FormulaField: formula metadata descriptor. */
export const FormulaDefinition = Object.freeze({
    name: 'FormulaField', dataType: 'formula', kind: 'computed',
    storage: 'record'
});
// Formula fields share the existing parser/evaluator; no parallel formula engine.
export async function loadFormulaFieldEngine() {
    const engine = await import('../../system-files/flow-formula-runtime.js');
    return { evaluateFlowFormula: engine.evaluateFlowFormula, validateFlowFormula: engine.validateFlowFormula,
        flowFormulaReferences: engine.flowFormulaReferences, inferFlowFormulaType: engine.inferFlowFormulaType };
}
