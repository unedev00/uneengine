import test from 'node:test';
import assert from 'node:assert/strict';
import {flowWorkbookTables,previewFlowExcel} from '../src/core/builders/FlowBuilder/flowExcelWorkbook';
import type {FlowDefinitionMetadata} from '../src/core/metadata/Definitions/metadata';

const initial=():FlowDefinitionMetadata=>({
  id:'00000000-0000-4000-8000-000000000001',apiName:'ExistingTillFlow',label:'Existing Till Flow',
  flowType:'Autolaunched Flow',status:'Draft',versionNumber:3,activeVersion:null,
  triggerObject:null,startConfig:{},versions:[],resources:[{
    name:'invoiceId',label:'Invoice ID',type:'Variable',dataType:'Text',isCollection:false,
    availableForInput:false,availableForOutput:true
  }],
  elements:[
    {id:1,type:'Start',label:'Start',config:{}},
    {id:2,type:'CreateRecord',label:'Create Invoice',config:{objectApiName:'Invoice',inputs:{Total:'@state.cart.total'}}},
    {id:3,type:'End',label:'End',config:{}}
  ],
  connectors:[
    {id:'start-create',from:1,to:2,label:'',kind:'normal'},
    {id:'create-end',from:2,to:3,label:'',kind:'normal'}
  ]
});
const sheets=(flow:FlowDefinitionMetadata)=>flowWorkbookTables(flow);
const lookup=(tables:ReturnType<typeof sheets>,name:string)=>tables.find(t=>t.name===name)!;
const types=['CreateRecord','Assignment','Decision'];

test('unchanged Excel export/import is a lossless no-op',()=>{
 const base=initial(),result=previewFlowExcel(sheets(base),base,types);
 assert.deepEqual(result.errors,[]);
 assert.deepEqual(result.changes,[]);
 assert.deepEqual(result.draft,base);
});
test('new node ID, input config and connection references upsert into existing flow',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Nodes').rows.push({Action:'UPSERT','Node ID':'NEW_1',Type:'Assignment',Label:'Set receipt'});
 lookup(tables,'Inputs').rows.push({Action:'UPSERT','Node ID':'NEW_1',Property:'value','Value (JSON)':JSON.stringify('@state.invoiceId')});
 lookup(tables,'Connections').rows.find(r=>r['Connection ID']==='create-end')!['To Node']='NEW_1';
 lookup(tables,'Connections').rows.push({Action:'UPSERT','Connection ID':'new-end','From Node':'NEW_1','To Node':'3',Label:'',Kind:'normal','Scheduled Path (JSON)':''});
 const result=previewFlowExcel(tables,base,types);
 assert.deepEqual(result.errors,[]);
 const newNode=result.draft.elements.find(n=>n.label==='Set receipt')!;
 assert.equal(newNode.id,4);
 assert.equal(newNode.config.value,'@state.invoiceId');
 assert.equal(result.draft.connectors.find(e=>e.id==='new-end')?.from,4);
 assert.equal(result.draft.connectors.find(e=>e.id==='create-end')?.to,4);
 assert.deepEqual(base,initial(),'source flow must not mutate');
});
test('deleting a connected node is possible only if edges are rewired in same upload',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Nodes').rows.find(r=>r['Node ID']==='2')!.Action='DELETE';
 lookup(tables,'Connections').rows.find(r=>r['Connection ID']==='start-create')!['To Node']='3';
 lookup(tables,'Connections').rows.find(r=>r['Connection ID']==='create-end')!.Action='DELETE';
 const result=previewFlowExcel(tables,base,types);
 assert.deepEqual(result.errors,[]);
 assert.deepEqual(result.draft.elements.map(n=>n.id),[1,3]);
 assert.deepEqual(result.draft.connectors.map(e=>[e.from,e.to]),[[1,3]]);
});
test('unmentioned rows do not delete nodes',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Nodes').rows.splice(1,1);
 const result=previewFlowExcel(tables,base,types);
 assert.deepEqual(result.errors,[]);
 assert.equal(result.draft.elements.length,3);
});
test('incorrect flow identity or stale snapshot is rejected',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Manifest').rows[0]['Flow API']='DifferentFlow';
 assert.throws(()=>previewFlowExcel(tables,base,types),/another flow/);
 lookup(tables,'Manifest').rows[0]['Flow API']=base.apiName;
 lookup(tables,'Manifest').rows[0]['Snapshot']='invalid';
 assert.throws(()=>previewFlowExcel(tables,base,types),/changed since download/);
});
test('invalid rows are reported and broken graph prevents applying',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Connections').rows.find(r=>r['Connection ID']==='create-end')!['To Node']='999';
 const result=previewFlowExcel(tables,base,types);
 assert.ok(result.errors.some(e=>e.includes('Connections row')));
 // A rejected row leaves the original valid edge intact.
 assert.deepEqual(result.draft.connectors,base.connectors);
 const broken=sheets(base);
 lookup(broken,'Connections').rows.find(r=>r['Connection ID']==='create-end')!.Action='DELETE';
 const invalidGraph=previewFlowExcel(broken,base,types);
 assert.ok(invalidGraph.errors.some(e=>e.includes('Graph:')));
});
test('invalid JSON settings do not overwrite existing node config',()=>{
 const base=initial(),tables=sheets(base);
 lookup(tables,'Inputs').rows.find(r=>r.Property==='inputs')!['Value (JSON)']='invalid JSON';
 const result=previewFlowExcel(tables,base,types);
 assert.ok(result.errors.some(e=>e.includes('Invalid JSON')));
 assert.deepEqual(result.draft.elements.find(n=>n.id===2)?.config,base.elements.find(n=>n.id===2)?.config);
});
