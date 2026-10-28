import {Database,Filter,ListFilter,ExternalLink} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';

type Properties=Record<string,unknown>;
type DataObject={apiName:string;label:string;fields?:Array<{apiName:string;label:string}>};
type Definitions=NonNullable<LibraryComponentMetadata['propertyDefinitions']>;
const has=(definitions:Definitions|undefined,key:string)=>Boolean(definitions?.some(def=>def.propertyKey===key));

/** Three stable Office-style groups. Every editor writes an existing metadata
 * key; unsupported controls stay visible and disabled. */
export default function PageBuilderRibbonData({properties,definition,objects,fallbackObject,onChange,onOpenSource,onOpenFilters}:{
 properties:Properties;definition?:LibraryComponentMetadata;objects:DataObject[];fallbackObject?:string;
 onChange:(properties:Properties)=>void;onOpenSource:()=>void;onOpenFilters:()=>void;
}){
 const defs=definition?.propertyDefinitions;
 const objectDef=defs?.find(def=>def.kind==='OBJECT');
 const objectKey=objectDef?.propertyKey??'objectApiName';
 const activeObject=String(properties[objectKey]??fallbackObject??'');
 const fields=objects.find(object=>object.apiName===activeObject)?.fields??[];
 const mappingKey=defs?.find(def=>/^(?:recordKeyFieldApiName|recordIdFieldApiName|dateFieldApiName|eventStartFieldApiName)$/i.test(def.propertyKey))?.propertyKey;
 const filters=Object.entries(properties).reduce((total,[key,value])=>total+(key==='filters'||key.endsWith('Filters')?Array.isArray(value)?value.length:0:0),0);
 const bind=(key:string,value:unknown)=>onChange({...properties,[key]:value});
 const changeObject=(apiName:string)=>{
   const sourceFields=objects.find(object=>object.apiName===apiName)?.fields??[];
   const pick=(pattern:RegExp)=>sourceFields.find(field=>pattern.test(field.apiName+' '+field.label))?.apiName??'';
   const suggestions=definition?.apiName==='une_item_grid'&&objectKey==='objectApiName'?{
     imageFieldApiName:properties.imageFieldApiName||pick(/image|photo|picture|thumbnail/i),
     titleFieldApiName:properties.titleFieldApiName||pick(/^(name|title|product_name)$/i)||pick(/name|title/i),
     descriptionFieldApiName:properties.descriptionFieldApiName||pick(/description|summary|detail/i),
     priceFieldApiName:properties.priceFieldApiName||pick(/price|amount|cost/i)
   }:{};
   onChange({...properties,[objectKey]:apiName,...suggestions});
 };
 const fieldSelect=(label:string,key:string,disabled:boolean)=> <label className="office-ribbon-data-field" key={key}>
   <span>{label}</span><select aria-label={label} value={String(properties[key]??'')} disabled={disabled||!fields.length}
     onChange={event=>bind(key,event.target.value)}>
     <option value="">None</option>{fields.map(f=><option key={f.apiName} value={f.apiName}>{f.label}</option>)}
   </select></label>;
 return <>
   <div className="office-ribbon-group office-ribbon-data-group" aria-label="Data source">
     <div className="office-ribbon-data-heading"><Database size={18}/> <strong>Source</strong>
       <button className="office-ribbon-data-link" type="button" onClick={onOpenSource} disabled={!objectDef}
         title="Open source" aria-label="Open source"><ExternalLink size={15}/></button></div>
     <label className="office-ribbon-data-field"><span>Object</span>
       <select aria-label="Source object" disabled={!objectDef} value={objectDef?String(properties[objectKey]??''):''}
         onChange={event=>changeObject(event.target.value)}>
         <option value="">Choose object</option>{objects.map(object=><option key={object.apiName} value={object.apiName}>{object.label}</option>)}
       </select>
     </label>
     {mappingKey?fieldSelect('Record field',mappingKey,false)
       :<label className="office-ribbon-data-field"><span>Record field</span><select aria-label="Record field" disabled value=""><option>Not supported</option></select></label>}
     <span className="office-ribbon-group-heading">Source</span>
   </div>
   <div className="office-ribbon-group office-ribbon-data-group" aria-label="Data filters">
     <div className="office-ribbon-data-heading"><Filter size={18}/> <strong>Filters</strong>
       <button className="office-ribbon-data-link" type="button" onClick={onOpenFilters}
         title="Open filters" aria-label="Open filters"><ExternalLink size={15}/></button></div>
     <label className="office-ribbon-data-field"><span>Active filters</span>
       <input aria-label="Active filter count" readOnly value={filters+' '+(filters===1?'filter':'filters')}/></label>
     <label className="office-ribbon-data-field"><span>Filter logic</span>
       <select aria-label="Filter logic" value={String(properties.filterLogic??'AND')==='OR'?'OR':'AND'}
         onChange={event=>bind('filterLogic',event.target.value)}>
         <option value="AND">All (AND)</option><option value="OR">Any (OR)</option>
       </select></label>
     <span className="office-ribbon-group-heading">Filters</span>
   </div>
   <div className="office-ribbon-group office-ribbon-data-group" aria-label="Data records">
     <div className="office-ribbon-data-heading"><ListFilter size={18}/> <strong>Records</strong></div>
     {fieldSelect('Sort field','recordSortFieldApiName',!has(defs,'recordSortFieldApiName'))}
     <div className="office-ribbon-data-pagination">
       <label><input aria-label="Enable pagination" type="checkbox" disabled={!has(defs,'enablePagination')}
         checked={properties.enablePagination===true} onChange={event=>bind('enablePagination',event.target.checked)}/> Pagination</label>
       <label>Page size <input aria-label="Page size" type="number" min={1} max={500} disabled={!has(defs,'pageSize')||properties.enablePagination!==true}
         value={typeof properties.pageSize==='number'?properties.pageSize:12}
         onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>0&&value<=500)bind('pageSize',value);}}/></label>
     </div><span className="office-ribbon-group-heading">Records</span>
   </div>
 </>;
}
