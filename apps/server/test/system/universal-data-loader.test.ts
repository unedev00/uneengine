import test from 'node:test';
import assert from 'node:assert/strict';
import {readLoaderWorkbook,writeLoaderWorkbook} from '../../src/system-support/metadata-loader-xlsx.js';
import {digestWorkbook,requireLoaderSheet,loaderReport,loaderRows} from '../../src/system-support/universal-loader-common.js';
import {convert,payload,type Context,type Field} from '../../src/system-support/universal-loader-record-helpers.js';

const field=(apiName:string,dataType:string):Field=>({apiName,dataType,required:false,
 label:apiName,unique:false} as Field);

test('Records Excel download is reuploadable and row numbers survive validation reports',()=>{
 const worksheet={name:'Records',columns:['Action','ObjectApiName','Id','Name','Price'],
  rows:[{Action:'Upsert',ObjectApiName:'Product',Id:'',Name:'New Burger',Price:'4.50'},
   {Action:'Upsert',ObjectApiName:'Product',Id:'',Name:'=NotAnExcelFormula',Price:'bad'}]};
 const file=writeLoaderWorkbook([worksheet]);
 const opened=requireLoaderSheet(file,'Records',['Action','ObjectApiName','Id']);
 assert.equal(opened.rows[0].Name,'New Burger');
 assert.equal(opened.rows[1].Name,'=NotAnExcelFormula');
 const rows=loaderRows(opened);
 rows[0].status='Success';rows[0].result='Created 111';
 rows[1].status='Error';rows[1].message='Price must be a finite number';
 const report=readLoaderWorkbook(Buffer.from(loaderReport(opened,rows),'base64'));
 assert.deepEqual(report.map(sheet=>sheet.name),['Records','All Rows','Successful','Errors','Skipped']);
 assert.equal(report[3].rows[0].ExcelRow,'3');
 assert.equal(report[2].rows[0].Result,'Created 111');
 assert.equal(digestWorkbook(file).length,64);
});
test('Record cells preserve numbers, booleans, blank and explicit clear semantics',()=>{
 const ctx={writable:new Map([['Price',field('Price','Currency(18,2)')],
  ['Active',field('Active','Checkbox')],['Name',field('Name','Text(80)')]])} as unknown as Context;
 const row={sheet:'Records',excelRow:2,cells:{Action:'Upsert',ObjectApiName:'Product',Id:'',
  Price:'0',Active:'FALSE',Name:'<CLEAR>'},status:'Valid',message:'Ready',result:''} as const;
 assert.deepEqual(payload(row as any,ctx),{Price:0,Active:false,Name:null});
 assert.equal(convert(field('Price','Number(18,2)'),'7.25'),7.25);
 assert.throws(()=>convert(field('Active','Checkbox'),'maybe'),/TRUE or FALSE/);
 assert.throws(()=>convert(field('Price','Currency(18,2)'),'NaN'),/finite number/);
 assert.throws(()=>convert(field('CustomerId','Lookup(Account)'),'not-a-uuid'),/record ID/);
});
