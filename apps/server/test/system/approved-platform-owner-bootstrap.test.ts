import {readRetiredMigration} from '../../../../scripts/read-retired-migration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readRetiredMigration('20261128-approved-oci-platform-owner.sql');
test('OCI owner approval is a one-time SQL assignment, never a runtime bypass',()=>{
 assert.match(sql,/md_platform_deployment_owner_receipts/);
 assert.match(sql,/SELECT count\(\*\) FROM md_tenants\) <> 1/);
 assert.match(sql,/d\.domain='unesolutions\.co\.uk'/);
 assert.match(sql,/sha256\(convert_to\(lower\(u\.email\)/);
 assert.match(sql,/md_permission_assignments a/);
 assert.match(sql,/p\.api_name='OneEngine'/);
 assert.match(sql,/md_rbac_allowed\(u\.tenant_id,u\.id,'Tenant','manage'\)/);
 assert.match(sql,/PlatformDeveloper/);
 assert.match(sql,/'PlatformOperations','manage','allow'/);
 assert.match(sql,/md_security_events/);
 assert.match(sql,/bootstrap-granted/);
 assert.match(sql,/policy_effect IS DISTINCT FROM 'allow'/);
 assert.match(sql,/ON CONFLICT.*DO NOTHING/);
 assert.doesNotMatch(sql,/@gmail|@unesolutions|\*','\*'|DELETE FROM md_permission|UPDATE md_permission_rules/);
});
