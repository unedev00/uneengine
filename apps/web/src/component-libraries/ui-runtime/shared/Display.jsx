import OneTenantImage from "../../shared/TenantImage.jsx";
const fire=(p,event,value)=>{if(event==='change'&&typeof p.onChange==='function'&&!p.actionFlows?.change)p.onChange(value);
  if(p.actionFlows?.[event]&&typeof p.onAction==='function')return Promise.resolve(p.onAction({event,value})).catch(()=>{});
};
const data=p=>Array.isArray(p.records)?p.records:Array.isArray(p.items)?p.items:[];
const safeKey=k=>typeof k==="string"&&/^[A-Za-z][A-Za-z0-9_]*$/.test(k);
const field=(r,k)=>safeKey(k)?r?.[k]:undefined;
const n=(v,fallback,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
export function UneImage(p){return <figure className="one-ui" style={{margin:0}}>
 {p.src&&<OneTenantImage src={p.src} loadAsset={p.loadAsset} alt={p.alt||""} style={{
 width:"100%",height:n(p.imageHeight,220,16,1000),objectFit:p.imageFit||"cover",borderRadius:n(p.radius,16,0,80)}}/>}
 {p.caption&&<figcaption className="one-muted">{p.caption}</figcaption>}</figure>}
export function UneMetric(p){return <section className="one-ui one-surface" style={{padding:16}}>
 <small>{p.title||"Metric"}</small><div style={{fontSize:28,fontWeight:700}}>{p.value??"0"}</div>
 {p.subtitle&&<small>{p.subtitle}</small>}</section>}
export function UneAlert(p){return <p className="one-ui one-surface" role={p.severity==="error"?"alert":"status"}
 style={{padding:12,borderLeft:"4px solid var(--une-accent)"}}>{p.text||"Information"}</p>}
export function UneProgress(p){const value=n(p.value,0,0,Number(p.max)||100),max=n(p.max,100,1,100000);
 return <div className="one-ui"><label>{p.label||"Progress"}</label>
  <progress value={value} max={max} style={{width:"100%",accentColor:"var(--une-accent)"}}/>
  <span>{Math.min(100,Math.round(value/max*100))}%</span></div>}
export function UneDocumentViewer(p){
 const url=typeof p.src==="string"&&(/^(?:https:\/\/|asset:)/i.test(p.src))?p.src:"";
 return <section className="one-ui one-surface" style={{padding:16}}><h3>{p.title||"Document"}</h3>
  {url?<a href={url.startsWith("https://")?url:undefined} rel="noopener noreferrer" target="_blank">
    Open document</a>:<p className="one-muted">Select a document source.</p>}
  {p.showPrint!==false&&<button className="one-btn" type="button"
   onClick={()=>fire(p,"print",{source:p.src})}>Print through configured Flow</button>}</section>;
}
export function UneChart(p){
 const rows=data(p).slice(0,40),labelField=p.chartLabelFieldApiName||"Name",valueField=p.chartValueFieldApiName||"Value";
 const values=rows.map(r=>({label:String(field(r,labelField)??""),value:Number(field(r,valueField))})).filter(r=>Number.isFinite(r.value));
 const max=Math.max(1,...values.map(r=>r.value)),barWidth=Math.max(8,Math.floor(500/Math.max(values.length,1)));
 const points=values.map((r,i)=>[i*barWidth+barWidth/2,170-Math.max(0,r.value)/max*150].join(",")).join(" ");
 return <div className="one-ui one-surface" style={{padding:16}}>
  <svg viewBox="0 0 500 200" role="img" aria-label={p.title||"Data chart"} style={{width:"100%",height:220}}>
   {p.chartType==="line"?<polyline points={points} fill="none" stroke="var(--une-accent)" strokeWidth="3"/>:
    values.map((r,i)=><rect key={i} x={i*barWidth} y={170-Math.max(0,r.value)/max*150}
      width={Math.max(2,barWidth-3)} height={Math.max(0,r.value)/max*150} fill="var(--une-accent)"/>)}
  </svg>{!values.length&&<p className="one-muted">{p.emptyText||"No chart data"}</p>}
 </div>;
}
