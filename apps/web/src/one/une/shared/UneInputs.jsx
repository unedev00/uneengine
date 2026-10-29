const fire=(p,event,value)=>{if(event==='change'&&typeof p.onChange==='function'&&!p.actionFlows?.change)p.onChange(value);
  if(p.actionFlows?.[event]&&typeof p.onAction==='function')return Promise.resolve(p.onAction({event,value})).catch(()=>{});
};
const records=p=>Array.isArray(p.records)?p.records:Array.isArray(p.items)?p.items:[];
const key=k=>typeof k==="string"&&/^[A-Za-z][A-Za-z0-9_]*$/.test(k);
const field=(row,name,fallback)=>key(name)?row?.[name]??fallback:fallback;
const n=(v,fallback,min=0,max=200)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
export function UneInput(p){
 const generatedId=React.useId();
 const id=p.inputId||generatedId;
 const [local,setLocal]=React.useState(p.value??p.defaultValue??"");
 React.useEffect(()=>{if(p.value!==undefined)setLocal(p.value)},[p.value]);
 const set=v=>{setLocal(v);fire(p,"change",v)};
 const type=["text","email","number","tel","date","time","search","password","url"].includes(p.inputType)?p.inputType:"text";
 const maxLength=Number(p.maxLength)>0?n(p.maxLength,4096,1,100000):undefined;
 const gap=n(p.gap,12,0,120);
 const padding=n(p.padding,16,0,100);
 const density=["compact","comfortable","spacious"].includes(p.density)?p.density:"comfortable";
 const densityGap=density==="compact"?Math.max(2,gap/2):density==="spacious"?gap*1.5:gap;
 const surface=["glass","solid","plain"].includes(p.surface)?p.surface:"solid";
 const helpId=p.helpText?id+"-help":undefined;
 const attributes={id,className:"one-control",required:p.required===true,value:local??"",
  placeholder:p.placeholder||"",maxLength,
  "aria-describedby":helpId};
 return <div className="one-ui one-field une-input-field" data-surface={surface} data-density={density}
   style={{display:"flex",flexDirection:"column",gap:densityGap,padding:0}}>
  {p.label&&<label className="one-label" htmlFor={id}>{p.label}</label>}
  <div className="une-input-surface" style={{padding}}>
   {p.multiline?<textarea {...attributes} rows={Math.max(3,n(p.rows,3,1,16))} onChange={e=>set(e.target.value)}/>:
    <input {...attributes} type={type}
     onChange={e=>set(type==="number"?(e.target.value===""?"":Number(e.target.value)):e.target.value)}/>}
  </div>
  {p.helpText&&<small id={helpId} className="one-muted une-input-help" title={String(p.helpText)}>{p.helpText}</small>}
 </div>;
}
export function UneToggle(p){
 const [local,setLocal]=React.useState(p.value??p.defaultValue??false),checked=local;
 React.useEffect(()=>setLocal(Boolean(p.value??p.defaultValue??false)),[p.value,p.defaultValue]);
 return <label className="one-ui one-row" style={{justifyContent:"space-between",gap:12}}>
  <span>{p.label||"Setting"}</span><input role="switch" type="checkbox" checked={checked} disabled={p.disabled===true}
    onChange={e=>{setLocal(e.target.checked);fire(p,"change",e.target.checked)}}/></label>;
}
const options=p=>{
 const rows=records(p);
 if(p.optionLabelFieldApiName)return rows.map(row=>({label:String(field(row,p.optionLabelFieldApiName,"")),
   value:String(field(row,p.optionValueFieldApiName||"Id","")),record:row}));
 return Array.isArray(p.options)?p.options.map(o=>typeof o==="object"?o:{label:String(o),value:String(o)}):[];
};
export function UneChoice(p){
 const [local,setLocal]=React.useState(p.mode==="multiple"?[]:""),chosen=p.value!==undefined?p.value:local;
 const values=options(p).filter(x=>x.value!==undefined&&x.value!==null);
 const select=value=>{setLocal(value);fire(p,"change",value)};
 return <fieldset className="one-ui one-field" style={{border:0,padding:0}}>
  <legend>{p.label||"Choose"}</legend>
  <div className="one-stack" style={{flexDirection:"column",gap:8}}>
   {values.map((o,i)=>{const value=String(o.value),checked=p.mode==="multiple"
     ?Array.isArray(chosen)&&chosen.some(v=>String(v)===value):String(chosen??"")===value;
    return <label key={value+i} className="one-item" style={{display:"flex",alignItems:"center",gap:10,padding:12}}>
    <input type={p.mode==="multiple"?"checkbox":"radio"} name={p.inputId||p.componentId||"une-choice"} checked={checked}
     onChange={()=>select(p.mode==="multiple"?(checked?chosen.filter(v=>String(v)!==value):[...(Array.isArray(chosen)?chosen:[]),value]):value)}/>
    <span>{o.label??value}</span></label>})}
  </div></fieldset>;
}
export function UneLookup(p){
 const [localQuery,setLocalQuery]=React.useState(""),[local,setLocal]=React.useState(p.value??"");
 React.useEffect(()=>setLocal(p.value??""),[p.value]);
 const query=p.searchValue!==undefined&&p.searchValue!==""?String(p.searchValue):localQuery;
 const keyName=p.searchFieldApiName||p.recordTitleFieldApiName||"Name";
 const shown=records(p).filter(row=>String(field(row,keyName,"")).toLowerCase().includes(query.toLowerCase())).slice(0,100);
 const choose=value=>{
  setLocal(value);
  const record=shown.find(row=>String(field(row,p.recordValueFieldApiName||"Id",""))===value);
  const fields=value=>String(value||"").split(",").map(s=>s.trim())
     .filter(s=>/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(s)).slice(0,10);
  const first=keys=>keys.map(key=>field(record,key,"")).map(value=>String(value??"").trim()).find(Boolean)||"";
  const phoneFields=fields(p.recordPhoneFieldApiNames),nameFields=fields(p.recordNameFieldApiNames);
  const phone=phoneFields.map(key=>String(field(record,key,"")||"").replace(/[^0-9]/g,""))
    .find(value=>/^[1-9][0-9]{6,14}$/.test(value))||"";
  const rawName=first(nameFields);
  fire(p,"change",p.selectionPayload==="record"
    ?{value,record:record??null,phoneNumber:phone,contactName:rawName||phone}
    :value);
 };
 return <div className="one-ui one-field" aria-busy={p.loading===true}>
  <label className="one-label">{p.label||"Lookup"}
   <input className="one-control" placeholder={p.placeholder||"Search records"}
    value={query} disabled={p.disabled===true} onChange={e=>{setLocalQuery(e.target.value);fire(p,"search",e.target.value)}}/>
  </label>
  {p.loading===true?<p role="status" className="one-muted">{p.loadingText||"Loading records…"}</p>:
   <select className="one-control" aria-label={p.label||"Select record"} value={String(local)}
    disabled={p.disabled===true} onChange={e=>choose(e.target.value)}>
    <option value="">{p.emptyText&&shown.length===0?p.emptyText:"Select…"}</option>
    {shown.map((row,i)=>{const value=String(field(row,p.recordValueFieldApiName||"Id",""));
     const title=String(field(row,p.recordTitleFieldApiName||"Name",value));
     const sub=p.recordSubtitleFieldApiName?String(field(row,p.recordSubtitleFieldApiName,"")):"";
     return <option value={value} key={value+i}>{sub?title+" — "+sub:title}</option>})}
   </select>}
 </div>;
}
export function UneDatePicker(p){return <UneInput {...p} inputType="date"/>;}
export function UneSlotPicker(p){
 const filtered=records(p).filter(row=>!p.optionAvailableFieldApiName||[true,"true",1,"1"].includes(
   field(row,p.optionAvailableFieldApiName,false)));
 return <div className="one-ui one-field"><label className="one-label">{p.label||"Available times"}</label>
  {!filtered.length?<p className="one-muted" role="status">{p.emptyText||"No available times"}</p>:
  <div className="one-row" style={{flexWrap:"wrap",gap:8}}>
   {filtered.slice(0,100).map((row,i)=>{const value=String(field(row,p.optionValueFieldApiName||"Id",""));
    const label=String(field(row,p.optionLabelFieldApiName||"Name",value));
    return <button className="one-btn" type="button" key={value+i} onClick={()=>fire(p,"change",{value,record:row})}>{label}</button>;})}
  </div>}</div>;
}
