import {useState,useRef,useEffect,useLayoutEffect} from 'react';
import {createPortal} from 'react-dom';
import {AlignLeft,AlignCenter,AlignRight,Bold,WrapText,ArrowLeftRight,ArrowUpDown,ImagePlus,SlidersHorizontal} from 'lucide-react';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {UneRibbonProperty,UneBuilderTab} from './uneBuilderPropertyInventory';
import RibbonColorPalette from './RibbonColorPalette';
import TenantMediaPicker from '../ComponentProperties/TenantMediaPicker';
import RecordFilterEditor from '../../../component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor';
import SmartFormulaField from './SmartFormulaField';
import './SmartRibbon.css';
type Position={x:number;y:number;width:number;height:number};
type Props={tab:UneBuilderTab;api:string;definitions:readonly UneRibbonProperty[];properties:Record<string,unknown>;
 onChange:(next:Record<string,unknown>)=>void;objects:readonly ObjectMetadata[];pageObjectApiName?:string;
 position?:Position;onPositionChange?:(next:Position)=>void;layoutMode:string};
const weekdays=[['sun','Sun'],['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat']] as const;
const fallback=(value:unknown)=>typeof value==='string'?value:'';
export default function SmartRibbon({tab,api,definitions,properties,onChange,objects,pageObjectApiName='',position,onPositionChange,layoutMode}:Props){
 const [mediaOpen,setMediaOpen]=useState(false);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [daysOpen,setDaysOpen]=useState(false);
 const daysButton=useRef<HTMLButtonElement>(null);
 const daysMenu=useRef<HTMLDivElement>(null);
 const [daysPosition,setDaysPosition]=useState({top:0,left:0});
 useEffect(()=>{setDaysOpen(false);},[tab,api]);
 useLayoutEffect(()=>{
   if(!daysOpen)return;
   const position=()=>{
     const rect=daysButton.current?.getBoundingClientRect();
     if(!rect){setDaysOpen(false);return;}
     setDaysPosition({top:Math.max(6,Math.min(rect.bottom+3,window.innerHeight-242)),
       left:Math.max(6,Math.min(rect.left,window.innerWidth-180))});
   };
   const outside=(event:PointerEvent)=>{
     const target=event.target as Node;
     if(!daysButton.current?.contains(target)&&!daysMenu.current?.contains(target))setDaysOpen(false);
   };
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setDaysOpen(false);};
   position();
   window.addEventListener('resize',position);
   window.addEventListener('scroll',position,true);
   document.addEventListener('pointerdown',outside);
   document.addEventListener('keydown',escape);
   return()=>{
     window.removeEventListener('resize',position);
     window.removeEventListener('scroll',position,true);
     document.removeEventListener('pointerdown',outside);
     document.removeEventListener('keydown',escape);
   };
 },[daysOpen]);
 const objectName=fallback(properties.objectApiName)||pageObjectApiName;
 const object=objects.find(o=>o.apiName===objectName);
 const update=(key:string,value:unknown)=>onChange({...properties,[key]:value});
 // Keep the global property inventory visible for every selected component.
 // Unsupported controls are disabled by the per-property `supported` check below.
 const visible=definitions.filter(p=>p.tab===tab);
 const sections=[...new Set(visible.map(p=>p.group))];
 const controls=(property:UneRibbonProperty)=>{
   const supported=property.components.includes(api);
   const kind=property.kindOverrides?.[api]??property.kind;
   const key=property.valueKeys?.[api]??property.id;
   const isSize=property.id==='width'||property.id==='height';
   const useCanvasPosition=layoutMode==='free-canvas'&&Boolean(position&&onPositionChange);
   const enabled=supported&&(kind!=='position'||isSize||useCanvasPosition);
   const value=properties[key]??property.defaultsOverrides?.[api]??property.default??'';
   const options=property.choicesOverrides?.[api]??property.choices??[];
   const write=(v:unknown)=>{
    if(!enabled)return;
    if(kind==='position'&&useCanvasPosition&&position&&onPositionChange&&typeof v==='number'){
     onPositionChange({...position,[property.id]:v});
    }else if(kind==='position'&&isSize&&typeof v==='number')update(key,v);
    else if(kind!=='position')update(key,v);
   };
   const title=property.label;
   let editor;
   if(property.id==='imageSource'&&supported){
     const mode=properties.imageSourceMode==='field'?'field':'upload';
     editor=<div className="smart-source-inline">
       <select aria-label="Image source type" value={mode} onChange={e=>onChange({...properties,imageSourceMode:e.target.value,imageSource:''})}>
         <option value="upload">Upload image</option><option value="field">Object field</option>
       </select>
       {mode==='upload'?<button type="button" title="Choose or upload tenant image" aria-label="Choose or upload tenant image"
         onClick={()=>setMediaOpen(true)}><ImagePlus size={16}/> Choose</button>:
        <><select aria-label="Image field" value={fallback(value).replace(/^@/,'')}
           onChange={e=>write(e.target.value?'@'+e.target.value:'')}>
          <option value="">Choose field</option>{(object?.fields??[]).map(f=><option key={f.apiName} value={f.apiName}>{f.label}</option>)}
         </select><button type="button" title="Image filters and conditions" aria-label="Image filters and conditions"
           onClick={()=>setFiltersOpen(true)}><SlidersHorizontal size={16}/></button></>}
     </div>;
   }else if(kind==='expression')editor=<SmartFormulaField value={String(value)} onChange={write}
       label={title} disabled={!enabled} fields={object?.fields??[]} />;
   else if(kind==='object')editor=<select className="smart-select" aria-label={title} disabled={!enabled} value={String(value)}
     onChange={e=>write(e.target.value)}><option value="">Select Object</option>
     {objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label}</option>)}</select>;
   else if(kind==='color')editor=<RibbonColorPalette variant="property"
     kind={/border/i.test(property.id)?'border':/label|text|value/i.test(property.id)?'text':'fill'}
     label={title} value={String(value)} disabled={!enabled} onChange={write}/>;
   else if(kind==='number'||kind==='position')editor=<span className="smart-numeric">
     {property.id==='width'?<ArrowLeftRight size={15}/>:property.id==='height'?<ArrowUpDown size={15}/>:null}
     <input type="number" className="smart-office-number" aria-label={title} disabled={!enabled} min={property.min??0} max={property.max}
       value={kind==='position'&&useCanvasPosition?position?.[property.id as keyof Position]??'':
        typeof value==='string'?Number.parseFloat(value)||'':value as number}
       onChange={e=>{if(e.target.value!==''){const n=Number(e.target.value);if(Number.isFinite(n))write(n);}}}/>
   </span>;
   else if(kind==='shadow')editor=<div className="smart-icons" role="group" aria-label={title}>
     {['none','medium','large'].map((opt,i)=><button key={opt} type="button" disabled={!enabled} title={opt}
       aria-label={title+' '+opt} aria-pressed={value===opt} onClick={()=>write(opt)}><span
         style={{boxShadow:i===0?'none':i===1?'1px 2px 3px #64748b':'2px 4px 8px #64748b'}}/></button>)}
   </div>;
   else if(kind==='align')editor=<div className="smart-icons" role="group" aria-label={title}>
     {([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([opt,Icon])=>
       <button type="button" key={opt} disabled={!enabled} title={opt}
        aria-label={title+' '+opt} aria-pressed={value===opt} onClick={()=>write(opt)}><Icon size={15}/></button>)}
   </div>;
   else if(kind==='boolean'){
     if(['headerBold','badgeBold','supportingBold','summaryTextWeight','summary2TextWeight','wrapText'].includes(property.id)){
       const Icon=property.id==='wrapText'?WrapText:Bold;
       editor=<button className="smart-icon-toggle" type="button" disabled={!enabled}
         aria-label={title} title={title} aria-pressed={value===true} onClick={()=>write(value!==true)}><Icon size={17}/></button>;
     }else editor=<input type="checkbox" aria-label={title} disabled={!enabled}
       checked={value===true} onChange={e=>write(e.target.checked)}/>;
   }else if(kind==='weekdays')editor=<div className="smart-weekdays">
     <button ref={daysButton} type="button" disabled={!enabled} onClick={()=>setDaysOpen(v=>!v)}
       aria-label={title} aria-expanded={daysOpen}>Days ▾</button>
     {daysOpen&&createPortal(<div ref={daysMenu} className="smart-weekday-popup" role="dialog"
       aria-label="Choose calendar days" style={{top:daysPosition.top,left:daysPosition.left}}>
       {weekdays.map(([day,label])=><label key={day}>
         <input type="checkbox" checked={Array.isArray(value)&&value.includes(day)}
           onChange={e=>write(e.target.checked?[...(Array.isArray(value)?value:[]),day]:
             (Array.isArray(value)?value:[]).filter(x=>x!==day))}/>{label}</label>)}
     </div>,document.body)}
   </div>;
   else if(property.id==='defaultCheck')editor=<button type="button" role="switch"
     className="smart-default-check-switch" aria-label={title}
     aria-checked={value===true||value==='true'} disabled={!enabled}
     onClick={()=>write(!(value===true||value==='true'))}>
     <span className="smart-default-check-thumb" aria-hidden="true"/>
   </button>;
   else if(kind==='choice')editor=<select className="smart-select" aria-label={title} disabled={!enabled}
     value={String(value)} onChange={e=>write(e.target.value)}><option value="">Select</option>
     {options.map(s=><option value={s} key={s}>{s.replaceAll('-',' ')}</option>)}</select>;
   return <div key={property.id} className={'smart-property'+(!enabled?' disabled':'')} data-property={property.id}
       data-supported={supported} title={title}><span className="smart-label">{title}</span>{editor}</div>;
 };
 return <div className="smart-ribbon" data-smart-api={api} aria-label="Smart shared property ribbon">
  {sections.map(section=><section className="smart-ribbon-group" key={section} aria-label={section}>
   <div className="smart-ribbon-items">{visible.filter(p=>p.group===section).map(controls)}</div>
   <span className="smart-ribbon-caption">{section}</span>
  </section>)}
  {mediaOpen&&createPortal(<div className="smart-dialog-backdrop" role="presentation">
    <section className="smart-dialog" role="dialog" aria-modal="true" aria-label="Image source">
     <header><strong>Choose Image</strong><button type="button" onClick={()=>setMediaOpen(false)}>Close</button></header>
     <TenantMediaPicker value={fallback(properties.imageSource)} initiallyOpen
       onChange={value=>onChange({...properties,imageSourceMode:'upload',imageSource:value})}/>
    </section></div>,document.body)}
  {filtersOpen&&createPortal(<div className="smart-dialog-backdrop" role="presentation">
    <section className="smart-dialog" role="dialog" aria-modal="true" aria-label="Image filters">
     <header><strong>Image source filters and conditions</strong><button type="button" onClick={()=>setFiltersOpen(false)}>Done</button></header>
     {object?<RecordFilterEditor title="Image record" fields={object.fields??[]}
       filters={Array.isArray(properties.filters)?properties.filters:[]}
       onChange={filters=>onChange({...properties,filters})}/>:
       <p>Choose an Object first.</p>}
    </section></div>,document.body)}
 </div>;
}
