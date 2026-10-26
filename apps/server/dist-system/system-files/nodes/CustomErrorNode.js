import { createFlowCustomError } from '../flow-error-runtime.js';
/** Preserve the shared Flow error contract and resource interpolation. */
export function executeCustomErrorNode(config, resolveResource) {
    throw createFlowCustomError(config, resolveResource);
}
