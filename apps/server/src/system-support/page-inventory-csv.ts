import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {readComponentContract} from './component-contract-store.js';
import {availableComponentSettings,componentSettingIssues,type ComponentSettingDefinition} from './component-property-contract.js';
import type {PageLayoutVariant} from '../system-files/page-layout-version-runtime.js';
import {randomUUID} from 'node:crypto';
import {componentInstanceNames,canonicalComponentName,componentNamePattern,ensureComponentInstanceNames} from './page-component-names.js';

/** One interoperable format for Page Builder inventory export and guarded draft import. */
export const INVENTORY_COLUMNS=['pageapi','component_type','component_name','propertyid','value'] as const;
const LEGACY_INVENTORY_COLUMNS=['pageapi','component_name','component_property','value'] as const;
export type InventoryIssue={row:number;pageapi?:string;component_type?:string;component_name:string;component_property:string;value?:string;remark:string};
type Block={id:string;type:string;label:string;region?:string;visible:boolean;
 position?:{x:number;y:number;width:number;height:number};
 properties:Record<string,unknown>};
export type InventoryPage={apiName:string;draftRevision?:number;layoutMode?:string;canvasWidth?:number;canvasHeight?:number;components:Block[];[key:string]:unknown};
export type InventorySettingDefinition=ComponentSettingDefinition&{valueKey?:string};
type Definitions=Map<string,InventorySettingDefinition[]>;
const componentApi=(type:string)=>type.startsWith('Custom:')?type.slice(7):type;
const componentType=(api:string)=>'Custom:'+api;
const validComponentApi=(api:string)=>/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(api);
const settingsFor=(definitions:Definitions,type:string)=>
 definitions.get(type)??definitions.get(componentType(componentApi(type)))??[];
const unsafe=new Set(['__proto__','prototype','constructor']);
// Internal hierarchy links and obsolete Advanced placeholders are not user-editable
// component properties. Their saved SQL values remain untouched by inventory import.
const excludedInventoryProperties=new Set(['cssClass','allowedChildTypes','maxChildren','layoutParentId','parentId','navigatorName','libraryComponentId']);
const inventoryPropertyAllowed=(key:string)=>!excludedInventoryProperties.has(key);
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
function schemaLeaves(out:Map<string,string>,definitions:readonly InventorySettingDefinition[],
 instance:Record<string,unknown>,prefix=''):void{
 for(const item of definitions){
  if(!prefix&&!inventoryPropertyAllowed(item.propertyKey))continue;
  const key=prefix+item.propertyKey;
  if(item.kind==='GROUP'&&item.fields?.length)
   schemaLeaves(out,item.fields as InventorySettingDefinition[],
    isPlain(instance[item.valueKey??item.propertyKey])?instance[item.valueKey??item.propertyKey] as Record<string,unknown>:{},key+'.');
  else if(!out.has(key))
   out.set(key,valueText(instance[item.valueKey??item.propertyKey]??item.defaultValue));
 }
}
/** Installed tenant components and SQL-enabled shared ribbon rules form the import contract.
 * A published tenant library contract supplements these definitions, never grants
 * access to a disabled/uninstalled standard component. No app-specific inventory.
 */
