import {resolvePhoneColumns} from "../../../core/records/ResponsiveDataList/phoneColumns.mjs";
const fire=(p,event,value)=>{if(event==='change'&&typeof p.onChange==='function'&&!p.actionFlows?.change)p.onChange(value);
  if(p.actionFlows?.[event]&&typeof p.onAction==='function')return Promise.resolve(p.onAction({event,value})).catch(()=>{});
};
const data=p=>Array.isArray(p.records)?p.records:Array.isArray(p.items)?p.items:[];
const valid=v=>typeof v==="string"&&/^[A-Za-z][A-Za-z0-9_]*$/.test(v);
const field=(r,k,fallback="")=>valid(k)?r?.[k]??fallback:fallback;
const amount=(v)=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,d,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
export function UneRepeater(p){
 const [localSelection,setLocalSelection]=React.useState("");
 const rows=data(p),nameKey=p.recordTitleFieldApiName||"Name",idKey=p.recordValueFieldApiName||"Id";
 const query=String(p.searchValue??"").trim().toLowerCase(),searchKey=p.searchFieldApiName||nameKey;
 const max=clamp(p.maxItems,200,1,500),selected=p.selectedValue||localSelection;
 const matched=query?rows.filter(row=>String(field(row,searchKey,"")).toLowerCase().includes(query)):rows;
 const select=(id,row)=>{
  if(p.disabled===true)return;
  setLocalSelection(id);
  if(p.selectionFilterKey&&p.pageSessionKey&&typeof window!=="undefined"){
   window.dispatchEvent(new CustomEvent("metadrive:page-filter-selected",{detail:{
    pageSessionKey:p.pageSessionKey,filterKey:p.selectionFilterKey,value:id,
    recordId:id,label:String(field(row,nameKey,id)),
    sourceObjectApiName:p.sourceObjectApiName||p.objectApiName||""
   }}));
  }
  fire(p,"itemSelect",p.sourceObjectApiName?{...row,sourceObjectApiName:p.sourceObjectApiName}:row);
 };
 return <div className="one-ui one-stack" style={{flexDirection:"column",gap:8}} aria-busy={p.loading===true}>
 {p.loading===true?<p role="status" className="one-muted">{p.loadingText||"Loading records…"}</p>:
 matched.length===0?<p className="one-muted">{p.emptyText||"No records"}</p>:
 matched.slice(0,max).map((row,i)=>{
  const id=String(field(row,idKey,i)),name=String(field(row,nameKey,id));
  return <button className="one-item" type="button" key={id+i} aria-pressed={String(selected)===id}
      disabled={p.disabled===true} style={{textAlign:"left",padding:12}} onClick={()=>select(id,row)}>
    <strong>{name}</strong>{p.recordSubtitleFieldApiName&&<div className="one-muted">
      {String(field(row,p.recordSubtitleFieldApiName))}</div>}
    {p.recordBadgeFieldApiName&&<small className="une-row-badge">{String(field(row,p.recordBadgeFieldApiName))}</small>}
    {p.recordTrailingFieldApiName&&<span className="une-row-trailing">{String(field(row,p.recordTrailingFieldApiName))}</span>}
   </button>})}
 </div>;
}
export function UneRecordList(p){return <UneRepeater {...p}/>}
const fields=(p,rows)=>Array.isArray(p.columns)&&p.columns.length?p.columns:
 Object.keys(rows[0]||{}).filter(k=>valid(k)&&!k.startsWith("_")).slice(0,12).map(key=>({key,label:key}));
