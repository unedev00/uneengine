import {createHash} from 'node:crypto';
import {readLoaderWorkbook,writeLoaderWorkbook,type LoaderTable} from './metadata-loader-xlsx.js';

export type LoaderStatus='Valid'|'Error'|'Skipped'|'Success';
export type LoaderRow={sheet:string;excelRow:number;cells:Record<string,string>;status:LoaderStatus;message:string;result:string};
export const digestWorkbook=(buffer:Buffer)=>createHash('sha256').update(buffer).digest('hex');
export function decodeLoaderWorkbook(value:unknown):Buffer{
 if(typeof value!=='string'||value.length>14_000_000
  ||!/^([A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
  throw Error('Invalid XLSX workbook payload');
 const buffer=Buffer.from(value,'base64');
 if(buffer.length>10_000_000)throw Error('Workbook exceeds 10 MB');
 return buffer;
}
export function requireLoaderSheet(buffer:Buffer,name:string,required:string[],maxRows=4000){
 const sheets=readLoaderWorkbook(buffer);
 const sheet=sheets.find(t=>t.name===name);
 if(!sheet)throw Error('Missing '+name+' sheet');
 if(sheet.rows.length>maxRows)throw Error('Maximum '+maxRows+' rows per upload');
 if(required.some(key=>!sheet.columns.includes(key)))throw Error('Missing columns: '+required.filter(key=>!sheet.columns.includes(key)).join(', '));
 const duplicates=sheet.columns.filter((c,i)=>sheet.columns.indexOf(c)!==i);
 if(duplicates.length)throw Error('Duplicate Excel headers');
 return sheet;
}
export function loaderSummary(rows:LoaderRow[]){
 return {total:rows.length,valid:rows.filter(r=>r.status==='Valid').length,
  success:rows.filter(r=>r.status==='Success').length,
  error:rows.filter(r=>r.status==='Error').length,
  skipped:rows.filter(r=>r.status==='Skipped').length};
}
export function loaderReport(original:LoaderTable,rows:LoaderRow[]):string{
 const base=original.columns.filter(c=>!['Status','Result','Message'].includes(c));
 const enriched:Record<string,string>[]=rows.map(r=>({...r.cells,Status:r.status,Result:r.result,Message:r.message}));
 const allColumns=['Sheet','ExcelRow',...base,'Status','Result','Message'];
 const all=enriched.map((r,index)=>Object.fromEntries(allColumns.map(c=>[c,c==='Sheet'?rows[index].sheet:
  c==='ExcelRow'?String(rows[index].excelRow):r[c]??''])));
 const filtered=(name:string,status:LoaderStatus):LoaderTable=>({
  name,columns:allColumns,rows:all.filter(r=>r.Status===status)
 });
 return writeLoaderWorkbook([
  {name:original.name,columns:[...base,'Status','Result','Message'],rows:enriched},
  {name:'All Rows',columns:allColumns,rows:all},
  filtered('Successful','Success'),filtered('Errors','Error'),filtered('Skipped','Skipped')
 ]).toString('base64');
}
export const loaderRows=(sheet:LoaderTable):LoaderRow[]=>
 sheet.rows.map((cells,index)=>({
  sheet:sheet.name,excelRow:Number(cells.__excelRow)||index+2,cells,
  status:'Valid',message:'Ready',result:''
 }));
export const loaderResult=(rows:LoaderRow[],extra:Record<string,unknown>={})=>({
 ...extra,summary:loaderSummary(rows),
 rows:rows.map(row=>({sheet:row.sheet,excelRow:row.excelRow,status:row.status,
  action:row.cells.Action??'Upsert',objectApi:row.cells.ObjectApiName??'',fieldApi:row.cells.ApiName??'',
  message:row.message,result:row.result}))
});
export function loaderFile(tables:LoaderTable[]):string{return writeLoaderWorkbook(tables).toString('base64');}
