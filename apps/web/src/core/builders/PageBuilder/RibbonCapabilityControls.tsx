import {useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal,ChevronDown,PaintBucket,Square,Scan,Layers,Blend,Type,Bold,AlignLeft,Palette,CaseSensitive,Image,Ratio,Move,CalendarDays,CalendarRange,Clock,Table2,ChartNoAxesCombined,Grid2X2,Columns3,WrapText,PanelTop,Menu,MousePointer,Settings2} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';

type PropertyDefinition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
type Values=Record<string,unknown>;
/** A compact icon-first surface backed exclusively by the component's declared metadata. */
export default function RibbonCapabilityControls({group,definitions,properties,onChange,icon}:{
 group:string;definitions:readonly PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;icon:ReactNode;
}){
 const [open,setOpen]=useState(false);
 const enabled=definitions.length>0;
 const commands:Record<string,Array<{name:string;icon:ReactNode}>>={
  Card:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Border',icon:<Square size={16}/>},{name:'Corners',icon:<Scan size={16}/>},{name:'Shadow',icon:<Layers size={16}/>},{name:'Opacity',icon:<Blend size={16}/>}],
  Heading:[{name:'Size',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Bold',icon:<Bold size={16}/>},{name:'Align',icon:<AlignLeft size={16}/>}],
  'Supporting text':[{name:'Size',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Bold',icon:<Bold size={16}/>},{name:'Align',icon:<AlignLeft size={16}/>}],
  Badge:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Text',icon:<CaseSensitive size={16}/>},{name:'Border',icon:<Square size={16}/>}],
  Image:[{name:'Fit',icon:<Image size={16}/>},{name:'Shape',icon:<Square size={16}/>},{name:'Ratio',icon:<Ratio size={16}/>},{name:'Position',icon:<Move size={16}/>}],
  Calendar:[{name:'View',icon:<CalendarDays size={16}/>},{name:'Header',icon:<PanelTop size={16}/>},{name:'Time',icon:<Clock size={16}/>},{name:'Weekends',icon:<CalendarRange size={16}/>}],
  Chart:[{name:'Type',icon:<ChartNoAxesCombined size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Size',icon:<Ratio size={16}/>}],
  Table:[{name:'Table',icon:<Table2 size={16}/>},{name:'Columns',icon:<Columns3 size={16}/>}],
  Container:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Grid',icon:<Grid2X2 size={16}/>},{name:'Wrap',icon:<WrapText size={16}/>}],
  Navigation:[{name:'Menu',icon:<Menu size={16}/>},{name:'Direction',icon:<Move size={16}/>}],
  Button:[{name:'Button',icon:<MousePointer size={16}/>},{name:'Colour',icon:<Palette size={16}/>}],
  Text:[{name:'Text',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>}]
 };
 const named=commands[group]??[{name:group,icon},{name:'Settings',icon:<Settings2 size={16}/>},{name:'Options',icon:<SlidersHorizontal size={16}/>}];
 return <div className="office-ribbon-capabilities" aria-label={group+' commands'}>
   {named.map(cmd=><button key={cmd.name} type="button" className="office-ribbon-capability-icon"
     disabled={!enabled} title={enabled?group+' '+cmd.name:group+' '+cmd.name+' unavailable'}
     aria-label={group+' '+cmd.name} onClick={()=>setOpen(true)}>{cmd.icon}</button>)}
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
