import {evaluateFieldExpression} from "../../shared/OneFieldExpression.js";
const number=(v,f,min=0,max=2000)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const text=(v)=>v===null||v===undefined?"":String(v);
const expression=(v,record)=>{
 if(typeof v!=="string")return text(v);
 if(/^(?:https:\/\/|asset:)/i.test(v.trim()))return v;
 if(!/@[A-Za-z]/.test(v)&&!/^\s*"/.test(v)&&
   !/^\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s*[+\-*/&]/.test(v))return v;
 try{return text(evaluateFieldExpression(v,record||{}));}catch{return "";}
};
const assetPattern=/^asset:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const mime=new Set(["image/png","image/jpeg","image/webp","image/gif"]);
function SmartPicture({src,alt,loadAsset,style}){
 const [data,setData]=React.useState("");
 React.useEffect(()=>{
   let live=true;setData("");
   const match=typeof src==="string"?src.match(assetPattern):null;
   if(match&&typeof loadAsset==="function")Promise.resolve(loadAsset(match[1])).then(asset=>{
     if(live&&asset&&mime.has(asset.contentType)&&typeof asset.contentBase64==="string"&&
       asset.contentBase64.length<7100000&&/^[A-Za-z0-9+/]+={0,2}$/.test(asset.contentBase64))
       setData("data:"+asset.contentType+";base64,"+asset.contentBase64);
   }).catch(()=>{});
   return()=>{live=false};
 },[src,loadAsset]);
 const safeSrc=typeof src==="string"&&/^https:\/\//i.test(src)?src:data;
 return safeSrc?<img src={safeSrc} alt={alt} style={style}/>:<span role="img" aria-label="Image area" className="smart-image-empty" style={style}>Image area</span>;
}
const recordOf=p=>p.objectApiName&&Array.isArray(p.records)
 ?(p.records[0]??{}):p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
 Array.isArray(p.records)&&p.records.length?p.records[0]:Array.isArray(p.items)&&p.items.length?p.items[0]:{};
