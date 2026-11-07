import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';

/** Installed only for Acetill tenants. Never replace tenant-authored flows. */
type Node={id:number;type:string;label:string;config:Record<string,unknown>};
const node=(id:number,type:string,label:string,config:Record<string,unknown>={}):Node=>({id,type,label,config});
const edge=(from:number,to:number,label='Next')=>({from,to,kind:'normal',label});
const input=(name:string,dataType='Text')=>({name,type:'Variable',dataType,availableForInput:true});
const output=(name:string,dataType='Text')=>({name,type:'Variable',dataType,availableForOutput:true});
const collection=(name:string,object:string,inbound=false)=>({name,type:'Record Collection',dataType:object,...(inbound?{availableForInput:true}:{availableForOutput:true})});
const graph=(apiName:string,label:string,elements:Node[],connectors:ReturnType<typeof edge>[],resources:object[])=>({
 apiName,label,appApiName:'Acetill',flowType:'Autolaunched Flow',status:'Active',version:1,
 elements,connectors,resources,tests:[]
});
const hold=graph('AcetillHoldCart','Hold active cart without cloning lines',[
 node(1,'Start','Start',{executionContext:'User'}),
 node(2,'Get Records','Read my open cart',{object:'Cart',recordLimit:'1',outputVariable:'cart',
  conditions:[{field:'Id',operator:'Equals',value:'{!cartId}'},
   {field:'UserId',operator:'Equals',value:'{!$User.Id}'},
   {field:'Status',operator:'Equals',value:'Open'}]}),
 node(3,'Decision','Cart found?',{outcomes:[{name:'Found',label:'Found',conditionLogic:'All',
  conditions:[{field:'{!cart}',operator:'IsNotNull'}]}]}),
 node(4,'Assignment','Assign hold reference',{variable:'holdReference',value:'{!requestId}',operator:'Assign'}),
 node(5,'Update Records','Hold selected cart',{object:'Cart',recordId:'{!cart.Id}',
  fieldValues:[{field:'HoldReference',value:'{!holdReference}'},{field:'HoldLabel',value:'{!label}'},
   {field:'Status',value:'Held'},{field:'HeldBy',value:'{!$User.Id}'}]}),
 node(6,'End','Cart held',{}),
 node(7,'Custom Error','Cannot hold unowned cart',{errorLocation:'Page',
  errorMessage:'Select your open cart before placing it on hold.'})
],[edge(1,2),edge(2,3),edge(3,4,'Found'),edge(3,7,'Default'),edge(4,5),edge(5,6),edge(7,6)],[
 input('cartId'),input('requestId'),input('label'),
 output('holdReference'),{name:'cart',type:'Record',dataType:'Cart'}
]);
const list=graph('AcetillListHeldCarts','List my held sales',[
 node(1,'Start','Start',{executionContext:'User'}),
 node(2,'Get Records','My held carts',{object:'Cart',recordLimit:'all',outputVariable:'records',
  conditions:[{field:'Status',operator:'Equals',value:'Held'},
   {field:'UserId',operator:'Equals',value:'{!$User.Id}'}]}),
 node(3,'End','Done',{})
],[edge(1,2),edge(2,3)],[collection('records','Cart')]);
const resume=graph('AcetillResumeHeldCart','Resume a held sale',[
 node(1,'Start','Start',{executionContext:'User'}),
 node(2,'Get Records','Find my held cart',{object:'Cart',recordLimit:'1',outputVariable:'heldCart',
  conditions:[{field:'HoldReference',operator:'Equals',value:'{!holdReference}'},
   {field:'Status',operator:'Equals',value:'Held'},
   {field:'UserId',operator:'Equals',value:'{!$User.Id}'}]}),
 node(3,'Decision','Cart found?',{outcomes:[{name:'Resume',label:'Resume',conditionLogic:'All',
  conditions:[{field:'{!heldCart}',operator:'IsNotNull'}]}]}),
 node(4,'Get Records','Retrieve cart lines',{object:'CartLine',recordLimit:'all',
  outputVariable:'records',requireNonEmpty:true,conditions:[{field:'Cart',operator:'Equals',value:'{!heldCart.Id}'}],
  referenceEnrichments:[{referenceField:'Product',object:'Product',fields:{ProductId:'Id',Name:'Name',Price:'Price',AgeRestricted:'AgeRestricted',MinimumAge:'MinimumAge'}}]}),
 node(5,'Update Records','Release held cart',{object:'Cart',recordId:'{!heldCart.Id}',
  fieldValues:[{field:'Status',value:'Open'}]}),
 node(6,'Assignment','Mark completed',{variable:'status',value:'completed'}),
 node(8,'Assignment','Activate selected cart',{variable:'cartId',value:'{!heldCart.Id}',operator:'Assign'}),
 node(7,'End','Done',{})
],[edge(1,2),edge(2,3),edge(3,4,'Resume'),edge(3,7,'Default'),edge(4,5),edge(5,6),edge(6,8),edge(8,7)],[
 input('holdReference'),input('requestId'),output('status'),output('cartId'),collection('records','CartLine'),
 {name:'heldCart',type:'Record',dataType:'Cart'}
]);
export const acetillCartGraphs=[hold,list,resume] as const;
export async function seedAcetillCartFlows(client:PoolClient,tenantId:string):Promise<number>{
 const objects=await client.query<{api_name:string}>(`SELECT api_name FROM md_object_definitions
 WHERE tenant_id=$1 AND api_name IN ('Cart','CartLine')`,[tenantId]);
 if(!['Cart','CartLine'].every(object=>objects.rows.some(row=>row.api_name===object)))return 0;
 let count=0;
 for(const template of acetillCartGraphs{
  const exists=await client.query('SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2',
   [tenantId,template.apiName]);
  if(exists.rowCount)continue;
  const {rows}=await client.query<{id:string}>(`INSERT INTO md_flow_definitions
   (tenant_id,api_name,label,flow_type,version,active)
   VALUES($1,$2,$3,'Autolaunched Flow',1,true) RETURNING id`,[tenantId,template.apiName,template.label]);
  const encoded:Array<{path:string;kind:string;text:string|null}>=[];
  encodeMetadataValue(template,'/builder',encoded);
  for(const entry of encoded)await client.query(`INSERT INTO md_flow_editor_values
    (tenant_id,flow_id,property_path,value_kind,value_text) VALUES($1,$2,$3,$4,$5)`,
    [tenantId,rows[0].id,entry.path,entry.kind,entry.text]);
  count++;
 }
 return count;
}
