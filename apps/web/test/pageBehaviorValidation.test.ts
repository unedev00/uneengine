import test from 'node:test';
import assert from 'node:assert/strict';
import {behaviorValidation} from '../src/core/pages/PageRuntime/pageBehaviorRuntime';
import {pagePropertyIssues} from '../src/core/components/Properties/pagePropertyContract';

const rejectOnPhone={logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Phone'}]};
const properties={pagePropertyContract:{version:1,validationRules:[{event:'click',message:'Unavailable on phone',when:rejectOnPhone}]}};

test('validation rules remain legal versioned component metadata',()=>{
 assert.deepEqual(pagePropertyIssues('Custom:une_button',properties),[]);
});

test('event validation evaluates declared conditions and does not block unrelated events',()=>{
 assert.equal(behaviorValidation(properties,'change',{formFactor:'Phone'}),'Unavailable on phone');
 assert.equal(behaviorValidation(properties,'click',{formFactor:'Desktop'}),null);
 assert.equal(behaviorValidation(properties,'change',{formFactor:'Phone'}),null);
 assert.equal(behaviorValidation({},'click',{formFactor:'Phone'}),null);
});
