import * as React from 'react';
import {useEffect,useRef,useState} from 'react';
export type OptionGroup={
 id:string;
 label:string;
 required?:boolean;
 choices:Array<{id:string;label:string;description?:string}>;
};
export type Selection={groupId:string;choiceId:string};
export default function ProductCustomiser({name,image,groups,onCancel,onAdd}:{
 name:string;image:string;groups:OptionGroup[];
 onCancel:()=>void;onAdd:(selections:Selection[])=>void;
}){
 const [selected,setSelected]=useState<Record<string,string>>({});
 const dialogRef=useRef<HTMLElement>(null);
 const cancelRef=useRef<HTMLButtonElement>(null);
 const onCancelRef=useRef(onCancel);
 onCancelRef.current=onCancel;
 useEffect(()=>{
   const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
   const dialog=dialogRef.current;
   cancelRef.current?.focus();
   const handleKey=(event:KeyboardEvent)=>{
     if(event.key==='Escape'){event.preventDefault();onCancelRef.current();return;}
     if(event.key!=='Tab'||!dialog)return;
     const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
     if(!controls.length){event.preventDefault();return;}
     const first=controls[0],last=controls[controls.length-1];
     if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
   };
   document.addEventListener('keydown',handleKey);
   return()=>{document.removeEventListener('keydown',handleKey);previous?.focus();};
 },[]);
 const valid=groups.every(group=>!group.required||Boolean(selected[group.id]));
 return <div className="ak-modal-backdrop" role="presentation">
   <section ref={dialogRef} className="ak-modal" role="dialog" aria-modal="true" aria-labelledby="ak-custom-title">
     <div className="ak-modal-top"><button ref={cancelRef} type="button" onClick={onCancel}>← Menu</button><span>CUSTOMISE YOUR ORDER</span></div>
     <div className="ak-modal-body">{image&&<img className="ak-modal-image" src={image} alt=""/>}
       <h2 id="ak-custom-title">{name}</h2>
       {groups.map(group=><fieldset key={group.id} className="ak-options"><legend>{group.label}{group.required?' *':''}</legend>
         {group.choices.map(choice=><label key={choice.id} className={selected[group.id]===choice.id?'ak-option selected':'ak-option'}>
           <input type="radio" name={group.id} value={choice.id} checked={selected[group.id]===choice.id}
             onChange={()=>setSelected(s=>({...s,[group.id]:choice.id}))}/>
           <span><strong>{choice.label}</strong>{choice.description&&<small>{choice.description}</small>}</span>
         </label>)}
       </fieldset>)}
     </div>
     <div className="ak-modal-footer"><button type="button" className="ak-primary" disabled={!valid}
       onClick={()=>onAdd(Object.entries(selected).map(([groupId,choiceId])=>({groupId,choiceId})))}>Add to basket →</button></div>
   </section>
 </div>;
}
