import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateTenantDocument} from '../../src/system-files/tenant-media-service.js';
import {validateFileAssetField,validateImageAssetField} from '../../src/field-engine/types/ImageAssetField.js';

const ref='asset:00000000-0000-4000-8000-000000000019';
test('tenant PDF media rejects malformed, oversize and non-PDF content',()=>{
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\nendobj\n%%EOF\n');
 assert.deepEqual(validateTenantDocument('application/pdf',pdf.toString('base64')),pdf);
 assert.throws(()=>validateTenantDocument('application/pdf',Buffer.from('not-pdf %%EOF').toString('base64')),
  /Invalid PDF document/);
 assert.throws(()=>validateTenantDocument('application/pdf',pdf.toString('base64')+'A'),
  /Invalid PDF document/);
 assert.throws(()=>validateTenantDocument('text/html',pdf.toString('base64')),/Invalid document/);
});
test('File reference accepts authorised PDF but Image reference requires image MIME',async()=>{
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const query=async(sql:string,args:unknown[])=>{
  calls.push({sql,args});return {rows:[{present:1}],rowCount:sql.includes("application/pdf")?1:0};
 };
 const client={query} as never;
 const rbac={require:async()=>{}} as never;
 assert.equal(await validateFileAssetField(client,rbac,'tenant','user',ref,'Contract'),ref);
 await assert.rejects(()=>validateImageAssetField(client,rbac,'tenant','user',ref,'Preview'),
  /unavailable in this tenant/);
 assert.ok(calls.every(item=>item.args[0]==='tenant'));
 const denied={require:async()=>{throw new Error('Permission denied');}} as never;
 await assert.rejects(()=>validateFileAssetField(client,denied,'tenant','user',ref,'Contract'),
  /Permission denied/);
});
