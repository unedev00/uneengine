/** CheckboxField: boolean metadata descriptor. */
export const CheckboxDefinition = Object.freeze({
    name: 'CheckboxField', dataType: 'boolean', kind: 'boolean',
    storage: 'record'
});
export function normalizeCheckboxField(value, key) {
    if (typeof value !== 'boolean')
        throw new Error('Invalid boolean field: ' + key);
    return String(value);
}
