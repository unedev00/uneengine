import test from 'node:test';
import assert from 'node:assert/strict';
import {behaviorValidation,behaviorTabForChild} from '../src/core/pages/PageRuntime/pageBehaviorRuntime';
import {pagePropertyIssues} from '../src/core/components/Properties/pagePropertyContract';
import {validateVisibilityRule} from '../src/core/components/Properties/componentVisibility';

const rejectOnPhone={logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Phone'}]};
const properties={pagePropertyContract:{version:1,validationRules:[{event:'click',message:'Unavailable on phone',when:rejectOnPhone}]}};

test('validation rules remain legal versioned component metadata',()=>{
 assert.deepEqual(pagePropertyIssues('Custom:une_button',properties),[]);
});

test('event validation evaluates declared conditions and does not block unrelated events',()=>{
 assert.equal(behaviorValidation(properties,'click',{formFactor:'Phone'}),'Unavailable on phone');
 assert.equal(behaviorValidation(properties,'click',{formFactor:'Desktop'}),null);
 assert.equal(behaviorValidation(properties,'change',{formFactor:'Phone'}),null);
 assert.equal(behaviorValidation({},'click',{formFactor:'Phone'}),null);
});

test('children assigned to hidden tabs are not rendered under a different visible tab',()=>{
 const tabs=['Overview','Admin'];
 const visibleTabs=['Overview'];
 assert.equal(behaviorTabForChild('Admin',tabs,visibleTabs),null);
 assert.equal(behaviorTabForChild('Overview',tabs,visibleTabs),'Overview');
 assert.equal(behaviorTabForChild(undefined,tabs,visibleTabs),'Overview');
});

test('behavior condition contract accepts inclusive comparisons and blank operators',()=>{
 const fields=[{apiName:'Amount',label:'Amount',dataType:'Currency'}] as any;
 for(const operator of ['Greater Than or Equal','Less Than or Equal','Is Blank','Is Not Blank']){
  assert.deepEqual(validateVisibilityRule({logic:'All',conditions:[
   {source:'Record Field',fieldApiName:'Amount',operator,value:operator.includes('Blank')?'':'10'}
  ]},fields,true),[]);
 }
});
