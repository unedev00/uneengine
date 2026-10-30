/** Presentation-only cart surface. No invented business logic, totals or cart actions. */
const n=(v,f,min=0,max=2000)=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const shadow=v=>v==="large"?"0 8px 20px #0003":v==="medium"?"0 3px 9px #0003":"none";
const border=v=>v?"1px solid "+v:"1px solid transparent";
const align=v=>["left","center","right"].includes(v)?v:"left";
export default function SmartCart({p,records,Picture,expression}){
 const demo=!records.length;
 const rows=demo?Array.from({length:3},(_,i)=>({id:"preview-"+i,__preview:true})):records.slice(0,20);
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
    fontWeight:p.supportingBold===true?700:400,
    color:p.supportingTextColor||"#586a81"}}>
    {demo?"Preview items (3)":rows.length+" items"}
  </div>
  <div className="smart-cart-table" style={{
    backgroundColor:p.tableBackgroundColor||"#fff",border:border(p.tableBorderColor),
    borderRadius:n(p.tableRadius,8),boxShadow:shadow(p.tableShadow)}}>
    <div className="smart-cart-columns" aria-hidden="true">
      <span>Product</span><span>Unit price</span><span>Quantity</span><span>Total</span>
    </div>
    {rows.map((record,i)=>{
      const name=demo?"Sample item "+(i+1):(p.textSource?expression(p.textSource,record):"Product "+(i+1));
      const src=p.imageSource?expression(p.imageSource,record):"";
      return <div key={record?.id??i} className="smart-cart-row" style={{
       minHeight:n(p.rowHeight,64,24),border:border(p.rowBorderColor),
       borderRadius:n(p.rowRadius,4),color:p.rowLabelColor||"#263b56"}}>
       <div className={"smart-cart-product "+(p.imagePlacement==="right"?"image-right":"image-left")}>
        <Picture src={src} alt={String(name||"Product")} loadAsset={p.loadAsset}
         style={{width:n(p.imageHeight,44,16),height:n(p.imageHeight,44,16),
           border:border(p.imageBorderColor),borderRadius:4,
           objectFit:p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":"cover",
           flex:"0 0 auto",overflow:"hidden"}}/>
        <span className="smart-cart-product-name">{name||"Product"}</span>
       </div>
       <span aria-label="Unit price not bound">—</span>
       <span aria-label="Quantity not bound">—</span>
       <span aria-label="Line total not bound">—</span>
      </div>;
    })}
  </div>
  <section className="smart-cart-summary" aria-label="Cart summary" style={{
   backgroundColor:p.summaryBackgroundColor||"#f7f9fc",
   border:border(p.summaryBorderColor),borderRadius:n(p.summaryRadius,8),
   boxShadow:shadow(p.summaryShadow),minHeight:n(p.summaryHeight,148,40),
   width:p.summaryWidth?n(p.summaryWidth,600,1,10000):"100%",maxWidth:"100%"}}>
   {["Subtotal","Discount","Tax"].map(label=><div key={label} className="smart-cart-summary-line"
    style={{fontSize:n(p.summaryTextSize,14,8,96),
     fontWeight:p.summaryTextWeight===true?700:400,
     color:p.summaryTextColor||"#52657d"}}><span>{label}</span><span aria-label={label+" not bound"}>—</span></div>)}
   <div className="smart-cart-summary-line smart-cart-total" style={{
     fontSize:n(p.summary2TextSize,18,8,96),
     fontWeight:p.summary2TextWeight===false?400:700,
     color:p.summary2TextColor||"#1c3558"}}>
     <span>Total</span><span aria-label="Total not bound">—</span>
   </div>
  </section>
  <div className="smart-cart-preview-note">Visual preview — totals and actions not yet connected</div>
 </section>;
}