export function UneTable(p){
 const rows=data(p),cols=fields(p,rows),pageSize=clamp(p.pageSize,20,1,100),[page,setPage]=React.useState(0);
 const maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1),current=Math.min(maxPage,page);
 const currentRows=rows.slice(current*pageSize,(current+1)*pageSize);
 const phone=resolvePhoneColumns(cols);
 const val=(row,col)=>col?String(field(row,col.key??col.apiName??col.fieldApiName,"")):"";
 const select=(row)=>fire(p,"rowSelect",row);
 const listLayout=p.phoneLayout!=="scroll";
 return <div className={"one-ui une-responsive-data "+(listLayout?"une-responsive-data--list":"une-responsive-data--scroll")}>
  {listLayout&&<div className="une-phone-records" role="list" aria-label={p.title||"Records"}>
    {currentRows.map((row,i)=><button type="button" role="listitem" key={String(row.Id??i)}
      className="une-phone-record-row" onClick={()=>select(row)} aria-label={val(row,phone.title)}>
      <span className="une-phone-record-main"><strong>{val(row,phone.title)}</strong>
        {phone.subtitle&&<small>{val(row,phone.subtitle)}</small>}
        {phone.badge&&<em>{val(row,phone.badge)}</em>}</span>
      {phone.trailing&&<span className="une-phone-record-trailing">{val(row,phone.trailing)}</span>}
      <span className="une-phone-chevron" aria-hidden="true">›</span>
    </button>)}
  </div>}
  <div className="une-scroll-table" role="region" aria-label="Scroll table" tabIndex={0}>
    <table className="une-table"><thead><tr>{cols.map((col,i)=><th key={i}>{col.label??col.key}</th>)}</tr></thead>
    <tbody>{currentRows.map((row,i)=>
      <tr key={i} onClick={()=>p.actionFlows?.rowSelect&&select(row)}>
       {cols.map((col,j)=><td key={j}>{val(row,col)}</td>)}</tr>)}</tbody>
    </table>
  </div>
  {rows.length===0&&<p className="one-muted">{p.emptyText||"No records"}</p>}
  {rows.length>pageSize&&<div className="one-row" style={{justifyContent:"space-between"}}>
   <button className="one-btn" type="button" disabled={current===0} onClick={()=>setPage(Math.max(0,current-1))}>Previous</button>
   <span>{current+1} / {maxPage+1}</span>
   <button className="one-btn" type="button" disabled={current===maxPage} onClick={()=>setPage(current+1)}>Next</button>
  </div>}</div>;
}

const initial=p=>Array.isArray(p.items)?p.items:[];
const kind=t=>["number","date","email","tel","time"].includes(t)?t:"text";
export function UneForm(p){
 const current=()=>p.value&&typeof p.value==="object"&&!Array.isArray(p.value)?p.value
    :Array.isArray(p.records)&&p.records.length?p.records[0]:{};
 const [values,setValues]=React.useState(current),fields=Array.isArray(p.fields)?p.fields:[];
 React.useEffect(()=>{setValues(current())},[p.value,p.records]);
 return <form className="one-ui one-surface" style={{padding:16}} onSubmit={e=>{e.preventDefault();fire(p,"submit",values)}}>
 <h3>{p.title||"Details"}</h3>{fields.map((f,i)=>{const id=String(f.apiName??f.key??"");if(!valid(id))return null;
  return <label className="one-field" key={id+i}>{f.label||id}<input className="one-control" type={kind(f.inputType)}
    value={values[id]??""} required={f.required===true} readOnly={f.readOnly===true}
    onChange={e=>setValues(s=>({...s,[id]:e.target.value}))}/></label>})}
 <button className="one-btn one-btn--primary" type="submit" disabled={p.disabled===true}>{p.submitLabel||"Save"}</button>
 </form>;
}
export function UneLineItems(p){
 const [rows,setRows]=React.useState(initial(p)),columns=Array.isArray(p.fields)?p.fields:[];
 React.useEffect(()=>{setRows(initial(p))},[p.items]);
 const max=clamp(p.maxRows,200,1,500);
 const changed=next=>{setRows(next);fire(p,"change",next)};
 const total=rows.reduce((sum,r)=>sum+amount(r.Quantity??r.quantity)*amount(r.UnitPrice??r.price)-amount(r.DiscountAmount??r.discount)+amount(r.TaxAmount??r.tax),0);
 return <div className="one-ui one-surface" style={{padding:16}}>
  <div className="one-row" style={{justifyContent:"space-between"}}><h3>{p.title||"Line items"}</h3>
   <button className="one-btn" type="button" disabled={rows.length>=max} onClick={()=>changed([...rows,{}])}>{p.addLabel||"Add line"}</button></div>
  {rows.map((row,index)=><div className="one-item une-line-row" key={index} style={{padding:12}}>
   {columns.map((f,i)=>{const key=f.apiName??f.key;if(!valid(key))return null;
    return <label key={key+i} className="one-field">{f.label||key}
     <input className="one-control" type={kind(f.inputType)} required={f.required===true}
      value={row[key]??""} onChange={e=>changed(rows.map((r,j)=>j===index?{...r,[key]:e.target.value}:r))}/></label>})}
   <button className="one-btn" type="button" aria-label={"Remove line "+(index+1)}
    onClick={()=>changed(rows.filter((_,i)=>i!==index))}>Remove</button>
  </div>)}<div className="one-row" style={{justifyContent:"space-between"}}><strong>Preview total</strong>
   <strong>{Number.isFinite(total)?total.toFixed(2):"—"}</strong></div>
  <small>Server Flows validate prices, taxes, discounts and document totals.</small>
 </div>;
}
