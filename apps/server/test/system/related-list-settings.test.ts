import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRelatedListSettings} from '../../src/system-files/object-definition.js';

test('existing record page layouts keep their default related-list behavior',()=>{
 assert.deepEqual(validateRelatedListSettings(['Invoices'],undefined),{});
 assert.deepEqual(validateRelatedListSettings(['Invoices'],{}),{});
});

test('configured related lists accept columns, filtering, sort, page size and action visibility',()=>{
 const settings={Invoices:{columns:['Number','Amount'],sortField:'Amount',sortDirection:'desc',
  filterField:'Status',filterValue:'Open',filterOperator:'Equals',pageSize:25,
  showNewAction:true,showRowActions:false}};
 assert.deepEqual(validateRelatedListSettings(['Invoices'],settings),settings);
});

test('strict settings validation rejects unknown lists and unsafe/invalid properties',()=>{
 const invalid=[
  {Unknown:{columns:['Name']}},
  {Invoices:{columns:['Bad;DROP TABLE']}}, 
  {Invoices:{columns:['Name','Name']}},
  {Invoices:{columns:Array(13).fill('Field')}},
  {Invoices:{sortField:'Name;DROP'}},
  {Invoices:{pageSize:200}},
  {Invoices:{sortDirection:'sideways'}},
  {Invoices:{filterOperator:'Match Everything'}},
  {Invoices:{filterField:'Status'}},
  {Invoices:{filterValue:'Open'}},
  {Invoices:{showRowActions:'yes'}},
  {Invoices:{unsafeHTML:'<script>'}}
 ];
 for(const settings of invalid){
  assert.throws(()=>validateRelatedListSettings(['Invoices'],settings),undefined,
    JSON.stringify(settings));
 }
});

test('related-list grouped conditions persist and reject malformed expressions',()=>{
 const settings={Invoices:{filters:[{field:'Status',operator:'Equals',value:'Open'},
  {field:'Amount',operator:'Greater Than',value:'100'}],filterLogic:'1 OR 2'}};
 assert.deepEqual(validateRelatedListSettings(['Invoices'],settings),settings);
 for(const filterLogic of ['1 OR 3','1 OR 1','1; DROP TABLE','']){
  if(!filterLogic)continue;
  assert.throws(()=>validateRelatedListSettings(['Invoices'],{Invoices:{...settings.Invoices,filterLogic}}));
 }
 assert.throws(()=>validateRelatedListSettings(['Invoices'],{Invoices:{filters:[{field:'Name',operator:'Equals',value:{source:'PageState'}}]}}));
});
