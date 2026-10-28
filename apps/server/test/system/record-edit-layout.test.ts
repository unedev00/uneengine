import assert from 'node:assert/strict';
import test from 'node:test';
import type {LightningPageMetadata,PageLayoutMetadata} from '../../../web/src/core/metadata/Definitions/metadata';
import {recordEditPageLayout} from '../../../web/src/core/records/RecordWorkspace/recordEditPageLayout';

const fallback:PageLayoutMetadata={id:'account-layout',label:'Original Account Layout',
 sections:[{id:'legacy',label:'Legacy fields',columns:2,fieldApiNames:['Name','Phone']}],
 actions:['Edit'],relatedLists:['Contacts']};
const page:LightningPageMetadata={
 apiName:'Account_Record_Edit',label:'Account Edit',targetObject:'Account',
 pageType:'Record Page',recordMode:'Edit',status:'Active',
 layoutMode:'template',canvasWidth:1200,canvasHeight:800,
 devices:['Desktop','Phone'],activationAssignments:[],
 components:[
  {id:'starter',type:'Record Detail',label:'Record Detail',properties:{},visible:true},
  {id:'first',type:'Field Section',label:'Main fields',properties:{columns:1,fieldApiNames:['Phone','Name']},visible:true},
  {id:'hidden',type:'Field Section',label:'Hidden fields',properties:{fieldApiNames:['Secret']},visible:false},
  {id:'address',type:'Record Field',label:'Billing Address',properties:{fieldApiName:'BillingAddress'},visible:true},
  {id:'duplicate',type:'Record Field',label:'Name again',properties:{fieldApiName:'Name'},visible:true}
 ]
};

test('published Edit Record Pages drive real form fields without duplicating records',()=>{
 const result=recordEditPageLayout(page,fallback);
 assert.equal(result?.label,'Account Edit');
 assert.deepEqual(result?.sections,[
  {id:'first',label:'Main fields',columns:1,fieldApiNames:['Phone','Name']},
  {id:'record-fields-1',label:'Record Information',columns:2,fieldApiNames:['BillingAddress']}
 ]);
 assert.deepEqual(result?.actions,['Edit']);
 assert.deepEqual(result?.relatedLists,['Contacts']);
});

test('draft, View and absent page never alter a live edit form',()=>{
 assert.strictEqual(recordEditPageLayout({...page,status:'Draft'},fallback),fallback);
 assert.strictEqual(recordEditPageLayout({...page,recordMode:'View'},fallback),fallback);
 assert.strictEqual(recordEditPageLayout(null,fallback),fallback);
});

test('starter Record Detail continues to use existing Object Page Layout until customized',()=>{
 assert.strictEqual(recordEditPageLayout({...page,components:[page.components[0]]},fallback),fallback);
});

test('Record Page layout field behavior is per-device, deduplicated and does not change Object requirements',()=>{
 const configured:LightningPageMetadata={...page,components:page.components.map(component=>{
  if(component.id==='first')return {...component,properties:{...component.properties,
   requiredFieldApiNames:['Phone','NotInSection','Phone'],
   readOnlyFieldApiNames:['Name','Phone']}};
  if(component.id==='address')return {...component,properties:{...component.properties,
   readOnlyOnLayout:true}};
  return component;
 })};
 const layout=recordEditPageLayout(configured,fallback);
 assert.equal(layout?.sections[0]?.requiredFieldApiNames,undefined);
 assert.deepEqual(layout?.sections[0]?.readOnlyFieldApiNames,['Name','Phone']);
 assert.deepEqual(layout?.sections[1]?.readOnlyFieldApiNames,['BillingAddress']);
 assert.equal(layout?.sections[1]?.requiredFieldApiNames,undefined);
 const unchanged=recordEditPageLayout(page,fallback);
 assert.equal(unchanged?.sections[0]?.requiredFieldApiNames,undefined);
 assert.equal(unchanged?.sections[0]?.readOnlyFieldApiNames,undefined);
 assert.equal(fallback.sections[0].requiredFieldApiNames,undefined);
});

