/** EmailField: email metadata descriptor. */
export const EmailDefinition = Object.freeze({
    name: 'EmailField', dataType: 'email', kind: 'text',
    storage: 'record'
});
export function validateEmailField(value, key) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        throw new Error('Invalid email field: ' + key);
}
