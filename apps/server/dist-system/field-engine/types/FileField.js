/** FileField: shared attachment/media service metadata descriptor. */
export const FileDefinition = Object.freeze({
    name: 'FileField', dataType: null, kind: 'attachment',
    storage: 'file-service'
});
// File operations retain the shared SQL/RBAC-protected file service.
export async function loadFileFieldService() { return import('../../system-files/record-file-service.js'); }
