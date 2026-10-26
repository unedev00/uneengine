import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerFieldExactIndexRoutes} from '../../src/system-support/field-exact-index-routes.js';

type Handler=(req:unknown,res:unknown,next:(error:unknown)=>void)=>void;
const setup=(db:unknown,rbac:unknown)=>{
 const handlers=new Map<string,Handler>();
 const app={get:(path:string,fn:Handler)=>{handlers.set('GET '+path,fn)},
  put:(path:string,fn:Handler)=>{handlers.set('PUT '+path,fn)}} as never;
 registerFieldExactIndexRoutes(app,db as never,rbac as never);
 const invoke=(key:string,req:unknown)=>new Promise<unknown>((resolve,reject)=>{
  const handler=handlers.get(key);
  if(!handler)throw Error('Missing expected field-index route');
  handler(req,{setHeader:()=>undefined,json:(result:unknown)=>resolve(result)},reject);
 });
 return {invoke};
};
const actor={tenant_id:'tenant-a',user_id:'user-a'};
const indexPath='/api/metadata/objects/:objectApi/field-indexes';
test('field index metadata list conceals unreadable Fields',async()=>{
 const db={query:async()=>({rows:[
  {field_api:'Name',label:'Name',enabled:true,revision:1},
  {field_api:'Private',label:'Private',enabled:true,revision:2}
 ]})};
 const rbac={require:async()=>undefined,
  allowed:async(_t:string,_u:string,resource:string)=>resource!=='Contact.Private'};
 const {invoke}=setup(db,rbac);
 const result=await invoke('GET '+indexPath,{actor,params:{objectApi:'Contact'}});
 assert.deepEqual(result,{indexes:[{fieldApi:'Name',label:'Name',enabled:true,revision:1}]});
});
test('index preference writes fail before SQL when OneEngine manage permission is denied',async()=>{
 let touched=false;
 const db={query:async()=>{touched=true;throw Error('Unexpected SQL')},
  transaction:async()=>{touched=true;throw Error('Unexpected SQL')}};
 const rbac={require:async(_t:string,_u:string,resource:string)=>{
  if(resource==='FieldDefinition')throw Error('Permission denied');
 }};
 const {invoke}=setup(db,rbac);
 await assert.rejects(()=>invoke('PUT '+indexPath+'/:fieldApi',{
  actor,params:{objectApi:'Contact',fieldApi:'Name'},
  body:{enabled:true,revision:0}
 }),/Permission denied/);
 assert.equal(touched,false);
});
test('stale index revision cannot mutate SQL settings',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string)=>{
  queries.push(sql);
  if(sql.includes('FROM md_field_definitions'))return {rowCount:1,rows:[{one:1}]};
  if(sql.includes('FROM md_field_exact_indexes')&&sql.includes('FOR UPDATE'))
   return {rows:[{revision:2,enabled:true}],rowCount:1};
  return {rows:[],rowCount:0};
 }};
 const db={transaction:async(cb:(client:unknown)=>Promise<unknown>)=>cb(client)};
 const rbac={require:async()=>undefined};
 const {invoke}=setup(db,rbac);
 await assert.rejects(()=>invoke('PUT '+indexPath+'/:fieldApi',{
  actor,params:{objectApi:'Contact',fieldApi:'Name'},
  body:{enabled:false,revision:1}
 }),/revision conflict/);
 assert.ok(!queries.some(sql=>sql.includes('UPDATE md_field_exact_indexes')
  ||sql.includes('INSERT INTO md_field_exact_index_history')));
});
