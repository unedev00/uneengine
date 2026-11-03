import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {readComponentContract} from './component-contract-store.js';
import {availableComponentSettings,componentSettingIssues,type ComponentSettingDefinition} from './component-property-contract.js';
import type {PageLayoutVariant} from '../system-files/page-layout-version-runtime.js';
import {randomUUID} from 'node:crypto';
import {componentInstanceNames,canonicalComponentName,componentNamePattern,ensureComponentInstanceNames} from './page-component-names.js';
import {pagePropertyContract,conditionSettings,recordFieldSettings,recordSectionSettings} from './page-property-contract.js';

/** One interoperable format for Page Builder inventory export and guarded draft import. */
/** Keep the first four columns stable for existing imports. The fifth is a display hint. */
export const INVENTORY_COLUMNS=['pageapi','component_name','component_property','value'] as const;
export const INVENTORY_EXPORT_COLUMNS=[...INVENTORY_COLUMNS,'ribbon_tab'] as const;
export type InventoryIssue={row:number;pageapi?:string;component_name:string;component_property:string;value?:string;remark:string};
type Block={id:string;type:string;label:string;region?:string;visible:boolean;
 position?:{x:number;y:number;width:number;height:number};
 properties:Record<string,unknown>};
export type InventoryPage={apiName:string;draftRevision?:number;layoutMode?:string;canvasWidth?:number;canvasHeight?:number;components:Block[];[key:string]:unknown};
export type InventoryRibbonProperty={
 id:string;tab:string;kind:string;defaultValue?:unknown;valueKey?:string;
};
export type InventoryDefinitions=Map<string,ComponentSettingDefinition[]> & {
 /** Enabled SQL Ribbon rules, keyed by a published component API name. */
 ribbonProperties?:Map<string,InventoryRibbonProperty[]>;
 /** True when the complete SQL-backed property inventory has been read. */
 completeCatalog?:boolean;
};
type Definitions=InventoryDefinitions;
const unsafe=new Set(['__proto__','prototype','constructor']);
// Internal hierarchy links and obsolete Advanced placeholders are not user-editable
// component properties. Their saved SQL values remain untouched by inventory import.
const excludedInventoryProperties=new Set(['cssClass','allowedChildTypes','maxChildren','layoutParentId','parentId','navigatorName']);
const inventoryPropertyAllowed=(key:string)=>!excludedInventoryProperties.has(key);
/** Existing shared Page Runtime metadata, present independently of a component's
 * optional SQL Ribbon slots. Do not invent per-page keys from saved values. */
const sharedPageSettings:ComponentSettingDefinition[]=[
 {...pagePropertyContract,section:'Advanced'},
 {propertyKey:'visibilityRules',label:'Visibility conditions',kind:'GROUP',
  fields:conditionSettings,section:'View'},
 {propertyKey:'actionFlows',label:'Configured Actions',kind:'GROUP',section:'Actions'},
 {propertyKey:'editorLocked',label:'Lock component in designer',kind:'BOOLEAN',
  defaultValue:false,section:'Arrange'}
];
const pageSettingsFor=(type:string):ComponentSettingDefinition[]=>[
 ...sharedPageSettings,
 ...(type==='Record Field'?recordFieldSettings:type==='Field Section'?recordSectionSettings:[])
];
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
function schemaLeaves(out:Map<string,{tab:string;defaultValue?:unknown;kind?:string}>,
 definitions:readonly ComponentSettingDefinition[],prefix='',section='Advanced'):void{
 for(const item of definitions){
  if(!prefix&&!inventoryPropertyAllowed(item.propertyKey))continue;
  const key=prefix+item.propertyKey,tab=item.section??section;
  if(item.kind==='GROUP'&&item.fields?.length)schemaLeaves(out,item.fields,key+'.',tab);
  else if(!out.has(key))out.set(key,{tab,defaultValue:item.defaultValue,kind:item.kind});
 }
}
/** Read through declared metadata paths only, not arbitrary instance keys. */
function pathValue(source:Record<string,unknown>,path:string):unknown{
 const parts=safeParts(path);
 if(!parts)return undefined;
 let value:unknown=source;
 for(const part of parts){if(!isPlain(value))return undefined;value=value[part];}
 return value;
}
const effective=(saved:unknown,defaultValue:unknown):unknown=>
 saved===undefined||saved===null||saved===''?defaultValue??saved:saved;

