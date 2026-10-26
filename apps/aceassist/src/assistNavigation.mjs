/** Derive standalone navigation from the tenant's App Manager SQL metadata.
 * The legacy defaults are used only for tenants installed before object-navigation
 * metadata was seeded; authoring those defaults lives in the independent app seeder.
 */
export const legacySections=Object.freeze([
  {object:'Appointment',label:'Appointments'},
  {object:'Customer',label:'Customers'},
  {object:'Quotation',label:'Quotations'},
  {object:'Invoice',label:'Invoices'},
  {object:'CashLedger',label:'Cash Ledger'}
]);

export function resolveAssistTabs(app,objects){
  const known=new Map((objects||[]).filter(x=>typeof x.apiName==='string')
    .map(x=>[x.apiName.toLowerCase(),x]));
  const ordered=(app?.navigationOrder||[]).filter(x=>x?.type==='Object')
    .map(x=>x.apiName);
  const entries=ordered.length?ordered:Array.isArray(app?.navigationItems)&&app.navigationItems.length
    ?app.navigationItems:legacySections.map(x=>x.object);
  const seen=new Set();
  return entries.filter(name=>{
    if(typeof name!=='string'||!name||seen.has(name.toLowerCase()))return false;
    seen.add(name.toLowerCase());
    // Financial line items are always managed below their parent document.
    if(name==='QuotationLine'||name==='InvoiceLine')return false;
    return !objects?.length||known.has(name.toLowerCase());
  }).map(name=>{
    const definition=known.get(name.toLowerCase());
    const legacy=legacySections.find(x=>x.object.toLowerCase()===name.toLowerCase());
    return {object:definition?.apiName||name,
      label:definition?.pluralLabel||definition?.label||legacy?.label||name};
  });
}
