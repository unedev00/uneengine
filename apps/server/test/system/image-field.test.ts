import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateImageAssetField} from '../../src/field-engine/types/ImageAssetField.js';

const image='asset:00000000-0000-4000-8000-000000000019';

test('Image field uses tenant-scoped asset lookup and OneEngine File read grant',async()=>{
 const calls:Array<{sql:string;args:unknown[]}>=[],grants:string[]=[];
 const client={query:async(sql:string,args:unknown[])=>{
  calls.push({sql,args});return {rowCount:1,rows:[{'?column?':1}]};
 }} as never;
 const rbac={require:async(_t:string,_u:string,resource:string,action:string)=>{
  grants.push(resource+':'+action);
 }} as never;
 assert.equal(await validateImageAssetField(client,rbac,'tenant-a','actor-a',image,'Photo'),image);
 assert.deepEqual(grants,['Files:read']);
 assert.deepEqual(calls[0].args,['tenant-a',image.slice(6)]);
 assert.match(calls[0].sql,/FROM md_tenant_media_assets WHERE tenant_id=\$1 AND id=\$2/);
});

test('Image field denies external URLs, other-tenant references and unreadable assets',async()=>{
 const calls:string[]=[];
 const absent={query:async(sql:string)=>{calls.push(sql);return {rows:[],rowCount:0};}} as never;
 const allowed={require:async()=>{}} as never;
 await assert.rejects(()=>validateImageAssetField(absent,allowed,'tenant-a','actor',image,'Photo'),
  /unavailable in this tenant/);
 await assert.rejects(()=>validateImageAssetField(absent,allowed,'tenant-a','actor','https://example.com/photo','Photo'),
  /requires a tenant media asset/);
 assert.equal(calls.length,1);
 const denied={require:async()=>{throw new Error('Permission denied');}} as never;
 await assert.rejects(()=>validateImageAssetField(absent,denied,'tenant-a','actor',image,'Photo'),
  /Permission denied/);
 assert.equal(calls.length,1,'denial must occur before asset query');
});
