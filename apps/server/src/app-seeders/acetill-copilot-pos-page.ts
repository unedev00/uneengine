import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {PageRuntime} from '../system-files/page-runtime.js';

const PAGE='COPILOTTILL_POS';
type Block=Record<string,unknown> & {
 id:string;type:string;label:string;region:string;visible:boolean;
 position:{x:number;y:number;width:number;height:number};
 properties:Record<string,unknown>;
};
const flow=(name:string,inputs:Record<string,unknown>={},outputs:Record<string,string>={})=>({
 actionType:'Flow',flowType:'Autolaunched Flow',flowApiName:name,inputs,outputs
});
const totals={cartSessionId:'cartSessionId',cartItems:'cartItems',subtotal:'subtotal',total:'total'};
const read=flow('AcetillCopilotReadCart',{sessionKey:'$session'},totals);
const add=flow('AcetillCopilotAddProduct',{
 sessionKey:'$session',productId:'$event.recordId'
},totals);
const qty=flow('AcetillCopilotChangeQuantity',{
 sessionKey:'$session',cartLineId:'$event.recordId',delta:'$event.delta'
},totals);
const cash=flow('AcetillPaymentCash',{
 cartItems:'$state.cartItems',cartTotal:'$state.total',requestId:'$session',
 cashReceived:'$state.cashReceived'
},{status:'checkoutStatus',invoiceId:'invoiceId',total:'checkoutTotal'});
const box=(id:string,type:string,label:string,region:string,
 x:number,y:number,width:number,height:number,properties:Record<string,unknown>):Block=>({
 id:'copilot-pos-'+id,type:'Custom:'+type,label,region,visible:true,
 position:{x,y,width,height},properties
});
/** Every control is a shared Smart Component with ordinary ribbon properties. */
export const copilotTillLayout=[
 box('products','smart_card_grid','Products','main',16,104,810,540,{
  objectApiName:'Product',
  filters:[{field:'Active',operator:'Equals',value:true}],
  textSource:'@Name',imageSource:'@ImageUrl',badgeText:'@Price',
  badgeVisible:true,badgeTextSize:13,badgeTextColor:'#FFFFFF',
  cardsPerRow:4,cardsPerColumn:3,imageHeight:122,imagePlacement:'top',
  headerBoxHeight:36,headerBold:true,wrapText:true,
  backgroundColor:'#FFFFFF',borderColor:'#DEE5ED',radius:8,shadow:'small',
  actionFlows:{click:add,start:read}
 }),
 box('cart','smart_cart','Current sale','sidebar',846,104,536,550,{
  objectApiName:'CartLine',relatedFilterKey:'cartSessionId',
  relatedFieldApiName:'CartSession',
  textSource:'@Name',column2Source:'@UnitPrice',column3Source:'@Quantity',
  column4Source:'@Quantity * @UnitPrice',column5Source:'@DiscountAmount',
  columnVisibility:['Column 1','Column 2','Column 3','Column 4'],
  column3SourceType:'Number',currencyCode:'GBP',
  subtotalValue:'$state.subtotal',totalValue:'$state.total',
  cardsPerRow:6,rowHeight:44,imageHeight:24,headerBoxHeight:46,
  supportingBoxHeight:28,summaryHeight:140,
  backgroundColor:'#FFFFFF',tableBackgroundColor:'#FFFFFF',
  headerTextColor:'#1E3551',rowLabelColor:'#23384D',
  actionFlows:{qtyIcon:qty,start:read}
 }),
 box('search','smart_lookup','Search products','main',16,28,580,56,{
  objectApiName:'Product',textSource:'@Name',
  placeholder:'Find a product or scan barcode',
  backgroundColor:'#FFFFFF',borderColor:'#D6E1EE',radius:8,
  actionFlows:{select:flow('AcetillCopilotAddProduct',{
   sessionKey:'$session',productId:'$event.record.Id'
  },totals)}
 }),
 box('new','smart_button','New sale','header',606,28,158,52,{
  label:'New sale',backgroundColor:'#1A6AD2',labelColor:'#FFFFFF',
  textSize:14,radius:8,actionFlows:{click:{
   ...read,resetSessionOnSuccess:true,mutatesData:false
  }}
 }),
 box('lock','smart_button','Verify till PIN','header',1214,28,168,52,{
  label:'🔒 Verify PIN',backgroundColor:'#E9EEF6',labelColor:'#233A54',
  textSize:14,radius:8,actionFlows:{click:flow('AcetillVerifyUserPin',
   {pin:'$state.tillPin'},{verified:'pinVerified'})}
 }),
 box('pin','smart_text','Till PIN','sidebar',1030,28,172,52,{
  placeholder:'Till PIN',textSize:14,radius:8,
  actionFlows:{change:{actionType:'PageState',stateKey:'tillPin',value:'$event'}}
 }),
 box('cash','smart_text','Cash received','sidebar',846,686,246,50,{
  placeholder:'Cash received',textSize:14,
  radius:8,backgroundColor:'#FFFFFF',
  actionFlows:{change:{actionType:'PageState',stateKey:'cashReceived',value:'$event'}}
 }),
 box('pay','smart_button','Complete cash sale','sidebar',1104,686,278,50,{
  label:'Complete cash sale',backgroundColor:'#166A51',labelColor:'#FFFFFF',
  textSize:14,radius:8,actionFlows:{click:cash}
 }),
 box('hold','smart_button','Hold sale','sidebar',846,750,164,48,{
  label:'Hold sale',backgroundColor:'#334E72',labelColor:'#FFFFFF',radius:8,
  actionFlows:{click:{
   ...flow('AcetillHoldCart',{requestId:'$session',label:'Till held sale',
    cartItems:'$state.cartItems'},{holdReference:'holdReference',cartId:'heldCartId'}),
   resetSessionOnSuccess:true
  }}
 }),
 box('held','smart_button','List held sales','sidebar',1022,750,176,48,{
  label:'Held sales',backgroundColor:'#334E72',labelColor:'#FFFFFF',radius:8,
  actionFlows:{click:flow('AcetillListHeldCarts',{}, {records:'heldCarts'})}
 }),
 box('receipt','smart_button','Print receipt','sidebar',1210,750,172,48,{
  label:'Print receipt',backgroundColor:'#334E72',labelColor:'#FFFFFF',radius:8,
  actionFlows:{click:flow('AcetillPrintReceipt',{invoiceId:'$state.invoiceId'})}
 })
];
const responsive=(block:Block,variant:string):Block=>{
 if(variant==='Desktop'||variant==='Custom')return block;
 const width=variant==='Mobile'?390:1024;
 const usable=width-24;
 const index=copilotTillLayout.findIndex(x=>x.id===block.id);
 if(variant==='Tablet'){
  const scale=usable/1382;
  return {...block,position:{
   x:Math.round(block.position.x*scale),y:Math.round(block.position.y*scale),
   width:Math.max(110,Math.floor(block.position.width*scale)),
   height:block.position.height}};
 }
 // Intentionally one single column, compact mobile controls, no clipped checkout.
 return {...block,position:{x:12,y:12+index*82,width:usable,
  height:block.type==='Custom:smart_card_grid'?420:
   block.type==='Custom:smart_cart'?440:56}};
};
const stableTypes:Record<string,string[]>={
 'copilot-pos-products':['smart_card_grid','acetill_item_grid','ui_item_grid','une_item_grid'],
 'copilot-pos-cart':['smart_cart','acetill_cart','ui_cart','une_cart']
};
const sameKind=(component:{id?:string;type?:string},requested:Block)=>(
 component.id===requested.id || component.type===requested.type && (
 requested.id==='copilot-pos-products'||requested.id==='copilot-pos-cart') ||
 (stableTypes[requested.id]??[]).some(type=>
 component.type===type||component.type==='Custom:'+type)
);
/**
 * Only modifies an existing user-created COPILOTTILL_POS. Never invents a
 * replacement page, replaces components, changes authored properties, or
 * updates the original Acetill pages. Creates a new immutable draft revision.
 */
