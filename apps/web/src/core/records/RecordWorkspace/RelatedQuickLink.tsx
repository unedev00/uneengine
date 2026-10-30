import {useState,type ReactNode} from 'react';
export default function RelatedQuickLink({label,total,targetId,onJump,children}:{
  label:string;total:number;targetId?:string;onJump:()=>void;children:ReactNode;
}){
  const [hovered,setHovered]=useState(false),[pinned,setPinned]=useState(false);
  const open=hovered||pinned;
  const close=()=>{setHovered(false);setPinned(false);};
  return <div className="related-quick-link" onMouseEnter={()=>setHovered(true)}
    onMouseLeave={()=>setHovered(false)} onKeyDown={event=>{if(event.key==='Escape')close();}}>
    {targetId?<a href={'#'+encodeURIComponent(targetId)} onClick={event=>{
      event.preventDefault();onJump();close();
    }}>{label} ({total})</a>:<span>{label} ({total})</span>}
    <button type="button" className="text-action" aria-expanded={open}
      aria-label={'Preview '+label} onClick={()=>setPinned(previous=>!previous)}>Preview</button>
    {open&&<div role="region" aria-label={label+' preview'}><button type="button" className="text-action" onClick={close} aria-label={'Close '+label+' preview'}>Close</button>{children}</div>}
  </div>;
}
