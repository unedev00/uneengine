/** UrlField: url metadata descriptor. */
export const UrlDefinition = Object.freeze({
    name: 'UrlField', dataType: 'url', kind: 'text',
    storage: 'record'
});
export function validateUrlField(value, key) {
    if (!/^https?:\/\/[^\s]+$/i.test(value))
        throw new Error('Invalid URL field: ' + key);
}
