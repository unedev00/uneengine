import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateConditionExpression,isComponentVisible,validateVisibilityRule
} from '../src/core/components/Properties/componentVisibility';
import {behaviorAction,behaviorTabs,behaviorField} from '../src/core/pages/PageRuntime/pageBehaviorRuntime';

test('P2 mixed AND/OR precedence, parentheses and full token consumption',()=>{
 assert.equal(evaluateConditionExpression('1 AND (2 OR 3)',[true,false,true]),true);
 assert.equal(evaluateConditionExpression('1 AND (2 OR 3)',[false,true,true]),false);
 assert.equal(evaluateConditionExpression('1 OR 2 AND 3',[true,false,false]),true);
 assert.equal(evaluateConditionExpression('(1 OR 2) AND 3',[true,false,false]),false);
 assert.equal(evaluateConditionExpression('1 and (2 or 3)',[true,false,true]),true);
});
test('P2 invalid, out-of-range and malicious condition expressions fail closed',()=>{
 for(const value of ['','0','4','1 AND','(1 OR 2','1 OR 2)','1 && 2',
  '1 OR alert(1)','1 OR 2 OR 99','1 XOR 2','1 AND 1 blah']){
  assert.equal(evaluateConditionExpression(value,[true,true,true]),null,value);
 }
});
test('P2 expression overrides simple logic without changing legacy rules',()=>{
 const base={logic:'All' as const,conditions:[
   {source:'Device' as const,operator:'Equals' as const,value:'Desktop' as const},
   {source:'Device' as const,operator:'Equals' as const,value:'Phone' as const},
   {source:'Device' as const,operator:'Not Equals' as const,value:'Phone' as const}
 ]};
 const context={formFactor:'Desktop' as const};
 const component=(visibilityRules:unknown)=>({visible:true,properties:{visibilityRules}});
 assert.equal(isComponentVisible(component(base),context,false),false);
 assert.equal(isComponentVisible(component({...base,expression:'1 AND (2 OR 3)'}),context,false),true);
 assert.equal(isComponentVisible(component({...base,expression:'1 AND 99'}),context,false),false);
 assert.deepEqual(validateVisibilityRule({...base,expression:'1 AND 99'},[],false).length>0,true);
});

test('P2 nested expressions also drive shared action and tab conditions',()=>{
 const when={logic:'All',expression:'1 AND (2 OR 3)',conditions:[
  {source:'Device',operator:'Equals',value:'Desktop'},
  {source:'Device',operator:'Equals',value:'Phone'},
  {source:'Device',operator:'Not Equals',value:'Phone'}
 ]};
 const props={pagePropertyContract:{version:1,
   actionVisibility:[{actionId:'Edit',unavailable:'Hide',when}],
   tabVisibility:[{tabId:'details',when}]}};
 assert.equal(behaviorAction(props,'Edit',{formFactor:'Desktop'}),'enabled');
 assert.deepEqual(behaviorTabs(props,['details','other'],{formFactor:'Desktop'}),['details','other']);
 assert.equal(behaviorAction(props,'Edit',{formFactor:'Phone'}),'hidden');
 assert.deepEqual(behaviorTabs(props,['details','other'],{formFactor:'Phone'}),['other']);
});

test('P2 nested expressions update Dynamic Forms required/hidden rules on unsaved values',()=>{
 const when={logic:'All',expression:'1 AND (2 OR 3)',conditions:[
  {source:'Device',operator:'Equals',value:'Desktop'},
  {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Open'},
  {source:'Record Permission',operator:'Equals',value:'Edit'}
 ]};
 const props={pagePropertyContract:{version:1,fieldRules:[
  {fieldApiName:'Phone',behavior:'Required',visibilityRules:when}]}};
 const base={formFactor:'Desktop' as const,
  fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status']),
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>()};
 assert.deepEqual(behaviorField(props,'Phone',{...base,record:{Status:'Closed'}}),
  {visible:false,required:false,readOnly:false});
 assert.deepEqual(behaviorField(props,'Phone',{...base,record:{Status:'Open'}}),
  {visible:true,required:true,readOnly:false});
 assert.deepEqual(behaviorField(props,'Phone',{...base,record:{Status:'Closed'},
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),
  {visible:true,required:true,readOnly:false});
 assert.deepEqual(behaviorField(props,'Phone',{...base,record:{Status:'Open'},
  readableFieldApiNames:new Set<string>()}),
  {visible:false,required:false,readOnly:false});
});

test('PB19 App/Home visibility evaluates authorised viewer profile without record context',()=>{
 const component={visible:true,properties:{visibilityRules:{logic:'All',conditions:[
  {source:'User Profile' as const,operator:'Equals' as const,value:'profile-A'}]}}};
 assert.equal(isComponentVisible(component,{formFactor:'Desktop',profileId:'profile-A'},false),true);
 assert.equal(isComponentVisible(component,{formFactor:'Desktop',profileId:'profile-B'},false),false);
 assert.equal(isComponentVisible(component,{formFactor:'Desktop'},false),false);
});
