import * as React from 'react';
import {createPortal} from 'react-dom';
import type {PopupScreen} from './screenFormula';

type Request={appId:string;screen:PopupScreen};
export default function WorkspaceFormulaScreen({render}:{render:(request:Request)=>React.ReactNode}){
 const [requests,setRequests]=React.useState<Request[]>([]);
 React.useEffect(()=>{
  const open=(event:Event)=>{
   const detail=(event as CustomEvent<Request>).detail;
   event.preventDefault();
   setRequests(current=>[...current,detail]);
  };
  window.addEventListener('metadrive:workspace-formula-screen',open);
  return ()=>window.removeEventListener('metadrive:workspace-formula-screen',open);
 },[]);
 return <>{requests.map(request=>{
  const {screen}=request;
  return createPortal(<dialog open aria-label={screen.page} className={screen.print?'formula-print-preview':undefined}
    style={{position:'fixed',inset:0,zIndex:1200,width:'85vw',height:'85vh',overflow:'auto'}}>
    <button onClick={()=>{screen.failed?.(Error('Preview closed'));setRequests(current=>current.filter(item=>item!==request));}}>Close</button>
    {screen.print&&<button onClick={()=>window.print()}>Print / Save PDF</button>}
    <React.Suspense fallback={null}>{render(request)}</React.Suspense>
   </dialog>,document.body,screen.instance);
 })}</>;
}
