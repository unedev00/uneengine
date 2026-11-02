import assert from 'node:assert/strict';
import {SqlPersistence} from '../../apps/server/dist-system/system-files/sql-persistence.js';
import {PageRuntime} from '../../apps/server/dist-system/system-files/page-runtime.js';
import {encodeMetadataValue} from '../../apps/server/dist-system/system-files/component-runtime.js';

// Tenant-owned, no-code-editable Flow metadata. Not an Acetill AppExchange
// resource: uninstalling Acetill must not remove Smart Till's cart operations.
const VERSION=1;
const node=(id,type,label,config={})=>({id,type,label,config});
const edge=(from,to,label='Next')=>({from,to,kind:'normal',label});
const variable=(name,dataType='Text',input=false,output=false)=>({
 name,type:'Variable',dataType,...(input?{availableForInput:true}:{}),
 ...(output?{availableForOutput:true}:{})
});
const resource=[
 variable('sessionKey','Text',true),
 variable('cartSessionId','Text',false,true),
 {name:'currentSession',type:'Record',dataType:'CartSession'},
 {name:'cartItems',type:'Record Collection',dataType:'CartLine',availableForOutput:true},
 {name:'cartLine',type:'Record',dataType:'CartLine'},
 {name:'calculatedLineTotal',type:'Formula',dataType:'Number',
  value:'cartLine.Quantity * cartLine.UnitPrice'},
 variable('subtotal','Number',false,true),
 variable('total','Number',false,true)
];
const totals=start=>({
 elements:[
  node(start,'Assignment','Reset subtotal',{variable:'subtotal',operator:'Assign',value:0}),
  node(start+1,'Loop','Each cart line',{collection:'cartItems',loopVariable:'cartLine'}),
  node(start+2,'Assignment','Add line total',{
   variable:'subtotal',operator:'Add',value:'{!calculatedLineTotal}'}),
  node(start+3,'Assignment','Set total',{variable:'total',operator:'Assign',value:'{!subtotal}'})
 ],
 links:[edge(start,start+1),edge(start+1,start+2,'For Each'),
  edge(start+2,start+1),edge(start+1,start+3,'After Last')]
});
const readSession=(id)=>node(id,'Get Records','Read session',{
 object:'CartSession',recordLimit:'1',outputVariable:'currentSession',
 conditions:[{field:'SessionKey',operator:'Equals',value:'{!sessionKey}'},
  {field:'Status',operator:'Equals',value:'Open'}]
});
const readLines=(id)=>node(id,'Get Records','Read cart lines',{
 object:'CartLine',recordLimit:'all',outputVariable:'cartItems',
 conditions:[{field:'CartSession',operator:'Equals',value:'{!cartSessionId}'}]
});
const decision=(id,label,conditions,outcome='Valid')=>node(id,'Decision',label,{
 outcomes:[{name:outcome,label:outcome,conditionLogic:'All',conditions}]
});
const exists=ref=>[{field:ref,operator:'IsNotNull'}];
const graph=(apiName,label,elements,connectors,extra=[])=>({
 apiName,label,flowType:'Autolaunched Flow',status:'Active',version:VERSION,
 startConfig:{executionContext:'User'},elements,connectors,
 resources:[...resource,...extra],tests:[]
});
const addTotals=totals(12);
const readTotals=totals(7);

