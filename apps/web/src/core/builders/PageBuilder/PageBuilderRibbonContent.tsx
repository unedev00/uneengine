import type {ReactNode} from 'react';
import {Image as ImageIcon,Type,AlignLeft,CalendarDays,Clock,Ellipsis} from 'lucide-react';
import type {FieldMetadata,LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import RibbonFieldExpressionInput from './RibbonFieldExpressionInput';

type Properties=Record<string,unknown>;
type DataObject={apiName:string;label:string;fields?:FieldMetadata[]};
const fieldOptions=(fields:FieldMetadata[])=>fields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>);

/** Compact Content layout for the two reference components, backed only by
 * existing persisted keys. No presentation-only mock switches. */
export default function PageBuilderRibbonContent({componentApiName,properties,definition,objects,onChange}:{
 componentApiName:string;properties:Properties;definition?:LibraryComponentMetadata;
 objects:DataObject[];onChange:(next:Properties)=>void;
}){
 const fields=objects.find(o=>o.apiName===String(properties.objectApiName??''))?.fields??[];
 const has=(key:string)=>Boolean(definition?.propertyDefinitions?.some(d=>d.propertyKey===key));
 const update=(key:string,value:unknown)=>onChange({...properties,[key]:value});
 const select=(label:string,key:string,disabled=false)=> <label className="office-ribbon-content-row" key={key}>
   <span>{label}</span><select aria-label={label} disabled={disabled||!has(key)||!fields.length}
     value={String(properties[key]??'')} onChange={event=>update(key,event.target.value)}>
     <option value="">None</option>{fieldOptions(fields)}
   </select></label>;
 const toggle=(label:string,key:string,defaultChecked=true)=> <label className="office-ribbon-content-row" key={key}>
   <span>{label}</span><input type="checkbox" aria-label={label} checked={properties[key]===true||(properties[key]!==false&&defaultChecked)}
     onChange={event=>update(key,event.target.checked)}/></label>;
 const input=(label:string,key:string)=> <label className="office-ribbon-content-row" key={key}>
   <span>{label}</span><input type="text" aria-label={label} value={String(properties[key]??'')}
     onChange={event=>update(key,event.target.value)}/></label>;
 const number=(label:string,key:string,enabled:boolean)=> <label className="office-ribbon-content-row" key={key}>
   <span>{label}</span><input type="number" aria-label={label} disabled={!enabled} min={0}
     value={Number(properties[key]??2)} onChange={event=>{const value=Number(event.target.value);if(Number.isFinite(value)&&value>=0)update(key,value);}}/></label>;
 const expr=(label:string,key:string,legacyKey:string)=><RibbonFieldExpressionInput
   label={label} fields={fields}
   value={String(properties[key]??(properties[legacyKey]?'@'+properties[legacyKey]:''))}
   onChange={value=>update(key,value)}/>;
 const section=(title:string,icon:ReactNode,content:ReactNode)=><div key={title} className="office-ribbon-group office-ribbon-content-card">
   <div className="office-ribbon-content-heading">{icon}<strong>{title}</strong></div>
   <div className="office-ribbon-content-fields">{content}</div><span className="office-ribbon-group-heading">{title}</span>
 </div>;
 if(componentApiName==='une_item_grid')return <>
   {section('Image',<ImageIcon size={18}/>,<>
     {expr('Image field','imageExpression','imageFieldApiName')}
     {toggle('Show image','showImage')}
     {has('missingImageBehavior')&&<label className="office-ribbon-content-row"><span>Missing image</span><select
       aria-label="Missing image" value={String(properties.missingImageBehavior??'')} onChange={e=>update('missingImageBehavior',e.target.value)}>
       <option value="">Default</option>{definition?.propertyDefinitions?.find(d=>d.propertyKey==='missingImageBehavior')?.choices?.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
     </select></label>}
   </>)}
   {section('Heading',<Type size={18}/>,<>
     {expr('Heading','headingExpression','titleFieldApiName')}
     {toggle('Show heading','showTitle')}
   </>)}
   {section('Supporting Text',<AlignLeft size={18}/>,<>
     {expr('Text','descriptionExpression','descriptionFieldApiName')}
     {toggle('Show text','showDescription',false)}
     {number('Lines','descriptionLineLimit',has('descriptionLineLimit'))}
   </>)}
   {section('Badge',<Ellipsis size={18}/>,<>
     {expr('Badge','badgeExpression','badgeFieldApiName')}
     {has('badgeFontWeight')&&<label className="office-ribbon-content-row"><span>Badge weight</span><select
       aria-label="Badge weight" value={String(properties.badgeFontWeight??'')} onChange={e=>update('badgeFontWeight',e.target.value)}>
       <option value="">Default</option>{definition?.propertyDefinitions?.find(d=>d.propertyKey==='badgeFontWeight')?.choices?.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
     </select></label>}
     <label className="office-ribbon-content-row"><span>Legacy value</span>
       <input type="checkbox" aria-label="Show legacy value" checked={properties.showPrice!==false}
         disabled={!properties.priceFieldApiName} onChange={e=>update('showPrice',e.target.checked)}/></label>
   </>)}
   {section('Empty State',<Ellipsis size={18}/>,
     <label className="office-ribbon-content-row"><span>Message</span>
       <input type="text" aria-label="Empty state message" value={String(properties.emptyText??'No matching records')}
         onChange={e=>update('emptyText',e.target.value)}/></label>)}

 </>;
 if(componentApiName==='une_calendar')return <>
   {section('Event Title',<CalendarDays size={18}/>,<>{select('Title field','titleFieldApiName')}{select('Date field','dateFieldApiName')}</>)}
   {section('Event Time',<Clock size={18}/>,<>{select('Start','eventStartFieldApiName')}{select('End','eventEndFieldApiName')}{input('Time zone','timeZone')}</>)}
   {section('Description',<AlignLeft size={18}/>,<>{select('Service','serviceFieldApiName')}{input('Service value','serviceValue')}</>)}
   {section('Other',<Ellipsis size={18}/>,<>{select('Location','resourceFieldApiName')}{input('Resource','resourceValue')}</>)}
 </>;
 return null;
}
