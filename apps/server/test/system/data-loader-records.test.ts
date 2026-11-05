import test from 'node:test';
import assert from 'node:assert/strict';
import {registerDataLoaderRecordRoutes} from '../../src/system-support/data-loader-records.js';
import {writeLoaderWorkbook} from '../../src/system-support/metadata-loader-xlsx.js';

test('Universal Data Loader imports 26 named lookup rows as real relationship UUIDs',async()=>{
 const routes=new Map<string,(req:never,res:never,next:(error?:Error)=>void)=>void>();
 const app={post:(path:string,handler:(req:never,res:never,next:(error?:Error)=>void)=>void)=>{
  routes.set(path,handler);
 }};
 const parent='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const created:Record<string,unknown>[]=[];
 const records={create:async(_tenant:string,_actor:string,_object:string,values:Record<string,unknown>)=>{
  created.push(values);
  return 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 }};
 const db={query:async(sql:string,params:unknown[])=>{
  assert.match(sql,/md_record_access/);
  assert.deepEqual(params,['tenant-1','MealChoiceGroup','Lunch','actor-1']);
  return {rows:[{id:parent}],rowCount:1};
 }};
 const definitions={get:async()=>({fields:[
  {apiName:'Name',dataType:'Text',required:true},
  {apiName:'ChoiceGroup',dataType:'Lookup',required:true,relationship:{targetObject:'MealChoiceGroup'}}
 ]})};
 const rbac={require:async()=>{},allowed:async()=>true};
 registerDataLoaderRecordRoutes(app as never,db as never,records as never,
  definitions as never,rbac as never,{} as never);
 const workbook=writeLoaderWorkbook([{name:'Records',
  columns:['Action','Id','Name','ChoiceGroup'],
  rows:Array.from({length:26},(_,i)=>({Action:'Create',Id:'',Name:'Option '+i,ChoiceGroup:'Lunch'}))
 }]).toString('base64');
 const call=async(path:string,body:Record<string,unknown>)=>new Promise<Record<string,any>>((resolve,reject)=>{
  const route=routes.get(path);if(!route)return reject(new Error('Route not registered: '+path));
  const req={actor:{tenant_id:'tenant-1',user_id:'actor-1'},body};
  const res={set:()=>res,json:(value:Record<string,any>)=>{resolve(value);return res;}};
  route(req as never,res as never,reject);
 });
 const input={objectApi:'MealChoiceOption',workbook};
 const preview=await call('/api/data-loader/records/validate',input);
 assert.deepEqual(preview.summary,{total:26,valid:26,success:0,error:0,skipped:0});
 const result=await call('/api/data-loader/records/execute',{
  ...input,digest:preview.digest,confirmation:'PROCEED_EXCLUDING_ERRORS'
 });
 assert.deepEqual(result.summary,{total:26,valid:0,success:26,error:0,skipped:0});
 assert.equal(created.length,26);
 assert.ok(created.every(row=>row.ChoiceGroup===parent));
});