export const SMART_TILL_ADD=graph('SmartTillAddProduct','Smart Till: add selected product to cart',[
 node(1,'Start','Start'),
 decision(2,'Valid session and clicked product?',[
  ...exists('{!sessionKey}'),...exists('{!productId}')]),
 node(3,'Get Records','Read clicked product by ID',{
  object:'Product',recordLimit:'1',outputVariable:'product',
  conditions:[{field:'Id',operator:'Equals',value:'{!productId}'}]}),
 decision(4,'Product found?',exists('{!product}'),'Found'),
 decision(5,'Price available?',[
  {field:'{!product.Price}',operator:'GreaterThanOrEqualTo',value:0}]),
 readSession(6),
 decision(7,'Open session found?',exists('{!currentSession}'),'Found'),
 node(8,'Assignment','Use existing CartSession',{
  variable:'cartSessionId',operator:'Assign',value:'{!currentSession.Id}'}),
 node(9,'Create Records','Create CartSession when missing',{
  object:'CartSession',recordSource:'fields',resultVariable:'cartSessionId',
  uniqueInputGuard:{field:'SessionKey'},
  fieldValues:[{field:'Name',value:'Smart Till cart'},
   {field:'SessionKey',value:'{!sessionKey}'},{field:'Status',value:'Open'}]}),
 node(10,'Create Records','Create CartLine for clicked product',{
  object:'CartLine',recordSource:'fields',resultVariable:'cartLineId',
  fieldValues:[{field:'CartSession',value:'{!cartSessionId}'},
   {field:'Product',value:'{!product.Id}'},
   {field:'Name',value:'{!product.Name}'},
   {field:'Quantity',value:1},
   {field:'UnitPrice',value:'{!product.Price}'},
   {field:'OriginalUnitPrice',value:'{!product.Price}'},
   {field:'LineTotal',value:'{!product.Price}'}]}),
 readLines(11),...addTotals.elements,
 node(16,'End','Cart updated'),
 node(20,'Custom Error','Invalid product or session',{
  errorLocation:'Page',errorMessage:'Select an available product with a valid price.'})
],[
 edge(1,2),edge(2,3,'Valid'),edge(2,20,'Default'),
 edge(3,4),edge(4,5,'Found'),edge(4,20,'Default'),
 edge(5,6,'Valid'),edge(5,20,'Default'),
 edge(6,7),edge(7,8,'Found'),edge(7,9,'Default'),
 edge(8,10),edge(9,10),edge(10,11),edge(11,12),
 ...addTotals.links,edge(15,16)
],[variable('productId','Text',true),{name:'product',type:'Record',dataType:'Product'},
 variable('cartLineId','Text',false,true)]);

export const SMART_TILL_READ=graph('SmartTillReadCart','Smart Till: read current cart',[
 node(1,'Start','Start'),
 decision(2,'Session supplied?',exists('{!sessionKey}')),
 readSession(3),
 decision(4,'Open session exists?',exists('{!currentSession}'),'Found'),
 node(5,'Assignment','Set CartSession ID',{
  variable:'cartSessionId',operator:'Assign',value:'{!currentSession.Id}'}),
 readLines(6),...readTotals.elements,
 node(11,'End','Cart loaded')
],[
 edge(1,2),edge(2,3,'Valid'),edge(2,11,'Default'),
 edge(3,4),edge(4,5,'Found'),edge(4,11,'Default'),
 edge(5,6),edge(6,7),...readTotals.links,edge(10,11)
]);

