/** DateTimeField: datetime metadata descriptor. */
export const DateTimeDefinition = Object.freeze({
    name: 'DateTimeField', dataType: 'datetime', kind: 'date',
    storage: 'record'
});
export function normalizeDateTimeField(value, key) {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || !/Z$|[+-][0-9]{2}:[0-9]{2}$/.test(value))
        throw new Error('Invalid datetime field: ' + key);
    return new Date(value).toISOString();
}
