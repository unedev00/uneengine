import test from 'node:test';
import assert from 'node:assert/strict';
import type {FieldMetadata} from '../src/core/metadata/Definitions/metadata';
import {resolveSmartToggleFieldBinding,updateSmartToggleField}
 from '../src/core/pages/PageRuntime/smartToggleFieldBinding';
const fields=[
 {apiName:'IsActive',label:'Active',dataType:'Checkbox'},
 {apiName:'Name',label:'Name',dataType:'Text'},
 {apiName:'Approved',label:'Approved',dataType:'Boolean'}
] as FieldMetadata[];
const rows=[{Id:'record-1',IsActive:true,Approved:false,Name:'Example'}];
const get=(source:string,items:Record<string,unknown>[]=rows,total=items.length,recordId='')=>
 resolveSmartToggleFieldBinding('smart_toggle',{objectApiName:'Product',textSource:source},
  'Product',fields,items,total,recordId);
test('direct Boolean binding reads stored true and false',()=>{
 assert.deepEqual(get('@IsActive'),{ready:true,fieldApiName:'IsActive',recordId:'record-1',value:true});
 assert.equal(get('@Product.Approved')?.value,false);
 assert.equal(get('@Product.IsActive')?.value,true);
 for(const source of ['@Name','@Other.IsActive','@IsActive & "text"','@Product.Parent.Approved'])
  assert.equal(get(source)?.ready,false);
 assert.equal(get('@IsActive',[],0)?.ready,false);
 assert.equal(resolveSmartToggleFieldBinding('smart_text',{textSource:'@IsActive'},'Product',fields,rows,1),undefined);
});
test('ambiguous queries never select the first record for write',()=>{
 const many=[...rows,{Id:'record-2',IsActive:false}];
 assert.equal(get('@IsActive',many,2)?.ready,false);
 assert.equal(get('@IsActive',many,2,'record-2')?.value,false);
 assert.equal(get('@IsActive',many,2,'missing')?.ready,false);
 assert.equal(get('@IsActive',rows,2)?.ready,false);
});
test('Boolean-only writes reuse the permission-checked record endpoint',async()=>{
 const calls:Array<{path:string;method?:string;payload?:unknown}>=[];
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  calls.push({path,method:init?.method,payload:JSON.parse(String(init?.body))});
  return {record:{Id:'record-1',IsActive:false}} as T;
 };
 await updateSmartToggleField(request,'Product',get('@IsActive')!,false);
 assert.deepEqual(calls,[{path:'/records/Product/record-1',method:'PUT',payload:{IsActive:false}}]);
 await assert.rejects(()=>updateSmartToggleField(request,'Product',{ready:false},true));
 assert.equal(calls.length,1);
});
test('unreadable values cannot fall back to a default',()=>{
 assert.equal(get('@IsActive',[{Id:'record-1'}],1)?.ready,false);
 assert.equal(get('@IsActive',[{Id:'record-1',IsActive:null}],1)?.ready,false);
 assert.equal(get('@IsActive',[{Id:'record-1',IsActive:'false'}],1)?.value,false);
});