export async function inventoryDefinitions(db:SqlPersistence,tenant:string,
 components:readonly Block[],variant:PageLayoutVariant,extraTypes:readonly string[]=[]):Promise<Definitions>{
 const names=[...new Set([...components.map(c=>c.type),...extraTypes].map(componentApi)
  .filter(validComponentApi))];
 if(!names.length)return new Map();
 const available=await db.query<{api_name:string}>(`
  SELECT api_name FROM md_component_definitions
  WHERE tenant_id=$1 AND enabled=true AND api_name=ANY($2::text[])`,[tenant,names]);
 const installed=available.rows.map(row=>row.api_name);
 if(!installed.length)return new Map();
 const [shared,published]=await Promise.all([
  db.query<{component_api:string;property_key:string;label:string;control_kind:string;
    value_key:string;default_value:unknown;choices:unknown;min_value:number|null;max_value:number|null}>(`
   SELECT r.component_api,p.property_key,p.label,
    COALESCE(r.control_kind_override,p.control_kind) AS control_kind,
    COALESCE(r.value_key,p.property_key) AS value_key,
    COALESCE(r.default_value_override,p.default_value) AS default_value,
    COALESCE(r.choices_override,p.choices) AS choices,p.min_value,p.max_value
   FROM md_builder_ribbon_component_rules r
   JOIN md_builder_shared_properties p ON p.property_key=r.property_key
   WHERE r.enabled=true AND p.scope='component' AND p.control_kind NOT IN ('command','readonly')
    AND r.component_api=ANY($1::text[])
   ORDER BY p.sort_order`,[installed]),
  db.query<{component_api:string;published_version:number}>(`
   SELECT component_api,published_version FROM md_component_library_heads
   WHERE tenant_id=$1 AND component_api=ANY($2::text[]) AND published_version IS NOT NULL`,
   [tenant,installed])
 ]);
 const entries=await Promise.all(published.rows.map(async row=>{
  const contract=await readComponentContract(db,tenant,row.component_api,row.published_version);
  return [row.component_api,availableComponentSettings(
    contract.propertyDefinitions??[],variant,row.published_version)] as const;
 }));
 const publishedByApi=new Map(entries);
 const result=new Map<string,InventorySettingDefinition[]>();
 for(const api of installed){
  const definitions=new Map<string,InventorySettingDefinition>(
   (publishedByApi.get(api)??[]).map(def=>[def.propertyKey,def]));
  for(const prop of shared.rows.filter(row=>row.component_api===api)){
   const choices=Array.isArray(prop.choices)
    ?prop.choices.filter((value):value is string=>typeof value==='string'):[];
   const kind:ComponentSettingDefinition['kind']=
    prop.control_kind==='number'||prop.control_kind==='position'?'NUMBER':
    prop.control_kind==='boolean'?'BOOLEAN':
    prop.control_kind==='color'?'COLOR':
    prop.control_kind==='object'?'OBJECT':
    prop.control_kind==='weekdays'?'STRING_LIST':
    prop.control_kind==='choice'&&choices.length?'SELECT':'TEXT';
   const def:InventorySettingDefinition={
    propertyKey:prop.property_key,label:prop.label,kind,valueKey:prop.value_key,
    ...(prop.default_value!==null?{defaultValue:prop.default_value as ComponentSettingDefinition['defaultValue']}:{ }),
    ...(kind==='SELECT'?{choices:choices.map(key=>({key,label:key}))}:{ }),
    ...(kind==='NUMBER'&&prop.min_value!==null?{min:prop.min_value}:{ }),
    ...(kind==='NUMBER'&&prop.max_value!==null?{max:prop.max_value}:{ })
   };
   definitions.set(def.propertyKey,def);
  }
  const items=[...definitions.values()];
  result.set(componentType(api),items);
  result.set(api,items);
 }
 return result;
}
export function exportInventoryCsv(page:InventoryPage,definitions:Definitions=new Map()):string{
 const rows:unknown[][]=[[...INVENTORY_COLUMNS]];
 const names=componentInstanceNames(page.components);
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
  for(const [key,value] of Object.entries(component.properties??{})){
   if(inventoryPropertyAllowed(key))flatten(values,key,value);
  }
  schemaLeaves(values,settingsFor(definitions,component.type),component.properties??{});
  for(const [key,value] of values)
   rows.push([page.apiName,componentApi(component.type),names.get(component.id),key,value]);
 }
 return inventoryCsv(rows);
}
type CsvRow={line:number;cells:string[]};
type InventoryCsvFormat='typed'|'legacy';
function parseCsv(text:string):{rows:CsvRow[];issues:InventoryIssue[];format:InventoryCsvFormat}{
 let format:InventoryCsvFormat='typed';
 const issues:InventoryIssue[]=[];
 if(text.length>700000)return {rows:[],issues:[{row:1,component_name:'',component_property:'',remark:'CSV exceeds the 700 KB import limit'}],format};
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
  const isTyped=header.length===INVENTORY_COLUMNS.length&&header.every((value,i)=>value===INVENTORY_COLUMNS[i]);
  const isLegacy=header.length===LEGACY_INVENTORY_COLUMNS.length&&
   header.every((value,i)=>value===LEGACY_INVENTORY_COLUMNS[i]);
  if(isLegacy)format='legacy';
  if(!isTyped&&!isLegacy)issues.push({row:rows[0].line,component_name:'',component_property:'',
    remark:'Expected CSV columns: '+INVENTORY_COLUMNS.join(',')});
 }
 return {rows:rows.slice(1),issues,format};
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
/** Identify all requested standard component APIs before loading SQL contracts. */
export function inventoryRequestedTypes(csv:string):string[]{
 const {rows,format}=parseCsv(csv);
 const types=format==='typed'
  ?rows.filter(r=>r.cells.length===5).map(r=>r.cells[1].trim())
  :rows.filter(r=>r.cells.length===4&&r.cells[2].trim()==='component.type')
    .map(r=>r.cells[3].trim());
 return [...new Set(types.map(componentApi).filter(validComponentApi).map(componentType))].slice(0,100);
}

