import test from 'node:test';
import assert from 'node:assert/strict';
import {recordComponentVisible} from '../src/core/records/RecordWorkspace/recordComponentVisibility';
import {recordEditPageLayout} from '../src/core/records/RecordWorkspace/recordEditPageLayout';
import {relatedListInstances,relatedListPageSize,relatedListQuery} from '../src/core/records/RecordWorkspace/relatedListInstances';
import {recordDateTimeInput,recordDateTimeValue} from '../src/core/records/RecordFormDialog/recordInputValues';
import type {LightningPageMetadata,PageComponentMetadata,ObjectMetadata,PageLayoutMetadata} from '../src/core/metadata/Definitions/metadata';
const component=(id:string,type:string,properties:Record<string,unknown>={},visible=true):PageComponentMetadata=>({id,type,label:id,visible,properties});
const page=(components:PageComponentMetadata[])=>({apiName:'Record',label:'Record',pageType:'Record Page',recordMode:'Edit',status:'Active',components} as LightningPageMetadata);
const field={apiName:'Name',label:'Name',dataType:'Text',required:false,unique:false};
const child={apiName:'Contact',label:'Contact',pluralLabel:'Contacts',fields:[field,{...field,apiName:'AccountId',dataType:'Reference',relationship:{targetObject:'Account',childRelationshipName:'Contacts'}}]} as ObjectMetadata;
const context={formFactor:'Desktop' as const};
const legacy={id:'legacy',label:'Legacy',sections:[{id:'old',label:'Old',columns:2,fieldApiNames:['Name']}],relatedLists:['Contacts'],actions:['Edit']} as PageLayoutMetadata;
test('hidden ancestor suppresses edit fields without restoring fallback',()=>{
 const nodes=[component('root','Container',{},false),component('field','Record Field',{fieldApiName:'Name',layoutParentId:'root'})];
 assert.equal(recordComponentVisible(nodes[1],nodes,context),false);
 assert.deepEqual(recordEditPageLayout(page(nodes),legacy,context)?.sections,[]);
});
test('cycles and missing parents fail closed',()=>{
 const nodes=[component('a','Container',{layoutParentId:'b'}),component('b','Record Field',{layoutParentId:'a',fieldApiName:'Name'})];
 assert.equal(recordComponentVisible(nodes[1],nodes,context),false);
 assert.equal(recordComponentVisible(nodes[1],[nodes[1]],context),false);
});
test('tab conditions apply to descendants but unselected visible tabs remain editable',()=>{
 const tabs=component('tabs','Tabs',{tabs:['Public','Private'],pagePropertyContract:{version:1,tabVisibility:[{tabId:'Private',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Phone'}]}}]}});
 const nodes=[tabs,component('private','Record Field',{fieldApiName:'Secret',layoutParentId:'tabs',tabLabel:'Private'}),component('public','Record Field',{fieldApiName:'Name',layoutParentId:'tabs',tabLabel:'Public'})];
 assert.equal(recordComponentVisible(nodes[1],nodes,context),false);
 assert.equal(recordComponentVisible(nodes[2],nodes,context),true);
});
test('duplicate relationship components keep independent settings and keys',()=>{
 const definitions=page([component('open','Related List',{relatedLists:['Contacts'],relatedListSettings:{Contacts:{pageSize:10,filterField:'Name',filterValue:'Open'}}}),
 component('closed','Related List',{relatedLists:['Contacts'],relatedListSettings:{Contacts:{pageSize:25,filterField:'Name',filterValue:'Closed'}}})]);
 const result=relatedListInstances('Account',[child],undefined,definitions);
 assert.deepEqual(result.map(item=>item.key),['open:Contacts','closed:Contacts']);
 assert.equal(relatedListQuery(result[0],'parent-1',10).get('filterValue'),'Open');
 assert.equal(relatedListQuery(result[1],'parent-1',0).get('limit'),'25');
 assert.equal(relatedListQuery(result[0],'parent-1',10).get('offset'),'10');
});
test('Quick Links alone request authorised canonical relationship counts and previews',()=>{
 const result=relatedListInstances('Account',[child],undefined,page([component('links','Related List Quick Links',{relatedLists:['contacts','Missing']})]));
 assert.equal(result.length,1);assert.equal(result[0].key,'Contacts');
});
test('grouped conditions cannot remove parent scope; unsupported filters fail closed',()=>{
 const result=relatedListInstances('Account',[child],legacy,page([]))[0];
 result.settings={filters:[{field:'Name',operator:'Equals',value:'One'},{field:'Name',operator:'Contains',value:'Two'}],filterLogic:'1 OR 2'};
 const query=relatedListQuery(result,'parent',0);
 assert.equal(query.get('relatedField'),'AccountId');assert.equal(query.get('relatedId'),'parent');
 assert.equal(query.get('filterLogic'),'1 OR 2');assert.equal(JSON.parse(query.get('filters')!)[1].operator,'contains');
 assert.throws(()=>relatedListQuery(result,'',0),/parent/);
 result.settings.filters=[{field:'Missing',operator:'Equals',value:'One'}];
 assert.throws(()=>relatedListQuery(result,'parent',0),/filter/);
});
test('dynamic filter values only use the selected parent and cannot become unbound',()=>{
 const result=relatedListInstances('Account',[child],legacy,page([]))[0];
 result.settings={filters:[{field:'AccountId',operator:'Equals',value:{source:'CurrentRecord'}}]};
 assert.equal(JSON.parse(relatedListQuery(result,'parent-2',0).get('filters')!)[0].value,'parent-2');
 result.settings.filters![0].value={source:'PageState',key:'Missing'};
 assert.throws(()=>relatedListQuery(result,'parent',0),/source/);
});
test('page sizes are bounded and timestamps round-trip without losing seconds',()=>{
 assert.equal(relatedListPageSize(0),1);assert.equal(relatedListPageSize(1000),100);assert.equal(relatedListPageSize(NaN),50);
 const stamp='2026-10-30T12:34:56.000Z';
 assert.equal(recordDateTimeValue(recordDateTimeInput(stamp)),stamp);
 assert.equal(recordDateTimeValue(''),null);
});
