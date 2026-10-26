/** PercentField: percent metadata descriptor. */
export const PercentDefinition = Object.freeze({
    name: 'PercentField', dataType: 'percent', kind: 'numeric',
    storage: 'record'
});
export { normalizeNumberField as normalizePercentField } from './NumberField.js';