type ImportedRow={row:CsvRow;api:string;type:string;name:string;property:string;value:string};
export function applyInventoryCsv(page:InventoryPage,csv:string,definitions:Definitions=new Map()){
 const parsed=parseCsv(csv),{issues,format}=parsed;
 const entries:ImportedRow[]=parsed.rows.map(row=>({
  row,api:row.cells[0]??'',type:format==='typed'?row.cells[1]??'':'',
  name:row.cells[format==='typed'?2:1]??'',
  property:row.cells[format==='typed'?3:2]??'',
  value:row.cells[format==='typed'?4:3]??''
 }));
 const copy=structuredClone(page);
 const names=componentInstanceNames(copy.components);
 const byName=new Map([...copy.components].map(c=>[canonicalComponentName(names.get(c.id)!),c]));
 const byId=new Map(copy.components.map(c=>[c.id,c]));
 const seen=new Set<string>(),rejectedNames=new Set<string>();
 let changes=0,skipped=0;
 const report=(entry:ImportedRow,remark:string)=>issues.push({
  row:entry.row.line,pageapi:entry.api,component_type:entry.type,component_name:entry.name,
  component_property:entry.property,value:entry.value,remark
 });
 const limit=format==='typed'?5:4;
 // A declared type is authoritative. One custom name identifies at most one
 // instance in the selected page, including when its CSV rows are non-adjacent.
 const legacyTypes=new Map<string,string>();
 if(format==='legacy')for(const entry of entries){
  if(entry.property.trim()==='component.type'){
   const key=canonicalComponentName(entry.name),previous=legacyTypes.get(key);
   if(previous&&previous!==entry.value.trim())report(entry,'Conflicting component types for one name');
   else legacyTypes.set(key,entry.value.trim());
  }
 }
 for(const entry of entries){
  if(issues.length>=500)break;
  if(entry.row.cells.length!==limit||entry.api.trim()!==page.apiName||!entry.name.trim())continue;
  const key=canonicalComponentName(entry.name);
  const existing=byName.get(key)??(format==='legacy'?byId.get(entry.name):undefined);
  if(existing)continue;
  if(rejectedNames.has(key))continue;
  if(!componentNamePattern.test(entry.name)){
   report(entry,'New component name must begin with a letter (max 80 characters)');
   rejectedNames.add(key);continue;
  }
  const rawType=format==='typed'?entry.type.trim():legacyTypes.get(key)??'';
  const api=componentApi(rawType);
  if(!validComponentApi(api)||!rawType){
   report(entry,'Component type is missing or invalid');rejectedNames.add(key);continue;
  }
  const type=componentType(api);
  if(!definitions.has(type)&&!definitions.has(api)){
   report(entry,'Component type is not enabled for this tenant or has no installed metadata');
   rejectedNames.add(key);continue;
  }
  if(copy.components.length>=400){
   report(entry,'Page layout cannot contain more than 400 components');rejectedNames.add(key);continue;
  }
  const canvas=page.layoutMode==='free-canvas';
  const component:Block={
   id:'import-'+randomUUID(),type,label:api,region:'main',visible:true,
   properties:{navigatorName:entry.name,libraryComponentId:api},
   ...(canvas?{position:{x:0,y:0,width:Math.min(page.canvasWidth??1440,320),
    height:Math.min(page.canvasHeight??900,180)}}:{})
  };
  copy.components.push(component);byName.set(key,component);byId.set(component.id,component);changes++;
 }
 for(const entry of entries){
  if(issues.length>=500)break;
  if(entry.row.cells.length!==limit){report(entry,'Expected '+limit+' CSV columns');continue;}
  if(entry.api.trim()!==page.apiName){report(entry,'Page API does not match selected page: '+page.apiName);continue;}
  const component=byName.get(canonicalComponentName(entry.name))??
   (format==='legacy'?byId.get(entry.name):undefined);
  if(!component){
   if(!issues.some(issue=>issue.component_name===entry.name))
    report(entry,'Component not found or could not be created: '+entry.name);
   continue;
  }
  if(format==='typed'){
   const requestedApi=componentApi(entry.type.trim());
   if(!validComponentApi(requestedApi)||requestedApi!==componentApi(component.type)){
    report(entry,'Component type mismatch: existing instance is '+componentApi(component.type));continue;
   }
  }
  const property=entry.property.trim();
  if(!property){report(entry,'Property ID is required');continue;}
  const pair=component.id+'\u0000'+property;
  if(seen.has(pair)){report(entry,'Duplicate component property in CSV');continue;}
  seen.add(pair);
  // Blank values and omitted rows never erase a tenant customisation.
  const value=entry.value;
  if(value.trim()===''){skipped++;continue;}
  if(property.startsWith('component.')){
   const name=property.slice('component.'.length);
   if(name==='type'){
    if(format==='typed')report(entry,'Component type belongs in component_type, not propertyid');
    else if(value!==component.type)report(entry,'Component type cannot be changed');
   }else if(name==='id'){
    if(format==='typed')report(entry,'Component ID is immutable; use the custom component name');
    else if(value!==component.id)report(entry,'Component ID is immutable');
   }else if(name==='label'){
    if(value.length>200){report(entry,'Component label exceeds 200 characters');continue;}
    if(component.label!==value){component.label=value;changes++;}
   }else if(name==='visible'){
    if(!/^(true|false)$/i.test(value.trim())){report(entry,'Visibility must be true or false');continue;}
    const next=value.trim().toLowerCase()==='true';
    if(component.visible!==next){component.visible=next;changes++;}
   }else if(name==='region'){
    if(!['header','main','sidebar'].includes(value.trim())){report(entry,'Invalid component region');continue;}
    if(component.region!==value.trim()){component.region=value.trim();changes++;}
   }else if(name.startsWith('position.')){
    const coord=name.slice('position.'.length);
    if(!['x','y','width','height'].includes(coord)){report(entry,'Unknown canvas position property');continue;}
    if(!component.position){report(entry,'Component has no editable canvas position on this layout');continue;}
    const number=Number(value.trim());
    if(!Number.isFinite(number)||Math.abs(number)>100000||(['width','height'].includes(coord)&&number<=0)){
     report(entry,'Canvas position must be a finite number; width and height must be positive');continue;
    }
    const pos=component.position as unknown as Record<string,number>;
    if(pos[coord]!==number){pos[coord]=number;changes++;}
   }else report(entry,'Unknown or protected component property');
   continue;
  }
  const path=property.startsWith('properties.')?property.slice(11):property;
  const parts=safeParts(path);
  if(!parts){report(entry,'Invalid property path');continue;}
  if(!inventoryPropertyAllowed(parts[0])){
   report(entry,'This property is internal or retired and cannot be changed by CSV');continue;
  }
  const schema=lookupSchema(settingsFor(definitions,component.type),parts);
  const valuePath=schema?.valueKey??parts[parts.length-1];
  if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(valuePath)||unsafe.has(valuePath)){
   report(entry,'Invalid metadata value key');continue;
  }
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
  if(missingParent){report(entry,'Nested component property does not exist');continue;}
  // An existing legacy property may still be edited, but a new key must exist
  // in a published contract or the enabled shared SQL ribbon inventory.
  if(!Object.prototype.hasOwnProperty.call(target,valuePath)&&!schema){
   report(entry,'Unknown component metadata property');continue;
  }
  try{
   const next=parsedValue(value,target[valuePath],schema?.kind);
   const schemaIssue=schema?componentSettingIssues(schema,next,property)[0]:undefined;
   if(schemaIssue){report(entry,schemaIssue.path+': '+schemaIssue.message);continue;}
   if(JSON.stringify(target[valuePath])!==JSON.stringify(next)){target[valuePath]=next;changes++;}
  }catch(error){report(entry,error instanceof Error?error.message:'Invalid component property value');}
 }
 if(issues.length===0&&changes>0)copy.components=ensureComponentInstanceNames(copy.components);
 issues.sort((a,b)=>a.row-b.row);
 return {valid:issues.length===0,issues,changes,skipped,page:copy};
}
