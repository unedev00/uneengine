import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';

/** Acetill-owned metadata graphs: no POS-specific Core runtime or SQL business operations. */
const n=(id:number,type:string,label:string,config:Record<string,unknown>={})=>({id,type,label,config});
const e=(from:number,to:number,label='Next')=>({from,to,kind:'normal',label});
const variable=(name:string,dataType='Text',input=false,output=false)=>({
 name,type:'Variable',dataType,...(input?{availableForInput:true}:{}),
 ...(output?{availableForOutput:true}:{})
});
const readSession=n(2,'Get Records','Find current till session',{
 object:'CartSession',recordLimit:'1',outputVariable:'existingSession',
 conditions:[{field:'SessionKey',operator:'Equals',value:'{!sessionKey}'}]});
const sessionChoice=n(3,'Decision','Session exists?',{outcomes:[{
 name:'Found',label:'Found',conditionLogic:'All',
 conditions:[{field:'{!existingSession}',operator:'IsNotNull'}]}]});
const basket=(id:number)=>n(id,'Get Records','Retrieve basket lines',{
 object:'CartLine',recordLimit:'all',outputVariable:'cartItems',
 conditions:[{field:'CartSession',operator:'Equals',value:'{!cartSessionId}'}]});
const summaries=(begin:number)=>({
 elements:[
  n(begin,'Assignment','Clear subtotal',{variable:'subtotal',operator:'Assign',value:0}),
  n(begin+1,'Loop','Iterate sale lines',{collection:'cartItems',loopVariable:'cartLine'}),
  n(begin+2,'Assignment','Add line amount',{variable:'subtotal',operator:'Add',value:'{!calculatedLineTotal}'}),
  n(begin+3,'Assignment','Save total',{variable:'total',operator:'Assign',value:'{!subtotal}'})
 ],
 links:[e(begin,begin+1),e(begin+1,begin+2,'For Each'),
  e(begin+2,begin+1),e(begin+1,begin+3,'After Last')]
});
const resources=[
 variable('sessionKey','Text',true),variable('cartSessionId','Text',false,true),
 {name:'existingSession',type:'Record',dataType:'CartSession'},
 {name:'cartItems',type:'Record Collection',dataType:'CartLine',availableForOutput:true},
 {name:'cartLine',type:'Record',dataType:'CartLine'},
 {name:'calculatedLineTotal',type:'Formula',dataType:'Number',
  value:'cartLine.Quantity * cartLine.UnitPrice'},
 variable('subtotal','Number',false,true),variable('total','Number',false,true)
];
const graph=(apiName:string,label:string,elements:ReturnType<typeof n>[],
 connectors:ReturnType<typeof e>[],extraResources:object[]=[])=>({
 apiName,label,appApiName:'Acetill',flowType:'Autolaunched Flow',status:'Active',version:1,
 startConfig:{executionContext:'User'},elements,connectors,
 resources:[...resources,...extraResources],tests:[]
});
const addTotal=summaries(10);
export const copilotAddProduct=graph('AcetillCopilotAddProduct','Till: add authorised product',[
 n(1,'Start','Start'),readSession,sessionChoice,
 n(4,'Assignment','Use current session',{variable:'cartSessionId',operator:'Assign',value:'{!existingSession.Id}'}),
 n(5,'Create Records','Open basket session',{
  object:'CartSession',recordSource:'fields',resultVariable:'cartSessionId',
  uniqueInputGuard:{field:'SessionKey'},
  fieldValues:[{field:'Name',value:'Till basket'},{field:'SessionKey',value:'{!sessionKey}'},
   {field:'Status',value:'Open'}]}),
 n(6,'Get Records','Load authoritative product',{
  object:'Product',recordLimit:'1',outputVariable:'product',
  conditions:[{field:'Id',operator:'Equals',value:'{!productId}'},
   {field:'Active',operator:'Equals',value:true}]}),
 n(7,'Decision','Product eligible?',{outcomes:[{name:'Valid',label:'Valid',conditionLogic:'All',
  conditions:[{field:'{!product}',operator:'IsNotNull'},
   {field:'{!product.Price}',operator:'GreaterThanOrEqualTo',value:0}]}]}),
 n(8,'Create Records','Add basket line',{object:'CartLine',recordSource:'fields',
  resultVariable:'cartLineId',fieldValues:[
   {field:'CartSession',value:'{!cartSessionId}'},{field:'Product',value:'{!product.Id}'},
   {field:'Name',value:'{!product.Name}'},{field:'Quantity',value:1},
   {field:'UnitPrice',value:'{!product.Price}'},
   {field:'OriginalUnitPrice',value:'{!product.Price}'},
   {field:'LineTotal',value:'{!product.Price}'}]}),
 basket(9),...addTotal.elements,
 n(14,'Custom Error','Unavailable product',{errorLocation:'Page',
  errorMessage:'Select an active product with a valid price.'}),
 n(15,'End','Basket updated')
],[
 e(1,2),e(2,3),e(3,4,'Found'),e(3,5,'Default'),e(4,6),e(5,6),
 e(6,7),e(7,8,'Valid'),e(7,14,'Default'),e(8,9),e(9,10),
 ...addTotal.links,e(13,15)
],[variable('productId','Text',true),{name:'product',type:'Record',dataType:'Product'},
 variable('cartLineId','Text',false,true)]);
