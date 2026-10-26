/** PicklistField: picklist metadata descriptor. */
export const PicklistDefinition = Object.freeze({
    name: 'PicklistField', dataType: 'picklist', kind: 'selection',
    storage: 'record'
});
export async function validatePicklistField(value, key, allowedValues) {
    if (!value)
        throw new Error('Invalid picklist value: ' + key);
    if (!(new Set(await allowedValues())).has(value))
        throw new Error('Invalid picklist value: ' + key);
}
