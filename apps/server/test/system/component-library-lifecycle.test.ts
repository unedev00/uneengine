import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
import {ComponentLibraryService} from '../../src/system-support/component-library-service.js';
import {compileTenantComponent} from '../../src/system-support/component-library-compiler.js';

const sample={apiName:'DemoComponent',label:'Demo',description:'',
 surfaces:['page','dashboard'],resize:{defaultWidth:6,defaultHeight:4,minWidth:2,minHeight:2},
 jsxSource:'export default function Demo(){return null}',cssSource:'',publicationStatus:'Draft'};
test('component definitions are validated before any database write',async()=>{
 let queries=0;
 const db={query:async()=>{queries++;throw Error('Unexpected SQL');},transaction:async()=>{queries++;throw Error('Unexpected SQL');}} as unknown as SqlPersistence;
 const rbac={require:async()=>{}} as unknown as RbacEngine;
 const svc=new ComponentLibraryService(db,rbac);
 await assert.rejects(()=>svc.save('t','u',{...sample,compiledJs:'untrustedCode'}),/Compiled code/);
 await assert.rejects(()=>svc.save('t','u',{...sample,surfaces:['page','page']}),/Invalid component/);
 await assert.rejects(()=>svc.save('t','u',{...sample,jsxSource:'export default function Demo( {'}),/Transform failed/);
 await assert.rejects(()=>svc.publish('t','u','invalid path',1),/Invalid component version/);
 assert.equal(queries,0);
});
test('tenant component source is compiled for the isolated renderer without imports',async()=>{
 const compiled=await compileTenantComponent('export default function Demo(){return <button>Ready</button>}');
 assert.match(compiled,/module\.exports/);
 assert.match(compiled,/React\.createElement/);
 await assert.rejects(()=>compileTenantComponent('import React from "react"; export default function Demo(){return null}'),/cannot import external modules/);
 await assert.rejects(()=>compileTenantComponent('function Demo(){return null}'),/must export a default React component/);
});
test('component listing serves the published renderer while retaining the current draft and rollback revisions',async()=>{
 const versions=[
  {component_api:'DemoComponent',current_version:2,published_version:1,version:1,state:'Published',
   properties:{...sample,jsxSource:'export default function Demo(){return <button>Ready</button>}',publicationStatus:undefined},
   created_at:new Date('2026-01-01T00:00:00Z')},
  {component_api:'DemoComponent',current_version:2,published_version:1,version:2,state:'Draft',
   properties:{...sample,label:'Draft Demo',jsxSource:'export default function Demo(){return <button>Draft</button>}',publicationStatus:undefined},
   created_at:new Date('2026-01-02T00:00:00Z')}
 ];
 const db={query:async(sql:string)=>{
  if(sql.includes('SELECT h.component_api'))return {rows:versions};
  if(sql.includes('md_component_library_contract_properties'))return {rows:[]};
  throw Error('Unexpected SQL');
 }} as unknown as SqlPersistence;
 const rbac={require:async()=>{}} as unknown as RbacEngine;
 const [component]=await new ComponentLibraryService(db,rbac).list('tenant','user');
 assert.ok(component);
 assert.equal(component.version,1);
 assert.equal(component.status,'Published');
 assert.match(component.compiledJs,/Ready/);
 assert.equal(component.pendingDraft?.version,2);
 assert.match(component.pendingDraft?.compiledJs??'',/Draft/);
 assert.deepEqual(component.revisions?.map(revision=>revision.version),[2,1]);
});
test('component lifecycle requires OneEngine permissions before SQL',async()=>{
 let queries=0;
 const db={query:async()=>{queries++;return {rows:[]};},transaction:async()=>{queries++;}} as unknown as SqlPersistence;
 const rbac={require:async()=>{throw Error('Permission denied');}} as unknown as RbacEngine;
 const svc=new ComponentLibraryService(db,rbac);
 await assert.rejects(()=>svc.list('t','u'),/Permission denied/);
 await assert.rejects(()=>svc.save('t','u',sample),/Permission denied/);
 await assert.rejects(()=>svc.publish('t','u','DemoComponent'),/Permission denied/);
 await assert.rejects(()=>svc.remove('t','u','DemoComponent'),/Permission denied/);
 assert.equal(queries,0);
});
