import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildPrintDocument,vectorPdf,resolvePrintValue} from '../../src/system-support/backend-print-template-pdf-service.js';
import {ScheduledActionService} from '../../src/system-support/scheduled-action-service.js';
import {compileActionPlan} from '../../src/expression-engine/ActionFormulas.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';

const uuid='11111111-1111-4111-8111-111111111111';
const sample={
 apiName:'Receipt',pageType:'Print Template',status:'Active',targetObject:'Sale',
 layoutMode:'free-canvas',canvasWidth:794,canvasHeight:1123,canvasFillColor:'#ffffff',
 components:[
  {id:'title',type:'smart_text',label:'Receipt title',visible:true,
   position:{x:28,y:24,width:420,height:80},
   properties:{textSource:'Receipt for @Sale.Name',fontSize:24,color:'#111111'}},
  {id:'name',type:'smart_label',label:'Name',visible:true,
   position:{x:28,y:112,width:340,height:40},
   properties:{textSource:'@Sale.Name',textSize:18,color:'#123456',backgroundColor:'#eeeeee'}},
  {id:'amount',type:'smart_text',label:'Total',visible:true,
   position:{x:28,y:158,width:340,height:40},
   properties:{textSource:'=ROUND(@Sale.Total, 2)',fontSize:16}}
 ]
};
test('backend can resolve permitted record bindings and expressions without a browser session',()=>{
 const record={Name:'Customer & <One>',Total:12.345,Id:uuid};
 assert.equal(resolvePrintValue('@Sale.Name',record,'Sale'),record.Name);
 assert.equal(resolvePrintValue('=ROUND(@Sale.Total, 2)',record,'Sale'),'12.35');
 assert.throws(()=>resolvePrintValue('@Other.Name',record,'Sale'),/another object/);
 assert.throws(()=>resolvePrintValue('@Sale.Hidden',record,'Sale'),/unavailable/);
});
test('published Print Template can be populated and saved as PDF without document/window',async()=>{
 const page={...sample,components:sample.components.map(x=>({...x,
  properties:{...x.properties,textSource:x.id==='title'?'Receipt':x.properties.textSource}}))};
 const document=await buildPrintDocument(page,{Id:uuid,Name:'Customer & <One>',Total:12.345});
 assert(document.html.includes('Customer &amp; &lt;One&gt;'));
 assert(!document.html.includes('<One>'));
 assert(document.html.includes('left:28px;top:112px'));
 const pdf=vectorPdf(document);
 assert.equal(pdf.toString('ascii',0,5),'%PDF-');
 assert(pdf.toString('latin1').includes('Customer & <One>'));
 assert(pdf.toString('ascii',pdf.length-10).includes('%%EOF'));
});
test('backend print output rejects hidden data and unsafe remote images',async()=>{
 const missing={...sample,components:[{...sample.components[1],
  properties:{textSource:'@Sale.SecretField'}}]};
 await assert.rejects(buildPrintDocument(missing,{Name:'Visible',Id:uuid,Total:1}),
  /Print field is unavailable/);
 const image={...sample,components:[{id:'image',type:'smart_image',label:'Logo',visible:true,
  position:{x:0,y:0,width:200,height:200},
  properties:{imageSource:'https://private.example/secret'}}]};
 await assert.rejects(buildPrintDocument(image,{Id:uuid,Name:'A',Total:10}),/permitted tenant media/);
});
test('WAIT can schedule CREATEPDF after 600 minutes and retain follow-up attachment',async()=>{
 const seq='=ACTIONS(WAIT(600,0),CREATEPDF(Receipt,"'+uuid+'",AS(pdf)),WHATSAPP(Brevo,"+441234","Receipt",pdf.FileId))';
 assert.deepEqual(compileActionPlan(seq).map(x=>x.name),['WAIT','CREATEPDF','WHATSAPP']);
 const sql:string[]=[];
 const fake={
  transaction:async<T>(cb:(client:{query:(sql:string,values:unknown[])=>Promise<{rows:unknown[]}>})=>Promise<T>):Promise<T>=>cb({
   query:async(query:string)=>{
    sql.push(query);
    return {rows:[{id:uuid}]};
   }
  })
 } as unknown as SqlPersistence;
 const response=await new ScheduledActionService(fake).schedule('tenant','user',{
  formula:seq,nextStep:1,seconds:36000,scope:{},variables:{},sessionId:'expired-session'
 });
 assert.equal(response.status,'Pending');
 assert(sql.some(x=>x.includes('INSERT INTO md_scheduled_actions')));
});


test('backend PDF preserves related table rows and PDF image objects',async()=>{
 const table={...sample,components:[{id:'line-items',type:'smart_table',
  label:'Line items',visible:true,position:{x:20,y:150,width:740,height:120},
  properties:{dataCollection:{objectApiName:'SaleLine',columns:['Name','Amount']},
   relatedFieldApiName:'SaleId'}}]};
 const doc=await buildPrintDocument(table,{Id:uuid,Name:'Order',Total:9},undefined,
  async()=>[{Name:'Line A',Amount:9},{Name:'Line B',Amount:0}]);
 assert(doc.html.includes('<table'));
 assert(doc.html.includes('Line A'));
 assert(doc.html.includes('Line B'));
 assert(vectorPdf(doc).toString('ascii',0,5)==='%PDF-');
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9en9ZJUAAAAASUVORK5CYII=';
 const picture={...sample,components:[{id:'logo',type:'smart_image',label:'Logo',
  visible:true,position:{x:5,y:5,width:120,height:120},
  properties:{imageSource:'asset:'+uuid}}]};
 const imageDoc=await buildPrintDocument(picture,{Id:uuid,Name:'Order',Total:10},
  async()=>({contentType:'image/png',contentBase64:png}));
 const pdf=vectorPdf(imageDoc);
 assert(pdf.toString('latin1').includes('/Subtype /Image'));
 assert(pdf.toString('latin1').includes('/FlateDecode'));
});
