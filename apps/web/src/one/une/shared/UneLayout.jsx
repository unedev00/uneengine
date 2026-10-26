import OneTenantImage from "../../shared/OneTenantImage.jsx";
const fire=(p,event,value)=>p.actionFlows?.[event]&&typeof p.onAction==="function"
  ?Promise.resolve(p.onAction({event,value})).catch(()=>{}):undefined;
const clamp=(value,fallback,min=0,max=100)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const parse=v=>Array.isArray(v)?v:String(v??"").split(",").map(s=>s.trim()).filter(Boolean);
export function UneContainer(p){return <section className="one-ui one-surface" style={{
  display:"flex",flexDirection:p.direction==="row"?"row":"column",gap:clamp(p.gap,12),
  padding:clamp(p.padding,16),borderRadius:clamp(p.radius,20)}}>{p.children}</section>}
export function UneStack(p){return <div className="one-ui" style={{display:"flex",
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
 const tabs=parse(p.tabs||"Overview, Details"),children=React.Children.toArray(p.children);
 const [selected,setSelected]=React.useState(0);
 const active=Math.max(0,Math.min(p.controlledSelection===true?Number(p.selectedIndex)||0:selected,tabs.length-1)),uid=React.useId();
 return <section className="one-ui"><div className="one-tabs" role="tablist" aria-label={p.tabLabel||p.label||"Tabs"}>
  {tabs.map((label,i)=><button className="one-tab" type="button" role="tab" key={label+i}
   id={uid+"-tab-"+i} aria-controls={uid+"-panel"} aria-selected={i===active}
   onClick={()=>{if(p.controlledSelection!==true)setSelected(i);fire(p,"tabChange",{index:i,label,value:label})}}>{label}</button>)}</div>
  {p.showPanel!==false&&<div id={uid+"-panel"} role="tabpanel" aria-labelledby={uid+"-tab-"+active}
   style={{paddingTop:12}}>{children[active]??null}</div>}</section>;
}
const menuOptions=v=>Array.isArray(v)?v:parse(v).map(label=>({label,value:label}));
export function UneNavigation(p){
 return <nav className="one-ui one-row" aria-label={p.label||"Navigation"} style={{
 display:"flex",flexDirection:p.direction==="column"?"column":"row",gap:clamp(p.gap,8)}}>
 {menuOptions(p.items).map((item,i)=><button className="one-btn" type="button" key={i}
  onClick={()=>fire(p,"navigate",{label:item.label??String(item.value??""),value:item.value??item.label})}>
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
