import {parseScreenAction} from '../../../../../server/src/expression-engine/ActionFormulas.js';
import {resolvePageActionRoute,type PageActionRoutingContext,type PageActionRoute} from './pageActionRouting';
import {appRoutePath} from '../../workspace/Navigation/appRouting';

export type PopupScreen={page:string;sessionId:string;recordId:string;instance:string;inScreen:boolean;print?:boolean;ready?:()=>void;failed?:(reason:Error)=>void};
export function openFormulaScreen(source:string,context:PageActionRoutingContext,
 onNavigate:(route:PageActionRoute)=>void,parentKey:string,sessionId:string,recordId:string){
 const {page,mode}=parseScreenAction(source);
 const inScreen=mode==='popup'&&context.pages.some(item=>
  item.apiName===page&&item.pageType==='In-Screen Page'&&item.status==='Active');
 const route=inScreen?null:resolvePageActionRoute({navigationTargetType:'App Page',navigationPageApiName:page},context);
 if(mode==='popup'){
  const screen:PopupScreen={page,sessionId,recordId,instance:crypto.randomUUID(),inScreen};
  const handled=!window.dispatchEvent(new CustomEvent('metadrive:open-formula-screen',{
   detail:{parentKey,screen},cancelable:true
  }));
  if(!handled)throw Error('This page has no popup host');
 }else if(route){
  if(mode==='current')onNavigate(route);
  else window.open(appRoutePath(route),'_blank','noopener');
 }
 return {navigated:true};
}

export function previewPrintTemplate(page:string,recordId:string,parentKey:string,sessionId:string){
 return new Promise<void>((ready,failed)=>{
  const screen:PopupScreen={page,recordId,sessionId,instance:crypto.randomUUID(),inScreen:false,print:true,ready,failed};
  if(window.dispatchEvent(new CustomEvent('metadrive:open-formula-screen',{detail:{parentKey,screen},cancelable:true})))
   failed(Error('This page has no print preview host'));
 });
}
