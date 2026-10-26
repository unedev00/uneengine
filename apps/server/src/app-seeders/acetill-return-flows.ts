import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';
const returnConfig={
 sourceNumber:'InvoiceNumber',sourceType:'InvoiceType',sourceStatus:'Status',
 sourceReference:'ReferenceInvoice',lineParent:'Invoice',lineSource:'OriginalInvoiceLine',
 lineProduct:'Product',quantity:'Quantity',sourceQuantity:'Quantity',
 unitPrice:'UnitPrice',lineTotal:'LineTotal',lineName:'Name',
 reason:'ReturnReason',cashier:'Cashier',total:'Total',typeValue:'SRN',
 returnStatuses:['Paid','Issued','Completed','Complete','Settled','PartPaid']
};


/** Read-only sales return lookup. Tenant record/field permissions are enforced by Get Records. */
export async function seedAcetillReturnLookup(client:PoolClient,tenantId:string):Promise<boolean>{
 const {rows:objects}=await client.query<{api_name:string}>(`SELECT api_name FROM md_object_definitions
  WHERE tenant_id=$1 AND api_name IN ('Invoice','InvoiceLine')`,[tenantId]);
 if(!['Invoice','InvoiceLine'].every(name=>objects.some(row=>row.api_name===name)))return false;
 const apiName='AcetillLoadReturnInvoice';
 const exists=await client.query('SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2',
  [tenantId,apiName]);
 if(exists.rowCount)return false;
 const graph={
  apiName,label:'Find invoice for sales return',appApiName:'Acetill',
  flowType:'Autolaunched Flow',status:'Active',version:1,tests:[],
  startConfig:{executionContext:'User',securityOperation:'LoadLinkedReturnDocument',returnDocumentConfig:returnConfig},
  resources:[
   {name:'invoiceNumber',type:'Variable',dataType:'Text',availableForInput:true},
   {name:'invoice',type:'Record',dataType:'Invoice',availableForOutput:true},
   {name:'records',type:'Record Collection',dataType:'InvoiceLine',availableForOutput:true}
  ],
  elements:[
   {id:1,type:'Start',label:'Start',config:{executionContext:'User'}},
   {id:2,type:'Get Records',label:'Find completed invoice',config:{
    object:'Invoice',recordLimit:'1',outputVariable:'invoice',
    conditions:[{field:'InvoiceNumber',operator:'Equals',value:'{!invoiceNumber}'},
      {field:'InvoiceType',operator:'NotEquals',value:'SRN'}]}},
   {id:3,type:'Decision',label:'Invoice exists?',config:{outcomes:[
    {name:'Found',label:'Found',conditions:[{field:'{!invoice}',operator:'IsNotNull'}]}]}},
   {id:4,type:'Get Records',label:'Find invoice lines',config:{
    object:'InvoiceLine',recordLimit:'all',outputVariable:'records',
    conditions:[{field:'Invoice',operator:'Equals',value:'{!invoice.Id}'}]}},
   {id:5,type:'End',label:'Done',config:{}},
   {id:6,type:'Custom Error',label:'Invoice not found',config:{
    errorLocation:'Page',errorMessage:'No matching eligible invoice found.'}}
  ],
  connectors:[
   {from:1,to:2,kind:'normal',label:'Next'},
   {from:2,to:3,kind:'normal',label:'Next'},
   {from:3,to:4,kind:'normal',label:'Found'},
   {from:3,to:6,kind:'normal',label:'Default'},
   {from:4,to:5,kind:'normal',label:'Next'},
   {from:6,to:5,kind:'normal',label:'Next'}
  ]
 };
 const {rows}=await client.query<{id:string}>(`INSERT INTO md_flow_definitions
 (tenant_id,api_name,label,flow_type,version,active)
 VALUES($1,$2,$3,'Autolaunched Flow',1,true) RETURNING id`,[tenantId,apiName,graph.label]);
 const encoded:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(graph,'/builder',encoded);
 for(const e of encoded)await client.query(`INSERT INTO md_flow_editor_values
 (tenant_id,flow_id,property_path,value_kind,value_text)
 VALUES($1,$2,$3,$4,$5)`,[tenantId,rows[0].id,e.path,e.kind,e.text]);
 return true;
}

/** Atomic SRN operation using the shared, configurable linked-document return guard. */
export async function seedAcetillCreateSalesReturn(client:PoolClient,tenantId:string):Promise<boolean>{
 const apiName='AcetillCreateSalesReturn';
 const exists=await client.query('SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2',
  [tenantId,apiName]);
 if(exists.rowCount)return false;
 const graph={
  apiName,label:'Create verified sales return',appApiName:'Acetill',
  flowType:'Autolaunched Flow',status:'Active',version:1,tests:[],
  startConfig:{executionContext:'User',securityOperation:'CreateLinkedReturnDocument',returnDocumentConfig:returnConfig},
  resources:[
   {name:'originalInvoiceNumber',type:'Variable',dataType:'Text',availableForInput:true},
   {name:'reason',type:'Variable',dataType:'Text',availableForInput:true},
   {name:'requestId',type:'Variable',dataType:'Text',availableForInput:true},
   {name:'lines',type:'Record Collection',dataType:'InvoiceLine',availableForInput:true},
   {name:'status',type:'Variable',dataType:'Text',availableForOutput:true},
   {name:'srnInvoiceId',type:'Variable',dataType:'Text',availableForOutput:true},
   {name:'srnInvoiceNumber',type:'Variable',dataType:'Text',availableForOutput:true}
  ],
  elements:[
   {id:1,type:'Start',label:'Start',config:{executionContext:'User'}},
   {id:2,type:'End',label:'Return complete',config:{}}
  ],
  connectors:[{from:1,to:2,kind:'normal',label:'Next'}]
 };
 const {rows}=await client.query<{id:string}>(`INSERT INTO md_flow_definitions
  (tenant_id,api_name,label,flow_type,version,active)
  VALUES($1,$2,$3,'Autolaunched Flow',1,true) RETURNING id`,[tenantId,apiName,graph.label]);
 const encoded:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(graph,'/builder',encoded);
 for(const value of encoded)await client.query(`INSERT INTO md_flow_editor_values
  (tenant_id,flow_id,property_path,value_kind,value_text)
  VALUES($1,$2,$3,$4,$5)`,[tenantId,rows[0].id,value.path,value.kind,value.text]);
 return true;
}