test('published Record Actions retain declarative visibility conditions only for enabled actions',async()=>{
 const dynamic:LightningPageMetadata={...page,components:[...page.components,{
  id:'record-actions',type:'Record Actions',label:'Actions',visible:true,
  properties:{actions:['Edit','Delete'],actionVisibility:{
   Edit:{fieldApiName:'Status',equalsValue:'Open'},
   Delete:{fieldApiName:'Internal',equalsValue:'Yes'},
   Hidden:{fieldApiName:'Status',equalsValue:'No'},
   Clone:{fieldApiName:'Bad;SQL',equalsValue:'X'}
  }}
 }]};
 const {recordPagePresentationLayout}=await import('../../../web/src/core/records/RecordWorkspace/recordPageLayoutMigration.js');
 const result=recordPagePresentationLayout(dynamic,fallback);
 assert.deepEqual(result?.actionVisibility,{
  Edit:{fieldApiName:'Status',equalsValue:'Open'},
  Delete:{fieldApiName:'Internal',equalsValue:'Yes'}
 });
});

test('published mobile and desktop Record Actions keep independent action layouts',async()=>{
 const {recordPagePresentationLayout}=await import('../../../web/src/core/records/RecordWorkspace/recordPageLayoutMigration.js');
 const action=(id:string,actions:string[])=>({
  id,type:'Record Actions' as const,label:'Actions',visible:true,
  properties:{actions}
 });
 const mobile:LightningPageMetadata={...page,layoutVariant:'Mobile',
  components:[action('mobile-actions',['Check In'])]};
 const desktop:LightningPageMetadata={...page,layoutVariant:'Desktop',
  components:[action('desktop-actions',['Edit','Delete'])]};
 const m=recordPagePresentationLayout(mobile,fallback);
 const d=recordPagePresentationLayout(desktop,fallback);
 assert.deepEqual(m?.actions,['Check In']);
 assert.deepEqual(d?.actions,['Edit','Delete']);
 assert.deepEqual(fallback.actions,['Edit'],'legacy SQL layout must remain unchanged');
 assert.strictEqual(recordPagePresentationLayout({...mobile,status:'Draft'},fallback),fallback);
});

test('published overrides map standard buttons to declarative Object Actions',async()=>{
 const {recordPagePresentationLayout}=await import('../../../web/src/core/records/RecordWorkspace/recordPageLayoutMigration.js');
 const configured:LightningPageMetadata={...page,components:[{
  id:'buttons',type:'Record Actions',label:'Actions',visible:true,properties:{
   actions:['Edit','Clone','Delete'],actionOverrides:{
    Edit:'RunApproval',Clone:'OpenReview',Delete:'RunDeletion',
    New:'InvalidExtra',Other:'NotStandard'
   }
  }
 }]};
 const layout=recordPagePresentationLayout(configured,fallback);
 assert.deepEqual(layout?.actionOverrides,{Edit:'RunApproval',Clone:'OpenReview',Delete:'RunDeletion'});
 const hidden=recordPagePresentationLayout({...configured,components:[{
  ...configured.components[0],properties:{actions:['Edit'],
   actionOverrides:{Edit:'RunApproval',Delete:'RunDeletion',Clone:'Invalid;Field'}}
 }]},fallback);
 assert.deepEqual(hidden?.actionOverrides,{Edit:'RunApproval'});
 assert.strictEqual(recordPagePresentationLayout({...configured,status:'Draft'},fallback),fallback);
});

test('published Record Actions support safe conditional operators with Field-read denial',async()=>{
 const {recordPagePresentationLayout}=await import('../../../web/src/core/records/RecordWorkspace/recordPageLayoutMigration.js');
 const {recordActionConditionVisible}=await import('../../../web/src/core/records/RecordWorkspace/recordActionVisibility.js');
 const configured:LightningPageMetadata={...page,components:[{
  id:'rules',type:'Record Actions',label:'Rules',visible:true,properties:{
   actions:['Edit','Delete','Clone','New'],actionVisibility:{
    Edit:{fieldApiName:'Status',equalsValue:'Open',operator:'NotEquals'},
    Delete:{fieldApiName:'Notes',equalsValue:'',operator:'IsBlank'},
    Clone:{fieldApiName:'Notes',equalsValue:'APPROVED',operator:'Contains'},
    New:{fieldApiName:'Status',equalsValue:'Open',operator:'Unsupported'}
   }
  }
 }]};
 const layout=recordPagePresentationLayout(configured,fallback);
 assert.equal(layout?.actionVisibility?.New?.operator,'Never');
 assert.equal(recordActionConditionVisible(layout!.actionVisibility!.New,{Status:'Open'},true),false);
 const edit=layout?.actionVisibility?.Edit;
 const del=layout?.actionVisibility?.Delete;
 const clone=layout?.actionVisibility?.Clone;
 assert.ok(edit&&del&&clone);
 const record={Status:'Closed',Notes:'Approved by owner'};
 assert.equal(recordActionConditionVisible(edit,record,true),true);
 assert.equal(recordActionConditionVisible(edit,{Status:'Open'},true),false);
 assert.equal(recordActionConditionVisible(del,{Notes:''},true),true);
 assert.equal(recordActionConditionVisible(del,record,true),false);
 assert.equal(recordActionConditionVisible(clone,record,true),true);
 assert.equal(recordActionConditionVisible(clone,record,false),false);
 assert.equal(recordActionConditionVisible(del,null,true),false);
 assert.equal(recordActionConditionVisible({...clone,equalsValue:''},record,true),false);
});