const readTotal=summaries(6);
export const copilotReadCart=graph('AcetillCopilotReadCart','Till: read current session and total',[
 n(1,'Start','Start'),readSession,sessionChoice,
 n(4,'Assignment','Use current session',{variable:'cartSessionId',operator:'Assign',value:'{!existingSession.Id}'}),
 basket(5),...readTotal.elements,n(10,'End','Basket loaded')
],[e(1,2),e(2,3),e(3,4,'Found'),e(3,10,'Default'),
 e(4,5),e(5,6),...readTotal.links,e(9,10)]);
const qtyTotal=summaries(11);
export const copilotChangeQuantity=graph('AcetillCopilotChangeQuantity','Till: change authorised basket quantity',[
 n(1,'Start','Start'),readSession,sessionChoice,
 n(4,'Assignment','Current session',{variable:'cartSessionId',operator:'Assign',value:'{!existingSession.Id}'}),
 n(5,'Get Records','Read this session line',{
  object:'CartLine',recordLimit:'1',outputVariable:'selectedLine',
  conditions:[{field:'Id',operator:'Equals',value:'{!cartLineId}'},
   {field:'CartSession',operator:'Equals',value:'{!cartSessionId}'}]}),
 n(6,'Decision','Line and delta authorised?',{outcomes:[{
  name:'Valid',label:'Valid',conditionLogic:'All',conditions:[
   {field:'{!selectedLine}',operator:'IsNotNull'},
   {field:'{!delta}',operator:'GreaterThanOrEqualTo',value:-1},
   {field:'{!delta}',operator:'LessThanOrEqualTo',value:1}]}]}),
 n(7,'Decision','Positive remaining quantity?',{outcomes:[{
  name:'Keep',label:'Keep',conditionLogic:'All',
  conditions:[{field:'{!nextQuantity}',operator:'GreaterThan',value:0}]}]}),
 n(8,'Update Records','Adjust quantity',{object:'CartLine',recordId:'{!selectedLine.Id}',
  fieldValues:[{field:'Quantity',value:'{!nextQuantity}'},
   {field:'LineTotal',value:'{!nextLineTotal}'}]}),
 n(9,'Delete Records','Remove zero-quantity line',{object:'CartLine',recordId:'{!selectedLine.Id}'}),
 basket(10),...qtyTotal.elements,
 n(15,'Custom Error','Invalid adjustment',{errorLocation:'Page',
  errorMessage:'Quantity change was not authorised.'}),
 n(16,'End','Quantity updated')
],[e(1,2),e(2,3),e(3,4,'Found'),e(3,15,'Default'),e(4,5),e(5,6),
 e(6,7,'Valid'),e(6,15,'Default'),e(7,8,'Keep'),e(7,9,'Default'),
 e(8,10),e(9,10),e(10,11),...qtyTotal.links,e(14,16)
],[variable('cartLineId','Text',true),variable('delta','Number',true),
 {name:'selectedLine',type:'Record',dataType:'CartLine'},
 {name:'nextQuantity',type:'Formula',dataType:'Number',value:'selectedLine.Quantity + delta'},
 {name:'nextLineTotal',type:'Formula',dataType:'Number',value:'nextQuantity * selectedLine.UnitPrice'}]);
