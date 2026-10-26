import { registerObjectApiController } from './ObjectApiController.js';
import { registerMetadataApiController } from './MetadataApiController.js';
import { registerFlowApiController } from './FlowApiController.js';
import { registerPageApiController } from './PageApiController.js';
/** Existing dynamic routes, preserved with the original API paths and tenant guards. */
export function registerDynamicApiRoutes(app, db, rbac, records, flows) {
    registerFlowApiController(app, db, rbac, flows);
    registerObjectApiController(app, records);
    registerMetadataApiController(app, db, rbac, records);
    registerPageApiController(app, db, rbac);
}
