export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const scalar = (value) => value === null || typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean';
export function template(value, resolve) {
    if (typeof value !== 'string')
        throw new Error('Notification values must be text');
    return value.replace(/\{!([A-Za-z_$][A-Za-z0-9_$.]*)\}/g, (_match, reference) => {
        const resolved = resolve('{!' + reference + '}');
        if (resolved !== null && resolved !== undefined && !scalar(resolved))
            throw new Error('Notification template references a non-scalar resource');
        return resolved === null || resolved === undefined ? '' : String(resolved);
    });
}