export const SMART_TILL_OUTPUTS={
 cartSessionId:'cartSessionId',cartItems:'cartItems',
 subtotal:'subtotal',total:'total'
};
export const SMART_TILL_CLICK={
 actionType:'Flow',flowType:'Autolaunched Flow',
 flowApiName:'SmartTillAddProduct',
 inputs:{sessionKey:'$session',productId:'$event.recordId'},
 outputs:SMART_TILL_OUTPUTS
};
export const SMART_TILL_START={
 actionType:'Flow',flowType:'Autolaunched Flow',
 flowApiName:'SmartTillReadCart',inputs:{sessionKey:'$session'},
 outputs:SMART_TILL_OUTPUTS
};
const isBound=(b,name)=>b&&typeof b==='object'&&!Array.isArray(b)&&b.flowApiName===name;
const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function smartTillCartBindings(layout){
 const grid=layout.components.find(c=>c.id==='codextill-product-grid');
 const cart=layout.components.find(c=>c.id==='codextill-cart');
 assert(grid?.type==='Custom:smart_card_grid'
  &&grid.properties?.objectApiName==='Product','Expected authored Product Card Grid');
 assert(cart?.type==='Custom:smart_cart'
  &&cart.properties?.objectApiName==='CartLine','Expected authored CartLine Smart Cart');
 let changed=false,skipped=[];
 const components=layout.components.map(c=>{
  if(c.id===grid.id){
   const actions=isObject(c.properties.actionFlows)?c.properties.actionFlows:{};
   const click=actions.click;
   if(isBound(click,'AcetillCopilotAddProduct')||isBound(click,SMART_TILL_CLICK.flowApiName)){
    const next={...click,...SMART_TILL_CLICK};
    if(JSON.stringify(next)!==JSON.stringify(click)){
     changed=true;
     return {...c,properties:{...c.properties,actionFlows:{...actions,click:next}}};
    }
   }else skipped.push('Product Card Grid click is not the expected legacy add Flow');
  }
  if(c.id===cart.id){
   const actions=isObject(c.properties.actionFlows)?c.properties.actionFlows:{};
   const start=actions.start;
   if((!start||isBound(start,'AcetillCopilotReadCart')
       ||isBound(start,SMART_TILL_START.flowApiName))
     &&(!c.properties.relatedFilterKey||c.properties.relatedFilterKey==='cartSessionId')
     &&(!c.properties.relatedFieldApiName||c.properties.relatedFieldApiName==='CartSession')){
    const props={...c.properties,relatedFilterKey:'cartSessionId',
     relatedFieldApiName:'CartSession',
     actionFlows:{...actions,start:{...start,...SMART_TILL_START}}};
    if(JSON.stringify(props)!==JSON.stringify(c.properties)){
     changed=true;return {...c,properties:props};
    }
   }else skipped.push('Cart has a customised start Flow or related filter');
  }
  return c;
 });
 return {changed,skipped,layout:{...layout,components}};
}
export function validateSmartTillGraph(){
 for(const flow of [SMART_TILL_ADD,SMART_TILL_READ]){
  assert(!Object.hasOwn(flow,'appApiName'));
  assert.equal(flow.status,'Active');
  const ids=new Set(flow.elements.map(n=>n.id));
  assert.equal(ids.size,flow.elements.length);
  for(const e of flow.connectors)assert(ids.has(e.from)&&ids.has(e.to));
  assert(flow.resources.some(r=>r.name==='cartSessionId'&&r.availableForOutput));
 }
 const product=SMART_TILL_ADD.elements.find(n=>n.id===3);
 assert.equal(product.config.conditions.length,1,'Never hardcode Card Grid Active filters into server Flow');
 assert.deepEqual(product.config.conditions,[{field:'Id',operator:'Equals',value:'{!productId}'}]);
 assert.equal(SMART_TILL_CLICK.inputs.productId,'$event.recordId');
 assert.equal(SMART_TILL_CLICK.inputs.sessionKey,'$session');
}
validateSmartTillGraph();

if(process.argv.includes('--preflight')){
 console.log('Smart Till standalone Flow and Page metadata preflight passed');
 process.exit(0);
}
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
if(typeof process.getuid==='function'&&process.getuid()===0){
 process.initgroups('metadrive','metadrive');
 process.setgid('metadrive');process.setuid('metadrive');
}
if(typeof process.getuid==='function'&&process.getuid()===0)throw Error('Refusing root SQL connection');

