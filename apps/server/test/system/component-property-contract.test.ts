import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {resolveComponentSettings,validateComponentDefinitions,validateComponentSettings,
 availableComponentSettings,mergeComponentSettings,componentSettingAvailable,type ComponentSettingDefinition} from '../../src/system-support/component-property-contract.js';
import {pageBehaviorSchemas,pagePropertyContract,pagePropertyIssues} from '../../src/system-support/page-property-contract.js';
import {encodeMetadataValue,decodeMetadataValues} from '../../src/system-files/component-runtime.js';
import {writeComponentContract,readComponentContract,validateComponentContract,validatePageComponentContracts} from '../../src/system-support/component-contract-store.js';
import {ComponentLibraryService} from '../../src/system-support/component-library-service.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
const definitions:ComponentSettingDefinition[]=[{propertyKey:'settings',label:'Settings',kind:'GROUP',schemaVersion:1,fields:[
 {propertyKey:'count',label:'Count',kind:'NUMBER',min:0,max:10,defaultValue:3},
 {propertyKey:'enabled',label:'Enabled',kind:'BOOLEAN',defaultValue:true},
 {propertyKey:'text',label:'Text',kind:'TEXT',defaultValue:'Default'}
],defaultValue:{}},{propertyKey:'rows',label:'Rows',kind:'COLLECTION',schemaVersion:1,maxItems:2,fields:[
 {propertyKey:'label',label:'Label',kind:'TEXT',required:true},
 {propertyKey:'width',label:'Width',kind:'NUMBER',defaultValue:4}
]}];
test('recursive defaults preserve explicit false/zero/empty/null and unknown metadata without mutation',()=>{
 const original={settings:{count:0,enabled:false,text:'',extra:'keep'},rows:[{label:'A',old:true}],future:{value:1}};
 const before=structuredClone(original),result=resolveComponentSettings(definitions,original);
 assert.deepEqual(original,before);
 assert.deepEqual(result,{...original,rows:[{label:'A',old:true,width:4}]});
 assert.equal(resolveComponentSettings(definitions,{settings:null}).settings,null);
 const a=resolveComponentSettings(definitions,{}),b=resolveComponentSettings(definitions,{});
 (a.settings as Record<string,unknown>).count=99;
 assert.equal((b.settings as Record<string,unknown>).count,3);
});
test('nested errors report paths and enforce collection limits and types',()=>{
 assert.deepEqual(validateComponentDefinitions(definitions),[]);
 const bad=validateComponentSettings(definitions,{settings:{count:11,enabled:'false'},rows:[{label:''}]});
 assert.deepEqual(bad.map(i=>i.path),['settings.count','settings.enabled','rows.0.label']);
 assert.ok(validateComponentSettings(definitions,{rows:[{}, {}, {}]}).some(i=>i.path==='rows'));
});
test('schemas reject unknown versions, unsafe keys, duplicate identities, bad limits and unbounded nesting',()=>{
 for(const patch of [{propertyKey:'__proto__'},{schemaVersion:2},{maxItems:-1},{devices:['Other']},{sinceVersion:0}])
  assert.ok(validateComponentDefinitions([{...definitions[0],...patch}]).length);
 assert.ok(validateComponentDefinitions([definitions[0],definitions[0]]).length);
 let nested:unknown=[];
 for(let i=0;i<10;i++)nested=[{propertyKey:'group',label:'Group',kind:'GROUP',fields:nested}];
 assert.ok(validateComponentDefinitions(nested).length);
});
test('component schema override, version and device selection do not rewrite saved values',()=>{
 const local={propertyKey:'title',label:'Local',kind:'TEXT' as const,defaultValue:'Local'};
 assert.deepEqual(mergeComponentSettings([{...local,label:'Shared'}],[local]),[local]);
 assert.equal(componentSettingAvailable({...local,devices:['Mobile'],sinceVersion:2},'Desktop',2),false);
 assert.equal(componentSettingAvailable({...local,devices:['Mobile'],sinceVersion:2},'Mobile',1),false);
 assert.equal(componentSettingAvailable({...local,devices:['Mobile'],sinceVersion:2},'Mobile',2),true);
});
test('behaviour fragments share bounded shapes and legacy fields remain intact',()=>{
 for(const d of [...Object.values(pageBehaviorSchemas),pagePropertyContract])assert.deepEqual(validateComponentDefinitions([d]),[]);
 assert.deepEqual(pagePropertyIssues('Custom:une_card',{arbitraryLegacy:{x:1}}),[]);
 assert.ok(pagePropertyIssues('Record Field',{requiredOnLayout:'true'}).length);
 assert.ok(pagePropertyIssues('Field Section',{readOnlyFieldApiNames:[{}]}).length);
 assert.ok(pagePropertyIssues('Custom:une_card',{pagePropertyContract:{version:2}}).length);
 const value={pagePropertyContract:{version:1,tabVisibility:[{tabId:'details',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Phone'}]}}]}};
 assert.deepEqual(pagePropertyIssues('Tabs',value),[]);
 const rows:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(value,'/properties',rows);
 assert.deepEqual(decodeMetadataValues(rows.map(r=>({property_path:r.path,value_kind:r.kind,value_text:r.text}))),{properties:value});
});
function store(){
 const data:Array<{tenant:string;api:string;version:number;property_path:string;value_kind:string;value_text:string|null}>=[];
 const client={query:async(sql:string,p:unknown[])=>{
  if(sql.includes('INSERT INTO md_component_library_contract_properties')){
   data.push({tenant:String(p[0]),api:String(p[1]),version:Number(p[2]),property_path:String(p[3]),value_kind:String(p[4]),value_text:p[5] as string|null});return {rows:[]};
  }
  assert.match(sql,/WHERE tenant_id=\$1 AND component_api=\$2 AND version=\$3/);
  return {rows:data.filter(r=>r.tenant===p[0]&&r.api===p[1]&&r.version===p[2])};
 }} as unknown as Pick<PoolClient,'query'>;
 return {client,data};
}
test('relational contract versions preserve omitted definitions, explicit clear, restore and tenant isolation',async()=>{
 const {client,data}=store();
 const schema={propertyDefinitions:definitions,eventDefinitions:[{apiName:'select',label:'Select'}]};
 await writeComponentContract(client,'tenant-a','Card',1,schema);
 await writeComponentContract(client,'tenant-a','Card',2,{},1);
 assert.deepEqual(await readComponentContract(client,'tenant-a','Card',2),schema);
 await writeComponentContract(client,'tenant-a','Card',3,{propertyDefinitions:[]},2);
 assert.deepEqual((await readComponentContract(client,'tenant-a','Card',3)).propertyDefinitions,[]);
 await writeComponentContract(client,'tenant-a','Card',4,{},1);
 assert.deepEqual(await readComponentContract(client,'tenant-a','Card',4),schema);
 assert.deepEqual(await readComponentContract(client,'tenant-b','Card',4),{});
 assert.ok(data.every(r=>!['json','jsonb'].includes(r.value_kind)));
});
test('page validation reads published tenant schema, never a page-supplied schema',async()=>{
 const {client,data}=store();await writeComponentContract(client,'t','Card',1,{propertyDefinitions:definitions});
 const reader={query:async(sql:string,p:unknown[])=>{
  assert.match(sql,/h.published_version=p.version/);assert.equal(p[0],'t');assert.deepEqual(p[1],['Card']);
  return {rows:data.map(r=>({...r,component_api:r.api}))};
 }} as unknown as Pick<PoolClient,'query'>;
 await assert.rejects(()=>validatePageComponentContracts(reader,'t',[{type:'Custom:Card',properties:{settings:{count:100}}}]),/settings.count/);
 await validatePageComponentContracts(reader,'t',[{type:'Custom:Card',properties:{settings:{count:0},unknown:'preserved'}}]);
});
test('invalid schema/event authoring is rejected before SQL and after RBAC',async()=>{
 assert.throws(()=>validateComponentContract({eventDefinitions:[{apiName:'bad.name',label:'Bad'}]}),/events/);
 let calls=0;
 const db={query:async()=>{calls++;throw Error('SQL not expected');},transaction:async()=>{calls++;throw Error('SQL not expected');}} as unknown as SqlPersistence;
 const rbac={require:async()=>{}} as unknown as RbacEngine;
 const svc=new ComponentLibraryService(db,rbac);
 await assert.rejects(()=>svc.save('t','u',{apiName:'Demo',label:'Demo',description:'',surfaces:['page'],
  resize:{defaultWidth:100,defaultHeight:100,minWidth:1,minHeight:1},jsxSource:'',cssSource:'',publicationStatus:'Draft',
  propertyDefinitions:[{propertyKey:'constructor',label:'Bad',kind:'TEXT'}]}),/Invalid component properties/);
 assert.equal(calls,0);
});

test('publish and restore copy the selected schema version within the component transaction',async()=>{
 const {client:storage}=store();
 await writeComponentContract(storage,'t','Card',1,{propertyDefinitions:definitions});
 await writeComponentContract(storage,'t','Card',2,{propertyDefinitions:[]});
 let current=2,inside=false;
 const client={query:async(sql:string,p:unknown[])=>{
  assert.ok(inside,'schema lifecycle writes must stay inside transaction');
  if(sql.includes('md_component_library_contract_properties'))return storage.query(sql,p);
  if(sql.includes('FOR UPDATE OF h'))return {rows:[{current_version:current}]};
  if(sql.includes('SELECT properties FROM'))return {rows:[{properties:{label:'Card'}}]};
  if(sql.includes('UPDATE md_component_library_heads'))current=Number(p[2]);
  return {rows:[]};
 }} as unknown as PoolClient;
 const db={query:async()=>({rows:[]}),transaction:async(fn:(c:PoolClient)=>Promise<unknown>)=>{
  inside=true;try{return await fn(client);}finally{inside=false;}
 }} as unknown as SqlPersistence;
 const svc=new ComponentLibraryService(db,{require:async()=>{}} as unknown as RbacEngine);
 await svc.publish('t','u','Card');
 assert.deepEqual(await readComponentContract(storage,'t','Card',3),{propertyDefinitions:[]});
 await svc.publish('t','u','Card',1);
 assert.deepEqual(await readComponentContract(storage,'t','Card',4),{propertyDefinitions:definitions});
});
test('nested device and version restrictions apply to defaults and validation together',()=>{
 const all:ComponentSettingDefinition[]=[{propertyKey:'group',label:'Group',kind:'GROUP',defaultValue:{},fields:[
  {propertyKey:'desktop',label:'Desktop',kind:'TEXT',devices:['Desktop'],required:true},
  {propertyKey:'future',label:'Future',kind:'NUMBER',sinceVersion:3,defaultValue:4}
 ]}];
 const active=availableComponentSettings(all,'Mobile',2);
 const values=resolveComponentSettings(active,{group:{legacy:'Keep'}});
 assert.deepEqual(values,{group:{legacy:'Keep'}});
 assert.deepEqual(validateComponentSettings(active,values),[]);
});

test('P1 field and action rules survive metadata encoding, validation and decoding',()=>{
 const properties={pagePropertyContract:{version:1,
  fieldRules:[{fieldApiName:'Name',behavior:'Required',visibilityRules:{logic:'Any',
   conditions:[{source:'Record Permission',operator:'Equals',value:'Edit'},
    {source:'Device',operator:'Equals',value:'Phone'}]}}],
  actionVisibility:[{actionId:'Edit',unavailable:'Disable',when:{logic:'All',
   conditions:[{source:'Record Permission',operator:'Equals',value:'Edit'}]}}]}};
 assert.deepEqual(pagePropertyIssues('Record Field',properties),[]);
 const rows:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(properties,'/properties',rows);
 assert.deepEqual(decodeMetadataValues(rows.map(row=>({
  property_path:row.path,value_kind:row.kind,value_text:row.text
 }))),{properties});
});
