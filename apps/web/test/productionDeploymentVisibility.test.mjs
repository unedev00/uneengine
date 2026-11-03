import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('global system popup never hides deployment control after a forbidden status response',()=>{
 const source=readFileSync('apps/web/src/core/workspace/Navigation/appNavigationView.tsx','utf8');
 assert.match(source,/aria-label="Production deployment"/);
 assert.match(source,/<button type="button" className="btn btn-small navigation-deployment-button"/);
 assert.match(source,/Platform Developer deployment permission required/);
 assert.match(source,/deploymentError && <p[^>]+role="alert"/);
 assert.doesNotMatch(source,/\{deployment && <div className="navigation-deployment-control"/);
 assert.doesNotMatch(source,/403\|permission\|denied/);
 assert.doesNotMatch(source,/Open GitHub workflow history/);
 assert.match(source,/Deploy latest to OCI/);
 assert.match(source,/OCI deployment failed at stage/);
 assert.match(source,/PlatformOperations manage permission is missing/);
 assert.match(source,/OneEngine permission set is not assigned/);
 assert.match(source,/Deployment is restricted to the platform tenant/);
 assert.doesNotMatch(source,/Platform Developer deployment permission required/);
 assert.match(source,/OCI deployment/);
 assert.doesNotMatch(source,/GitHub credential is required/);
});
