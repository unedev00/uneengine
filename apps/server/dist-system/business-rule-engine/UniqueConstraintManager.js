/** Canonical metadata flag for database-enforced uniqueness and external IDs. */
export function requiresUniqueValue(field) {
    return field.is_unique || field.external_id;
}
