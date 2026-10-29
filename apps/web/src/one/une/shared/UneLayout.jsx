import OneTenantImage from "../../shared/OneTenantImage.jsx";
import {evaluateFieldExpression} from "../../shared/OneFieldExpression.js";
const fire=(p,event,value)=>p.actionFlows?.[event]&&typeof p.onAction==="function"
  ?Promise.resolve(p.onAction({event,value})).catch(()=>{}):undefined;
const clamp=(value,fallback,min=0,max=100)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const parse=v=>Array.isArray(v)?v:String(v??"").split(",").map(s=>s.trim()).filter(Boolean);
const objectFit=p=>p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":p.imageFill==="fill"?"cover":p.imageFit||"cover";
const recordFor=p=>p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
  Array.isArray(p.records)&&p.records.length?p.records[0]:
  Array.isArray(p.items)&&p.items.length?p.items[0]:{};
const textFrom=(source,record)=>typeof source==="string"&&source.trim()?evaluateFieldExpression(source,record):"";
export function UneContainer(p){
 const record=recordFor(p),image=textFrom(p.imageSource,record),heading=textFrom(p.textSource,record)||p.label||"";
 const badge=textFrom(p.badgeText,record),badgeVisible=p.badgeVisible===true&&Boolean(badge);
 const alignment=String(p.badgeAlignment||"image-top-right"),onImage=alignment.startsWith("image-")&&Boolean(image);
 const colorValue=v=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v)?v:undefined;
 const badgeNode=badgeVisible?<span className="une-container-badge" style={{
   position:onImage?"absolute":undefined,zIndex:2,
   top:onImage&&!alignment.includes("bottom")?8:undefined,
   bottom:onImage&&alignment.includes("bottom")?8:undefined,
   left:onImage&&alignment.includes("left")?8:onImage&&alignment.includes("center")?"50%":undefined,
   right:onImage&&alignment.includes("right")?8:undefined,
   transform:onImage&&alignment.includes("center")?"translateX(-50%)":undefined,
   borderRadius:16,padding:"3px 8px",backgroundColor:"var(--une-accent,#2563eb)",
   color:colorValue(p.badgeTextColor)||"#fff",fontSize:clamp(p.badgeTextSize,12,0,60),
   fontWeight:p.badgeBold===false?400:700,
   ...(!onImage?{alignSelf:alignment==="text-center"?"center":alignment==="text-right"?"flex-end":"flex-start"}:{})
 }}>{badge}</span>:null;
 return <section className="one-ui one-surface une-container-root" style={{
   display:"flex",flexDirection:p.direction==="row"?"row":"column",gap:clamp(p.gap,12),
   padding:clamp(p.padding,16),borderRadius:clamp(p.radius,20),
   backgroundColor:colorValue(p.backgroundColor),borderColor:colorValue(p.borderColor)
 }}>
   {heading&&<span className="une-container-label" style={{
     color:colorValue(p.labelColor),textAlign:["left","center","right"].includes(p.labelAlignment)?p.labelAlignment:undefined
   }}>{heading}</span>}
   {image&&<div className="une-container-image" style={{position:"relative",minWidth:0}}>
     <OneTenantImage src={image} loadAsset={p.loadAsset} alt={heading}
       style={{display:"block",width:"100%",height:180,objectFit:objectFit(p)}}/>
     {onImage&&badgeNode}
   </div>}
   {!onImage&&alignment!=="text-bottom"&&badgeNode}
   {p.children}
   {!onImage&&alignment==="text-bottom"&&badgeNode}
 </section>;
}
export function UneStack(p){return <div className="one-ui une-stack-root" style={{display:"flex",
  flexDirection:p.direction==="row"?"row":"column",flexWrap:p.wrap===false?"nowrap":"wrap",
  gap:clamp(p.gap,12),padding:clamp(p.padding,16)}}>{p.children}</div>}
export function UneGrid(p){return <div className="one-ui une-grid" style={{
 "--une-cols-desktop":clamp(p.desktopColumns,3,1,12),
 "--une-cols-tablet":clamp(p.tabletColumns,2,1,12),
 "--une-cols-phone":clamp(p.mobileColumns,1,1,12),
 gap:clamp(p.gap,12)}}>{p.children}</div>}
export function UneSplitPane(p){
 const list=React.Children.toArray(p.children),ratio=clamp(p.splitRatio,50,15,85);
 return <div className="one-ui une-split" style={{"--une-split-ratio":ratio+"%",gap:clamp(p.gap,12)}}>
  <div>{list[0]||null}</div><div>{list.slice(1)}</div></div>;
}
export function UneCard(p){return <section className="one-ui one-surface" style={{padding:clamp(p.padding,16),borderRadius:clamp(p.radius,20)}}>
  {p.title&&<h3 className="one-heading">{p.title}</h3>}{p.subtitle&&<small>{p.subtitle}</small>}
  {p.description&&<p>{p.description}</p>}
  {p.imageSrc&&<OneTenantImage src={p.imageSrc} alt={p.title||""} loadAsset={p.loadAsset}
   style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:12}}/>}{p.children}</section>}