test('version-1 field rules apply to published forms without widening Object permissions',()=>{
 const configured:LightningPageMetadata={...page,components:page.components.map(component=>
  component.id==='first'?{...component,properties:{...component.properties,pagePropertyContract:{
   version:1,fieldRules:[
    {fieldApiName:'Name',behavior:'Required',visibilityRules:{logic:'All',conditions:[
     {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Active'}]}},
    {fieldApiName:'Phone',behavior:'ReadOnly'}
   ]}}}:component)};
 const context={formFactor:'Phone' as const,record:{Status:'Active'},
  fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status'])};
 const active=recordEditPageLayout(configured,fallback,context);
 assert.deepEqual(active?.sections[0]?.fieldApiNames,['Phone','Name']);
 assert.deepEqual(active?.sections[0]?.requiredFieldApiNames,['Name']);
 assert.deepEqual(active?.sections[0]?.readOnlyFieldApiNames,['Phone']);
 const hidden=recordEditPageLayout(configured,fallback,{...context,record:{Status:'Closed'}});
 assert.deepEqual(hidden?.sections[0]?.fieldApiNames,['Phone']);
 assert.equal(hidden?.sections[0]?.requiredFieldApiNames,undefined);
 const unreadable=recordEditPageLayout(configured,fallback,{...context,readableFieldApiNames:new Set<string>()});
 assert.deepEqual(unreadable?.sections[0]?.fieldApiNames,['Phone']);
 assert.deepEqual(fallback.sections[0].fieldApiNames,['Name','Phone']);
});

test('component visibility is evaluated in the Edit layout with current, authorised field values',()=>{
 const conditional:LightningPageMetadata={...page,components:page.components.map(component=>
  component.id==='first'?{...component,properties:{...component.properties,
   visibilityRules:{logic:'All',conditions:[{source:'Record Field',fieldApiName:'Status',
    operator:'Equals',value:'Open'}]}}}:component)};
 const context={formFactor:'Desktop' as const,record:{Status:'Open'},
  fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status'])};
 const shown=recordEditPageLayout(conditional,fallback,context);
 assert.deepEqual(shown?.sections[0]?.fieldApiNames,['Phone','Name']);
 const hidden=recordEditPageLayout(conditional,fallback,{...context,record:{Status:'Closed'}});
 assert.equal(hidden?.sections.some(section=>section.id==='first'),false);
 const denied=recordEditPageLayout(conditional,fallback,{
  ...context,readableFieldApiNames:new Set<string>()});
 assert.equal(denied?.sections.some(section=>section.id==='first'),false);
});

test('per-field conflicts never make a read-only field simultaneously layout-required',()=>{
 const changed:LightningPageMetadata={...page,components:page.components.map(component=>
  component.id==='address'?{...component,properties:{...component.properties,
   requiredOnLayout:true,readOnlyOnLayout:true}}:component)};
 const layout=recordEditPageLayout(changed,fallback);
 assert.deepEqual(layout?.sections.at(-1)?.readOnlyFieldApiNames,['BillingAddress']);
 assert.equal(layout?.sections.at(-1)?.requiredFieldApiNames,undefined);
});

test('an authored Dynamic Forms layout never leaks hidden fields through legacy fallback',()=>{
 const conditional:LightningPageMetadata={...page,components:[{
  id:'private-fields',type:'Field Section',label:'Private',visible:true,
  properties:{fieldApiNames:['Secret'],visibilityRules:{logic:'All',conditions:[
   {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Authorized'}]}}
 }]};
 const context={formFactor:'Desktop' as const,record:{Status:'Denied'},
  fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status'])};
 const result=recordEditPageLayout(conditional,fallback,context);
 assert.deepEqual(result?.sections,[]);
 assert.deepEqual(fallback.sections[0].fieldApiNames,['Name','Phone']);
});
