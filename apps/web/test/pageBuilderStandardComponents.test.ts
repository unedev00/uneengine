import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {standardPageComponents} from '../src/core/components/Catalog/catalog';
import {isComponentVisible,validateVisibilityRule} from '../src/core/components/Properties/componentVisibility';
import {childrenOf,isLayoutContainer} from '../src/core/pages/TemplatePageRuntime/pageComponentLayout';

test('functional standard blocks are discoverable with preserved catalog IDs',()=>{
 const supported=new Set(standardPageComponents.map(item=>item.apiName));
 for(const name of ['Rich Text','List View','Path','Screen Flow','Items to Approve',
   'Related List Quick Links','Tabs','Accordion','Related List','Highlights Panel'])
   assert.equal(supported.has(name),true,name+' is not registered');
});

test('Tabs and Accordion can nest field blocks without changing their persisted IDs',()=>{
 const blocks=[
   {id:'tabs',type:'Tabs',label:'Details',visible:true,properties:{tabs:['Overview']}},
   {id:'accordion',type:'Accordion',label:'Section',visible:true,parentId:'tabs',
     properties:{layoutParentId:'tabs',tabLabel:'Overview'}},
   {id:'field',type:'Record Field',label:'Stage',visible:true,parentId:'accordion',
     properties:{layoutParentId:'accordion',fieldApiName:'Stage'}}
 ];
 assert.equal(isLayoutContainer(blocks[0]),true);
 assert.equal(isLayoutContainer(blocks[1]),true);
 assert.deepEqual(childrenOf(blocks,'tabs').map(item=>item.id),['accordion']);
 assert.deepEqual(childrenOf(blocks,'accordion').map(item=>item.id),['field']);
});

test('profile and record-type visibility rules compare contextual metadata without bypassing FLS',()=>{
 const profile={logic:'All',conditions:[{source:'User Profile',operator:'Equals',value:'p1'}]};
 const type={logic:'All',conditions:[{source:'Record Type',operator:'Equals',value:'rt1'}]};
 const item=(rules:unknown)=>({visible:true,properties:{visibilityRules:rules}});
 assert.deepEqual(validateVisibilityRule(profile,[],true),[]);
 assert.deepEqual(validateVisibilityRule(type,[],true),[]);
 assert.equal(isComponentVisible(item(profile),{formFactor:'Desktop',profileId:'p1'},true),true);
 assert.equal(isComponentVisible(item(profile),{formFactor:'Desktop',profileId:'other'},true),false);
 assert.equal(isComponentVisible(item(type),{
   formFactor:'Desktop',record:{RecordTypeId:'rt1'}},true),true);
 assert.equal(isComponentVisible(item(type),{
   formFactor:'Desktop',record:{RecordTypeId:'rt2'}},true),false);
 assert.equal(isComponentVisible(item(profile),{formFactor:'Desktop'},true),false);
 assert.equal(isComponentVisible(item(type),{formFactor:'Desktop',record:{RecordTypeId:'rt1'}},false),false);
});

test('embedded Screen Flow and approval blocks delegate to existing tenant APIs',()=>{
 const flow=readFileSync(new URL('../src/core/pages/PageRuntime/EmbeddedScreenFlow.tsx',import.meta.url),'utf8');
 const approvals=readFileSync(new URL('../src/core/pages/PageRuntime/StandardApprovals.tsx',import.meta.url),'utf8');
 const inline=readFileSync(new URL('../src/core/records/RecordWorkspace/InlineRecordField.tsx',import.meta.url),'utf8');
 assert.match(flow,/FlowScreenContent/);
 assert.match(flow,/flow-interviews/);
 assert.match(approvals,/approvals\/inbox/);
 assert.match(approvals,/approvals\//);
 assert.match(inline,/onSave/);
 assert.match(inline,/onEditFull/,'Complex fields must open the shared edit form');
 assert.match(inline,/Multi-Select Picklist/,'Inline multi-selects use configured picklist values');
 assert.match(inline,/datetime-local/,'Datetime values have an appropriate editor');
});
