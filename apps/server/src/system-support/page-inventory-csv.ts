import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {readComponentContract} from './component-contract-store.js';
import {availableComponentSettings,componentSettingIssues,type ComponentSettingDefinition} from './component-property-contract.js';
import type {PageLayoutVariant} from '../system-files/page-layout-version-runtime.js';

/** One interoperable format for Page Builder inventory export and guarded draft import. */
export const INVENTORY_COLUMNS=['pageapi','component_name','component_property','value'] as const;
export type InventoryIssue={row:number;component_name:string;component_property:string;remark:string};
type Block={id:string;type:string;label:string;region?:string;visible:boolean;
 position?:{x:number;y:number;width:number;height:number};
 properties:Record<string,unknown>};
export type InventoryPage={apiName:string;draftRevision?:number;components:Block[];[key:string]:unknown};
type Definitions=Map<string,ComponentSettingDefinition[]>;
const unsafe=new Set(['__proto__','prototype','constructor']);
const isPlain=(value:unknown):value is Record<string,unknown>=>value!==null
 &&typeof value==='object'&&!Array.isArray(value);
const safeParts=(path:string):string[]|null=>{
 const parts=path.split('.');
 return parts.length>0&&parts.length<=12&&parts.every(p=>/^[A-Za-z][A-Za-z0-9_]*$/.test(p)&&!unsafe.has(p))?parts:null;
};
const csvCell=(value:unknown)=>{
 const text=String(value??'');
 return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
};
export function inventoryCsv(rows:readonly (readonly unknown[])[]):string{
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function valueText(value:unknown):string{
 return value===undefined||value===null?'':typeof value==='object'?JSON.stringify(value):String(value);
}
function flatten(out:Map<string,string>,prefix:string,value:unknown):void{
 if(isPlain(value)&&Object.keys(value).length){
  for(const [key,child] of Object.entries(value))flatten(out,prefix+'.'+key,child);
 }else out.set(prefix,valueText(value));
}
function schemaLeaves(out:Map<string,string>,definitions:readonly ComponentSettingDefinition[],
 prefix=''):void{
 for(const item of definitions){
  const key=prefix+item.propertyKey;
  if(item.kind==='GROUP'&&item.fields?.length)schemaLeaves(out,item.fields,key+'.');
  else if(!out.has(key))out.set(key,'');
 }
}
export async function inventoryDefinitions(db:SqlPersistence,tenant:string,
 components:readonly Block[],variant:PageLayoutVariant):Promise<Definitions>{
 const names=[...new Set(components.filter(c=>c.type.startsWith('Custom:'))
   .map(c=>c.type.slice(7)))];
 if(!names.length)return new Map();
 const result=await db.query<{component_api:string;published_version:number}>(
  'SELECT component_api,published_version FROM md_component_library_heads WHERE tenant_id=$1 AND component_api=ANY($2::text[]) AND published_version IS NOT NULL',
  [tenant,names]);
 const entries=await Promise.all(result.rows.map(async row=>{
  const contract=await readComponentContract(db,tenant,row.component_api,row.published_version);
  return ['Custom:'+row.component_api,availableComponentSettings(
   contract.propertyDefinitions??[],variant,row.published_version)] as const;
 }));
 return new Map(entries);
}
export function exportInventoryCsv(page:InventoryPage,definitions:Definitions=new Map()):string{
 const rows:unknown[][]=[[...INVENTORY_COLUMNS]];
 for(const component of page.components){
  const values=new Map<string,string>([
   ['component.label',component.label],
   ['component.visible',String(component.visible)],
   ['component.region',component.region??'main'],
   ['component.position.x',valueText(component.position?.x)],
   ['component.position.y',valueText(component.position?.y)],
   ['component.position.width',valueText(component.position?.width)],
   ['component.position.height',valueText(component.position?.height)]
  ]);
  for(const [key,value] of Object.entries(component.properties??{}))flatten(values,key,value);
  schemaLeaves(values,definitions.get(component.type)??[]);
  for(const [key,value] of values)
   rows.push([page.apiName,component.id,key,value]);
 }
 return inventoryCsv(rows);
}
type CsvRow={line:number;cells:string[]};
function parseCsv(text:string):{rows:CsvRow[];issues:InventoryIssue[]}{
 const issues:InventoryIssue[]=[];
 if(text.length>700000)return {rows:[],issues:[{row:1,component_name:'',component_property:'',remark:'CSV exceeds the 700 KB import limit'}]};
 const rows:CsvRow[]=[],current:string[]=[];
 let cell='',quoted=false,afterQuote=false,line=1,start=1;
 const finishCell=()=>{current.push(cell);cell='';afterQuote=false;};
 const finishRow=()=>{
  finishCell();
  if(current.some(x=>x.trim()))rows.push({line:start,cells:[...current]});
  current.length=0;start=line;
 };
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"'){quoted=false;afterQuote=true;}
   else{cell+=ch;if(ch==='\n')line++;}
  }else if(ch==='"'&&!cell&&!afterQuote)quoted=true;
  else if(ch===',')finishCell();
  else if(ch==='\n'||ch==='\r'){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   line++;finishRow();
  }else if(afterQuote&&!/\s/.test(ch)){
   issues.push({row:start,component_name:'',component_property:'',remark:'Unexpected characters after a quoted CSV value'});
   cell+=ch;
  }else if(ch==='"'){
   issues.push({row:start,component_name:'',component_property:'',remark:'Unexpected quote in CSV value'});
  }else cell+=ch;
  if(rows.length>25000){
   issues.push({row:line,component_name:'',component_property:'',remark:'CSV exceeds 25,000 rows'});
   break;
  }
 }
 if(quoted)issues.push({row:start,component_name:'',component_property:'',remark:'Unclosed quoted CSV value'});
 if(current.length||cell)finishRow();
 if(!rows.length)issues.push({row:1,component_name:'',component_property:'',remark:'CSV is empty'});
 else{
  const header=rows[0].cells.map((v,i)=>i===0?v.replace(/^\uFEFF/,'').trim().toLowerCase():v.trim().toLowerCase());
  if(header.length!==4||header.some((value,i)=>value!==INVENTORY_COLUMNS[i]))
   issues.push({row:rows[0].line,component_name:'',component_property:'',
    remark:'Expected CSV columns: '+INVENTORY_COLUMNS.join(',')});
 }
 return {rows:rows.slice(1),issues};
}
function lookupSchema(defs:readonly ComponentSettingDefinition[],parts:readonly string[]):ComponentSettingDefinition|undefined{
 let current=defs,found:ComponentSettingDefinition|undefined;
 for(let i=0;i<parts.length;i++){
  found=current.find(d=>d.propertyKey===parts[i]);
  if(!found)return;
  if(i!==parts.length-1){
   if(found.kind!=='GROUP'||!found.fields)return;
   current=found.fields as ComponentSettingDefinition[];
  }
 }
 return found;
}
function parsedValue(input:string,original:unknown,kind?:string):unknown{
 const trimmed=input.trim();
 if(typeof original==='number'||kind==='NUMBER'||kind==='CURRENCY'){
  const number=Number(trimmed);
  if(!trimmed||!Number.isFinite(number))throw Error('Enter a finite numeric value');
  return number;
 }
 if(typeof original==='boolean'||kind==='BOOLEAN'){
  if(trimmed.toLowerCase()==='true')return true;
  if(trimmed.toLowerCase()==='false')return false;
  throw Error('Enter true or false');
 }
 const list=['COLLECTION','STRING_LIST','FIELD_LIST','COLUMNS','OPTIONS','RECORD_LIST'];
 if(Array.isArray(original)||kind&&list.includes(kind)){
  try{const value=JSON.parse(input);if(Array.isArray(value))return value;}catch{}
  throw Error('Enter a valid JSON array');
 }
 if(isPlain(original)||kind==='GROUP'){
  try{const value=JSON.parse(input);if(isPlain(value))return value;}catch{}
  throw Error('Enter a valid JSON object');
 }
 return input;
}
export function applyInventoryCsv(page:InventoryPage,csv:string,definitions:Definitions=new Map()){
 const {rows,issues}=parseCsv(csv);
 const copy=structuredClone(page);
 const byName=new Map(copy.components.map(c=>[c.id,c]));
 const seen=new Set<string>();
 let changes=0,skipped=0;
 for(const row of rows){
  if(issues.length>=500)break;
  const [api,componentName,rawProperty,value]=row.cells;
  const report=(remark:string)=>issues.push({row:row.line,component_name:componentName??'',
   component_property:rawProperty??'',remark});
  if(row.cells.length!==4){report('Expected exactly four CSV columns');continue;}
  if(api?.trim()!==page.apiName){report('Page API does not match selected page: '+page.apiName);continue;}
  const component=byName.get(componentName);
  if(!component){report('Component not found on selected page: '+componentName);continue;}
  const property=rawProperty?.trim();
  if(!property){report('Component property is required');continue;}
  const pair=componentName+'\u0000'+property;
  if(seen.has(pair)){report('Duplicate component property in CSV');continue;}
  seen.add(pair);
  // A blank value means no update, including when the row was downloaded with no configured value.
  if(value.trim()===''){skipped++;continue;}
  if(property.startsWith('component.')){
   const name=property.slice('component.'.length);
   if(name==='label'){
    if(value.length>200){report('Component label exceeds 200 characters');continue;}
    if(component.label!==value){component.label=value;changes++;}
   }else if(name==='visible'){
    if(!/^(true|false)$/i.test(value.trim())){report('Visibility must be true or false');continue;}
    const next=value.trim().toLowerCase()==='true';
    if(component.visible!==next){component.visible=next;changes++;}
   }else if(name==='region'){
    if(!['header','main','sidebar'].includes(value.trim())){report('Invalid component region');continue;}
    if(component.region!==value.trim()){component.region=value.trim();changes++;}
   }else if(name.startsWith('position.')){
    const coord=name.slice('position.'.length);
    if(!['x','y','width','height'].includes(coord)){report('Unknown component position property');continue;}
    if(!component.position){report('Component has no editable canvas position on this layout');continue;}
    const number=Number(value.trim());
    if(!Number.isFinite(number)||Math.abs(number)>100000||(['width','height'].includes(coord)&&number<=0)){
     report('Canvas position must be a finite number; width and height must be positive');continue;
    }
    const pos=component.position as unknown as Record<string,number>;
    if(pos[coord]!==number){pos[coord]=number;changes++;}
   }else report('Unknown or protected component property');
   continue;
  }
  const path=property.startsWith('properties.')?property.slice(11):property;
  const parts=safeParts(path);
  if(!parts){report('Invalid property path');continue;}
  const schema=lookupSchema(definitions.get(component.type)??[],parts);
  let target:Record<string,unknown>=component.properties??(component.properties={});
  let missingParent=false;
  for(const segment of parts.slice(0,-1)){
   const candidate=target[segment];
   if(candidate===undefined){
    if(!schema){missingParent=true;break;}
    target[segment]={};
   }else if(!isPlain(candidate)){missingParent=true;break;}
   target=target[segment] as Record<string,unknown>;
  }
  if(missingParent){report('Nested component property does not exist');continue;}
  const key=parts[parts.length-1];
  if(!Object.prototype.hasOwnProperty.call(target,key)&&!schema){
   report('Unknown component metadata property');continue;
  }
  try{
   const next=parsedValue(value,target[key],schema?.kind);
   const schemaIssue=schema?componentSettingIssues(schema,next,property)[0]:undefined;
   if(schemaIssue){report(schemaIssue.path+': '+schemaIssue.message);continue;}
   if(JSON.stringify(target[key])!==JSON.stringify(next)){target[key]=next;changes++;}
  }catch(error){report(error instanceof Error?error.message:'Invalid component property value');}
 }
 return {valid:issues.length===0,issues,changes,skipped,page:copy};
}
