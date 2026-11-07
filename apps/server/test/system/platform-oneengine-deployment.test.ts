import {readRetiredMigration} from '../../../../scripts/read-retired-migration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {seedPlatformOneEngineDeploymentPermission} from '../../src/app-seeders/platform-oneengine-deployment.js';

const migration=readRetiredMigration('20261129-oneengine-oci-deployment.sql');

test('migration grants platform operations only to canonical platform OneEngine without overwriting deny',()=>{
 assert.match(migration,/p\.api_name='OneEngine'/);
 assert.match(migration,/d\.domain='unesolutions\.co\.uk'/);
 assert.match(migration,/t\.status='ACTIVE'/);
 assert.match(migration,/'PlatformOperations','manage','allow'/);
 assert.match(migration,/ON CONFLICT.*DO NOTHING/);
 assert.doesNotMatch(migration,/UPDATE md_permission_rules|DELETE FROM|PlatformDeveloper/);
 assert.match(migration,/md_security_events/);
});
test('startup seeder is idempotent and creates no extra platform permission set',async()=>{
 const calls:string[]=[];
 const db={query:async(sql:string)=>{
  calls.push(sql);
  return {rows:calls.length===1?[{tenant_id:'platform'}]:[]};
 }} as unknown as Pick<SqlPersistence,'query'>;
 assert.equal(await seedPlatformOneEngineDeploymentPermission(db),1);
 assert.equal(await seedPlatformOneEngineDeploymentPermission(db),0);
 assert.ok(calls.every(sql=>sql.includes("p.api_name='OneEngine'")));
 assert.ok(calls.every(sql=>sql.includes("d.domain='unesolutions.co.uk'")));
 assert.ok(calls.every(sql=>sql.includes('ON CONFLICT')&&sql.includes('DO NOTHING')));
 assert.ok(calls.every(sql=>!sql.includes('INSERT INTO md_permission_sets')));
 assert.ok(calls.every(sql=>sql.includes('md_security_events')));
});