export async function inventoryDefinitions(db:SqlPersistence,tenant:string,
 components:readonly Block[],variant:PageLayoutVariant,extraTypes:readonly string[]=[]):Promise<Definitions>{
 const names=[...new Set([...components.map(c=>c.type),...extraTypes]
   .filter(type=>/^Custom:[A-Za-z][A-Za-z0-9_]{0,127}$/.test(type))
   .map(type=>type.slice(7)))];
 const definitions=new Map<string,ComponentSettingDefinition[]>() as Definitions;
 definitions.completeCatalog=true;
 if(!names.length)return definitions;
 const [published,ribbons]=await Promise.all([
  db.query<{component_api:string;published_version:number}>(
   'SELECT component_api,published_version FROM md_component_library_heads WHERE tenant_id=$1 AND component_api=ANY($2::text[]) AND published_version IS NOT NULL',
   [tenant,names]),
  // Same source as /api/metadata/builder-ribbon: global properties and only
  // enabled rules. A disabled/unsupported control is never exported as editable.
  db.query<{component_api:string;property_key:string;tab:string;kind:string;
   default_value:unknown;value_key:string|null}>(`
   SELECT r.component_api,p.property_key,p.tab,
     COALESCE(r.control_kind_override,p.control_kind) AS kind,
     COALESCE(r.default_value_override,p.default_value) AS default_value,
     r.value_key
   FROM md_builder_ribbon_component_rules r
   JOIN md_builder_shared_properties p ON p.property_key=r.property_key
   WHERE r.enabled=true AND p.scope='component'
     AND r.component_api=ANY($1::text[])
   ORDER BY p.sort_order,p.property_key`,[names])
 ]);
 for(const row of published.rows){
  const contract=await readComponentContract(db,tenant,row.component_api,row.published_version);
  definitions.set('Custom:'+row.component_api,availableComponentSettings(
   contract.propertyDefinitions??[],variant,row.published_version));
 }
 const ribbonProperties=new Map<string,InventoryRibbonProperty[]>();
 for(const item of ribbons.rows){
  const type='Custom:'+item.component_api;
  if(!ribbonProperties.has(type))ribbonProperties.set(type,[]);
  if(!inventoryPropertyAllowed(item.property_key))continue;
  ribbonProperties.get(type)!.push({id:item.property_key,tab:item.tab,kind:item.kind,
   defaultValue:item.default_value??undefined,valueKey:item.value_key??undefined});
 }
 definitions.ribbonProperties=ribbonProperties;
 return definitions;
}
/** A stable, metadata-complete list per component type, independent of how many
 * instance keys happen to have been saved. Never writes defaults back to SQL. */
