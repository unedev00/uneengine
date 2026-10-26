/** TextField: text metadata descriptor. */
export const TextDefinition = Object.freeze({
    name: 'TextField', dataType: 'text', kind: 'text',
    storage: 'record'
});
export function validateTextField(value, key, maxLength) {
    if (typeof value !== 'string')
        throw new Error('Invalid text field: ' + key);
    if (maxLength !== null && maxLength !== undefined && value.length > maxLength)
        throw new Error('Invalid text length: ' + key);
}
