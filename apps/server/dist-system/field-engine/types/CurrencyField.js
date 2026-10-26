/** CurrencyField: currency metadata descriptor. */
export const CurrencyDefinition = Object.freeze({
    name: 'CurrencyField', dataType: 'currency', kind: 'numeric',
    storage: 'record'
});
export { normalizeNumberField as normalizeCurrencyField } from './NumberField.js';
