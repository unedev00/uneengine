import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzePagePerformance} from '../src/core/builders/PageBuilder/pagePerformanceAnalysis';

test('PB22 performance analyzer reports concrete configuration and actionable guidance',()=>{
 const page={components:[
  {id:'list',type:'List View',label:'Open cases',visible:true,properties:{pageSize:250}},
  {id:'image',type:'une_image',label:'Hero',visible:true,properties:{src:'data:image/png;base64,'+'A'.repeat(51000)}},
  {id:'hidden',type:'Report Chart',label:'Hidden report',visible:false,properties:{}},
  {id:'conditions',type:'Record Field',label:'Conditional',visible:true,
    properties:{pagePropertyContract:{version:1,fieldRules:[]}}}
 ]};
 const result=analyzePagePerformance(page as any);
 assert.deepEqual(result.map(x=>x.componentId),['list','list','image','conditions']);
 assert.ok(result.every(x=>x.recommendation.length>15));
 assert.equal(result.some(x=>x.componentId==='hidden'),false);
});
test('PB22 no invented performance result for static page',()=>{
 assert.deepEqual(analyzePagePerformance({components:[]}),[]);
});
