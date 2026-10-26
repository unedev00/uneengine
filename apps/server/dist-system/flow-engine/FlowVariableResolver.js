export function isFlowScalar(value) {
    return value === null || typeof value === 'string' || typeof value === 'boolean'
        || typeof value === 'number' && Number.isFinite(value);
}
export function flowScalarText(value) {
    if (value === null)
        return { text: null, type: 'null' };
    return { text: String(value), type: typeof value };
}
export function parseFlowScalar(text, type) {
    if (type === 'null')
        return null;
    if (type === 'boolean')
        return text === 'true';
    if (type === 'number') {
        const parsed = Number(text);
        if (!Number.isFinite(parsed))
            throw new Error('Invalid Flow number');
        return parsed;
    }
    if (type === 'text' || type === 'string')
        return text ?? '';
    throw new Error('Unsupported Flow property type');
}