export const copilotDefaultCategory=graph('AcetillCopilotDefaultCategory','Till: choose available POS category',[
 n(1,'Start','Start'),
 n(2,'Get Records','Read active POS category',{
  object:'MenuCategory',recordLimit:'1',outputVariable:'firstCategory',
  conditions:[{field:'Active',operator:'Equals',value:true},
   {field:'IsVisiblePOS',operator:'Equals',value:true}]}),
 n(3,'Decision','POS category exists?',{outcomes:[{
  name:'Found',label:'Found',conditionLogic:'All',
  conditions:[{field:'{!firstCategory}',operator:'IsNotNull'}]}]}),
 n(4,'Assignment','Set first category',{
  variable:'categoryId',operator:'Assign',value:'{!firstCategory.Id}'}),
 n(5,'End','Category ready')
],[e(1,2),e(2,3),e(3,4,'Found'),e(3,5,'Default'),e(4,5)],
 [{name:'firstCategory',type:'Record',dataType:'MenuCategory'},
  variable('categoryId','Text',false,true)]);
export const copilotVerifyPin={
 apiName:'AcetillCopilotVerifyPin',label:'Verify cashier PIN securely',
 appApiName:'Acetill',flowType:'Screen Flow',status:'Active',version:1,
 startConfig:{executionContext:'User'},
 elements:[
  n(1,'Start','Start'),
  n(2,'Screen','Verify cashier PIN',{fields:[{
   name:'pin',apiName:'pin',label:'Enter till PIN',type:'Password',
   required:true,minLength:4,maxLength:12}]}),
  n(3,'Subflow','Verify with existing cashier policy',{
   flowApiName:'AcetillVerifyUserPin',
   inputValues:'pin={!pin}',outputValues:'verified=verified'}),
  n(4,'Decision','Correct PIN?',{outcomes:[{
   name:'Verified',label:'Verified',conditionLogic:'All',
   conditions:[{field:'{!verified}',operator:'Equals',value:true}]}]}),
  n(5,'End','PIN verified'),
  n(6,'Custom Error','Invalid cashier PIN',{
   errorLocation:'Page',errorMessage:'Incorrect till PIN.'})
 ],
 connectors:[e(1,2),e(2,3),e(3,4),e(4,5,'Verified'),e(4,6,'Default')],
 resources:[variable('pin'),variable('verified','Boolean',false,true)],tests:[]
};
export const copilotPosGraphs=[copilotAddProduct,copilotReadCart,copilotChangeQuantity,copilotDefaultCategory,copilotVerifyPin];

/** Only Acetill's independent seeder writes graphs; skip existing versions. */
export async function seedAcetillCopilotPosFlows(client:Pick<PoolClient,'query'>,tenant:string){
 const prerequisites=await client.query<{object_api:string;api_name:string}>(
  "SELECT object_api,api_name FROM md_field_definitions WHERE tenant_id=$1 AND object_api IN ('Product','CartSession','CartLine','MenuCategory')",[tenant]);
 const required=['MenuCategory.Active','MenuCategory.IsVisiblePOS','Product.Name','Product.Price','Product.Active','CartSession.SessionKey',
  'CartSession.Name','CartSession.Status','CartLine.CartSession','CartLine.Product',
  'CartLine.Name','CartLine.Quantity','CartLine.UnitPrice',
  'CartLine.OriginalUnitPrice','CartLine.LineTotal'];
 const available=new Set(prerequisites.rows.map(r=>r.object_api+'.'+r.api_name));
 if(required.some(name=>!available.has(name)))return 0;
 let count=0;
 for(const flow of copilotPosGraphs){
  const found=await client.query("SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2",
   [tenant,flow.apiName]);
  if(found.rowCount)continue;
  const result=await client.query<{id:string}>(
   "INSERT INTO md_flow_definitions(tenant_id,api_name,label,flow_type,version,active) VALUES($1,$2,$3,$4,1,true) RETURNING id",
   [tenant,flow.apiName,flow.label,flow.flowType]);
  const encoded:Array<{path:string;kind:string;text:string|null}>=[];
  encodeMetadataValue(flow,'/builder',encoded);
  for(const prop of encoded)
   await client.query("INSERT INTO md_flow_editor_values(tenant_id,flow_id,property_path,value_kind,value_text) VALUES($1,$2,$3,$4,$5)",
    [tenant,result.rows[0].id,prop.path,prop.kind,prop.text]);
  count++;
 }
 return count;
}