const recordsOf=p=>Array.isArray(p.records)?p.records:Array.isArray(p.items)?p.items:[];
function SmartCard({p,record}){
 const rawImage=p.imageSource;
 const image=expression(rawImage??p.src??"",record);
 const header=expression(p.textSource??p.label??p.title??"",record);
 const badge=expression(p.badgeText??"",record);
 const horizontal=["left","right"].includes(p.imagePlacement);
 return <article className="smart-card" style={{
  display:"flex",flexDirection:horizontal?"row":"column",
  background:p.backgroundColor||"#fff",border:p.borderColor?"1px solid "+p.borderColor:"1px solid #e2e8f0",
  borderRadius:number(p.radius,12),overflow:"hidden",position:"relative",minWidth:0
 }}>
  <div style={{order:["right","bottom"].includes(p.imagePlacement)?2:0,flex:horizontal?"1 1 50%":undefined,minWidth:0}}>
   <SmartPicture src={image} alt={header} loadAsset={p.loadAsset}
      style={{height:number(p.imageHeight,220),width:"100%",display:"block",
       objectFit:p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":"cover",
       border:p.imageBorderColor?"1px solid "+p.imageBorderColor:undefined}}/>
  </div>
  <div className="smart-card-content" style={{
    order:1,flex:horizontal?"1 1 50%":undefined,display:"flex",alignItems:"center",
    height:number(p.headerBoxHeight,44),fontWeight:p.headerBold===false?400:700,
    textAlign:p.headerAlignment||"left",justifyContent:p.headerAlignment==="right"?"flex-end":p.headerAlignment==="center"?"center":"flex-start",
    border:p.headerBorderColor?"1px solid "+p.headerBorderColor:undefined,color:p.defaultValueColor||p.labelColor||undefined,
    whiteSpace:p.wrapText===false?"nowrap":"normal",
    overflow:"hidden",overflowWrap:"anywhere",padding:"4px 10px"
  }}>{header}</div>
  {p.badgeVisible===true&&<span className={"smart-badge "+(p.badgeAlignment||"image-top-right")}
   style={{fontWeight:p.badgeBold===false?400:700,fontSize:number(p.badgeTextSize,12),
   color:p.badgeTextColor||"#fff"}}>{badge}</span>}
 </article>;
}
function SmartCalendar({p}){
 const now=new Date();
 const selected=typeof p.defaultValue==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(p.defaultValue)?
  new Date(p.defaultValue+"T12:00:00Z"):now;
 const year=selected.getUTCFullYear(),month=selected.getUTCMonth();
 const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
 const first=Math.max(0,["sun","mon","tue","wed","thu","fri","sat"].indexOf(p.firstDay||"mon"));
 const allowed=Array.isArray(p.showDays)?p.showDays:["sun","mon","tue","wed","thu","fri","sat"];
 const indices=Array.from({length:7},(_,n)=>(n+first)%7)
  .filter(i=>allowed.includes(dayNames[i].toLowerCase().slice(0,3)));
 const monthStart=new Date(Date.UTC(year,month,1)).getUTCDay();
 const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const offset=(monthStart-first+7)%7;
 const weeks=Math.ceil((days+offset)/7);
 return <div className="smart-calendar">
  {p.label&&<strong>{expression(p.label,recordOf(p))}</strong>}
  <strong>{selected.toLocaleString("en-GB",{month:"long",year:"numeric",timeZone:"UTC"})}</strong>
  {indices.length===0?<p>No calendar days selected</p>:<div className="smart-calendar-grid"
   style={{gridTemplateColumns:"repeat("+indices.length+",minmax(0,1fr))"}}>
   {indices.map(i=><b key={"day"+i}>{dayNames[i]}</b>)}
   {Array.from({length:weeks},(_,week)=>indices.map(i=>{
    const relative=(i-first+7)%7;
    const date=week*7+relative-offset+1;
    return <span key={week+"-"+i} aria-label={date>=1&&date<=days?
     dayNames[i]+" "+date:"Empty day"} className={date>=1&&date<=days?"":"smart-calendar-empty"}
     style={{color:p.defaultValueColor||undefined}}>
     {date>=1&&date<=days?date:""}
    </span>;
   }))}
  </div>}
 </div>;
}
function SmartLookup({p,style,fire}){
 const [query,setQuery]=React.useState(()=>expression(p.defaultValue??"",recordOf(p)));
 const [opened,setOpened]=React.useState(false);
 const candidates=recordsOf(p).slice(0,200).filter(item=>item&&typeof item==="object");
 const display=row=>expression(p.textSource??row.Name??row.name??row.label??row.title??row.id??"",row);
 const matches=candidates.filter(row=>display(row).toLowerCase().includes(query.toLowerCase())).slice(0,20);
 return <div className="smart-lookup" style={style}>
  <input className="smart-search" type="search" role="combobox"
   aria-label={text(p.placeholder||p.label||"Search records")}
   aria-expanded={opened&&matches.length>0} aria-controls="smart-lookup-suggestions"
   placeholder={text(p.placeholder||p.label||"Search records…")}
   value={query} onFocus={()=>setOpened(true)}
   onChange={event=>{setQuery(event.target.value);setOpened(true);fire("change",event.target.value)}}/>
  {opened&&query&&matches.length>0&&<div id="smart-lookup-suggestions" className="smart-lookup-menu" role="listbox">
   {matches.map((record,i)=><button type="button" key={text(record.id??i)} role="option"
    aria-selected={false} onMouseDown={event=>event.preventDefault()}
    onClick={()=>{setQuery(display(record));setOpened(false);fire("select",{record,value:record.id??null})}}>
     {display(record)}
   </button>)}
  </div>}
 </div>;
}
function SmartTabs({p,record,fire}){
 const [active,setActive]=React.useState(0);
 const tabs=Array.isArray(p.tabs)?p.tabs:Array.from({length:number(p.tabCount,3,1,20)},(_,i)=>"Tab "+(i+1));
 const heading=expression(p.textSource??p.label??"",record);
 return <div className="smart-tabs-shell">
  {heading&&<strong className="smart-tabs-heading">{heading}</strong>}
  <nav className="smart-tabs" aria-label={heading||"Tabs"}>
   {tabs.map((tab,index)=><button key={index} type="button" role="tab"
    aria-selected={active===index} style={{height:number(p.tabHeight,44),
     minWidth:number(p.tabWidth,120),color:p.tabColor||undefined,
     background:active===index?p.selectedTabColor||"#eaf2ff":undefined}}
    onClick={()=>{setActive(index);fire("change",index)}}>{text(tab?.label??tab)}</button>)}
  </nav>
 </div>;
}
export default function SmartRuntime(p){
 const name=p.kind||"smart_text",record=recordOf(p),label=expression(p.label||"",record);
 const style={fontSize:number(p.textSize,16),color:p.labelColor||undefined,textAlign:p.labelAlignment||"left",
   borderRadius:number(p.radius,12),boxShadow:p.shadow==="none"?"none":p.shadow==="large"?"0 8px 20px #0002":p.shadow==="medium"?"0 3px 9px #0002":"none"};
 const fire=(event,value)=>{if(p.previewOnly||p.builderPreview)return;
  if(typeof p.onAction==="function")void Promise.resolve(p.onAction({event,value})).catch(()=>{});
 };
 let content;
 if(name==="smart_button")content=<button type="button" className="smart-button"
   onClick={()=>fire("click",record)} style={{...style,background:p.backgroundColor||"#2267bc",color:p.labelColor||"#fff",borderColor:p.borderColor}}>{label||"Button"}</button>;
 else if(name==="smart_toggle")content=<label className="smart-toggle" style={style}>
  <input type="checkbox" defaultChecked={p.defaultValue===true} onChange={e=>fire("change",e.target.checked)}/>{label||"Toggle"}</label>;
 else if(name==="smart_text")content=<label className="smart-field" style={{...style,background:p.backgroundColor||undefined}}>
  {label&&<span>{label}</span>}<input type="text" placeholder={text(p.placeholder||"")} defaultValue={expression(p.textSource??p.defaultValue??p.value??"",record)}
  style={{color:p.defaultValueColor||p.labelColor||undefined,borderColor:p.borderColor||undefined}}
  onChange={e=>fire("change",e.target.value)}/></label>;
 else if(name==="smart_lookup")content=<SmartLookup p={p} fire={fire}
   style={{...style,backgroundColor:p.backgroundColor||undefined,borderColor:p.borderColor||undefined,
    color:p.defaultValueColor||p.labelColor||undefined,fontSize:number(p.placeholderSize,p.textSize||14)}}/>;
 else if(name==="smart_image")content=<SmartCard p={p} record={record}/>;
 else if(name==="smart_card_grid")content=<div className="smart-grid" style={{gridTemplateColumns:"repeat("+number(p.cardsPerRow,3,1,12)+",minmax(0,1fr))"}}>
  {recordsOf(p).slice(0,number(p.cardsPerRow,3,1,12)*number(p.cardsPerColumn,1,1,12)).map((r,i)=>
  <SmartCard p={p} record={r} key={r?.id??i}/>)}</div>;
 else if(name==="smart_calendar")content=<SmartCalendar p={p}/>;
 else if(name==="smart_tabs")content=<SmartTabs p={p} record={record} fire={fire}/>;
 else if(name==="smart_navigation"){
  const items=Array.isArray(p.items)&&p.items.length?p.items:p.textSource?[expression(p.textSource,record)]:[];
  content=<nav className="smart-navigation" style={{flexDirection:p.navigationDirection==="vertical"?"column":"row"}}>
   {items.map((item,i)=><button key={i} type="button" onClick={()=>{fire("click",item);if(p.onNavigate&&item?.target)p.onNavigate(item.target)}}>{text(item?.label??item)}</button>)}
  </nav>;
 }else content=<div className="smart-container">
  {p.label&&<strong>{label}</strong>}
  {(p.imageSource||p.textSource||p.badgeText)&&<SmartCard p={p} record={record}/>}
  {p.children||null}</div>;
 return <div className={"smart-runtime "+name} style={{...style,backgroundColor:p.backgroundColor||undefined,
   ...(p.borderColor?{border:"1px solid "+p.borderColor}:{}),
   ...(p.width!==undefined&&p.width!==''?{width:number(parseFloat(p.width),undefined,0,10000)}:{}),
   ...(p.height!==undefined&&p.height!==''?{height:number(parseFloat(p.height),undefined,0,10000)}:{})}}>{content}</div>;
}
