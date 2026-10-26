import { registerMetadataPackageRoutes } from '../system-support/metadata-package-service.js';
/** Delegate to the existing SQL/RBAC-checked package API, without new routes. */
export function registerPackageApiController(app, service) {
    registerMetadataPackageRoutes(app, service);
}
