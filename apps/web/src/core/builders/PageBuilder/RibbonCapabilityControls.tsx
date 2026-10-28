import {useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal,ChevronDown} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';

type PropertyDefinition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
type Values=Record<string,unknown>;
/** A compact icon-first surface backed exclusively by the component's declared metadata. */
export default function RibbonCapabilityControls({group,definitions,properties,onChange,icon}:{
 group:string;definitions:readonly PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;icon:ReactNode;
}){
 const [open,setOpen]=useState(false);
 const enabled=definitions.length>0;
 return <div className="office-ribbon-capabilities" aria-label={group+' commands'}>
   <button type="button" className="office-ribbon-capability-icon" disabled={!enabled}
     title={enabled?'Configure '+group:group+' unavailable'} aria-label={'Configure '+group}
     onClick={()=>setOpen(true)}>{icon}</button>
   <button type="button" className="office-ribbon-capability-icon" disabled={!enabled}
     aria-label={group+' settings'} onClick={()=>setOpen(true)}><SlidersHorizontal size={16}/></button>
   <button type="button" className="office-ribbon-capability-icon" disabled={!enabled}
     aria-label={group+' options'} onClick={()=>setOpen(true)}><ChevronDown size={16}/></button>
   {open&&createPortal(<div className="office-ribbon-capability-backdrop" role="presentation" onMouseDown={()=>setOpen(false)}>
     <section role="dialog" aria-modal="true" aria-label={group+' properties'} className="office-ribbon-capability-dialog"
       onMouseDown={event=>event.stopPropagation()}>
       <header><strong>{group} properties</strong><button type="button" onClick={()=>setOpen(false)}>Close</button></header>
       {definitions.map(def=>{
         const key=def.propertyKey,value=properties[key]??def.defaultValue??'';
         const update=(next:unknown)=>onChange({...properties,[key]:next});
         if(def.kind==='BOOLEAN')return <label key={key}><input type="checkbox" checked={value===true} onChange={e=>update(e.target.checked)}/>{def.label}</label>;
         if(def.kind==='SELECT')return <label key={key}>{def.label}<select value={String(value)} onChange={e=>update(e.target.value)}>
           <option value="">Choose</option>{(def.choices??[]).map(option=><option key={option.key} value={option.key}>{option.label}</option>)}
         </select></label>;
         if(def.kind==='NUMBER'||def.kind==='CURRENCY')return <label key={key}>{def.label}<input type="number" value={typeof value==='number'?value:''} onChange={e=>update(e.target.value===''?undefined:Number(e.target.value))}/></label>;
         if(['TEXT','STRING','LONG_TEXT','TEXTAREA','COLOR'].includes(def.kind))return <label key={key}>{def.label}<input type="text" value={String(value)} onChange={e=>update(e.target.value)}/></label>;
         return <p key={key}>{def.label}: use the detailed metadata editor for this property.</p>;
       })}
     </section>
   </div>,document.body)}
 </div>;
}
