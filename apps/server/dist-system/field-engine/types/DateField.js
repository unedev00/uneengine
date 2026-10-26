/** DateField: date metadata descriptor. */
export const DateDefinition = Object.freeze({
    name: 'DateField', dataType: 'date', kind: 'date',
    storage: 'record'
});
export function normalizeDateField(value, key) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ||
        (!Number.isFinite(Date.parse(value + 'T00:00:00.000Z')) || new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) !== value))
        throw new Error('Invalid date field: ' + key);
    return value;
}
