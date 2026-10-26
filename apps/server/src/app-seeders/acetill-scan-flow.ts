import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';

/** Tenant-owned scanner lookup using the existing generic Product Object and Get Records node. */
export async function seedAcetillScanFlow(client:PoolClient,tenantId:string):Promise<boolean>{
 const exists=await client.query('SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2',
  [tenantId,'AcetillScanProduct']);
 if(exists.rowCount)return false;
 const {rows:fields}=await client.query<{api_name:string}>(`SELECT api_name FROM md_field_definitions
  WHERE tenant_id=$1 AND object_api='Product' AND api_name IN ('Barcode','Name','Price')`,[tenantId]);
 if(!['Barcode','Name','Price'].every(name=>fields.some(row=>row.api_name===name)))return false;
 const graph={
  apiName:'AcetillScanProduct',label:'Look up product by scanned barcode',
  appApiName:'Acetill',flowType:'Autolaunched Flow',status:'Active',version:1,tests:[],
  resources:[
   {name:'barcode',type:'Variable',dataType:'Text',availableForInput:true},
   {name:'records',type:'Record Collection',dataType:'Product',availableForOutput:true}
  ],
  elements:[
   {id:1,type:'Start',label:'Start',config:{executionContext:'User'}},
   {id:2,type:'Get Records',label:'Match barcode',config:{
    object:'Product',recordLimit:'all',outputVariable:'records',
    conditions:[{field:'Barcode',operator:'Equals',value:'{!barcode}'}]}},
   {id:3,type:'End',label:'Done',config:{}}
  ],
  connectors:[{from:1,to:2,label:'Next',kind:'normal'},{from:2,to:3,label:'Next',kind:'normal'}]
 };
 const {rows:flows}=await client.query<{id:string}>(`INSERT INTO md_flow_definitions
  (tenant_id,api_name,label,flow_type,version,active)
  VALUES($1,$2,$3,'Autolaunched Flow',1,true) RETURNING id`,[tenantId,graph.apiName,graph.label]);
 const values:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(graph,'/builder',values);
 for(const item of values)await client.query(`INSERT INTO md_flow_editor_values
 (tenant_id,flow_id,property_path,value_kind,value_text)
 VALUES($1,$2,$3,$4,$5)`,[tenantId,flows[0].id,item.path,item.kind,item.text]);
 return true;
}
