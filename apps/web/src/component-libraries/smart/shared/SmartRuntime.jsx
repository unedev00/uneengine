import SmartCart from "../../smart_cart/SmartCart.jsx";
import icons from "../../smart_icon/iconCatalog.json";
import {smartShapeAppearance} from "./SmartShapeAppearance.js";
import {evaluateFieldExpression} from "../../shared/FieldExpression.js";
import {useTenantImageSource} from "../../shared/TenantImage.jsx";
const number=(v,f,min=0,max=2000)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const text=(v)=>v===null||v===undefined?"":String(v);
const expression=(v,record,pageState,objectApiName,collectionSources,namedCollections)=>{
 if(typeof v!=="string")return text(v);
 // The common bounded evaluator resolves authorised row-specific relationship
 // values via __mentionValues without turning numbers into quoted strings or
 // replacing @mentions inside quoted literals.
 if(/^(?:https:\/\/|asset:)/i.test(v.trim()))return v;
 if(!/^\s*=/.test(v)&&!/@[A-Za-z]/.test(v)&&!/^\s*"/.test(v)&&
   !/^\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s*[+\-*/&]/.test(v))return v;
 try{return text(evaluateFieldExpression(v,record||{},{namedCollectionSelections:pageState?.collectionSelections,rootObjectApiName:objectApiName,collectionSources,namedCollections}));}catch{return "";}
};
function SmartPicture({src,alt,loadAsset,style}){
 const source=useTenantImageSource(src,loadAsset);
 const [failed,setFailed]=React.useState(false);
 React.useEffect(()=>setFailed(false),[src]);
 return source&&!failed?<img src={source} alt={alt} style={style} onError={()=>setFailed(true)}/>:null;
}
// Reuse the normal authorised record-filter matcher for independent value
// visibility. Global object filtering/paging remains untouched.
const fieldAllows=(p,key,record)=>{
 if(typeof p.fieldAllowed==='function')return p.fieldAllowed(key,record??{});
 // Outside the authorised page runtime, reject configured scoped rules rather
 // than silently exposing an unverified value.
 return !p.dataFieldFilters||typeof p.dataFieldFilters!=='object'
   ||!Object.prototype.hasOwnProperty.call(p.dataFieldFilters,key);
};
const scopedExpression=(p,key,source,record)=>fieldAllows(p,key,record)
 ?(key==="textSource"&&p.dataCollection&&record&&
    (/(?:^|[=(,])\s*COLLECTION\s*\(/i.test(String(source??""))
     ||/^\s*=?\s*@[A-Za-z][A-Za-z0-9_.]*(?:\s*(?:=|==|<>|!=|>=|<=|>|<)\s*.+)?\s*$/i.test(String(source??"")))
    ?text(p.kind==="smart_card_grid"&&record.__collectionManual===false
      &&typeof record.Name==="string"&&record.Name.trim()
      ?record.Name:record.__collectionLabel??record.Name??"")
    :expression(source,record,p.pageState,p.objectApiName,p.formulaCollectionSources,p.namedCollections)):"";
const recordOf=p=>p.objectApiName&&Array.isArray(p.records)
 ?(p.records[0]??{}):p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
 Array.isArray(p.records)&&p.records.length?p.records[0]:Array.isArray(p.items)&&p.items.length?p.items[0]:{};
// Editor-only examples are derived from the existing shared record source.
// They never have a database Id and never invoke a Flow action.
const editorCardRows=(count)=>Array.from({length:Math.min(36,Math.max(1,count))},(_,i)=>({
 __builderSample:true,Name:"Product Name "+(i+1),Price:"Price",Quantity:1
}));
const recordsOf=p=>{
 const records=Array.isArray(p.records)?p.records:Array.isArray(p.items)?p.items:[];
 return p.kind==="smart_card_grid"&&p.builderPreview===true&&!p.loading&&!records.length
  ?editorCardRows(number(p.cardsPerRow,3)*number(p.cardsPerColumn,3)):records;
};
const isBuilderEmpty=p=>p.builderPreview===true&&!p.loading&&recordsOf(p).length===0;
// Image bindings must resolve once per authorised record, not once for the grid.
// Plain API names and @Field expressions both use the same record values.
const boundImage=(p,record)=>{
 if(!fieldAllows(p,'imageSource',record))return '';
  const source=p.imageSource??p.src??'';
 const key=typeof source==='string'?source.replace(/^@/,''):'';
 if(key && record && Object.prototype.hasOwnProperty.call(record,key))return text(record[key]);
 return expression(source,record,p.pageState,p.objectApiName,p.formulaCollectionSources,p.namedCollections);
};
function SmartCard({p,record}){
 const image=boundImage(p,record);
 const preview=p.previewOnly===true||p.builderPreview===true||p.preview===true;
 const sample=Boolean(p.builderPreview===true&&record?.__builderSample===true);
 const header=scopedExpression(p,"textSource",p.textSource??p.title??p.label??"",record)||(sample?"Product Name":p.kind==="smart_card_grid"&&preview?"Text here":"");
 const badge=scopedExpression(p,"badgeText",p.badgeText??"",record)||(sample?"Price":preview&&p.badgeVisible===true?"Badge":"");
 const horizontal=["left","right"].includes(p.imagePlacement);
 const single=p.kind==="smart_image";
 const grid=p.kind==="smart_card_grid";
 const imageHeight=number(p.imageHeight,220,0,1200);
 const headerHeight=number(p.headerBoxHeight,44,0,1200);
 // Standalone Image has exactly ONE decorative stroke, on the native image.
 // A card-grid item remains a separate card with an optional image stroke.
 // Never paint an implicit card border around an independently bordered Image.
 const strokeWidth=p.borderWidth===undefined?1:number(p.borderWidth,1,0,24);
 const imageStroke=p.imageBorderColor||(single?p.borderColor:undefined);
 const nativeImageBorder=imageStroke&&strokeWidth>0?strokeWidth+"px solid "+imageStroke:undefined;
 const cardBorder=single?"none":strokeWidth===0?"none":
  (strokeWidth+"px solid "+(p.borderColor||"#e2e8f0"));
 return <article className="smart-card" style={{
  display:"flex",flexDirection:horizontal?"row":"column",
  background:single?(p.imageBackgroundColor??p.backgroundColor??"transparent"):(p.backgroundColor||"#fff"),border:cardBorder,
  borderRadius:number(p.radius,12),overflow:"hidden",position:"relative",minWidth:0,
  fontSize:number(p.textSize,16,8,96),
  boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none",
  ...(single?{height:"100%",minHeight:0}:{}),
  ...(grid?{height:"100%",minHeight:0}:{}),
 }}>
  {(!grid||imageHeight>0)&&<div style={{order:["right","bottom"].includes(p.imagePlacement)?2:0,
    flex:horizontal?"1 1 50%":single?"1 1 auto":grid?"1 1 "+imageHeight+"px":undefined,
    minWidth:0,minHeight:0,
    ...(single?{display:"flex"}:{}),
    ...(grid?{overflow:"hidden",maxHeight:horizontal?undefined:imageHeight}:{} )}}>
   {single&&p.builderPreview&&!image
     ?<div className="smart-image-empty smart-editor-image-placeholder" aria-label="Image Here"
        style={{height:"100%",width:"100%",border:nativeImageBorder,
          borderRadius:number(p.radius,12),boxSizing:"border-box",overflow:"hidden"}}>
        <span>Image Here</span>
      </div>
     :grid&&preview&&!image&&(sample||p.builderPreview!==true)
    ?<div className="smart-card-image-placeholder" aria-hidden="true" style={{
       height:"100%",minHeight:0,display:"grid",placeItems:"center",
       background:"var(--md-card-placeholder,#edf2f7)",color:"#526276",fontSize:12
     }}>Image Here</div>
    :<SmartPicture src={image} alt={header} loadAsset={p.loadAsset}
      style={{height:single||grid?"100%":imageHeight,width:"100%",display:"block",
       maxHeight:grid?"100%":undefined,
       objectFit:p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":"cover",
       boxSizing:"border-box",borderRadius:single?number(p.radius,12):undefined,
       border:nativeImageBorder}}/>}
  </div>}
  {header&&headerHeight>0&&<div className="smart-card-content" style={{
    order:1,flex:horizontal?"1 1 50%":undefined,display:"flex",alignItems:"center",
    height:headerHeight,alignSelf:horizontal?"center":undefined,flexShrink:0,
    fontWeight:p.headerBold===false?400:700,
    textAlign:p.headerAlignment||p.labelAlignment||"left",justifyContent:(p.headerAlignment||p.labelAlignment)==="right"?"flex-end":(p.headerAlignment||p.labelAlignment)==="center"?"center":"flex-start",
    border:p.headerBorderColor?"1px solid "+p.headerBorderColor:undefined,color:p.defaultValueColor||p.labelColor||undefined,
    whiteSpace:p.wrapText===false?"nowrap":"normal",
    overflow:"hidden",overflowWrap:"anywhere",padding:"4px 10px"
  }}>{header}</div>}
  {p.badgeVisible===true&&Boolean(badge)&&<span className={"smart-badge "+(p.badgeAlignment||"image-top-right")}
   style={{fontWeight:p.badgeBold===false?400:700,fontSize:number(p.badgeTextSize,12),
   color:p.badgeTextColor||"#fff",background:p.badgeBodyColor||"#2563eb"}}>{badge}</span>}
 </article>;
}
function SmartCalendar({p,fire}){
 const resolveDate=value=>{
   if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
     const [year,month,day]=value.split("-").map(Number);
     const date=new Date(year,month-1,day,12);
     if(date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day)return date;
   }
   return new Date();
 };
 const [selected,setSelected]=React.useState(()=>resolveDate(p.selectedDate??p.defaultValue));
 React.useEffect(()=>setSelected(resolveDate(p.selectedDate??p.defaultValue)),[p.selectedDate,p.defaultValue]);
 const year=selected.getFullYear(),month=selected.getMonth();
 const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
 const first=Math.max(0,["sun","mon","tue","wed","thu","fri","sat"].indexOf(p.firstDay||"mon"));
 const allowed=Array.isArray(p.showDays)?p.showDays:["sun","mon","tue","wed","thu","fri","sat"];
 const indices=Array.from({length:7},(_,n)=>(n+first)%7)
   .filter(i=>allowed.includes(dayNames[i].toLowerCase().slice(0,3)));
 const monthStart=new Date(year,month,1).getDay();
 const days=new Date(year,month+1,0).getDate();
 const offset=(monthStart-first+7)%7;
 const weeks=Math.ceil((days+offset)/7);
 return <div className="smart-calendar" style={{borderRadius:number(p.radius,12),
  borderColor:p.borderColor||undefined,background:p.backgroundColor||undefined,
  boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none"}}>
  <strong>{selected.toLocaleString("en-GB",{month:"long",year:"numeric"})}</strong>
  {indices.length===0?<p>No days selected for display</p>:<div className="smart-calendar-grid" style={{gridTemplateColumns:"repeat("+indices.length+",minmax(0,1fr))"}}>
   {indices.map(i=><b key={"day"+i}>{dayNames[i]}</b>)}
   {Array.from({length:weeks},(_,week)=>indices.map(i=>{
     const relative=(i-first+7)%7;
     const date=week*7+relative-offset+1;
     if(date<1||date>days)return <span className="smart-calendar-empty" key={week+"-"+i}/>;
     const isSelected=date===selected.getDate();
     const iso=[year,String(month+1).padStart(2,"0"),String(date).padStart(2,"0")].join("-");
     return <button type="button" className={isSelected?"smart-calendar-selected-day":""}
       key={week+"-"+i} aria-label={"Select "+iso} aria-pressed={isSelected}
       style={isSelected?{color:"#fff",
         borderColor:p.defaultValueColor||"#60a5fa",background:p.defaultValueColor||"#2563eb",fontWeight:700}:undefined}
       onClick={()=>{setSelected(new Date(year,month,date,12));fire("change",iso);if(p.actionFlows?.click)fire("click",iso)}}>{date}</button>;
   }))}
  </div>}
 </div>;
}
function SmartLookup({p,style,fire}){
 const [query,setQuery]=React.useState("");
 const [opened,setOpened]=React.useState(false);
 const candidates=recordsOf(p).slice(0,200).filter(item=>item&&typeof item==="object");
 const display=row=>scopedExpression(p,"textSource",p.textSource??row.Name??row.name??row.label??row.title??row.id??"",row);
 const matches=candidates.filter(row=>display(row).toLowerCase().includes(query.toLowerCase())).slice(0,20);
 return <div className="smart-lookup" style={{...style,"--smart-placeholder-color":p.labelColor||"#64748b"}}>
  <input className="smart-search" type="search" role="combobox"
   aria-label={text(p.placeholder||p.label||"Search records")}
   aria-expanded={opened&&matches.length>0} aria-controls="smart-lookup-suggestions"
   placeholder={text(p.placeholder||p.label||"Search records…")}
   style={{textAlign:p.labelAlignment||"left",fontSize:number(p.textSize,16),color:p.labelColor||undefined,
    boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none",
    background:p.backgroundColor||"#fff",borderColor:p.borderColor||undefined,
    ...smartShapeAppearance(p.shapeId,number(p.radius,12))}}
   value={query} onFocus={()=>setOpened(true)}
   onChange={event=>{setQuery(event.target.value);setOpened(true);fire("change",event.target.value)}}/>
  {opened&&query&&matches.length>0&&<div id="smart-lookup-suggestions" className="smart-lookup-menu" role="listbox" style={{textAlign:p.labelAlignment||"left",fontSize:number(p.textSize,16)}}>
   {matches.map((record,i)=><button type="button" key={text(record.id??i)} role="option"
    aria-selected={false} style={{textAlign:"inherit",fontSize:"inherit"}} onMouseDown={event=>event.preventDefault()}
    onClick={()=>{setQuery(display(record));setOpened(false);fire("select",{record,value:record.id??null})}}>
     {display(record)}
   </button>)}
  </div>}
 </div>;
}
function SmartTabs({p,record,fire}){
 const [active,setActive]=React.useState(0);
 const count=number(p.tabCount,3,1,20);
 // When bound to an Object, the shared Page Runtime supplies only filtered,
 // permission-checked records. Never generate unlimited tabs from raw records.
 const dynamic=Boolean(p.objectApiName&&p.textSource);
 const hasCollection=p.dataCollection&&typeof p.dataCollection.name==='string'
  &&Array.isArray(p.dataCollection.items);
 const collectionTabs=hasCollection?recordsOf(p).slice(0,count).map((row,index)=>({
  label:String(row.__collectionLabel??row.Name??''),value:row.__collectionValue,
  id:'collection-'+index,record:row
 })):null;
 const recordTabs=collectionTabs??(dynamic?(isBuilderEmpty(p)?Array.from({length:Math.min(count,5)},(_,i)=>({
   label:"Tab "+(i+1),id:"editor-tab-"+i
  })):recordsOf(p).slice(0,count).map(row=>({
   label:scopedExpression(p,"textSource",p.textSource,row),id:row?.Id??row?.id
  }))):Array.isArray(p.tabs)?p.tabs:Array.from({length:count},(_,i)=>i===0&&typeof p.label==="string"&&p.label&&!p.label.startsWith("@")?p.label:"Tab "+(i+1)));
 // A custom leading tab is an optional display entry, never an Object record.
 // The authorised Object records and their configured limit remain unchanged.
 const firstTabCustom=p.firstTabCustom===true;
 const captionContext={...(record&&typeof record==="object"&&!Array.isArray(record)?record:{}),
  state:p.pageState??{},session:{id:p.sessionId??""}};
 const firstTabCaption=firstTabCustom&&typeof p.firstTabCaption==="string"&&p.firstTabCaption.trim()
  ?expression(p.firstTabCaption,captionContext,p.pageState,p.objectApiName,p.formulaCollectionSources,p.namedCollections)||"Custom tab":"Custom tab";
 const firstTabValue=firstTabCustom&&typeof p.firstTabValue==="string"&&p.firstTabValue.trim()
  ?expression(p.firstTabValue,captionContext,p.pageState,p.objectApiName,p.formulaCollectionSources,p.namedCollections):"*";
 const tabs=firstTabCustom?[{label:firstTabCaption,id:"__custom_first_tab__"},...recordTabs]:recordTabs;
 // The page-scoped selection is authoritative for data-backed Tabs. Clearing a
 // parent selection must not leave a dependent child visibly selected.
 const changeAction=p.actionFlows?.change;
 const formulaStateKey=changeAction?.actionType==="Formula"&&typeof changeAction.formula==="string"
  ?/^@state\.([A-Za-z][A-Za-z0-9_]{0,63})\s*:=/.exec(changeAction.formula.trim())?.[1]:null;
 const stateKey=dynamic?(changeAction?.actionType==="PageState"?changeAction.stateKey:formulaStateKey):null;
 const selectedCollection=hasCollection&&p.pageState?.collectionSelections
  ?Object.entries(p.pageState.collectionSelections).find(([name])=>
    name.toLowerCase()===p.dataCollection.name.toLowerCase())?.[1]:null;
 const selectedId=hasCollection?selectedCollection?.Id
  :stateKey&&p.pageState?p.pageState[stateKey]:undefined;
 const indexForSelection=selectedId===null||selectedId===undefined||selectedId===""?-1:
  tabs.findIndex((tab,index)=>{
   const id=firstTabCustom&&index===0?firstTabValue
    :hasCollection?tab?.record?.Id??tab?.record?.id??tab?.value:tab?.id;
   return String(id??"")===String(selectedId);
  });
 // Always default to the FIRST actual tab, regardless of its caption or ID.
 // Existing explicit selections still take priority when changing tabs.
 const selectedTabIndex=(hasCollection||stateKey)
  ?indexForSelection>=0?indexForSelection:tabs.length?0:-1
  :tabs.length?Math.min(active,tabs.length-1):-1;
 const autoSelected=React.useRef(null);
 const firstTabRef=React.useRef(null);
 const selectTab=index=>{
  setActive(index);
  if(firstTabCustom&&index===0){
   fire("change",{index,value:firstTabValue,isCustom:true,record:{Id:firstTabValue,Name:firstTabCaption},
    ...(hasCollection?{collectionName:p.dataCollection.key??p.dataCollection.name}:{})});
  }else if(hasCollection){
   const item=recordTabs[index-(firstTabCustom?1:0)];
   const itemId=item?.record?.Id||item?.record?.id||item?.value;
   fire("change",{index,value:itemId??"",record:{
    ...item?.record,Id:itemId??"",Name:item?.label??item?.record?.Name??"",
    ...(item?.record?.__collectionCriteriaField?{
     Field:item.record.__collectionCriteriaField,
     Criteria:item.record.__collectionCriteria}: {})},
    collectionName:p.dataCollection.key??p.dataCollection.name});
  }else if(dynamic){
   const row=recordsOf(p)[index-(firstTabCustom?1:0)];
   fire("change",{index,value:String(row?.Id??row?.id??""),record:row});
  }else{
   const chosen=recordTabs[index-(firstTabCustom?1:0)];
   const identifier=chosen&&typeof chosen==="object"
    ?chosen.id??chosen.value??chosen.label:chosen;
   fire("change",{index,value:String(identifier??""),record:{
    Id:String(identifier??""),Name:text(chosen?.label??chosen??"")}});
  }
  if(index!==0)autoSelected.current=null;
 };
 const firstItemId=tabs.length?(firstTabCustom?firstTabValue:
  hasCollection?tabs[0]?.record?.Id??tabs[0]?.record?.id??tabs[0]?.value:tabs[0]?.id):null;
 // Publishing the first selection matters: a visual highlight alone leaves
 // Collection State blank, so dependent components cannot filter correctly.
 React.useEffect(()=>{
  if(!tabs.length||p.loading||p.previewOnly||p.builderPreview||
    !(hasCollection||stateKey)||typeof p.onAction!=="function")return;
  // Automatic default selection is not permission to execute an authored Flow
  // or arbitrary action during page load. State bindings are safe to initialise.
  if(changeAction&&changeAction.actionType!=="PageState"&&
    !(changeAction.actionType==="Formula"&&formulaStateKey))return;
  if(indexForSelection>=0){autoSelected.current=null;return;}
  const key=String(p.pageSessionKey??"")+"|"+String(p.componentId??"")+"|"+
   String(hasCollection?p.dataCollection.name:stateKey)+"|"+String(firstItemId??"");
  if(autoSelected.current===key)return;
  autoSelected.current=key;
  selectTab(0);
 },[indexForSelection,firstItemId,tabs.length,p.loading,p.previewOnly,p.builderPreview,
   p.pageSessionKey,p.componentId,p.onAction,hasCollection,stateKey,p.dataCollection?.name]);
 // Give the first selected tab keyboard focus only if the page has no
 // active control. Never steal focus from a search field or later user choice.
 React.useEffect(()=>{
  if(selectedTabIndex!==0||!tabs.length||p.loading||
   p.previewOnly||p.builderPreview||typeof document==="undefined"||
   document.activeElement!==document.body)return;
  firstTabRef.current?.focus({preventScroll:true});
 },[selectedTabIndex,tabs.length,p.loading,p.previewOnly,p.builderPreview]);
 React.useEffect(()=>{if(active>=tabs.length)setActive(0)},[active,tabs.length]);
 return <div className="smart-tabs-shell" style={{background:p.backgroundColor||undefined,
   display:"flex",flexDirection:"column",height:"100%",minHeight:0,width:"100%"}}>
  <nav className="smart-tabs" aria-label="Tabs" style={{
    width:"100%",height:"100%",flex:"1 1 auto",minHeight:0,alignContent:"stretch"}}>
   {tabs.map((tab,index)=><button key={tab?.id??index} ref={index===0?firstTabRef:null} type="button" role="tab"
    aria-selected={selectedTabIndex===index} style={{height:number(p.tabHeight,44),maxHeight:"100%",minHeight:0,flex:"1 1 auto",
     minWidth:number(p.tabWidth,120),borderRadius:number(p.radius,10),fontSize:number(p.textSize,16),textAlign:p.labelAlignment||"center",boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none",color:p.labelColor||undefined,
     background:selectedTabIndex===index?p.selectedTabColor||"#eaf2ff":p.tabColor||"#fff",
    borderColor:p.borderColor||undefined}}
    tabIndex={selectedTabIndex===index?0:-1}
    onClick={()=>selectTab(index)}>{text(tab?.label??tab)}</button>)}
   {(dynamic||hasCollection)&&tabs.length===0&&<span className="smart-tabs-empty">No matching records</span>}
  </nav>
 </div>;
}
function SmartToggle({p,fire}){
 const asBoolean=v=>v===true||v==="true"||v==="True";
 const [checked,setChecked]=React.useState(()=>asBoolean(p.value??p.defaultCheck??false));
 const [saving,setSaving]=React.useState(false);
 React.useEffect(()=>setChecked(asBoolean(p.value??p.defaultCheck??false)),[p.value,p.defaultCheck]);
 const bound=p.toggleFieldBound===true;
 const disabled=bound&&(p.toggleFieldReady!==true||saving);
 const change=e=>{
  const next=e.target.checked;
  if(!bound){setChecked(next);fire("change",next);if(p.actionFlows?.click)fire("click",next);return;}
  if(disabled||typeof p.onBoundToggleChange!=="function")return;
  setChecked(next);setSaving(true);
  void Promise.resolve().then(()=>p.onBoundToggleChange(next))
   .then(()=>{fire("change",next);if(p.actionFlows?.click)fire("click",next);})
   .catch(()=>setChecked(asBoolean(p.value??false)))
   .finally(()=>setSaving(false));
 };
 return <label className="smart-switch" title={p.toggleFieldError||undefined}>
  <input type="checkbox" role="switch" aria-label={p.toggleFieldError||"Toggle"}
   aria-busy={saving} checked={checked} disabled={disabled} onChange={change}/>
  <span className="smart-switch-track" style={{background:checked?(p.backgroundColor||"#34c759"):"#e5e5ea",
   border:p.borderColor?"1px solid "+p.borderColor:undefined,
   ...smartShapeAppearance(p.shapeId,p.shapeId==='shape:rectangle'?0:number(p.radius,999)),
   boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none"}}>
   <span className="smart-switch-thumb"/></span></label>;
}
export default function SmartRuntime(p){
 const name=p.kind||"smart_text",record=recordOf(p),label=scopedExpression(p,"label",p.label||"",record);
 const style={fontSize:number(p.textSize,16),color:p.labelColor||undefined,textAlign:p.labelAlignment||"left",borderRadius:number(p.radius,12)};
 const buttonIcon=name==="smart_button"?icons.find(icon=>icon.id===p.shapeId):null;
 const shadowStyle={boxShadow:p.calendarShadowColor?"0 4px 10px "+p.calendarShadowColor:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none",borderRadius:number(p.radius,12)};
 const fire=(event,value)=>{if(p.previewOnly||p.builderPreview)return;
  if(typeof p.onAction==="function")void Promise.resolve(p.onAction({event,value})).catch(()=>{});
 };
 let content;
 if(name==="smart_button")content=<button type="button" className="smart-button"
   title={label||"Button"} aria-label={label||buttonIcon?.label||"Button"}
   onClick={()=>fire("click",record)}
   style={{...style,...shadowStyle,...smartShapeAppearance(p.shapeId,number(p.radius,12)),
    padding:buttonIcon&&!label?"4px":undefined,
    justifyContent:label?(p.labelAlignment==="right"?"flex-end":p.labelAlignment==="center"?"center":"flex-start"):"center",
    background:p.backgroundColor||"#2267bc",color:p.labelColor||"#fff",borderColor:p.borderColor}}>
   {buttonIcon&&<span className="smart-button-glyph" aria-hidden="true" style={{
     backgroundColor:p.iconFillColor||p.labelColor||"#fff",
     WebkitMaskImage:'url(/smart-icons/'+buttonIcon.id+'.svg)',
     maskImage:'url(/smart-icons/'+buttonIcon.id+'.svg)'
   }}/>}
   {label&&<span className="smart-button-label">{label}</span>}
 </button>;
 else if(name==="smart_toggle")content=<SmartToggle p={p} fire={fire}/>;
 else if(name==="smart_text")content=<input className="smart-input-box" type="text"
  aria-label={label||text(p.placeholder||"Input")}
  placeholder={p.builderPreview===true&&![p.placeholder,p.textSource,p.defaultValue,p.value].some(v=>v!==undefined&&v!==null&&v!=="")
    &&!(p.properties&&Object.prototype.hasOwnProperty.call(p.properties,"label"))
    ?"Text Here":label||text(p.placeholder||"")}
  defaultValue={scopedExpression(p,p.textSource?"textSource":"defaultValue",p.textSource??p.defaultValue??p.value??"",record)}
  style={{...style,...shadowStyle,...smartShapeAppearance(p.shapeId,number(p.radius,12)),width:"100%",height:"100%",minWidth:0,minHeight:0,
    fontSize:number(p.textSize,16),color:p.defaultValueColor||p.labelColor||undefined,
    borderColor:p.borderColor||undefined,background:p.backgroundColor||"#fff",
    textAlign:p.labelAlignment||"left","--smart-placeholder-color":p.labelColor||"#64748b"}}
  onChange={e=>fire("change",e.target.value)}/>;
 else if(name==="smart_lookup")content=<SmartLookup p={p} fire={fire}
   style={{...style,backgroundColor:p.backgroundColor||undefined,borderColor:p.borderColor||undefined,
    width:"100%",height:"100%",minHeight:0,color:p.labelColor||undefined,fontSize:number(p.textSize,16)}}/>;
 else if(name==="smart_image")content=<SmartCard p={p} record={
   (p.imageSourceMode==="field"||typeof p.imageSource==="string"&&p.imageSource.startsWith("@"))&&Array.isArray(p.records)
   ?(p.records.find(r=>boundImage(p,r))??record):record
 }/>;
 else if(name==="smart_card_grid"){
  const rows=Math.max(1,Math.floor(number(p.cardsPerColumn,3,1,40)));
  const columns=Math.max(1,Math.floor(number(p.cardsPerRow,3,1,12)));
  const gap=number(p.gap,12,0,160);
  const minimumCardHeight=number(p.cardMinHeight,96,96,1200);
  const boundRows=recordsOf(p);
  const previewRows=(p.previewOnly===true||p.builderPreview===true||p.preview===true)&&boundRows.length===0
    ?Array.from({length:columns*rows},(_,i)=>({Id:"card-preview-"+i,Name:"Sample item "+(i+1)}))
    :boundRows;
  content=<div className="smart-grid" role="region" aria-label="Product cards" tabIndex={0}
   onKeyDown={event=>{
     // The inner grid is an independent keyboard scroller. Never steal
     // arrow/action keys from a focused card or from the Page Builder.
     if(event.target!==event.currentTarget)return;
     const scroller=event.currentTarget;
     if(event.key==="End"){event.preventDefault();scroller.scrollTop=scroller.scrollHeight;}
     else if(event.key==="Home"){event.preventDefault();scroller.scrollTop=0;}
     else if(event.key==="PageDown"){event.preventDefault();scroller.scrollTop+=scroller.clientHeight;}
     else if(event.key==="PageUp"){event.preventDefault();scroller.scrollTop-=scroller.clientHeight;}
   }}
   style={{
   boxSizing:"border-box",width:"100%",height:"100%",minHeight:0,minWidth:0,
   overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",
   gap,
   gridTemplateColumns:"repeat("+columns+",minmax(0,1fr))",
   // Cards per column specifies the number of visible rows, never a record limit.
   // The authored canvas height owns the viewport; additional rows scroll inside it.
   gridAutoRows:"max("+minimumCardHeight+"px, calc((100% - "+(rows-1)*gap+"px) / "+rows+"))",
   alignContent:"start"
  }}>
   {previewRows.map((r,i)=>{
    const card=<SmartCard p={p} record={r}/>;
    // Published metadata decides if the card is actionable. Never fabricate
    // an Add To Cart operation: the bound Flow owns persistence and RBAC.
    return p.actionFlows?.click&&!p.previewOnly&&!p.builderPreview
      ?<button key={r?.Id??r?.id??i} type="button" className="smart-grid-action"
        aria-label={"Select "+text(r?.Name??r?.name??r?.label??"product")}
        onClick={()=>fire("click",{record:r,recordId:r?.Id??r?.id??null})}>{card}</button>
      :<React.Fragment key={r?.Id??r?.id??i}>{card}</React.Fragment>;
   })}
  </div>;
 }
 else if(name==="smart_cart")content=<SmartCart p={p} records={recordsOf(p)} Picture={SmartPicture} expression={(formula,row)=>expression(formula,row,p.pageState,p.objectApiName,p.formulaCollectionSources,p.namedCollections)}
    fieldAllowed={(key,row)=>fieldAllows(p,key,row)} fire={fire}/>;
 else if(name==="smart_calendar")content=<SmartCalendar p={p} fire={fire}/>;
 else if(name==="smart_tabs")content=<SmartTabs p={p} record={record} fire={fire}/>;
 else if(name==="smart_navigation"){
  const items=Array.isArray(p.items)&&p.items.length?p.items:recordsOf(p);
  const entries=items.length?items:isBuilderEmpty(p)?["Home","Products","Settings"]:p.textSource?[record]:[];
  const labelOf=item=>{
    if(item&&typeof item==="object"){
      if(typeof item.label==="string"&&item.label)return item.label;
      return scopedExpression(p,"textSource",p.textSource??item.Name??item.name??item.title??item.id??"",item);
    }
    return text(item);
  };
  const fit=p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":"cover";
  content=<nav className="smart-navigation" style={{width:"100%",height:"100%",
   minWidth:0,minHeight:0,overflow:"auto",flexWrap:"nowrap",alignItems:"flex-start",flexDirection:p.navigationDirection==="vertical"?"column":"row"}}>
    {entries.map((item,i)=>{
      const label=labelOf(item);
      const src=item&&typeof item==="object"?item.imageSrc??item.imageUrl:null;
      const safeSrc=typeof src==="string"&&/^https:\/\//i.test(src)?src:null;
      return <button key={item?.id??i} type="button" className="smart-navigation-item"
        style={{flex:"0 0 auto",height:32,maxHeight:"100%",minHeight:0,color:p.labelColor||undefined,background:p.backgroundColor||"#fff",
          boxShadow:p.shadow==="large"?"0 8px 20px #0003":p.shadow==="medium"?"0 3px 9px #0003":"none",
          borderColor:p.borderColor||undefined,borderRadius:number(p.radius,4),fontSize:number(p.textSize,16)}}
        onClick={()=>{fire("click",item);if(p.onNavigate&&item?.target)p.onNavigate(item.target)}}>
        {safeSrc&&<img src={safeSrc} alt="" style={{width:22,height:22,objectFit:fit}}/>}{label}
      </button>;
    })}
  </nav>;
 }else content=<div className="smart-container" style={{
    background:p.imageBackgroundColor??p.backgroundColor??"transparent",
    border:p.borderColor?"1px solid "+p.borderColor:0,
    borderRadius:number(p.radius,12),...shadowStyle,...smartShapeAppearance(p.shapeId,number(p.radius,12))
 }}>{p.children||(p.builderPreview?<span className="smart-editor-container-placeholder">Drop components here</span>:null)}</div>;
 // Geometry-only technical host; the native Smart surface owns all visible styling.
 return <div className={"smart-runtime "+name} style={{
   display:"flex",flexDirection:"column",boxSizing:"border-box",border:0,
   background:"transparent",boxShadow:"none",padding:0,margin:0,
   minWidth:0,minHeight:0,width:p.canvasFrameSized===true?"100%":p.width!==undefined&&p.width!==''?number(parseFloat(p.width),undefined,0,10000):"100%",
   height:p.canvasFrameSized===true?"100%":p.height!==undefined&&p.height!==''?number(parseFloat(p.height),undefined,0,10000):"100%"
 }}>{content}</div>;
}
