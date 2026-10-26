/** MasterDetailField: reference metadata descriptor. */
export const MasterDetailDefinition = Object.freeze({
    name: 'MasterDetailField', dataType: 'reference', kind: 'relationship',
    relationshipType: 'Master-Detail',
    storage: 'record'
});
export function assertMasterDetailReparenting(previous, newId, key, allowed) {
    if (previous && previous !== newId && !allowed)
        throw new Error('Master-Detail relationship does not allow reparenting: ' + key);
}
