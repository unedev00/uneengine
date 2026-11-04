import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {FlowDefinitionMetadata, ObjectMetadata} from '../src/core/metadata/Definitions/metadata';
import {flowReferenceChoices, flowReferenceSymbol} from '../src/core/builders/FlowBuilder/flowReferenceCatalog';
import {flowReferenceBrowserGroups} from '../src/core/builders/FlowBuilder/flowReferenceBrowserModel';
import {httpResponseMapping, httpSampleFields, toggleHttpResponseField,
  toggleHttpStandardOutput} from '../src/core/builders/FlowBuilder/flowHttpOutputs';
import {flowReferenceTokenAt, insertFlowReference} from '../src/core/builders/FlowBuilder/flowReferenceTokens';

const order: ObjectMetadata={
  apiName:'Order',label:'Order',pluralLabel:'Orders',kind:'Custom Object',description:'',
  fields:[{apiName:'Email',label:'Email',dataType:'Text',required:false,unique:false}]
};

function flow():FlowDefinitionMetadata {
  return {
    apiName:'OrderSync',label:'Order Sync',flowType:'Record-Triggered Flow',status:'Draft',versionNumber:1,
    activeVersion:null,triggerObject:'Order',startConfig:{},
    elements:[
      {id:1,type:'Start',label:'Start',config:{}},
      {id:2,type:'HTTP Callout',label:'Get Payment',config:{method:'GET',path:'v1/pay'}},
      {id:3,type:'Update Records',label:'Save',config:{}}
    ],
    connectors:[{id:'a',from:1,to:2,label:'Default',kind:'normal'},{id:'b',from:2,to:3,label:'Default',kind:'normal'}],
    resources:[{name:'Counter',label:'Counter',type:'Variable',dataType:'Number',
      isCollection:false,availableForInput:false,availableForOutput:false}],
    versions:[]
  };
}

test('@ is record data, $ is user/system, ! is a Flow value',()=>{
  assert.equal(flowReferenceSymbol('{!$Record.Email}'),'@');
  assert.equal(flowReferenceSymbol('{!$Record__Prior.Email}'),'@');
  assert.equal(flowReferenceSymbol('{!record3.Id}'),'@');
  assert.equal(flowReferenceSymbol('{!$User.Id}'),'$');
  assert.equal(flowReferenceSymbol('{!$Flow.FaultMessage}'),'$');
  assert.equal(flowReferenceSymbol('{!Counter}'),'!');
});

test('typing a shortcut at the cursor is detected, but prices and order numbers stay text',()=>{
  assert.deepEqual(flowReferenceTokenAt('Hi @Rec',7),{start:3,symbol:'@',query:'Rec'});
  assert.deepEqual(flowReferenceTokenAt('!',1),{start:0,symbol:'!',query:''});
  assert.deepEqual(flowReferenceTokenAt('Total = !Am',11),{start:8,symbol:'!',query:'Am'});
  // Typed in quotes, after a letter, or doubled, the symbol stays plain text.
  assert.equal(flowReferenceTokenAt('Say "!',6),null);
  assert.equal(flowReferenceTokenAt('Say "@',6),null);
  assert.equal(flowReferenceTokenAt('Hello!',6),null);
  assert.equal(flowReferenceTokenAt('Wow !!',6),null);
  assert.deepEqual(flowReferenceTokenAt('v1/$Us',6),{start:3,symbol:'$',query:'Us'});
  assert.equal(flowReferenceTokenAt('Cost $5',7),null);
  assert.equal(flowReferenceTokenAt('Order !12',9),null);
  assert.equal(flowReferenceTokenAt('mail@example',12),null);
  assert.deepEqual(insertFlowReference('Hi @Em!',3,6,'{!$Record.Email}'),
    {value:'Hi {!$Record.Email}!',cursor:19});
});

test('ticking HTTP outputs declares typed variables the next step can pick with !',()=>{
  const fields=httpSampleFields('{"payment":{"id":"P1","amount":12.5,"paid":true},"items":[{"sku":"A"}]}');
  assert.deepEqual(fields.map(field=>[field.path,field.dataType]),[
    ['payment.id','Text'],['payment.amount','Number'],['payment.paid','Boolean'],['items[0].sku','Text']]);
  let next=toggleHttpStandardOutput(flow(),2,'status',true);
  next=toggleHttpResponseField(next,2,fields[1],true);
  assert.equal(next.elements[1].config.statusVariable,'Get_Payment_Status');
  assert.deepEqual(httpResponseMapping(next.elements[1]),{Get_Payment_payment_amount:'payment.amount'});
  assert.equal(next.resources.find(item=>item.name==='Get_Payment_payment_amount')?.dataType,'Number');
  const later=flowReferenceChoices(next,3,[order]);
  const amount=later.find(choice=>choice.reference==='{!Get_Payment_payment_amount}');
  assert.equal(amount?.symbol,'!');
  assert.equal(amount?.category,'Earlier steps');
  assert.match(amount?.label??'',/^Get Payment → /);
  // The callout's own outputs are not offered before it runs.
  assert.ok(!flowReferenceChoices(next,2,[order]).some(choice=>choice.reference==='{!Get_Payment_Status}'));
  const hash=flowReferenceBrowserGroups(next,3,[order],undefined,undefined,'!');
  assert.ok(hash.directOptions.some(option=>option.reference==='{!Get_Payment_Status}'));
  assert.ok(hash.groups.every(group=>!group.path.startsWith('$Record')));
  // Unticking removes the mapping and the unused auto-declared variable.
  const removed=toggleHttpResponseField(next,2,fields[1],false);
  assert.deepEqual(httpResponseMapping(removed.elements[1]),{});
  assert.ok(!removed.resources.some(item=>item.name==='Get_Payment_payment_amount'));
});

test('auto output names never clash with existing resources',()=>{
  const draft=flow();
  draft.resources.push({name:'Get_Payment_Status',label:'x',type:'Variable',dataType:'Text',
    isCollection:false,availableForInput:false,availableForOutput:false});
  const next=toggleHttpStandardOutput(draft,2,'status',true);
  assert.equal(next.elements[1].config.statusVariable,'Get_Payment_Status_2');
});
