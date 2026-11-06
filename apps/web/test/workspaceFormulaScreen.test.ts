import test from 'node:test';
import assert from 'node:assert/strict';
import {openFormulaScreen,previewPrintTemplate,type PopupScreen} from '../src/core/pages/PageRuntime/screenFormula';

test('record workspace popup and print receive the originating record and session',async()=>{
 const host=new EventTarget();
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:host,configurable:true});
 const received:PopupScreen[]=[];
 host.addEventListener('metadrive:workspace-formula-screen',event=>{
  const {appId,screen}=(event as CustomEvent<{appId:string;screen:PopupScreen}>).detail;
  assert.equal(appId,'Desk');
  received.push(screen);
  event.preventDefault();
  screen.ready?.();
 });
 try{
  openFormulaScreen('SCREEN(Form,popup)',{currentAppId:'Desk',objects:[],apps:[],defaultObjectApiName:'Case',
   pages:[{apiName:'Form',pageType:'In-Screen Page',status:'Active'}]},()=>{},'record-page','session1','record1');
  await previewPrintTemplate('Receipt','record2','record-page','session2','Desk');
  assert.deepEqual(received.map(screen=>[screen.page,screen.sessionId,screen.recordId]),
   [['Form','session1','record1'],['Receipt','session2','record2']]);
  assert.notEqual(received[0].instance,received[1].instance);
 }finally{
  if(original)Object.defineProperty(globalThis,'window',original);
  else Reflect.deleteProperty(globalThis,'window');
 }
});