const db=new SqlPersistence(process.env.DATABASE_URL);
try{
 const tenants=await db.query(`SELECT p.tenant_id FROM md_page_definitions p
   JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
   WHERE p.api_name='CODEXTILL' AND p.enabled=true
   AND NOT EXISTS(SELECT 1 FROM md_app_seed_pages s
     WHERE s.tenant_id=p.tenant_id AND s.page_id=p.id)`);
 assert.equal(tenants.rows.length,1,'Expected one tenant-owned, editable CODEXTILL Page');
 const tenant=tenants.rows[0].tenant_id;
 await db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['smarttill:cart-flows:'+tenant]);
  const prerequisites={
   Product:['Id','Name','Price'],
   CartSession:['Name','Status','SessionKey'],
   CartLine:['CartSession','Product','Name','Quantity','UnitPrice','OriginalUnitPrice','LineTotal']
  };
  const fields=await client.query(`SELECT object_api,api_name
    FROM md_field_definitions WHERE tenant_id=$1
    AND object_api IN ('Product','CartSession','CartLine')`,[tenant]);
  const known=new Set(fields.rows.map(r=>r.object_api+'.'+r.api_name));
  for(const [object,names] of Object.entries(prerequisites))
   for(const field of names.filter(f=>f!=='Id'))
    assert(known.has(object+'.'+field),'Required shared field missing: '+object+'.'+field);
  for(const flow of [SMART_TILL_ADD,SMART_TILL_READ]){
   const existing=await client.query(`SELECT id,active FROM md_flow_definitions
    WHERE tenant_id=$1 AND api_name=$2 AND archived=false ORDER BY version DESC LIMIT 1`,
    [tenant,flow.apiName]);
   if(existing.rows.length){
    assert(existing.rows[0].active===true,'Existing Smart Till Flow is inactive: '+flow.apiName);
    console.log(flow.apiName+': existing tenant customisation retained');
    continue;
   }
   const inserted=await client.query(`INSERT INTO md_flow_definitions
    (tenant_id,api_name,label,flow_type,version,active)
    VALUES($1,$2,$3,'Autolaunched Flow',$4,true) RETURNING id`,
    [tenant,flow.apiName,flow.label,VERSION]);
   const values=[];
   encodeMetadataValue(flow,'/builder',values);
   for(const value of values)
    await client.query(`INSERT INTO md_flow_editor_values
     (tenant_id,flow_id,property_path,value_kind,value_text)
     VALUES($1,$2,$3,$4,$5)`,
     [tenant,inserted.rows[0].id,value.path,value.kind,value.text]);
   console.log(flow.apiName+': installed independently of Acetill');
  }
  // Preserve explicit OneEngine/developer/cashier permission assignments.
  // Never assign a policy to a user or bypass Object/Field/Record RBAC.
  for(const [newFlow,oldFlow] of [
   ['SmartTillAddProduct','AcetillCopilotAddProduct'],
   ['SmartTillReadCart','AcetillCopilotReadCart']
  ]){
   await client.query(`INSERT INTO md_permission_rules
    (tenant_id,permission_set_id,resource,action,effect)
    SELECT r.tenant_id,r.permission_set_id,$2,'execute','allow'
    FROM md_permission_rules r WHERE r.tenant_id=$1
    AND r.resource=$3 AND r.action='execute' AND r.effect='allow'
    ON CONFLICT DO NOTHING`,[tenant,'Flow:'+newFlow,'Flow:'+oldFlow]);
  }
 });
 const runtime=new PageRuntime(db);
 const before=await runtime.editor(tenant,'CODEXTILL','Desktop');
 const patch=smartTillCartBindings(before);
 if(!patch.changed){
  console.log('Smart Till: no CODEXTILL draft bindings changed. '+patch.skipped.join('; '));
 }else{
  const latest=await runtime.editor(tenant,'CODEXTILL','Desktop');
  assert.deepEqual(latest,before,'CODEXTILL draft changed concurrently; refusing overwrite');
  await runtime.saveLayoutDraft(tenant,'CODEXTILL','Desktop',patch.layout);
  const saved=await runtime.editor(tenant,'CODEXTILL','Desktop');
  const expected=new Map(patch.layout.components.map(c=>[c.id,c]));
  for(const component of saved.components){
   const target=expected.get(component.id);
   assert(target,'Unrelated component removed');
   assert.deepEqual(component.position,target.position,'Page geometry changed');
   if(component.id==='codextill-product-grid'||component.id==='codextill-cart')
    assert.deepEqual(component.properties.actionFlows,target.properties.actionFlows);
  }
  console.log('Smart Till Card Grid and Cart draft actions updated; publishing remains owner-controlled');
  if(patch.skipped.length)console.log('Preserved customizations: '+patch.skipped.join('; '));
 }
}finally{await db.pool.end();}
