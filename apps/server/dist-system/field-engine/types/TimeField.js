/** TimeField: time metadata descriptor. */
export const TimeDefinition = Object.freeze({
    name: 'TimeField', dataType: 'time', kind: 'date',
    storage: 'record'
});
export function normalizeTimeField(value, key) {
    if (typeof value !== 'string')
        throw new Error('Invalid time field: ' + key);
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/.exec(value);
    if (!match)
        throw new Error('Invalid time field: ' + key);
    return `${match[1]}:${match[2]}:${match[3] ?? '00'}.${(match[4] ?? '').padEnd(3, '0')}`;
}
