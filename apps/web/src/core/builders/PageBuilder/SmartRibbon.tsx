import {useState,useRef,useEffect,useLayoutEffect,type ChangeEvent,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {AlignLeft,AlignCenter,AlignRight,Bold,WrapText,ArrowLeftRight,ArrowUpDown,ImagePlus,SlidersHorizontal,Eye,EyeOff} from 'lucide-react';
import {RibbonTextSizeIcon,RibbonCornerRadiusIcon} from './SmartRibbonIcons';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {UneRibbonProperty,UneBuilderTab} from './uneBuilderPropertyInventory';
import RibbonColorPalette from './RibbonColorPalette';
import {uploadTenantImageFile} from '../ComponentProperties/TenantMediaPicker';
import RecordFilterEditor from '../../../component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor';
import SmartFormulaField from './SmartFormulaField';
import SmartIconDropdown from './SmartIconDropdown';
import './SmartRibbon.css';
import './SmartRibbonCompact.css';
import './SmartRibbonApprovedThreeRow.css';
type Position={x:number;y:number;width:number;height:number};
type Props={tab:UneBuilderTab;api:string;definitions:readonly UneRibbonProperty[];properties:Record<string,unknown>;
 onChange:(next:Record<string,unknown>)=>void;objects:readonly ObjectMetadata[];pageObjectApiName?:string;
 position?:Position;onPositionChange?:(next:Position)=>void;layoutMode:string};
const weekdays=[['sun','Sun'],['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat']] as const;
const fallback=(value:unknown)=>typeof value==='string'?value:'';
export default function SmartRibbon({tab,api,definitions,properties,onChange,objects,pageObjectApiName='',position,onPositionChange,layoutMode}:Props){
 const uploadInput=useRef<HTMLInputElement>(null);
 const [uploadBusy,setUploadBusy]=useState(false);
 const [uploadError,setUploadError]=useState('');
 const selectLocalImage=async(event:ChangeEvent<HTMLInputElement>)=>{
   const file=event.target.files?.[0];
   event.target.value='';
   if(!file)return;
   setUploadBusy(true);setUploadError('');
   try{
     const imageSource=await uploadTenantImageFile(file);
     onChange({...properties,imageSourceMode:'upload',imageSource});
   }catch(reason){
     setUploadError(reason instanceof Error?reason.message:'Image upload failed');
   }finally{setUploadBusy(false);}
 };
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [filterTarget,setFilterTarget]=useState('Record');
 const [daysOpen,setDaysOpen]=useState(false);
 const daysButton=useRef<HTMLButtonElement>(null);
 const daysMenu=useRef<HTMLDivElement>(null);
 const [daysPosition,setDaysPosition]=useState({top:0,left:0});
 useEffect(()=>{setDaysOpen(false);setFiltersOpen(false);},[tab,api]);
 useEffect(()=>{
   if(!filtersOpen)return;
   const close=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape')setFiltersOpen(false);};
   document.addEventListener('keydown',close);
   return()=>document.removeEventListener('keydown',close);
 },[filtersOpen]);
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
 const openFilters=(target:string)=>{setFilterTarget(target);setFiltersOpen(true);};
 const filterCount=Array.isArray(properties.filters)?properties.filters.length:0;
 // Keep the global property inventory visible for every selected component.
 // Unsupported controls are disabled by the per-property `supported` check below.
 const compactDesign=tab==='Design'||tab==='Shapes';
 const visible=definitions.filter(p=>p.tab===tab);
 const sections=[...new Set(visible.map(p=>p.group))];
 const sectionRow=(group:string,row:number)=>visible
   .filter(p=>p.group===group&&(p.designRow??2)===row)
   .sort((a,b)=>(a.designOrder??999)-(b.designOrder??999));
 const controlWidth=(p:UneRibbonProperty)=>{
   if(p.designWidth)return p.designWidth;
   // Unconfigured future SQL properties remain present without overlapping.
   if(p.kind==='shadow'||p.kind==='align')return p.designDisplay==='dropdown'?28:84;
   if(p.kind==='color')return 40;
   if(p.kind==='number'||p.kind==='position')return 70;
   if(p.kind==='boolean')return 28;
   return 99;
 };
 const controls=(property:UneRibbonProperty)=>{
   const supported=property.components.includes(api);
   const kind=api==='smart_calendar'&&property.id==='shadow'
     ? 'shadow' : property.kindOverrides?.[api]??property.kind;
   const key=api==='smart_calendar'&&property.id==='shadow'?'shadow':property.valueKeys?.[api]??property.id;
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
   // Presentation-only shortening: metadata keys, persisted values and full
   // accessible names are retained. Unsupported properties stay disabled.
   const labelOverrides:Record<string,string>={
     badgeAlignment:'Position',imagePlacement:'Place',imageFill:'Fit',
     navigationDirection:'Direction',tabCount:'Tabs',firstDay:'First day'
   };
   const shortLabel=compactDesign?(property.designCaption??labelOverrides[property.id]??title):title;
   const isTextSize=compactDesign&&/^(textSize|badgeTextSize|summary2?TextSize|placeholderSize)$/.test(property.id);
   const isCorner=compactDesign&&/radius/i.test(property.id);
   const isWidth=compactDesign&&/width/i.test(property.id);
   const isHeight=compactDesign&&/height/i.test(property.id);
   const hasNumericIcon=(kind==='number'||kind==='position')&&
     (isTextSize||isCorner||isWidth||isHeight);
   let editor;
   if(property.id==='imageSource'&&supported){
     // The source is always editable: any direct or nested lookup reference
     // is resolved by the shared metadata engine, never by an image-name list.
     editor=<div className="smart-formula-filter smart-image-source-editor">
       <SmartFormulaField value={String(value)} label={title} disabled={!enabled}
         fields={object?.fields??[]} objects={objects} rootObjectApiName={objectName}
         onChange={source=>{if(enabled)onChange({...properties,imageSource:source,imageSourceMode:'field'});}}/>
       {api==='smart_image'&&<button type="button" className="smart-filter-trigger"
         title="Upload image from this computer" aria-label="Upload image" disabled={uploadBusy||!enabled}
         onClick={()=>uploadInput.current?.click()}><ImagePlus size={16}/></button>}
       <button type="button" className="smart-filter-trigger" aria-label="Image filters and conditions"
         title="Image filters and conditions" onClick={()=>openFilters('Image source')}
         disabled={!object} aria-haspopup="dialog"><SlidersHorizontal size={16}/></button>
     </div>;
   }else if(kind==='expression')editor=<div className="smart-formula-filter">
     <SmartFormulaField value={String(value)} onChange={write}
       label={title} disabled={!enabled}
       singleFieldOnly={api==='smart_toggle'&&property.id==='textSource'}
       fields={api==='smart_toggle'&&property.id==='textSource'
         ?(object?.fields??[]).filter(field=>['Checkbox','Boolean'].includes(field.dataType))
         :object?.fields??[]}
       objects={api==='smart_toggle'&&property.id==='textSource'?[]:objects}
       rootObjectApiName={objectName} />
     <button type="button" className="smart-filter-trigger" disabled={!enabled||!object}
       title={!object?'Choose an Object to configure record filters':'Filter '+object.label+' records'}
       aria-label={'Filter records for '+title} aria-haspopup="dialog"
       onClick={()=>openFilters(title)}><SlidersHorizontal size={16} aria-hidden="true"/>
       {filterCount>0&&<span className="smart-filter-count">{filterCount}</span>}</button>
   </div>;
   else if(kind==='object')editor=<select className="smart-select" aria-label={title} disabled={!enabled} value={String(value)}
     onChange={e=>write(e.target.value)}><option value="">Select Object</option>
     {objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label}</option>)}</select>;
   else if(kind==='color')editor=<RibbonColorPalette variant="property"
     kind={/border/i.test(property.id)?'border':property.id==='iconFillColor'||/label|text|value/i.test(property.id)?'text':'fill'}
     label={title} value={String(value)} disabled={!enabled} onChange={write}/>;
   else if(kind==='number'||kind==='position')editor=<span className="smart-numeric">
     {isTextSize?<span className="smart-property-glyph" title={title}><RibbonTextSizeIcon/></span>:
      isCorner?<span className="smart-property-glyph" title={title}><RibbonCornerRadiusIcon/></span>:
      isWidth?<span className="smart-property-glyph" title={title}><ArrowLeftRight size={17} aria-hidden="true"/></span>:
      isHeight?<span className="smart-property-glyph" title={title}><ArrowUpDown size={17} aria-hidden="true"/></span>:
      property.id==='width'?<ArrowLeftRight size={15}/>:property.id==='height'?<ArrowUpDown size={15}/>:null}
     <input type="number" className="smart-office-number" aria-label={title} disabled={!enabled} min={property.min??0} max={property.max}
       value={kind==='position'&&useCanvasPosition?position?.[property.id as keyof Position]??'':
        typeof value==='string'?Number.parseFloat(value)||'':value as number}
       onChange={e=>{if(e.target.value!==''){const n=Number(e.target.value);if(Number.isFinite(n))write(n);}}}/>
   </span>;
   else if(kind==='shadow'&&compactDesign&&property.designDisplay==='dropdown')editor=<SmartIconDropdown kind="shadow" value={String(value)} label={title} disabled={!enabled} onChange={write}/>;
   else if(kind==='shadow')editor=<div className="smart-icons" role="group" aria-label={title}>
     {['none','medium','large'].map((opt,i)=><button key={opt} type="button" disabled={!enabled} title={opt}
       aria-label={title+' '+opt} aria-pressed={value===opt} onClick={()=>write(opt)}><span
         style={{boxShadow:i===0?'none':i===1?'1px 2px 3px #64748b':'2px 4px 8px #64748b'}}/></button>)}
   </div>;
   else if(kind==='align'&&compactDesign&&property.designDisplay==='dropdown')editor=<SmartIconDropdown kind="align" value={String(value)} label={title} disabled={!enabled} onChange={write}/>;
   else if(kind==='align')editor=<div className="smart-icons" role="group" aria-label={title}>
     {([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([opt,Icon])=>
       <button type="button" key={opt} disabled={!enabled} title={opt}
        aria-label={title+' '+opt} aria-pressed={value===opt} onClick={()=>write(opt)}><Icon size={15}/></button>)}
   </div>;
   else if(kind==='boolean'){
     if(compactDesign&&property.id==='badgeVisible'){
       const Icon=value===true?Eye:EyeOff;
       editor=<button type="button" className="smart-visible-toggle" disabled={!enabled}
         role="switch" aria-label={title} title={title} aria-checked={value===true}
         onClick={()=>write(value!==true)}><Icon size={16} aria-hidden="true"/></button>;
     }else if(['headerBold','badgeBold','supportingBold','summaryTextWeight','summary2TextWeight','wrapText'].includes(property.id)){
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
   else if(kind==='choice')editor=<select className="smart-select" aria-label={title}
     title={value?title+': '+String(value):title} disabled={!enabled}
     value={String(value)} onChange={e=>write(e.target.value)}><option value="">Select</option>
     {options.map(s=><option value={s} key={s}>{s.replaceAll('-',' ')}</option>)}</select>;
   return <div key={property.id} className={'smart-property'+(!enabled?' disabled':'')} data-property={property.id}
       data-supported={supported} data-kind={kind} data-numeric-icon={hasNumericIcon?'true':'false'}
       data-design-caption={compactDesign&&Boolean(property.designCaptionWidth)?'true':'false'}
       style={compactDesign?{'--smart-control-width':controlWidth(property)+'px',
         '--smart-caption-width':(property.designCaptionWidth??0)+'px',
         '--smart-control-height':(property.designHeight??26)+'px'} as CSSProperties:undefined}
       title={title}><span className="smart-label">{shortLabel}</span>{editor}</div>;
 };
 return <div className="smart-ribbon" data-smart-api={api}
  data-compact-design={compactDesign?'true':'false'}
  data-three-row={compactDesign?'true':'false'} aria-label="Smart shared property ribbon">
  <input ref={uploadInput} className="smart-hidden-upload" type="file"
    accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Select local image"
    onChange={event=>void selectLocalImage(event)} />
  {uploadError&&<div className="smart-upload-error" role="alert" title={uploadError}>{uploadError}</div>}
  {sections.map(section=><section className="smart-ribbon-group" key={section}
     data-design-three-row={compactDesign?'true':undefined} aria-label={section}>
   <div className="smart-ribbon-items">
     {compactDesign?<>{[1,2,3].map(row=><div className="smart-ribbon-row" key={row}
       data-design-row={row}>{sectionRow(section,row).map(controls)}</div>)}</>:
       visible.filter(p=>p.group===section).map(controls)}
   </div>
   <span className="smart-ribbon-caption">{section}</span>
  </section>)}
  {filtersOpen&&createPortal(<div className="smart-dialog-backdrop smart-filter-backdrop"
       role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setFiltersOpen(false);}}>
    <section className="smart-dialog smart-filter-dialog" role="dialog" aria-modal="true"
      aria-label="Record filters" onKeyDown={e=>{if(e.key==='Escape')setFiltersOpen(false);}}>
     <header><div><strong>Filter Records</strong><span>{object?.label??'Object'} · {filterTarget}</span></div>
       <button type="button" autoFocus onClick={()=>setFiltersOpen(false)}>Done</button></header>
     <div className="smart-filter-dialog-body">
       {object?<RecordFilterEditor title={object.label+' records'} fields={object.fields??[]} objects={objects} rootObjectApiName={objectName}
         filters={Array.isArray(properties.filters)?properties.filters:[]}
         logic={properties.filterLogic==='OR'?'OR':'AND'}
         onLogicChange={filterLogic=>onChange({...properties,filterLogic})}
         onChange={filters=>onChange({...properties,filters})}/>:
         <p>Choose an Object first to configure the record conditions.</p>}
     </div>
    </section></div>,document.body)}
 </div>;
}
