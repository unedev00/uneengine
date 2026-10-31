/** Cart is presentation-only; expressions and actions use the existing shared runtimes. */
const n=(v,f,min=0,max=2000)=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const shadow=v=>v==="large"?"0 8px 20px #0003":v==="medium"?"0 3px 9px #0003":"none";
const border=v=>v?"1px solid "+v:"1px solid transparent";
const align=v=>["left","center","right"].includes(v)?v:"left";
const names=['Column 1','Column 2','Column 3','Column 4','Column 5'];
const headings=['Product','Unit price','Quantity','Total','Discount'];
const tracks=['minmax(100px,2.2fr)','minmax(65px,1fr)','minmax(115px,1.35fr)','minmax(65px,1fr)','minmax(65px,1fr)'];
const numericType=/^(Number|Currency|Percent|Integer|Decimal|Double|Float|Long|Short|Int)$/i;
const directField=source=>/^@([A-Za-z][A-Za-z0-9_]*)$/.exec(typeof source==="string"?source.trim():"")?.[1]??null;
const display=value=>value===null||value===undefined||value===""?"—":String(value);
export default function SmartCart({p,records,Picture,expression,fire}){
 const demo=!records.length;
 const actions=p.actionFlows&&typeof p.actionFlows==="object"&&!Array.isArray(p.actionFlows)?p.actionFlows:{};
 const canClick=Boolean(actions.click)&&!p.previewOnly&&!p.builderPreview;
 const canChangeQty=Boolean(actions.qtyIcon)&&!p.previewOnly&&!p.builderPreview;
 const rows=demo?Array.from({length:3},(_,i)=>({id:"preview-"+i,__preview:true})):records.slice(0,200);
 const rowHeight=n(p.rowHeight,64,24);
 const rowLimit=Math.floor(n(p.cardsPerRow,5,1,50));
 const visible=Array.isArray(p.columnVisibility)
   ?names.flatMap((name,index)=>p.columnVisibility.includes(name)?[index]:[])
   :[0,1,2,3,4];
 const columns=visible.length?visible.map(index=>tracks[index]).join(' '):'1fr';
 const sources=[null,p.column2Source,p.column3Source,p.column4Source,p.column5Source];
 const object=Array.isArray(p.objects)?p.objects.find(item=>item.apiName===p.objectApiName):null;
 const quantityField=directField(p.column3Source);
 const field=quantityField?object?.fields?.find(item=>item.apiName===quantityField):null;
 const renderQuantity=(record,name,payload)=>{
  const legacy=!p.column3Source;
  const legacyKey=['Quantity','quantity','Qty','qty'].find(key=>record?.[key]!==undefined);
  const fieldName=legacy?legacyKey:quantityField;
  const raw=fieldName?record?.[fieldName]:undefined;
  const computed=legacy?raw:expression(p.column3Source,record);
  // A calculated number is not a writable numeric field: suppress +/- for formulas.
  const numeric=Boolean(fieldName)&&(legacy
   ?(typeof raw==='number'&&Number.isFinite(raw)||
     typeof raw==='string'&&raw.trim()!==''&&Number.isFinite(Number(raw)))
   :field?numericType.test(field.dataType):typeof raw==='number'&&Number.isFinite(raw));
  const quantity=numeric&&computed!==null&&computed!==undefined&&computed!==''&&Number.isFinite(Number(computed))
    ?Number(computed):null;
  if(!numeric)return <span className="smart-cart-qty-value">{display(computed)}</span>;
  return <div className="smart-cart-qty-controls" aria-label={"Quantity controls for "+String(name||"Product")}>
   <button type="button" className="smart-cart-qty-button"
    aria-label={"Decrease quantity for "+String(name||"Product")}
    disabled={demo||!canChangeQty||payload.recordId===null||quantity===null||quantity<=0}
    onClick={()=>fire?.("qtyIcon",{...payload,delta:-1,operation:"decrement",fieldApiName:fieldName,quantity})}>−</button>
   <span className="smart-cart-qty-value" aria-label={quantity===null?"Quantity not bound":"Quantity "+quantity}>{display(computed)}</span>
   <button type="button" className="smart-cart-qty-button"
    aria-label={"Increase quantity for "+String(name||"Product")}
    disabled={demo||!canChangeQty||payload.recordId===null||quantity===null}
    onClick={()=>fire?.("qtyIcon",{...payload,delta:1,operation:"increment",fieldApiName:fieldName,quantity})}>+</button>
  </div>;
 };
 return <section className="smart-cart-root" aria-label="Smart Cart" style={{
  backgroundColor:p.backgroundColor||"#fff",border:border(p.borderColor),
  borderRadius:n(p.radius,12),boxShadow:shadow(p.shadow)}}>
  <header className="smart-cart-header" style={{
   height:n(p.headerBoxHeight,52,24),minHeight:n(p.headerBoxHeight,52,24),
   border:border(p.headerBorderColor),textAlign:align(p.headerAlignment),
   fontWeight:p.headerBold===false?400:700,color:p.headerTextColor||"#fff"}}>Smart Cart</header>
  <div className="smart-cart-supporting" style={{
   height:n(p.supportingBoxHeight,36,18),minHeight:n(p.supportingBoxHeight,36,18),
   border:border(p.supportingBorderColor),textAlign:align(p.supportingAlignment),
   fontWeight:p.supportingBold===true?700:400,color:p.supportingTextColor||"#586a81"}}>
   {demo?"Preview items (3)":rows.length+" items"}
  </div>
  <div className="smart-cart-table" style={{
   backgroundColor:p.tableBackgroundColor||"#fff",border:border(p.tableBorderColor),
   borderRadius:n(p.tableRadius,8),boxShadow:shadow(p.tableShadow),'--smart-cart-columns':columns}}>
   {visible.length===0?<p className="smart-cart-no-columns">No columns selected</p>:<>
    <div className="smart-cart-columns" aria-label="Cart columns">
     {visible.map(index=><span key={index}>{headings[index]}</span>)}
    </div>
    <div className="smart-cart-rows" role="region" aria-label="Cart item rows"
     style={{maxHeight:rowLimit*(rowHeight+6)}}>
     {rows.map((record,i)=>{
      const name=demo?"Sample item "+(i+1):(p.textSource?expression(p.textSource,record):"Product "+(i+1));
      const src=p.imageSource?expression(p.imageSource,record):"";
      const itemId=record?.Id??record?.id??null;
      const payload={record,recordId:itemId};
      return <div key={record?.Id??record?.id??i} className="smart-cart-row" style={{
        minHeight:rowHeight,border:border(p.rowBorderColor),
        borderRadius:n(p.rowRadius,4),color:p.rowLabelColor||"#263b56"}}>
       {visible.map(index=>{
        if(index===0)return <div key={index} className={"smart-cart-product "+(p.imagePlacement==="right"?"image-right":"image-left")}>
         <Picture src={src} alt={String(name||"Product")} loadAsset={p.loadAsset}
          style={{width:n(p.imageHeight,44,16),height:n(p.imageHeight,44,16),
           border:border(p.imageBorderColor),borderRadius:4,
           objectFit:p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":"cover",
           flex:"0 0 auto",overflow:"hidden"}}/>
         {canClick&&!demo&&itemId!==null?
          <button type="button" className="smart-cart-product-name smart-cart-product-click"
           aria-label={"Select "+String(name||"Product")} onClick={()=>fire?.("click",payload)}>{name||"Product"}</button>:
          <span className="smart-cart-product-name">{name||"Product"}</span>}
        </div>;
        if(index===2)return <div key={index} className="smart-cart-cell-qty">
         {renderQuantity(record,name,payload)}</div>;
        const value=demo||!sources[index]?"—":expression(sources[index],record);
        return <span key={index} className="smart-cart-cell" aria-label={value==="—"?headings[index]+" not bound":undefined}>
         {display(value)}</span>;
       })}
      </div>;
     })}
    </div>
   </>}
  </div>
  <section className="smart-cart-summary" aria-label="Cart summary" style={{
   backgroundColor:p.summaryBackgroundColor||"#f7f9fc",
   border:border(p.summaryBorderColor),borderRadius:n(p.summaryRadius,8),
   boxShadow:shadow(p.summaryShadow),minHeight:n(p.summaryHeight,148,40),
   width:p.summaryWidth?n(p.summaryWidth,600,1,10000):"100%",maxWidth:"100%"}}>
   {["Subtotal","Discount","Tax"].map(label=><div key={label} className="smart-cart-summary-line"
    style={{fontSize:n(p.summaryTextSize,14,8,96),
     fontWeight:p.summaryTextWeight===true?700:400,color:p.summaryTextColor||"#52657d"}}>
    <span>{label}</span><span aria-label={label+" not bound"}>—</span></div>)}
   <div className="smart-cart-summary-line smart-cart-total" style={{
    fontSize:n(p.summary2TextSize,18,8,96),fontWeight:p.summary2TextWeight===false?400:700,
    color:p.summary2TextColor||"#1c3558"}}>
    <span>Total</span><span aria-label="Total not bound">—</span>
   </div>
  </section>
  <div className="smart-cart-preview-note">Visual preview — totals and actions are configured separately</div>
 </section>;
}
