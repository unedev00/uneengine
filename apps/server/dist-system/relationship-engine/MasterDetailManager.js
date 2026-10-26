import { assertMasterDetailReparenting } from '../field-engine/types/MasterDetailField.js';
/** Master-detail reparenting policy delegates to the same field validator. */
export function enforceMasterDetailReparenting(previous, next, key, allowReparenting) {
    assertMasterDetailReparenting(previous, next, key, allowReparenting);
}
