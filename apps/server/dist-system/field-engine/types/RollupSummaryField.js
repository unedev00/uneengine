/** RollupSummaryField: rollup metadata descriptor. */
export const RollupSummaryDefinition = Object.freeze({
    name: 'RollupSummaryField', dataType: 'rollup', kind: 'computed',
    storage: 'record'
});
/** Render persisted SQL rollup values without a second aggregation engine. */
export function readRollupSummaryField(sourceType, dateValue, dateTimeValue, numberValue) {
    if (sourceType === 'date')
        return dateValue;
    if (sourceType === 'datetime')
        return dateTimeValue === null ? null : new Date(dateTimeValue).toISOString();
    return numberValue === null ? null : Number(numberValue);
}
