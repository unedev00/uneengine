import {useState,useRef,useEffect,useLayoutEffect,type ChangeEvent,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {AlignLeft,AlignCenter,AlignRight,Bold,WrapText,ArrowLeftRight,ArrowUpDown,ImagePlus,SlidersHorizontal,Eye,EyeOff} from 'lucide-react';
import {RibbonTextSizeIcon,RibbonCornerRadiusIcon} from './SmartRibbonIcons';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {UneRibbonProperty,UneBuilderTab,Design2Slot} from './uneBuilderPropertyInventory';
import RibbonColorPalette from './RibbonColorPalette';
import {uploadTenantImageFile} from '../ComponentProperties/TenantMediaPicker';
import {scopedFieldRule,type ScopedFieldFilter} from '../../pages/PageRuntime/fieldScopedRecordFilters';
import RecordFilterEditor from '../../../component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor';
import SmartFormulaField from './SmartFormulaField';
import {validateRecordFilterFormula} from '../../pages/PageRuntime/recordFilterFormula';
import {sessionCollectionFields} from '../../pages/PageRuntime/pageCollectionListBinding';
import {pageStateChoices} from './pageStateChoices';
import {namedCollectionName,namedCollectionNames} from '../../pages/PageRuntime/pageCollectionSession';
import {formulaCollectionReferenceKey} from '../../../../../server/src/expression-engine/FormulaCollection.js';
import SmartIconDropdown from './SmartIconDropdown';
import Design2IconDropdown from './Design2IconDropdown';
import SmartMultiSelect from './SmartMultiSelect';
import SmartIconGallery from './SmartIconGallery';
import './SmartRibbon.css';
import './SmartRibbonApprovedThreeRow.css';
import './SmartRibbonDataFormula.css';
import './SmartRibbonDesign2.css';
type Position={x:number;y:number;width:number;height:number};
type Props={tab:UneBuilderTab;api:string;definitions:readonly UneRibbonProperty[];properties:Record<string,unknown>;
 onChange:(next:Record<string,unknown>)=>void;objects:readonly ObjectMetadata[];pageObjectApiName?:string;
 position?:Position;onPositionChange?:(next:Position)=>void;layoutMode:string;
 /** For grouped/multiple components, expose only the intersection of SQL properties. */
 sharedPropertyIds?:readonly string[];mixedPropertyIds?:readonly string[];selectedApis?:readonly string[];
 pageComponents?:readonly {id:string;properties:Record<string,unknown>}[];componentId?:string;
 design2Slots?:readonly Design2Slot[];componentVisible?:boolean;
 onVisibleChange?:(visible:boolean)=>void;};
const weekdays=[['sun','Sun'],['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat']] as const;
const fallback=(value:unknown)=>typeof value==='string'?value:'';
const cartSummaryLabels:Record<string,{key:string;slot:string}>={
 subtotalValue:{key:'subtotalLabel',slot:'Summary 1'},
 totalValue:{key:'totalLabel',slot:'Summary 2'},
 taxValue:{key:'taxLabel',slot:'Summary 3'},
 discountValue:{key:'discountLabel',slot:'Summary 4'}
};
export default function SmartRibbon({tab,api,definitions,properties,onChange,objects,pageObjectApiName='',position,onPositionChange,layoutMode,sharedPropertyIds,mixedPropertyIds,selectedApis,pageComponents=[],componentId='',design2Slots=[],componentVisible=true,onVisibleChange}:Props){
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
 const stateOptions=pageStateChoices(pageComponents);
 const duplicateCollectionName=(()=>{
  const name=namedCollectionName(properties.collectionFormula);
  if(!name)return '';
  return pageComponents.some(item=>item.id!==componentId
   &&namedCollectionName(item.properties.collectionFormula)?.toLowerCase()===name.toLowerCase())
    ?'Duplicate collection name on this page: '+name:'';
 })();
 const validateCollection=(next:string):string|null=>{
  const names=namedCollectionNames(next);
  if(!names.length)return null;
  for(const name of names){
   const alias=formulaCollectionReferenceKey(name).toLowerCase();
   if(pageComponents.some(item=>item.id!==componentId&&Object.values(item.properties)
     .some(value=>namedCollectionNames(value).some(other=>
       formulaCollectionReferenceKey(other).toLowerCase()===alias))))
    return 'Duplicate Collection name: '+name;
  }
  if(/"(?:[^"]|"")*"\s*@([A-Za-z])/i.test(next))
   return 'Missing comma before the field reference';
  // Empty strings are valid explicit Field/Criteria placeholders.
  if(/,\s*(?:,|\))/.test(next))return 'Enter a value after the comma';
  return null;
 };

 const [design2Area,setDesign2Area]=useState('Body');
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [filterTarget,setFilterTarget]=useState('Record');
 const [filterFieldId,setFilterFieldId]=useState<string|null>(null);
 const [selectedDataField,setSelectedDataField]=useState<string|null>('__record_filter__');
 const [daysOpen,setDaysOpen]=useState(false);
 const daysButton=useRef<HTMLButtonElement>(null);
 const daysMenu=useRef<HTMLDivElement>(null);
 const [daysPosition,setDaysPosition]=useState({top:0,left:0});
 useEffect(()=>{setDaysOpen(false);setFiltersOpen(false);setSelectedDataField('__record_filter__');},[tab,api]);
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
 // Explicit selections only: the page object must not silently supply field suggestions.
 const sourceObjectNames=['objectApiName','objectApiName2','objectApiName3']
  .map(key=>fallback(properties[key])).filter((name,index,all)=>name&&all.indexOf(name)===index);
 const sourceObjects=objects.filter(item=>sourceObjectNames.includes(item.apiName))
  .sort((a,b)=>sourceObjectNames.indexOf(a.apiName)-sourceObjectNames.indexOf(b.apiName));
 const objectName=sourceObjectNames[0]??'';
 const object=objects.find(o=>o.apiName===objectName);
 const canFilterSessionCollection=stateOptions.some(item=>item.source==='CollectionState');
 const availableFilterFields=object?.fields??(canFilterSessionCollection?[...sessionCollectionFields]:[]);
 const update=(key:string,value:unknown)=>onChange({...properties,[key]:value});
 // Filter target comes from the originating button, not a second modal selector.
 const openFilters=(target:string,fieldId:string|null=null)=>{
  setFilterTarget(target);setFilterFieldId(fieldId);setFiltersOpen(true);
 };
 const storedFieldFilters=properties.dataFieldFilters;
 const fieldFilterRule=(id:string)=>scopedFieldRule(storedFieldFilters,id);
 const updateFieldFilter=(id:string,patch:Partial<ScopedFieldFilter>)=>{
   if(!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(id))return;
   const existing=storedFieldFilters&&typeof storedFieldFilters==='object'&&!Array.isArray(storedFieldFilters)
     ?storedFieldFilters as Record<string,unknown>:{};
   const previous=fieldFilterRule(id)??{filters:[],filterLogic:'AND',filterFormula:''};
   onChange({...properties,dataFieldFilters:{...existing,[id]:{...previous,...patch}}});
 };
 const filterCount=Array.isArray(properties.filters)?properties.filters.length:0;
 // Keep the global property inventory visible for every selected component.
 // Unsupported controls are disabled by the per-property `supported` check below.
 const compactDesign=true;
 // Independent SQL-planned view over shared controls and persisted property keys.
 // A null property key displays the fallback glyph, always disabled.
 const componentDesign2Slots=design2Slots.filter(slot=>slot.componentApi===api);
 const design2Areas=[...new Map(componentDesign2Slots.map(slot=>[slot.area,slot.areaOrder])).entries()]
  .sort((a,b)=>a[1]-b[1]).map(([area])=>area);
 const activeDesign2Area=design2Areas.includes(design2Area)?design2Area:design2Areas[0]??'Body';
 const activeDesign2Slots=componentDesign2Slots.filter(slot=>slot.area===activeDesign2Area);
 const design2Columns=Array.from({length:6},(_,index)=>Math.max(40,
   ...activeDesign2Slots.filter(slot=>slot.column===index+1).map(slot=>slot.width)));
 const design2Properties=tab==='Design2'?activeDesign2Slots.map(slot=>{
   const original=definitions.find(p=>p.id===slot.propertyKey)
     ??definitions.find(p=>p.id===slot.fallbackKey);
   if(!original)return null;
   const valid=slot.propertyKey===original.id&&original.components.includes(api);
   return {...original,
     label:/^focus(?:_color)?_/i.test(slot.slotKey)?'Focus Fill':original.label,
     tab:'Design2' as const,group:activeDesign2Area,
     components:valid?original.components:[],
     designRow:slot.row,designColumn:slot.column,designSlotKey:slot.slotKey,
     designOrder:slot.column,designWidth:slot.width,designHeight:slot.height,
     designCaptionWidth:0,
     designDisplay:original.kind==='align'||original.kind==='shadow'?'dropdown' as const:original.designDisplay};
 }).filter((p):p is NonNullable<typeof p>=>p!==null):[];
 const visible=definitions.filter(p=>p.tab===tab);
 const contextualVisible=tab==='Design2'?design2Properties:visible;
 // Keep active-record scope metadata and persisted settings intact, but do not
 // surface its automatic binding switch in any visible ribbon section.
 // A formula-created Collection now owns every tab; retired synthetic
 // leading-tab controls must not appear even with an older metadata snapshot.
 const retiredTabs=new Set(['firstTabCustom','firstTabCaption','firstTabValue']);
 const displayProperties=contextualVisible.filter(p=>!retiredTabs.has(p.id)&&
   p.id!=='autoRecordScope'&&p.id!=='collectionFormula'&&
   !(tab==='Data'&&p.id==='contextApiName'));
 const groups=[...new Set(displayProperties.map(p=>p.group))];
 const groupOrder=tab==='Design2'?[activeDesign2Area]
  :tab==='Data'?['Source','Values','Cart','Cart columns','Cart totals','Card Grid']
  :tab==='Design'?['Body','Shape','Typography','Tabs','Header','Badge','Header Supporting','Button',
    'Table','Row','Summary','Summary 2','Card Grid']
  :tab==='Layout'?['Size & Position','Tabs','Cards','Navigation','Calendar','Image','Icon']
  :[];
 const sections=[...groupOrder.filter(group=>groups.includes(group)),
  ...groups.filter(group=>!groupOrder.includes(group))];
 const sectionRow=(group:string,row:number)=>displayProperties
   .filter(p=>p.group===group&&((p.designRow??2)>=1&&(p.designRow??2)<=3?p.designRow??2:2)===row)
   .sort((a,b)=>(a.designOrder??999)-(b.designOrder??999));
 // Preserve row-three Data fields on row two before a tenant's SQL migration runs.
 const dataSectionRow=(group:string,row:number)=>tab==='Data'&&group!=='Source'&&row===2
   ?[...sectionRow(group,2),...sectionRow(group,3)]:sectionRow(group,row);
 const isDataFormula=(p:UneRibbonProperty)=>p.group!=='Source'&&
   (p.kindOverrides?.[api]??p.kind)==='expression';
 // The same visible ƒx editor can edit a display binding or the source filter.
 // The source filter is an explicit mode, never inferred from the caption text.
 const filterFormulaSelected=tab==='Data'&&selectedDataField==='__record_filter__';
 const activeDataProperty=tab==='Data'
   ?displayProperties.find(p=>p.id===selectedDataField&&isDataFormula(p)):undefined;
 const activeDataKey=activeDataProperty?.valueKeys?.[api]??activeDataProperty?.id??'';
 const selectedFieldRule=activeDataProperty?fieldFilterRule(activeDataProperty.id):undefined;
 // Record filtering and output-only visibility are different operations.
 const scopedFilterId=filterFieldId&&activeDataProperty?.id===filterFieldId?filterFieldId:null;
 const modalFieldRule=scopedFilterId?fieldFilterRule(scopedFilterId):undefined;
 const selectedFieldFilterCount=selectedFieldRule?.filters.length??0;
 const activeDataEnabled=Boolean(activeDataProperty&&activeDataProperty.components.includes(api)&&
   (!sharedPropertyIds||sharedPropertyIds.includes(activeDataProperty.id)));
 const activeDataValue=activeDataProperty
   ?String(properties[activeDataKey]??activeDataProperty.defaultsOverrides?.[api]??activeDataProperty.default??''):'';
 const changeRecordFilterFormula=(next:string)=>{
   if(!object)return;
   const formula=next.trimStart().startsWith('=')?next.trimStart().slice(1):next;
   // Keep ordinary saved data conditions active alongside the authored formula.
   onChange({...properties,filterFormula:formula,filterMode:undefined});
 };
 const activeSummaryLabel=activeDataProperty&&api==='smart_cart'
   ?cartSummaryLabels[activeDataProperty.id]:undefined;
 const changeActiveDataFormula=(next:string)=>{
   if(!activeDataEnabled||!activeDataProperty)return;
   onChange({...properties,[activeDataKey]:next,
     ...(activeDataProperty.id==='imageSource'?{imageSourceMode:'field'}:{})});
 };
 // Geometry only. Keep every property, icon, dropdown and persisted value;
 // fit their existing three rows without reserving space for empty columns.
 const controlWidth=(p:UneRibbonProperty)=>{
  if(tab==='Design2')return p.designWidth??40;
   // Reserve the exact SQL 30px input track; a separate 45px caption is added.
   if(p.id==='tabIndex')return p.designWidth??30;
   // Shape's 94px SQL width is exact, unlike other compact choice tracks.
   if(p.id==='shapeId')return p.designWidth??94;
   if(p.id==='cardButtonShape')return p.designWidth??94;
   // Shadow/Alignment icon dropdowns must remain at least 35px wide.
   if(p.designDisplay==='dropdown'&&(p.kind==='shadow'||p.kind==='align'))
     return Math.max(35,p.designWidth??0);
   const width=p.designWidth??(p.kind==='shadow'||p.kind==='align'?84:
     p.kind==='color'?40:p.kind==='number'||p.kind==='position'?64:
     p.kind==='boolean'?28:99);
   // Data retains its previous 64px numeric controls and full SQL formula widths.
   // Only the Design/Layout icon and spinner tracks get more compact.
   if(tab!=='Design'&&tab!=='Layout'&&p.designWidth&&
     (p.kind==='number'||p.kind==='position'))return 64;
   if(tab==='Design'||tab==='Layout'){
     if(p.kind==='number'||p.kind==='position')return Math.max(54,Math.min(width,58));
     if(p.kind==='choice'&&width>=80&&width<=110)return width-8;
   }
   return width;
 };
 // Match the actual Data chip spacing (2px), while preserving the 4px
 // spacing used by the other tabs and the three-row Source selectors.
 // SQL supplies each control width, including Column Visibility's native dropdown.
 const sectionWidth=(group:string)=>Math.ceil(Math.max(
   Math.max(0,...(tab==='Data'&&group!=='Source'?[1,2]:[1,2,3]).map(row=>{
     const properties=dataSectionRow(group,row);
     return properties.reduce((sum,p)=>sum+controlWidth(p)+
       (tab==='Data'&&isDataFormula(p)?0:(p.designCaptionWidth??0)),0)
       +Math.max(0,properties.length-1)*(tab==='Data'&&group!=='Source'?2:4);
   }))+15,
   group.length*5.5+16
 ));
 const controls=(property:UneRibbonProperty)=>{
   const supported=property.components.includes(api)&&(!sharedPropertyIds||sharedPropertyIds.includes(property.id));
   const kind=api==='smart_calendar'&&property.id==='shadow'
     ? 'shadow' : property.kindOverrides?.[api]??property.kind;
   const key=api==='smart_calendar'&&property.id==='shadow'?'shadow':property.valueKeys?.[api]??property.id;
   const isSize=property.id==='width'||property.id==='height';
   const useCanvasPosition=layoutMode==='free-canvas'&&Boolean(position&&onPositionChange);
   const condition=property.enabledWhen;
   const conditionValue=condition?properties[condition.property]??(
     definitions.find(p=>p.id===condition.property)?.defaultsOverrides?.[api]??
     definitions.find(p=>p.id===condition.property)?.default
   ):undefined;
   const enabled=supported&&(kind!=='position'||isSize||useCanvasPosition)&&
     (!condition||condition.in.includes(String(conditionValue??'')));
   const value=mixedPropertyIds?.includes(property.id)?'':properties[key]??property.defaultsOverrides?.[api]??property.default??'';
   const options=property.choicesOverrides?.[api]??property.choices??[];
   const write=(v:unknown)=>{
    if(!enabled)return;
    if(kind==='position'&&useCanvasPosition&&position&&onPositionChange&&typeof v==='number'){
     onPositionChange({...position,[property.id]:v});
    }else if(kind==='position'&&isSize&&typeof v==='number')update(key,v);
    else if(kind!=='position')update(key,v);
   };
   const title=property.label;
   const summaryLabel=api==='smart_cart'?cartSummaryLabels[property.id]:undefined;
   // Presentation-only shortening: metadata keys, persisted values and full
   // accessible names are retained. Unsupported properties stay disabled.
   const labelOverrides:Record<string,string>={
     badgeAlignment:'Position',imagePlacement:'Place',imageFill:'Fit',
     navigationDirection:'Direction',tabCount:'Tabs',firstDay:'First day'
   };
   const shortLabel=compactDesign?(property.designCaption??labelOverrides[property.id]??title):title;
   if(tab==='Data'&&isDataFormula(property)){
     const selected=selectedDataField===property.id;
     return <div key={property.id} data-property={property.id} data-kind={kind}
       data-supported={supported} className={'smart-property smart-data-field'+(!enabled?' disabled':'')}
       style={{'--smart-control-width':controlWidth(property)+'px',
         '--smart-caption-width':'0px','--smart-control-height':'26px'} as CSSProperties}>
       <span className="smart-data-field-pair">
         <button type="button" className="smart-data-field-name" disabled={!enabled}
           aria-label={'Select formula for '+title} onClick={()=>setSelectedDataField(property.id)}>{shortLabel}</button>
         <button type="button" disabled={!enabled} aria-pressed={selected}
           aria-label={'Formula for '+title} title={'Edit '+title+' formula'}
           className={'smart-data-field-fx'+(selected?' is-selected':'')}
           onClick={()=>setSelectedDataField(property.id)}>ƒx</button>
       </span>
     </div>;
   }
   const isTextSize=compactDesign&&/^(textSize|badgeTextSize|cardButtonTextSize|summary2?TextSize|placeholderSize|headerTextSize|supportingTextSize|rowTextSize|focusedTextSize)$/.test(property.id);
   const isCorner=compactDesign&&/radius/i.test(property.id);
   const isWidth=compactDesign&&/width/i.test(property.id);
   const isHeight=compactDesign&&/height/i.test(property.id);
   const hasNumericIcon=(kind==='number'||kind==='position')&&
     (isTextSize||isCorner||isWidth||isHeight);
   const isTabIndex=property.id==='tabIndex';
   let editor;
   if(property.id==='shapeId')editor=<SmartIconGallery value={String(value||'shape:rectangle')}
     disabled={!enabled} allowIcons={(selectedApis?.length?selectedApis:[api]).every(member=>
       (property.choicesOverrides?.[member]??property.choices??[]).includes('icons'))}
     onChange={write}/>;
   else if(property.id==='cardButtonShape')editor=<SmartIconGallery
     value={String(value||'shape:round-rectangle')} disabled={!enabled}
     allowIcons={false} onChange={write}/>;
   else if(property.id==='imageSource'&&supported){
     // The source is always editable: any direct or nested lookup reference
     // is resolved by the shared metadata engine, never by an image-name list.
     editor=<div className="smart-formula-filter smart-image-source-editor">
       <span className="smart-formula-prefix" title={title}>{shortLabel}</span>
       <SmartFormulaField value={String(value)} label={title} disabled={!enabled}
         fields={object?.fields??[]} objects={objects} rootObjectApiName={objectName}
         selectedSourceObjects={sourceObjects} mentionKind="image" stateOptions={stateOptions}
         onChange={source=>{if(enabled)onChange({...properties,imageSource:source,imageSourceMode:'field'});}}/>
       {api==='smart_image'&&<button type="button" className="smart-filter-trigger"
         title="Upload image from this computer" aria-label="Upload image" disabled={uploadBusy||!enabled}
         onClick={()=>uploadInput.current?.click()}><ImagePlus size={16}/></button>}
     </div>;
   }else if(kind==='expression')editor=<div className="smart-formula-filter">
     {summaryLabel?<input type="text" className="smart-summary-label"
       aria-label={summaryLabel.slot+' cart label'} title={summaryLabel.slot+' displayed cart label'}
       placeholder={summaryLabel.slot} maxLength={64} spellCheck={false}
       disabled={!enabled} value={fallback(properties[summaryLabel.key])}
       onChange={event=>{if(enabled)update(summaryLabel.key,event.target.value);}}/>:
       <span className="smart-formula-prefix" title={title}>{shortLabel}</span>}
     <SmartFormulaField value={String(value)} onChange={write}
       validate={validateCollection} stateOptions={stateOptions}
       label={title} disabled={!enabled}
       singleFieldOnly={api==='smart_toggle'&&property.id==='textSource'}
       fields={api==='smart_toggle'&&property.id==='textSource'
         ?(object?.fields??[]).filter(field=>['Checkbox','Boolean'].includes(field.dataType))
         :object?.fields??[]}
       objects={objects} rootObjectApiName={objectName}
        selectedSourceObjects={sourceObjects} />
     {property.id==='collectionFormula'&&duplicateCollectionName&&
       <span role="alert" className="smart-collection-error">{duplicateCollectionName}</span>}
   </div>;
   else if(tab==='Design'&&property.id==='badgeAlignment')editor=
     <div className="smart-inline-caption-select">
       <span aria-hidden="true">Alignment</span>
       <select className="smart-select" aria-label={title} title={title}
         disabled={!enabled} value={String(value)}
         onChange={event=>write(event.target.value)}>
         <option value="">Select</option>
         {options.map(option=><option key={option} value={option}>
           {option.replaceAll('-',' ')}
         </option>)}
       </select>
     </div>;
   else if(kind==='object')editor=<select className="smart-select" aria-label={title} disabled={!enabled} value={String(value)}
     onChange={e=>write(e.target.value)}><option value="">Select Object</option>
     {objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label}</option>)}</select>;
   else if(kind==='color')editor=<RibbonColorPalette variant="property"
     kind={/border/i.test(property.id)?'border':property.id==='iconFillColor'||/label|text|value/i.test(property.id)?'text':'fill'}
     iconVariant={tab==='Design2'&&property.id==='shapeFill'?'shape':
       tab==='Design2'&&/^focus/.test(property.designSlotKey??'')?'focus':undefined}
     label={title} value={String(value)} disabled={!enabled} onChange={write}/>;
   else if(tab==='Layout'&&['cardsPerRow','cardsPerColumn'].includes(property.id))
     editor=<select className="smart-select" aria-label={title} disabled={!enabled}
       value={String(Number(value)||1)} onChange={event=>write(Number(event.target.value))}>
       {Array.from({length:6},(_,i)=>i+1).map(n=><option key={n} value={n}>
         {property.id==='cardsPerRow'?'Columns ':'Rows '}{n}
       </option>)}
     </select>;
   else if(kind==='number'||kind==='position')editor=<span className="smart-numeric">
     {isTextSize?<span className="smart-property-glyph" title={title}><RibbonTextSizeIcon/></span>:
      isCorner?<span className="smart-property-glyph" title={title}><RibbonCornerRadiusIcon/></span>:
      isWidth?<span className="smart-property-glyph" title={title}><ArrowLeftRight size={17} aria-hidden="true"/></span>:
      isHeight?<span className="smart-property-glyph" title={title}><ArrowUpDown size={17} aria-hidden="true"/></span>:
      property.id==='width'?<ArrowLeftRight size={15}/>:property.id==='height'?<ArrowUpDown size={15}/>:null}
     <input type="number" className="smart-office-number" aria-label={title} disabled={!enabled} min={property.min??0} max={property.max} step={isTabIndex?1:undefined}
       value={kind==='position'&&useCanvasPosition?position?.[property.id as keyof Position]??'':
        typeof value==='string'?Number.parseFloat(value)||'':value as number}
       onChange={e=>{if(e.target.value!==''){const n=Number(e.target.value);if(Number.isFinite(n))write(isTabIndex?Math.max(0,Math.trunc(n)):n);}}}/>
   </span>;
   else if(kind==='shadow'&&compactDesign&&property.designDisplay==='dropdown')editor=<SmartIconDropdown kind="shadow" value={String(value)} label={title} disabled={!enabled} onChange={write}/>;
   else if(kind==='shadow')editor=<div className="smart-icons" role="group" aria-label={title}>
     {['none','medium','large'].map((opt,i)=><button key={opt} type="button" disabled={!enabled} title={opt}
       aria-label={title+' '+opt} aria-pressed={value===opt} onClick={()=>write(opt)}><span
         style={{boxShadow:i===0?'none':i===1?'1px 2px 3px #64748b':'2px 4px 8px #64748b'}}/></button>)}
   </div>;
   else if(tab==='Design2'&&kind==='align')editor=<Design2IconDropdown
     mode="horizontal" value={String(value)} label={title} disabled={!enabled}
     allowed={options} onChange={write}/>;
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
     }else if(['headerBold','badgeBold','supportingBold','rowBold','summaryTextWeight','summary2TextWeight','focusedTextBold','wrapText'].includes(property.id)){
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
   else if(tab==='Design2'&&kind==='choice'&&
     ['imagePlacement','imageFill','tabOrientation','navigationDirection'].includes(property.id))
     editor=<Design2IconDropdown
       mode={property.id==='imagePlacement'?'placement':property.id==='imageFill'?'imageFill':'orientation'}
       value={String(value)} label={title} disabled={!enabled} allowed={options} onChange={write}/>;
   else if(kind==='choice'&&Array.isArray(value))editor=<SmartMultiSelect
      label={title} choices={options} value={value.filter((item):item is string=>typeof item==='string')}
      disabled={!enabled} onChange={write}/>;
    else if(kind==='choice')editor=<select className="smart-select" aria-label={title}
     title={value?title+': '+String(value):title} disabled={!enabled}
     value={String(value)} onChange={e=>write(e.target.value)}><option value="">Select</option>
     {options.map(s=><option value={s} key={s}>{s.replaceAll('-',' ')}</option>)}</select>;
   return <div key={property.id} className={'smart-property'+(!enabled?' disabled':'')} data-property={property.id}
       data-supported={supported} data-kind={kind} data-numeric-icon={hasNumericIcon?'true':'false'}
       data-design-caption={compactDesign&&Boolean(property.designCaptionWidth)?'true':'false'}
       style={compactDesign?{'--smart-control-width':controlWidth(property)+'px',
         '--smart-caption-width':(property.designCaptionWidth??0)+'px',
         '--smart-control-height':(property.designHeight??26)+'px',
         ...(tab==='Design2'?{gridColumn:String(property.designColumn??1)}:{})} as CSSProperties:undefined}
       title={!enabled?'Applies to: '+property.components.map(api=>api.replace(/^smart_/,'' )).join(', '):title}>
       <span className="smart-label">{shortLabel}</span>{editor}</div>;
 };
 return <div className={'smart-ribbon'+(tab==='Design2'?' smart-design2-ribbon':'')} data-smart-api={api}
  data-compact-design={compactDesign?'true':'false'}
  data-three-row={compactDesign?'true':'false'} aria-label="Smart shared property ribbon">
  <input ref={uploadInput} className="smart-hidden-upload" type="file"
    accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Select local image"
    onChange={event=>void selectLocalImage(event)} />
  {uploadError&&<div className="smart-upload-error" role="alert" title={uploadError}>{uploadError}</div>}
  {tab==='Design2'?<section className="smart-ribbon-group smart-design2-group"
      data-design-three-row="true" data-smart-tab="Design2" aria-label="Design 2 contextual properties">
    <div className="smart-ribbon-items">
      <div className="smart-design2-toolbar-header">
        <label className="smart-design2-area-picker">
          <span aria-hidden="true">Select</span>
          <select className="smart-design2-area-select" aria-label="Select Design 2 area"
            value={activeDesign2Area} onChange={event=>setDesign2Area(event.target.value)}>
            {design2Areas.map(area=><option value={area} key={area}>{area}</option>)}
          </select>
        </label>
        <button type="button" className="smart-icon-toggle smart-design2-visibility"
          aria-label="Component visibility" title="Component visibility"
          aria-pressed={componentVisible} disabled={!onVisibleChange}
          onClick={()=>onVisibleChange?.(!componentVisible)}>
          {componentVisible?<Eye size={17}/>:<EyeOff size={17}/>}
        </button>
      </div>
      {[1,2,3].map(row=><div key={row} className="smart-ribbon-row smart-design2-property-row"
        style={{gridTemplateColumns:design2Columns.map(width=>width+'px').join(' ')}} data-design-row={row}>
        {sectionRow(activeDesign2Area,row).map(controls)}</div>)}
    </div>
    <span className="smart-ribbon-caption">{activeDesign2Area}</span>
  </section>:tab==='Data'?<>
    {sections.filter(group=>group==='Source').map(section=><section className="smart-ribbon-group" key={section}
      data-design-three-row="true" data-smart-tab={tab} aria-label={section}
      style={{'--smart-section-width':sectionWidth(section)+'px'} as CSSProperties}>
      <div className="smart-ribbon-items">{[1,2,3].map(row=><div className="smart-ribbon-row"
        data-design-row={row} key={row}>{sectionRow(section,row).map(controls)}</div>)}</div>
      <span className="smart-ribbon-caption">{section}</span>
    </section>)}
    <div className="smart-data-workspace">
      <div className="smart-data-formula-bar" aria-label="Data expression or record filter formula">
        <span className="smart-data-fx-prefix" aria-hidden="true">ƒx</span>
        <button type="button" className="smart-data-filter-button"
          aria-label="Configure record filters"
          title="Configure filters visually (same record filtering engine as the Formula Bar)"
          disabled={!object&&!canFilterSessionCollection}
          onClick={()=>{setSelectedDataField('__record_filter__');openFilters('Record');}}
          aria-haspopup="dialog">
          <SlidersHorizontal size={16}/>{filterCount>0&&
            <span className="smart-filter-count">{filterCount}</span>}
        </button>
        <button type="button" className="smart-data-image-upload"
          disabled={uploadBusy||!activeDataEnabled||activeDataProperty?.id!=='imageSource'||api!=='smart_image'}
          title={activeDataProperty?.id==='imageSource'&&api==='smart_image'?'Upload image':'Select an image field to enable upload'}
          aria-label="Upload image"
          onClick={()=>uploadInput.current?.click()}><ImagePlus size={17}/></button>
        <div className="smart-data-formula-input">
          {filterFormulaSelected?<SmartFormulaField key="__record_filter__"
            label="Record filter formula" value={typeof properties.filterFormula==='string'?properties.filterFormula:''}
            disabled={!object&&!canFilterSessionCollection} onChange={changeRecordFilterFormula}
            validate={value=>validateRecordFilterFormula(value.trimStart().replace(/^=\s*/,''),availableFilterFields)}
            stateOptions={stateOptions}
            fields={availableFilterFields} objects={objects} rootObjectApiName={objectName}
            selectedSourceObjects={sourceObjects}/>:
          activeDataProperty?<SmartFormulaField key={activeDataProperty.id}
            label={activeDataProperty.label} value={activeDataValue}
            disabled={!activeDataEnabled} onChange={changeActiveDataFormula}
            validate={validateCollection} stateOptions={stateOptions}
            singleFieldOnly={api==='smart_toggle'&&activeDataProperty.id==='textSource'}
            fields={api==='smart_toggle'&&activeDataProperty.id==='textSource'
              ?(object?.fields??[]).filter(field=>['Checkbox','Boolean'].includes(field.dataType))
              :object?.fields??[]}
            objects={objects} rootObjectApiName={objectName} selectedSourceObjects={sourceObjects}
            mentionKind={activeDataProperty.id==='imageSource'?'image':'text'}/>:
            <input type="text" disabled aria-label="Formula (select a field first)"
              placeholder="Select a field's Fx button to edit its formula"/>}
        </div>
        <input className="smart-data-summary-name"
          aria-label={(activeSummaryLabel?.slot??'Cart summary')+' cart label'}
          title={activeSummaryLabel?'Edit cart summary heading':'Select a cart summary field'}
          maxLength={64} spellCheck={false} disabled={!activeSummaryLabel||!activeDataEnabled}
          value={activeSummaryLabel?fallback(properties[activeSummaryLabel.key]):''}
          placeholder={activeSummaryLabel?.slot??'Cart summary'}
          onChange={event=>{if(activeSummaryLabel)update(activeSummaryLabel.key,event.target.value);}}/>
      </div>
      <div className="smart-data-sections">
        {sections.filter(group=>group!=='Source').map(section=><section className="smart-ribbon-group"
          key={section} data-smart-tab={tab} aria-label={section}
          style={{'--smart-section-width':sectionWidth(section)+'px'} as CSSProperties}>
          <div className="smart-ribbon-items">{[1,2].map(row=><div className="smart-ribbon-row"
            data-design-row={row} key={row}>{dataSectionRow(section,row).map(controls)}</div>)}</div>
          <span className="smart-ribbon-caption">{section}</span>
        </section>)}
      </div>
    </div>
  </>:sections.map(section=><section className="smart-ribbon-group" key={section}
     data-design-three-row={compactDesign?'true':undefined} data-smart-tab={tab} aria-label={section}
     style={compactDesign?{'--smart-section-width':sectionWidth(section)+'px'} as CSSProperties:undefined}>
   <div className="smart-ribbon-items">
     {compactDesign?<>{[1,2,3].map(row=><div className="smart-ribbon-row" key={row}
       data-design-row={row}>{sectionRow(section,row).map(controls)}</div>)}</>:
       visible.filter(p=>p.group===section).map(controls)}
   </div>
   <span className="smart-ribbon-caption">{section}</span>
  </section>)}
  {filtersOpen&&createPortal(<div className="smart-dialog-backdrop smart-filter-backdrop"
       role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setFiltersOpen(false);}}>
    <section className="smart-dialog smart-filter-dialog smart-record-filter-dialog" role="dialog" aria-modal="true"
      aria-label="Record filters" onKeyDown={e=>{if(e.key==='Escape')setFiltersOpen(false);}}>
     <header><div><strong>Filter Records</strong>
       <span>{object?.label??'Session Collection'} · {scopedFilterId?filterTarget+' only':'All records'}</span></div>
       <button type="button" autoFocus onClick={()=>setFiltersOpen(false)}>Done</button></header>
     <div className="smart-filter-dialog-body">
       {(object||canFilterSessionCollection)?<RecordFilterEditor compact title={scopedFilterId?filterTarget+' value':(object?.label??'Session Collection')+' records'} fields={availableFilterFields} objects={objects} rootObjectApiName={objectName}
         stateOptions={stateOptions}
         filters={scopedFilterId?(modalFieldRule?.filters??[]):Array.isArray(properties.filters)?properties.filters:[]}
         formula={scopedFilterId?(modalFieldRule?.filterFormula??''):typeof properties.filterFormula==='string'?properties.filterFormula:''}
         mode={scopedFilterId
           ?(modalFieldRule?.filterMode??((modalFieldRule?.filterFormula??'').trim()?'Formula':'Field'))
           :(properties.filterMode==='Field'||properties.filterMode==='Formula'?properties.filterMode
             :typeof properties.filterFormula==='string'&&properties.filterFormula.trim()?'Formula':'Field')}
         onModeChange={filterMode=>scopedFilterId
           ?updateFieldFilter(scopedFilterId,{filterMode})
           :onChange({...properties,filterMode})}
         onFormulaChange={filterFormula=>scopedFilterId?updateFieldFilter(scopedFilterId,{filterFormula}):onChange({...properties,filterFormula})}
         logic={scopedFilterId?(modalFieldRule?.filterLogic??'AND'):properties.filterLogic==='OR'?'OR':'AND'}
         onLogicChange={filterLogic=>scopedFilterId?updateFieldFilter(scopedFilterId,{filterLogic}):onChange({...properties,filterLogic})}
         onChange={filters=>scopedFilterId?updateFieldFilter(scopedFilterId,{filters}):onChange({...properties,filters})}/>:
         <p>Choose an Object or bind a named Collection to configure filters.</p>}
     </div>
    </section></div>,document.body)}
 </div>;
}
