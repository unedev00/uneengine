import {useState} from 'react';
import {auditUniversalRibbonCoverage} from './universalRibbonCoverage.mjs';
import {createPortal} from 'react-dom';
import RibbonColorPalette from './RibbonColorPalette';
import type {LibraryComponentMetadata,ObjectMetadata,FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';
import CustomComponentPropertyEditor from '../ComponentProperties/CustomComponentPropertyEditor';
import TenantMediaPicker from '../ComponentProperties/TenantMediaPicker';

/**
 * Universal Page Builder ribbon inventory. Importing metadata eagerly is confined to
 * the lazy-loaded builder; published app runtimes never import this catalog.
 * Fixed property slots for every UNE component; unsupported controls stay visible and disabled.
 */
type Definition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
type Properties=Record<string,unknown>;
type CatalogComponent={apiName:string;propertyDefinitions?:Definition[]};
type Tab='Component Data'|'Component Content'|'Component Properties'|'Component Layout'|'Component Responsive'|'Component Action';
const manifests=Object.values(import.meta.glob('../../../one/*/component.json',{eager:true,import:'default'})) as CatalogComponent[];
const validManifests=manifests.filter(item=>/^une_[a-z0-9_]+$/.test(item.apiName));
const definitionMap=new Map<string,Definition>();
for(const component of validManifests){
  for(const def of component.propertyDefinitions??[]){
    if(!definitionMap.has(def.propertyKey))definitionMap.set(def.propertyKey,def);
  }
}
// Never expose retired or duplicate source selectors as individual ribbon slots.
// Object-source variants remain available through the Source mappings editor.
const isExcludedRibbonProperty=(key:string)=>
  ['fontFamily','fontStyle','textDecoration','theme'].includes(key)
  || /(?:ageRestriction|barcode)/i.test(key)
  || (/(?:ObjectApiName|SourceObjectApi|ObjectAPI)$/i.test(key) && key!=='objectApiName');
const excluded=new Set(Array.from(definitionMap.keys()).filter(isExcludedRibbonProperty));
const sections:Record<Tab,readonly string[]>={
  'Component Data':['Source','Fields','Filters','Records','Data integration'],
  'Component Content':['Text','Image','Options','Content fields','Component content'],
  'Component Properties':['Surface','Card','Heading','Supporting text','Badge','Image','Appearance','Additional styling'],
  'Component Layout':['Size','Position','Spacing','Container','Nesting','Arrangement'],
  'Component Responsive':['Device','Responsive layout','Visibility','Mobile behaviour'],
  'Component Action':['Events','Actions','Flows','Navigation','Conditions','Mappings']
};
function place(key:string):[Tab,string]{
  if(/(?:^|_)(?:event|flow|action|operation|checkout|send|stateSync|stateRead|stateWrite|stateKey|stateValue|stateVersion|stateRecord|statePoll|stateSession)|(?:Output|Input)$|^canSend$|^enableSendPreparation$|^requirePerRecordSendGrant$/i.test(key))
    return ['Component Action', /flow|state|output|input/i.test(key)?'Flows':/event/i.test(key)?'Events':/checkout|send|action|operation/i.test(key)?'Actions':'Conditions'];
  if(/(?:mobile|phone|tablet|desktop|responsive|keyboard|fullScreen|device|autoScroll|threshold|showNewMessageNotice|avoidKeyboard)/i.test(key))
    return ['Component Responsive',/mobile|phone|keyboard/i.test(key)?'Mobile behaviour':'Responsive layout'];
  if(/^(?:width|height|imageHeight|imageWidth|cardWidth|cardMinHeight|productCardMinWidth|catalogueWidthPercent)$/i.test(key))
    return ['Component Layout','Size'];
  if(/(?:padding|margin|gap|density|columns|rows|span|ratio|position|direction|wrap|layoutContainer|splitRatio|corner|xOffset|yOffset)/i.test(key))
    return ['Component Layout',/padding|margin|gap|density/i.test(key)?'Spacing':/position|offset/i.test(key)?'Position':/layoutContainer/i.test(key)?'Nesting':'Container'];
  if(key==='surface')return ['Component Properties','Surface'];
  if(/^(theme|tone|accentColor|glassBlur)$/.test(key))return ['Component Properties','Appearance'];
  if(/^(?:backgroundColor|borderColor|textColor|radius|shadow|opacity)$/.test(key))return ['Component Properties','Surface'];
  if(/^card(?:Background|Border|Radius|Shadow|Hover|Density)/.test(key))return ['Component Properties','Card'];
  if(/^heading(?:Font|Color|Text|Line)/.test(key))return ['Component Properties','Heading'];
  if(/^description(?:Font|Color|Text|Line)/.test(key))return ['Component Properties','Supporting text'];
  if(/^badge(?:Font|Text|Background)/.test(key))return ['Component Properties','Badge'];
  if(/^image(?:Fit|Shape|Aspect|Position)/.test(key))return ['Component Properties','Image'];
  if(/(?:fontSize|fontWeight|fontColor|letterSpacing|borderWidth|borderStyle)/i.test(key))return ['Component Properties','Additional styling'];
  if(/(?:objectApiName|sourceObject|recordPresenter|conversationsObject|messagesObject|contactsObject|channelAccountObject|contactSourceObject)/i.test(key))return ['Component Data','Source'];
  if(/(?:fieldApiName|FieldApiNames|fieldMapping|column|mapping)/i.test(key))
    return ['Component Data',/filter/i.test(key)?'Filters':'Fields'];
  if(/(?:filter|searchKey|searchTerm|searchField|searchMode|selectedCategory|selectionFilter|restrictToAssigned)/i.test(key))return ['Component Data','Filters'];
  if(/(?:record|loading|items|pageSize|maxItems|sort|selectedValue)/i.test(key))return ['Component Data','Records'];
  if(/(?:src|imageSrc|imageExpression|alt|caption|missingImage)/i.test(key))return ['Component Content','Image'];
  if(key==='value')return ['Component Content','Text'];
  if(key==='allowTyping')return ['Component Content','Options'];
  if(/(?:placeholder|label|title|subtitle|description|text|empty|message|helpText|buttonLabel|notice)/i.test(key))return ['Component Content','Text'];
  if(/(?:options|choices|groups|selectedIndex|viewMode|mode|variant|severity|show|required|disabled|enable|controlled)/i.test(key))return ['Component Content','Options'];
  return ['Component Content','Component content'];
}
const slots=new Map<Tab,Map<string,Definition[]>>();
for(const tab of Object.keys(sections) as Tab[])slots.set(tab,new Map(sections[tab].map(section=>[section,[]])));
for(const [key,definition] of definitionMap){
  if(excluded.has(key))continue;
  const [tab,section]=place(key);
  slots.get(tab)?.get(section)?.push(definition);
}
for(const groups of slots.values())for(const defs of groups.values())defs.sort((a,b)=>a.propertyKey.localeCompare(b.propertyKey));
export const universalRibbonCoverage=auditUniversalRibbonCoverage(
  validManifests,
  Array.from(slots.values()).flatMap(groups=>Array.from(groups.values()).flatMap(defs=>defs.map(def=>def.propertyKey))),
  [...excluded]
);
if(import.meta.env.DEV&&(universalRibbonCoverage.missing.length||universalRibbonCoverage.duplicates.length))
  throw new Error('UNE ribbon registry coverage failed: '+JSON.stringify(universalRibbonCoverage));
export const universalRibbonInventoryCount=Array.from(slots.values()).reduce((total,groups)=>total+Array.from(groups.values()).reduce((sum,defs)=>sum+defs.length,0),0);
export const universalRibbonComponentCount=validManifests.length;

function PropertyEditor({definition,enabled,reviewOnly=false,properties,onChange,objects,flows,onOpenComplex,complexSelected}:{
 definition:Definition;enabled:boolean;reviewOnly?:boolean;properties:Properties;onChange:(next:Properties)=>void;
 objects:readonly ObjectMetadata[];flows:readonly FlowDefinitionMetadata[];
 onOpenComplex?:(key:string)=>void;complexSelected?:boolean;
}){
 const [mediaOpen,setMediaOpen]=useState(false);
 const [jsonError,setJsonError]=useState('');
 // Hold the literal edit while typing, including the empty value and partial numbers.
 // Otherwise replacing 16 with 22 immediately reinstates the default after Delete.
 const [numberDraft,setNumberDraft]=useState<string|null>(null);
 const key=definition.propertyKey;
 const label=definition.label||key.replace(/([a-z])([A-Z])/g,'$1 $2');
 const unitMatch=/^(.*?)\s*\((px|%|ms|s|columns|rows|lines|deg)\)\s*$/i.exec(label);
 const unit=(definition.kind==='NUMBER'||definition.kind==='CURRENCY')&&unitMatch?unitMatch[2]:'';
 const shownLabel=unit&&unitMatch?unitMatch[1]:label;
 const value=properties[key]??definition.defaultValue??'';
 const update=(next:unknown)=>{if(enabled)onChange({...properties,[key]:next});};
 const tip=reviewOnly?label+' — review only; not saved for this component':enabled?label:'Not supported by selected component';
 const props={disabled:!enabled,title:tip,'aria-label':label};
 let editor;
 if(definition.kind==='BOOLEAN')editor=<input type="checkbox" {...props} checked={value===true} onChange={e=>update(e.target.checked)}/>;
 else if(definition.kind==='SELECT')editor=<select {...props} value={String(value)} onChange={e=>update(e.target.value)}>
   <option value="">Default</option>{(definition.choices??[]).map(choice=><option key={choice.key} value={choice.key}>{choice.label}</option>)}
 </select>;
 else if(definition.kind==='NUMBER'||definition.kind==='CURRENCY'){
   const field=<input {...props} type="number" min={definition.min} max={definition.max}
     value={numberDraft??(typeof value==='number'?String(value):'')}
     onChange={e=>{
       const raw=e.target.value;
       setNumberDraft(raw);
       if(raw.trim()==='')return;
       const parsed=Number(raw);
       if(Number.isFinite(parsed)&&(definition.min===undefined||parsed>=definition.min)
         &&(definition.max===undefined||parsed<=definition.max))update(parsed);
     }}
     onBlur={()=>setNumberDraft(null)}/>;
   editor=unit?<span className="une-unit-field" data-unit={unit}>{field}</span>:field;
 }
 else if(definition.kind==='IMAGE')editor=<><button type="button" disabled={!enabled} title={tip} onClick={()=>setMediaOpen(true)}>Choose / Upload</button>
   {mediaOpen&&createPortal(<div className="une-universal-media-overlay" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setMediaOpen(false);}}>
      <div role="dialog" aria-modal="true" aria-label={label+' media library'}><button type="button" onClick={()=>setMediaOpen(false)}>Close</button>
        <TenantMediaPicker assetOnly initiallyOpen value={String(value)} onChange={next=>{update(next);setMediaOpen(false);}}/>
      </div></div>,document.body)}</>;
 else if(!['BOOLEAN','SELECT','NUMBER','CURRENCY','IMAGE','COLOR','TEXT','LONG_TEXT','TEXTAREA','STRING'].includes(definition.kind)){
   editor=<button type="button" disabled={!enabled} title={tip}
     aria-expanded={Boolean(complexSelected)} aria-controls="une-ribbon-complex-editor"
     onClick={()=>onOpenComplex?.(key)}>{complexSelected?'Editing':'Configure'}</button>;
 }
 else if(definition.kind==='COLOR'){
   const hex=/^#[0-9a-f]{6}$/i.test(String(value))?String(value):String(value).startsWith('#')||value==='transparent'?String(value):'';
   const kind=/border/i.test(key)?'border':/text|font|heading|description|supporting|value|icon/i.test(key)&&!/background/i.test(key)?'text':'fill';
   editor=<RibbonColorPalette variant="property" kind={kind} label={label} value={hex} disabled={!enabled} onChange={next=>update(next===''?undefined:next)}/>;
 }
 else if(value!==null&&typeof value==='object')editor=<textarea {...props} rows={1} value={JSON.stringify(value)}
   aria-invalid={!!jsonError} onChange={e=>{try{const parsed:unknown=JSON.parse(e.target.value);if(parsed===null||typeof parsed!=='object')throw Error('Expected an object or array');setJsonError('');update(parsed);}catch{setJsonError('Invalid structured value');}}}/>;
 else editor=<input {...props} type="text" value={String(value)} onChange={e=>update(e.target.value)}/>;
 return <label className={'une-universal-property'+(enabled?'':' is-disabled')+(reviewOnly?' is-review-only':'')} title={tip} data-property={key} data-kind={definition.kind}>
   <span className="une-universal-property-label" title={label}>{shownLabel}</span>
   {editor}
 </label>;
}
type CanvasPosition={x:number;y:number;width:number;height:number};
export type UniversalBuilderControls={
 position?:CanvasPosition;
 onPositionChange?:(position:CanvasPosition)=>void;
 visible:boolean;
 onVisibleChange:(visible:boolean)=>void;
 layoutMode:'template'|'free-canvas'|string;
 canvasWidth:number;
 canvasHeight:number;
 onOpenSource?:()=>void;
 onOpenFilters?:()=>void;
};
export default function UniversalRibbonInventory({tab,definition,componentId,properties,onChange,objects=[],flows=[],builder}:{
 tab:Tab;definition?:LibraryComponentMetadata;componentId?:string;properties:Properties;
 onChange:(next:Properties)=>void;
 objects?:readonly ObjectMetadata[];flows?:readonly FlowDefinitionMetadata[];
 builder?:UniversalBuilderControls;
}){
 const [expandedProperty,setExpandedProperty]=useState<string|null>(null);
 // Every component uses the same inventory, section order and control positions.
 const reviewPositionValue=(key:keyof CanvasPosition):number|string=>builder?.position?.[key]??'';
 const editCanvas=(key:keyof CanvasPosition,min:number,raw:string)=>{
   const value=Number(raw);
   if(!Number.isFinite(value)||value<min)return;
   if(builder?.position&&builder.layoutMode==='free-canvas')
     builder.onPositionChange?.({...builder.position,[key]:Math.round(value)});
 };
 const enabled=new Set((definition?.propertyDefinitions??[]).filter(item=>!isExcludedRibbonProperty(item.propertyKey)).map(item=>item.propertyKey));
 const canEditCanvas=builder?.layoutMode==='free-canvas'&&Boolean(builder.position)&&Boolean(builder.onPositionChange);
 const canOpenSource=Boolean(builder?.onOpenSource)&&(definition?.propertyDefinitions??[]).some(item=>/object|fieldApiName|mapping/i.test(item.propertyKey));
 const canOpenFilters=Boolean(builder?.onOpenFilters)&&(definition?.propertyDefinitions??[]).some(item=>/object|filter|searchField/i.test(item.propertyKey));
 const expandedDefinition=definition?.propertyDefinitions?.find(d=>d.propertyKey===expandedProperty);
 const groups=slots.get(tab);
 if(!groups)return null;
 return <div className="une-universal-ribbon" aria-label="Universal UNE property ribbon"
   data-component={definition?.apiName??'none'} data-component-id={componentId??'none'} data-inventory-count={universalRibbonInventoryCount}
   data-review-mode="all-disabled">
   {Array.from(groups).map(([section,defs])=><section key={section} className="une-universal-ribbon-section" aria-label={section}>
     <div className="une-universal-ribbon-controls">
       {tab==='Component Layout'&&section==='Size'&&(['width','height'] as const).map(key=>
         <label key={'canvas-'+key} className="une-universal-property" title={'Component '+key}>
           <span className="une-universal-property-label">{key==='width'?'Width':'Height'}</span>
           <input aria-label={'Component '+key} type="number" min={1} disabled={!canEditCanvas} value={reviewPositionValue(key)}
             onChange={event=>editCanvas(key,1,event.target.value)}/>
         </label>)}
       {tab==='Component Layout'&&section==='Position'&&(['x','y'] as const).map(key=>
         <label key={'canvas-'+key} className="une-universal-property" title={key.toUpperCase()+' position'}>
           <span className="une-universal-property-label">{key.toUpperCase()} position</span>
           <input aria-label={key.toUpperCase()+' position'} type="number" min={0} disabled={!canEditCanvas}
             value={reviewPositionValue(key)}
             onChange={event=>editCanvas(key,0,event.target.value)}/>
         </label>)}
       {tab==='Component Data'&&section==='Source'&&<button type="button"
         className="une-universal-builder-command" disabled={!canOpenSource} onClick={builder?.onOpenSource}>
         Source mappings
       </button>}
       {tab==='Component Data'&&section==='Filters'&&<button type="button"
         className="une-universal-builder-command" disabled={!canOpenFilters} onClick={builder?.onOpenFilters}>
         Filter conditions
       </button>}
       {defs.map(def=>{
         // UNE Text no longer exposes the legacy palette; other UNE controls retain it.
         if(definition?.apiName==='une_text'&&def.propertyKey==='tone')return null;
         // Free-canvas geometry already has dedicated Width/Height controls.
         if(canEditCanvas&&(def.propertyKey==='width'||def.propertyKey==='height'))return null;
         const supported=enabled.has(def.propertyKey);
         return <PropertyEditor key={def.propertyKey}
           definition={supported?definition?.propertyDefinitions?.find(item=>item.propertyKey===def.propertyKey)??def:def}
           enabled={supported} properties={properties}
           onChange={next=>{
             if(supported)onChange({...properties,[def.propertyKey]:next[def.propertyKey]});
           }}
           objects={objects} flows={flows}
           complexSelected={expandedProperty===def.propertyKey}
           onOpenComplex={key=>setExpandedProperty(previous=>previous===key?null:key)}/>;
       })}
     </div>
     <span className="une-universal-ribbon-caption">{section}</span>
   </section>)}
   {expandedDefinition&&<section id="une-ribbon-complex-editor" className="une-universal-ribbon-section une-universal-complex-section" aria-label={expandedDefinition.label+' settings'}>
     <div className="une-universal-complex-header"><strong>{expandedDefinition.label}</strong><button type="button" onClick={()=>setExpandedProperty(null)}>Close section</button></div>
     <div className="une-universal-complex-body"><CustomComponentPropertyEditor definitions={[expandedDefinition]} properties={properties}
       objects={objects} flows={flows} primaryObjectApiName={String(properties.objectApiName??'')}
       onChange={next=>onChange(next)}/></div>
     <span className="une-universal-ribbon-caption">Settings</span>
   </section>}
 </div>;
}