export function UneTabs(p){
 const original=parse(p.tabs||"Overview, Details"),tabs=Number.isInteger(Number(p.tabCount))&&Number(p.tabCount)>0
  ?Array.from({length:Math.min(30,Number(p.tabCount))},(_,i)=>original[i]||"Tab "+(i+1))
  :original,children=React.Children.toArray(p.children);
 const [selected,setSelected]=React.useState(0);
 const active=Math.max(0,Math.min(selected,tabs.length-1)),uid=React.useId();
 return <section className="one-ui une-tabs-root" style={{"--une-tab-bg":p.tabColor||undefined,"--une-selected-text":p.selectedTabTextColor||undefined}}><div className="one-tabs" role="tablist" aria-label={p.label||"Tabs"}>
  {tabs.map((label,i)=><button className="one-tab" type="button" role="tab" key={label+i}
   id={uid+"-tab-"+i} aria-controls={uid+"-panel"} aria-selected={i===active}
   style={{...(Number.isFinite(Number(p.tabHeight))&&Number(p.tabHeight)>=0?{height:Number(p.tabHeight)}:{}),
    ...(Number.isFinite(Number(p.tabWidth))&&Number(p.tabWidth)>=0?{width:Number(p.tabWidth)}:{}),
    ...(p.selectedTabColor&&i===active?{backgroundColor:p.selectedTabColor}:{}),
    ...(p.tabColor&&i!==active?{backgroundColor:p.tabColor}:{})}}
   onClick={()=>{setSelected(i);fire(p,"tabChange",{index:i,label,value:label})}}>{label}</button>)}</div>
  {<div className="une-tabs-panel" id={uid+"-panel"} role="tabpanel" aria-labelledby={uid+"-tab-"+active}>{children[active]??null}</div>}</section>;
}
const menuOptions=v=>Array.isArray(v)?v:parse(v).map(label=>({label,value:label}));
export function UneNavigation(p){
 const heading=textFrom(p.textSource,recordFor(p));
 const direction=p.navigationDirection==="vertical"?"column":p.navigationDirection==="horizontal"?"row":
   p.direction==="column"?"column":"row";
 const itemImage=item=>typeof item.imageSrc==="string"?item.imageSrc:typeof item.image==="string"?item.image:"";
 return <nav className="one-ui one-row une-navigation-bar" aria-label={p.label||"Navigation"} style={{
   display:"flex",flexDirection:direction,alignItems:direction==="row"?"center":"stretch",
   gap:clamp(p.gap,8),
   backgroundColor:p.backgroundColor||undefined,
   borderColor:p.borderColor||undefined,
   borderRadius:clamp(p.radius,12)
 }}>
 {heading&&<span className="une-navigation-heading" style={{
  color:p.labelColor||undefined,fontSize:clamp(p.textSize,16,8,70)
 }}>{heading}</span>}
 {menuOptions(p.items).map((item,i)=><button className="one-btn" type="button" key={i}
  style={{display:"inline-flex",alignItems:"center",gap:6}}
  onClick={()=>fire(p,"navigate",{label:item.label??String(item.value??""),value:item.value??item.label})}>
  {itemImage(item)&&<OneTenantImage src={itemImage(item)} alt="" loadAsset={p.loadAsset}
    style={{width:24,height:24,objectFit:objectFit(p)}}/>}
  {item.label??String(item.value??"")}</button>)}</nav>;
}
export function UneMenu(p){return <UneNavigation {...p} direction="column"/>}
function dialog(p,isDrawer){
 const [internalOpen,setInternalOpen]=React.useState(p.startOpen===true);
 const open=p.controlledOpen===true?p.isOpen===true:internalOpen;
 const close=()=>{if(p.controlledOpen!==true)setInternalOpen(false);fire(p,"close",{});};
 const show=()=>{if(p.controlledOpen!==true)setInternalOpen(true);fire(p,"open",{});};
 const ref=React.useRef(null);
 React.useEffect(()=>{if(!open)return;const previous=document.activeElement;ref.current?.focus();
  const key=e=>{
   if(e.key==="Escape"&&p.closeOnEscape!==false){e.preventDefault();close();return;}
   if(e.key!=="Tab"||!ref.current)return;
   const options=Array.from(ref.current.querySelectorAll(
    'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
   )).filter(el=>el.getClientRects().length>0);
   if(!options.length){e.preventDefault();ref.current.focus();return;}
   const first=options[0],last=options[options.length-1];
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){
    e.preventDefault();last.focus();
   }else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){
    e.preventDefault();first.focus();
   }
  };
  document.addEventListener("keydown",key);
  return()=>{document.removeEventListener("keydown",key);previous?.focus?.()};
 },[open,p.closeOnEscape,p.controlledOpen]);
 return <div className="one-ui">
  {p.showTrigger!==false&&<button className="one-btn" type="button" onClick={show}>{p.openLabel||"Open"}</button>}
  {open&&<div className="une-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&p.closeOnBackdrop!==false)close()}}>
   <section className={"one-surface une-dialog"+(isDrawer?" une-drawer":"")+(p.fullScreenOnMobile===true?" une-dialog--phone-full":"")}
    role="dialog" aria-modal="true" aria-label={p.title||"Dialog"} tabIndex={-1} ref={ref}>
    <div className="one-row" style={{justifyContent:"space-between",gap:12}}>
     <strong>{p.title||"Dialog"}</strong>
     {p.showCloseButton!==false&&<button className="one-btn" type="button" onClick={close} aria-label="Close">×</button>}
    </div>
    <div>{p.children}</div>
   </section>
  </div>}
 </div>;
}
export function UneModal(p){return dialog(p,false)}
export function UneDrawer(p){return dialog(p,true)}
