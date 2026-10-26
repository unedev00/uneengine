import type {PoolClient} from 'pg';

/** Explicitly assignable cashier policy; never auto-assign tenant users or bypass denies. */
export async function seedAcetillCashierPolicy(client:PoolClient,tenantId:string):Promise<void>{
 await client.query(`INSERT INTO md_permission_sets
 (tenant_id,api_name,label,description,navigation_default_access)
 VALUES($1,'AcetillCashier','Acetill Cashier',
 'Operate authorised registers, hold and resume sales, and process approved returns','Deny')
 ON CONFLICT(tenant_id,api_name) DO NOTHING`,[tenantId]);
 const rights:Array<[string,string]>=[
  ['App:Acetill','read'],
  ...['HoldSale','RetrieveSale','SalesReturn'].map(name=>['Action:Acetill'+name,'execute'] as [string,string]),
  ...['GetProducts','GetCategories','HoldCart','ListHeldCarts','ResumeHeldCart','LoadReturnInvoice',
    'CreateSalesReturn','VerifyUserPin','ScanProduct','PaymentCash','PaymentCard'].map(name=>['Flow:Acetill'+name,'execute'] as [string,string]),
  ...['Cart','CartLine','Invoice','InvoiceLine','Product'].map(name=>[name,'read'] as [string,string]),
  ...['Cart','CartLine'].flatMap(name=>[[name,'create'],[name,'edit']] as Array<[string,string]>),
  ...['Invoice','InvoiceLine'].map(name=>[name,'create'] as [string,string]),
  ...['Name','Status','HoldReference','HoldLabel','HeldBy','HeldAt'].flatMap(name=>
    ['read','create','edit'].map(action=>['Cart.'+name,action] as [string,string])),
  ...['Cart','Product','Quantity','Name','OriginalUnitPrice'].flatMap(name=>
    ['read','create'].map(action=>['CartLine.'+name,action] as [string,string])),
  ...['Name','Price','AgeRestricted','MinimumAge'].map(name=>['Product.'+name,'read'] as [string,string]),
  ...['Name','InvoiceNumber','InvoiceType','Status','ReferenceInvoice','ReturnReason',
    'Cashier','Total','Subtotal','Customer'].flatMap(name=>
      ['read','create'].map(action=>['Invoice.'+name,action] as [string,string])),
  ...['Name','Invoice','Product','Quantity','UnitPrice','LineTotal','OriginalInvoiceLine'].flatMap(name=>
      ['read','create'].map(action=>['InvoiceLine.'+name,action] as [string,string]))
 ];
 for(const [resource,action] of rights)await client.query(`INSERT INTO md_permission_rules
 (tenant_id,permission_set_id,resource,action,effect)
 SELECT $1,p.id,$2,$3,'allow' FROM md_permission_sets p
 WHERE p.tenant_id=$1 AND p.api_name IN ('AcetillCashier','OneEngine')
 ON CONFLICT DO NOTHING`,[tenantId,resource,action]);
}
