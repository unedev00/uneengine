import {useState,type ReactNode} from 'react';
export default function RelatedQuickLink({label,total,targetId,onJump,children}:{
  label:string;total:number;targetId?:string;onJump:()=>void;children:ReactNode;
}){
  const [open,setOpen]=useState(false);
  return <div className="related-quick-link" onMouseEnter={()=>setOpen(true)}
    onMouseLeave={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}>
    {targetId?<a href={'#'+encodeURIComponent(targetId)} onClick={event=>{
      event.preventDefault();onJump();setOpen(false);
    }}>{label} ({total})</a>:<span>{label} ({total})</span>}
    <button type="button" className="text-action" aria-expanded={open}
      aria-label={'Preview '+label} onClick={()=>setOpen(previous=>!previous)}>Preview</button>
    {open&&<div role="region" aria-label={label+' preview'}>{children}</div>}
  </div>;
}
