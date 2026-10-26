/** LookupField: reference metadata descriptor. */
export const LookupDefinition = Object.freeze({
    name: 'LookupField', dataType: 'reference', kind: 'relationship',
    relationshipType: 'Lookup',
    storage: 'record'
});
export function validateLookupField(value, key, relatedObject) {
    if (typeof value !== 'string' || !relatedObject || !isRecordIdentifier(value))
        throw new Error('Invalid relationship: ' + key);
}
function isRecordIdentifier(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