export function exportInventoryCsv(page:InventoryPage,definitions:Definitions=new Map()):string{
 const rows:unknown[][]=[[...INVENTORY_EXPORT_COLUMNS]];
 const names=componentInstanceNames(page.components);
 for(const component of page.components){
  const values=new Map<string,{value:unknown;tab:string}>([
   ['component.id',{value:component.id,tab:'Advanced'}],
   ['component.type',{value:component.type,tab:'Advanced'}],
   ['component.visible',{value:component.visible,tab:'View'}],
   ['component.region',{value:component.region??'main',tab:'Layout'}],
   ['component.position.x',{value:component.position?.x,tab:'Layout'}],
   ['component.position.y',{value:component.position?.y,tab:'Layout'}],
   ['component.position.width',{value:component.position?.width,tab:'Layout'}],
   ['component.position.height',{value:component.position?.height,tab:'Layout'}]
  ]);
  const properties=component.properties??{};
  const published=new Map<string,{tab:string;defaultValue?:unknown;kind?:string}>();
  for(const item of definitions.ribbonProperties?.get(component.type)??[])
   published.set(item.id,{tab:item.tab,defaultValue:item.defaultValue,kind:item.kind});
  schemaLeaves(published,definitions.get(component.type)??[]);
  schemaLeaves(published,pageSettingsFor(component.type));
  // Old call sites with no SQL catalogue retain their saved-property export.
  // Real API downloads always supply completeCatalog and use the stable list.
  if(!definitions.completeCatalog||(!component.type.startsWith('Custom:')&&
    !(definitions.get(component.type)?.length||definitions.ribbonProperties?.get(component.type)?.length))){
   const legacy=new Map<string,string>();
   for(const [key,value] of Object.entries(properties))
    if(inventoryPropertyAllowed(key))flatten(legacy,key,value);
   for(const [key,value] of legacy)values.set(key,{value,tab:published.get(key)?.tab??'Advanced'});
  }
  for(const [id,descriptor] of published){
   const ribbon=definitions.ribbonProperties?.get(component.type)?.find(row=>row.id===id);
   values.set(id,{value:effective(pathValue(properties,ribbon?.valueKey??id),descriptor.defaultValue),
    tab:descriptor.tab});
  }
  for(const [key,{value,tab}] of values)
   rows.push([page.apiName,names.get(component.id),key,valueText(value),tab]);
 }
 return inventoryCsv(rows);
}
type CsvRow={line:number;cells:string[]};
function parseCsv(text:string):{rows:CsvRow[];issues:InventoryIssue[];columns:number}{
 const issues:InventoryIssue[]=[];
 if(text.length>1800000)return {rows:[],columns:4,issues:[{row:1,component_name:'',component_property:'',remark:'CSV exceeds the 1.8 MB import limit'}]};
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
  if(rows.length>50000){
   issues.push({row:line,component_name:'',component_property:'',remark:'CSV exceeds 50,000 rows'});
   break;
  }
 }
 if(quoted)issues.push({row:start,component_name:'',component_property:'',remark:'Unclosed quoted CSV value'});
 if(current.length||cell)finishRow();
 if(!rows.length)issues.push({row:1,component_name:'',component_property:'',remark:'CSV is empty'});
 const header=rows[0]?.cells.map((v,i)=>i===0?v.replace(/^\uFEFF/,'').trim().toLowerCase():v.trim().toLowerCase())??[];
 const validBase=header.slice(0,4).every((value,i)=>value===INVENTORY_COLUMNS[i]);
 const columns=header.length===5&&validBase&&header[4]==='ribbon_tab'?5:4;
 if(!rows.length||!validBase||header.length!==columns||
   columns===4&&header.length!==INVENTORY_COLUMNS.length)
  if(rows.length)issues.push({row:rows[0].line,component_name:'',component_property:'',
   remark:'Expected CSV columns: '+INVENTORY_COLUMNS.join(',')+'[,ribbon_tab]'});
 return {rows:rows.slice(1),issues,columns};
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
 if(typeof original==='number'||kind==='NUMBER'||kind==='CURRENCY'||kind==='number'){
  const number=Number(trimmed);
  if(!trimmed||!Number.isFinite(number))throw Error('Enter a finite numeric value');
  return number;
 }
 if(kind==='position'&&trimmed&&Number.isFinite(Number(trimmed)))return Number(trimmed);
 if(typeof original==='boolean'||kind==='BOOLEAN'||kind==='boolean'){
  if(trimmed.toLowerCase()==='true')return true;
  if(trimmed.toLowerCase()==='false')return false;
  throw Error('Enter true or false');
 }
 const list=['COLLECTION','STRING_LIST','FIELD_LIST','COLUMNS','OPTIONS','RECORD_LIST'];
 if(Array.isArray(original)||kind==='weekdays'||kind&&list.includes(kind)){
  try{const value=JSON.parse(input);if(Array.isArray(value))return value;}catch{}
  throw Error('Enter a valid JSON array');
 }
 if(isPlain(original)||kind==='GROUP'){
  try{const value=JSON.parse(input);if(isPlain(value))return value;}catch{}
  throw Error('Enter a valid JSON object');
 }
 return input;
}
/** Only published library types explicitly declared by a CSV can create instances. */
export function inventoryRequestedTypes(csv:string):string[]{
 const {rows,columns,issues}=parseCsv(csv);
 if(issues.length)return [];
 return [...new Set(rows.filter(r=>r.cells.length===columns&&r.cells[2].trim()==='component.type')
  .map(r=>r.cells[3].trim()).filter(v=>/^Custom:[A-Za-z][A-Za-z0-9_]{0,127}$/.test(v)))].slice(0,100);
}
export function applyInventoryCsv(page:InventoryPage,csv:string,definitions:Definitions=new Map()){
 const {rows,issues,columns}=parseCsv(csv);
 const copy=structuredClone(page);
 const names=componentInstanceNames(copy.components);
 const byName=new Map([...copy.components].map(c=>[canonicalComponentName(names.get(c.id)!),c]));
 const byId=new Map(copy.components.map(c=>[c.id,c]));
 const seen=new Set<string>();
 let changes=0,skipped=0;
 const report=(row:CsvRow,remark:string)=>issues.push({
  row:row.line,pageapi:row.cells[0]??'',component_name:row.cells[1]??'',
  component_property:row.cells[2]??'',value:row.cells[3]??'',remark
 });
 // Resolve every intended upsert before interpreting its individual properties.
 // A missing name requires an explicit published component.type declaration.
 for(const row of rows){
  if(issues.length>=500)break;
  const [api,name]=row.cells;
  if(row.cells.length!==columns||api?.trim()!==page.apiName||!name?.trim())continue;
  const key=canonicalComponentName(name);
  if(byId.has(name)||byName.has(key))continue;
  if(!componentNamePattern.test(name)){
   report(row,'New component names must start with a letter and use letters, numbers or underscores (max 80)');
   continue;
  }
  const declared=rows.filter(candidate=>candidate.cells.length===columns&&candidate.cells[0].trim()===page.apiName
   &&canonicalComponentName(candidate.cells[1])===key&&candidate.cells[2].trim()==='component.type');
  if(!declared.length){report(row,'Component does not exist. Add a component.type row with a published Custom: component type to create it.');continue;}
  const type=declared[0].cells[3].trim();
  if(!/^Custom:[A-Za-z][A-Za-z0-9_]{0,127}$/.test(type)||!definitions.has(type)){
   report(declared[0],'Cannot create component: component.type is not a published tenant component');
   continue;
  }
  if(copy.components.length>=400){report(row,'This Page layout cannot contain more than 400 components');continue;}
  const canvas=page.layoutMode==='free-canvas';
  const component:Block={
   id:'import-'+randomUUID(),type,label:type.slice(7),region:'main',visible:true,
   properties:{navigatorName:name,libraryComponentId:type.slice(7)},
   ...(canvas?{position:{x:0,y:0,width:Math.min(page.canvasWidth??1440,320),
    height:Math.min(page.canvasHeight??900,180)}}:{})
  };
  copy.components.push(component);
  byName.set(key,component);byId.set(component.id,component);changes++;
 }
 for(const row of rows){
  if(issues.length>=500)break;
  const [api,componentName,rawProperty,value]=row.cells;
  if(row.cells.length!==columns){report(row,'Expected '+columns+' CSV columns');continue;}
  if(api?.trim()!==page.apiName){report(row,'Page API does not match selected page: '+page.apiName);continue;}
  const component=byId.get(componentName)??byName.get(canonicalComponentName(componentName));
  if(!component){
   // The pre-pass already provided the most useful missing/create error.
   if(!issues.some(issue=>issue.component_name===componentName))
    report(row,'Component not found or could not be created: '+componentName);
   continue;
  }
  const property=rawProperty?.trim();
  if(!property){report(row,'Component property is required');continue;}
  const pair=component.id+'\u0000'+property;
  if(seen.has(pair)){report(row,'Duplicate component property in CSV');continue;}
  seen.add(pair);
  // Blank cells and missing property rows do not change existing metadata.
  if(value.trim()===''){skipped++;continue;}
  if(property.startsWith('component.')){
   const name=property.slice('component.'.length);
   if(name==='type'){
    if(value!==component.type)report(row,'Component type cannot be changed. Use the published type when creating a component.');
   }else if(name==='id'){
    if(value!==component.id)report(row,'Component ID is immutable. Clear component.id when copying rows to create a new component.');
   }else if(name==='label'){
    if(value.length>200){report(row,'Component label exceeds 200 characters');continue;}
    if(component.label!==value){component.label=value;changes++;}
   }else if(name==='visible'){
    if(!/^(true|false)$/i.test(value.trim())){report(row,'Visibility must be true or false');continue;}
    const next=value.trim().toLowerCase()==='true';
    if(component.visible!==next){component.visible=next;changes++;}
   }else if(name==='region'){
    if(!['header','main','sidebar'].includes(value.trim())){report(row,'Invalid component region');continue;}
    if(component.region!==value.trim()){component.region=value.trim();changes++;}
   }else if(name.startsWith('position.')){
    const coord=name.slice('position.'.length);
    if(!['x','y','width','height'].includes(coord)){report(row,'Unknown component position property');continue;}
    if(!component.position){report(row,'Component has no editable canvas position on this layout');continue;}
    const number=Number(value.trim());
    if(!Number.isFinite(number)||Math.abs(number)>100000||(['width','height'].includes(coord)&&number<=0)){
     report(row,'Canvas position must be a finite number; width and height must be positive');continue;
    }
    const pos=component.position as unknown as Record<string,number>;
    if(pos[coord]!==number){pos[coord]=number;changes++;}
   }else report(row,'Unknown or protected component property');
   continue;
  }
  const path=property.startsWith('properties.')?property.slice(11):property;
  const parts=safeParts(path);
  if(!parts){report(row,'Invalid property path');continue;}
  if(!inventoryPropertyAllowed(parts[0])){
   report(row,'This property is internal or retired and cannot be changed by CSV');continue;
  }
  const schema=lookupSchema([
   ...(definitions.get(component.type)??[]),...pageSettingsFor(component.type)],parts);
  const ribbon=parts.length===1?definitions.ribbonProperties?.get(component.type)?.find(item=>item.id===parts[0]):undefined;
  // Stable CSV ID -> one shared Ribbon rule -> actual saved property key.
  const storageParts=ribbon?.valueKey?safeParts(ribbon.valueKey):parts;
  if(!storageParts){report(row,'Invalid shared Ribbon property storage path');continue;}
  const original=pathValue(component.properties??{},storageParts.join('.'));
  const hasPublishedCatalog=Boolean(definitions.completeCatalog&&component.type.startsWith('Custom:')&&
    ((definitions.ribbonProperties?.get(component.type)?.length??0)>0||
     (definitions.get(component.type)?.length??0)>0));
  if(!schema&&!ribbon&&(original===undefined||hasPublishedCatalog)){
   report(row,'Unknown or disabled component metadata property');continue;
  }
  try{
   const next=parsedValue(value,original,schema?.kind??ribbon?.kind);
   const schemaIssue=schema?componentSettingIssues(schema,next,property)[0]:undefined;
   if(schemaIssue){report(row,schemaIssue.path+': '+schemaIssue.message);continue;}
   const defaultValue=ribbon?.defaultValue??schema?.defaultValue;
   // A downloaded effective default is not an authored override.
   // Check BEFORE creating nested parents to keep a no-op import truly pure.
   if((original===undefined||original===null||original==='')&&
    defaultValue!==undefined&&JSON.stringify(next)===JSON.stringify(defaultValue)){
    skipped++;continue;
   }
   if(JSON.stringify(original)===JSON.stringify(next))continue;
   let target:Record<string,unknown>=component.properties??(component.properties={});
   let missingParent=false;
   for(const segment of storageParts.slice(0,-1)){
    const candidate=target[segment];
    if(candidate===undefined){if(!schema&&!ribbon){missingParent=true;break;}target[segment]={};}
    else if(!isPlain(candidate)){missingParent=true;break;}
    target=target[segment] as Record<string,unknown>;
   }
   if(missingParent){report(row,'Nested component property does not exist');continue;}
   target[storageParts[storageParts.length-1]]=next;changes++;
  }catch(error){report(row,error instanceof Error?error.message:'Invalid component property value');}
 }
 if(issues.length===0&&changes>0)copy.components=ensureComponentInstanceNames(copy.components);
 issues.sort((a,b)=>a.row-b.row);
 return {valid:issues.length===0,issues,changes,skipped,page:copy};
}