export async function seedAcetillCopilotPosPage(db:SqlPersistence,tenant:string){
 const found=await db.query<{id:string}>(
  "SELECT p.id FROM md_page_definitions p JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true",
  [tenant,PAGE]);
 if(!found.rows[0])return 0;
 const managed=await db.query(
  "SELECT 1 FROM md_app_seed_pages WHERE tenant_id=$1 AND page_id=$2",
  [tenant,found.rows[0].id]);
 if(managed.rowCount)return 0;
 const pages=new PageRuntime(db);
 let variants=0;
 for(const variant of ['Desktop','Tablet','Mobile','Custom'] as const){
  const current=await pages.editor(tenant,PAGE,variant);
  const needed=copilotTillLayout.filter(block=>
   !current.components.some(existing=>sameKind(existing,block)));
  if(!needed.length)continue;
  const components=[...current.components,...needed.map(block=>responsive(block,variant))];
  const draft={...current,components,
   canvasWidth:variant==='Mobile'?390:variant==='Tablet'?1024:
    Math.max(current.canvasWidth,1440),
   canvasHeight:Math.max(current.canvasHeight,
    variant==='Mobile'?1550:variant==='Tablet'?1100:900)};
  await pages.saveLayoutDraft(tenant,PAGE,variant,draft);
  // Publishing remains a separate, audited Owner decision after checkout
  // and payment attestation, never a silent tenant metadata seeder side effect.
  variants++;
 }
 return variants;
}
