import {useState} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import type {PropertyDevice} from '../../components/Properties/componentSettingDefinitions';
import {RibbonDesign,RibbonFormat} from './PageBuilderRibbonStyle';

type Properties=Record<string,unknown>;

/** Retain all legacy/styling metadata without allowing the old full-size
 * property inspector to distort the compact Design tab. */
export default function PageBuilderAdvancedStyle({properties,componentType,definition,device,excludeKeys,onChange}:{
 properties:Properties;componentType:string;definition?:LibraryComponentMetadata;
 device:PropertyDevice;excludeKeys:string[];onChange:(properties:Properties)=>void;
}){
 const [open,setOpen]=useState(false);
 return <div className="office-ribbon-group office-ribbon-advanced-style-trigger">
   <div className="office-ribbon-stack">
     <button type="button" onClick={()=>setOpen(true)} title="Open complete style editor">
       <SlidersHorizontal size={18}/> Additional styling
     </button>
   </div><span>More</span>
   {open&&createPortal(<div className="office-ribbon-capability-backdrop" onMouseDown={()=>setOpen(false)}>
     <section className="office-builder-ribbon office-ribbon-advanced-style-dialog" role="dialog"
       aria-modal="true" aria-label="Advanced component appearance" onMouseDown={event=>event.stopPropagation()}>
       <header><strong>Advanced component appearance</strong><button type="button" onClick={()=>setOpen(false)}>Close</button></header>
       <div className="office-ribbon-advanced-style-content">
         <RibbonDesign properties={properties} componentType={componentType} definition={definition} device={device} onChange={onChange}/>
         <RibbonFormat properties={properties} componentType={componentType} definition={definition} device={device} excludeKeys={excludeKeys} onChange={onChange}/>
       </div>
     </section>
   </div>,document.body)}
 </div>;
}
