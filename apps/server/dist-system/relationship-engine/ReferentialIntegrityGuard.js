/** Inbound required/restricted lookups prevent deletion, independently of app metadata. */
export function assertDeletionAllowed(references) {
    if (references.some(reference => reference.relationship_type === 'Lookup' &&
        (reference.delete_behavior === 'Restrict' || reference.required)))
        throw new Error('Record delete restricted by a lookup relationship');
}
