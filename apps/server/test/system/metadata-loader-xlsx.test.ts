import test from 'node:test';
import assert from 'node:assert/strict';
import {readLoaderWorkbook,writeLoaderWorkbook} from '../../src/system-support/metadata-loader-xlsx.js';

test('exported metadata XLSX can be read back without losing fields or special characters',()=>{
 const sheets=[
  {name:'Objects',columns:['Action','ApiName','Label','Description','Revision'],
   rows:[{Action:'Upsert',ApiName:'Product',Label:'Products & <Inventory>',Description:'Quoted "text" and a new\nline',Revision:'3'}]},
  {name:'Fields',columns:['Action','ObjectApiName','ApiName','DataType','FormulaExpression','PicklistValues'],
   rows:[{Action:'Upsert',ObjectApiName:'Product',ApiName:'Price__c',DataType:'Currency(18,2)',
    FormulaExpression:'@Product.Cost__c * 1.2',PicklistValues:'["A","B"]'}]}
 ];
 const workbook=writeLoaderWorkbook(sheets);
 assert.equal(workbook.readUInt32LE(0),0x04034b50);
 const read=readLoaderWorkbook(workbook);
 assert.equal(read.length,2);
 assert.deepEqual(read[0].rows[0],{...sheets[0].rows[0],__excelRow:'2'});
 assert.deepEqual(read[1].rows[0],{...sheets[1].rows[0],__excelRow:'2'});
});
test('rejects damaged archives and oversized worksheets',()=>{
 assert.throws(()=>readLoaderWorkbook(Buffer.from('invalid')),/Invalid XLSX/);
 assert.throws(()=>writeLoaderWorkbook([{name:'Objects',columns:['A'],rows:Array.from({length:10001},()=>({A:'x'}))}]),/Invalid workbook size/);
});
test('Excel-looking formulas remain inert strings on export',()=>{
 const sheet={name:'Fields',columns:['DataType'],rows:[{DataType:'=HYPERLINK("https://invalid.example")'}]};
 const parsed=readLoaderWorkbook(writeLoaderWorkbook([sheet]));
 assert.equal(parsed[0].rows[0].DataType,sheet.rows[0].DataType);
});
