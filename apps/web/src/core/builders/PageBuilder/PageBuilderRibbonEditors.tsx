import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { FieldMetadata } from '../../metadata/Definitions/metadata';
import { examineRecordFilter, isBooleanFilterField, isNumericFilterField, supportedFilterOperators } from '../../records/RecordWorkspace/recordFilterMetadata';
import { validateVisibilityRule, type ComponentVisibilityRule, type VisibilityCondition } from '../../components/Properties/componentVisibility';

/** One fixed-height ribbon strip. Overflow is navigated by buttons, not scrollbars or taller rows. */
function RibbonPages({ count, shown, children }: { count:number; shown:number; children:(start:number,end:number)=>ReactNode }) {
  const [requested,setRequested] = useState(0);
  const start = Math.min(requested,Math.max(0,count-shown));
  return <>
    {start>0 && <button type="button" className="office-ribbon-icon-button" title="Previous settings" aria-label="Previous settings" onClick={()=>setRequested(Math.max(0,start-shown))}><ChevronLeft size={16}/></button>}
    {children(start,Math.min(count,start+shown))}
    {start+shown<count && <button type="button" className="office-ribbon-icon-button" title="Next settings" aria-label="Next settings" onClick={()=>setRequested(start+shown)}><ChevronRight size={16}/></button>}
  </>;
}
const asRecord = (value:unknown):Record<string,unknown> => value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
const defaultFilter=()=>({field:'',operator:'Equals',value:''});
export function RibbonFilters({draft,onChange,onApply,onCancel,fields}:{
  draft:Record<string,unknown>;onChange:(draft:Record<string,unknown>)=>void;onApply:()=>void;onCancel:()=>void;fields:FieldMetadata[];
}) {
  const keys=Array.from(new Set(['filters',...Object.keys(draft).filter(key=>key.endsWith('Filters'))]));
  const all=keys.flatMap(key=>(Array.isArray(draft[key])?draft[key] as unknown[]:[]).map((filter,index)=>({key,index,filter})));
  const update=(key:string,index:number,value:unknown|null)=>{
    const items=Array.isArray(draft[key])?[...draft[key] as unknown[]]:[];
    if(value===null)items.splice(index,1);else items[index]=value;
    onChange({...draft,[key]:items});
  };
  const add=()=>onChange({...draft,filters:[...(Array.isArray(draft.filters)?draft.filters as unknown[]:[]),defaultFilter()]});
  const invalid=all.some(({filter})=>Boolean(examineRecordFilter(filter,fields)));
  return <div className="office-ribbon-compact-strip" aria-label="Record filter conditions">
    <div className="office-ribbon-mini-group">
      <label>Match <select aria-label="Filter logic" value={draft.filterLogic==='OR'?'OR':'AND'} onChange={e=>onChange({...draft,filterLogic:e.target.value})}>
        <option value="AND">All (AND)</option><option value="OR">Any (OR)</option>
      </select></label>
      <div className="office-ribbon-logic-actions">
        <button type="button" className="office-ribbon-icon-button" title="Add filter" aria-label="Add filter" disabled={!fields.length} onClick={add}><Plus size={17}/></button>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={invalid} onClick={onApply}>Apply</button>
      </div><span className="office-ribbon-group-heading">Logic</span>
    </div>
    <RibbonPages count={all.length} shown={4}>{(start,end)=>all.slice(start,end).map(({key,index,filter},i)=>{
      const raw=asRecord(filter),fieldName=String(raw.field??''),field=fields.find(f=>f.apiName===fieldName);
      const ops=supportedFilterOperators(field),operator=String(raw.operator??'Equals');
      const dynamic=raw.value&&typeof raw.value==='object'?asRecord(raw.value):null;
      const source=dynamic?String(dynamic.source??'Fixed'):'Fixed';
      const set=(patch:Record<string,unknown>)=>update(key,index,{...raw,...patch});
      return <div className="office-ribbon-mini-group office-ribbon-compact-condition" key={key+'-'+index}>
        <button type="button" className="ribbon-condition-delete" title="Delete filter" aria-label="Delete filter" onClick={()=>update(key,index,null)}><Trash2 size={13}/></button>
        <label>Field <select aria-label={'Filter field '+(start+i+1)} value={fieldName} onChange={e=>set({field:e.target.value,operator:'Equals',value:''})}>
          <option value="">Choose field</option>{fieldName&&!field&&<option value={fieldName}>{fieldName} (unavailable)</option>}
          {fields.map(f=><option key={f.apiName} value={f.apiName}>{f.label}</option>)}
        </select></label>
        <label>Match <select aria-label={'Filter operator '+(start+i+1)} value={operator} onChange={e=>set({operator:e.target.value})}>
          {!ops.includes(operator as typeof ops[number])&&<option value={operator}>{operator}</option>}
          {ops.map(op=><option key={op} value={op}>{op}</option>)}
        </select></label>
        <div className="ribbon-condition-value">
          <select title="Value source" aria-label={'Filter value source '+(start+i+1)} value={source} onChange={e=>set({value:e.target.value==='Fixed'?'':e.target.value==='PageState'?{source:'PageState',key:''}:{source:e.target.value}})}>
            <option value="Fixed">Value</option><option value="PageState">Page state</option><option value="CurrentRecord">Record</option><option value="Session">Session</option>
          </select>
          {source==='Fixed' ? isBooleanFilterField(field)
            ? <select aria-label="Filter value" value={String(raw.value??'')} onChange={e=>set({value:e.target.value})}><option value="">Select</option><option value="true">True</option><option value="false">False</option></select>
            : field?.dataType==='Picklist' && field.picklistValues?.length
              ? <select aria-label="Filter value" value={String(raw.value??'')} onChange={e=>set({value:e.target.value})}><option value="">Select</option>{field.picklistValues.map(v=><option key={v} value={v}>{v}</option>)}</select>
              : <input aria-label="Filter value" type={isNumericFilterField(field)?'number':'text'} value={String(raw.value??'')} onChange={e=>set({value:e.target.value})}/>
            : source==='PageState'?<input aria-label="Page state key" placeholder="State key" value={String(dynamic?.key??'')} onChange={e=>set({value:{source:'PageState',key:e.target.value}})}/>:<span className="ribbon-compact-readonly">Automatic</span>}
        </div>
        <span className="office-ribbon-group-heading">Filter {start+i+1}{key!=='filters'?' · '+key:''}</span>
      </div>;
    })}</RibbonPages>

  </div>;
}
const newCondition=():VisibilityCondition=>({source:'Device',operator:'Equals',value:'Desktop'});
export function RibbonVisibilityRules({draft,onChange,onApply,onCancel,fields,allowRecordFields,profiles,recordTypes}:{
  draft:ComponentVisibilityRule|undefined;onChange:(draft:ComponentVisibilityRule|undefined)=>void;onApply:()=>void;onCancel:()=>void;
  fields:FieldMetadata[];allowRecordFields:boolean;profiles:Array<{id:string;label:string}>;recordTypes:Array<{id:string;label:string}>;
}) {
  const update=(index:number,patch:VisibilityCondition|null)=>{
    if(!draft)return;
    onChange({...draft,conditions:patch===null?draft.conditions.filter((_,i)=>i!==index):draft.conditions.map((v,i)=>i===index?patch:v)});
  };
  const errors=validateVisibilityRule(draft,fields,allowRecordFields);
  return <div className="office-ribbon-compact-strip" aria-label="Visibility rule conditions">
    <div className="office-ribbon-mini-group">
      <label className="ribbon-small-checkbox"><input type="checkbox" checked={!!draft} onChange={e=>onChange(e.target.checked?{logic:'All',conditions:[newCondition()]}:undefined)}/> Enable</label>
      <label>Match <select disabled={!draft} value={draft?.logic??'All'} onChange={e=>draft&&onChange({...draft,logic:e.target.value as 'All'|'Any'})}><option value="All">All (AND)</option><option value="Any">Any (OR)</option></select></label>
      <span className="office-ribbon-group-heading">Rule</span>
    </div>
    <RibbonPages count={draft?.conditions.length??0} shown={4}>{(start,end)=>draft?.conditions.slice(start,end).map((condition,i)=>{
      const index=start+i;
      const source=condition.source;
      const field=source==='Record Field'?fields.find(f=>f.apiName===condition.fieldApiName):undefined;
      const operators=source==='Record Field'?supportedFilterOperators(field):['Equals','Not Equals'];
      return <div className="office-ribbon-mini-group office-ribbon-compact-condition" key={index}>
        <button type="button" className="ribbon-condition-delete" title="Delete condition" aria-label="Delete condition" onClick={()=>update(index,null)}><Trash2 size={13}/></button>
        <label>Source <select aria-label={'Condition source '+(index+1)} value={source} onChange={e=>{
          const next=e.target.value;
          update(index,next==='Record Field'?{source:'Record Field',fieldApiName:'',operator:'Equals',value:''}:
            next==='Device'?newCondition():next==='Record Permission'?{source:'Record Permission',operator:'Equals',value:'Edit'}:
            {source:next as 'Record Type'|'User Profile',operator:'Equals',value:''});
        }}><option value="Device">Device</option>{allowRecordFields&&<><option value="Record Field">Record field</option><option value="Record Type">Record type</option><option value="User Profile">User profile</option><option value="Record Permission">Record permission</option></>}</select></label>
        <div className="ribbon-condition-value">
          {source==='Record Field'&&<select aria-label="Visibility record field" value={condition.fieldApiName} onChange={e=>update(index,{...condition,fieldApiName:e.target.value,operator:'Equals',value:''})}><option value="">Field</option>{fields.map(f=><option key={f.apiName} value={f.apiName}>{f.label}</option>)}</select>}
          <select aria-label="Visibility operator" value={condition.operator} onChange={e=>update(index,{...condition,operator:e.target.value} as VisibilityCondition)}>{operators.map(op=><option value={op} key={op}>{op}</option>)}</select>
        </div>
        <label>Value {source==='Device' ? <select value={condition.value} onChange={e=>update(index,{...condition,value:e.target.value as 'Desktop'|'Tablet'|'Phone'})}>{['Desktop','Tablet','Phone'].map(v=><option key={v}>{v}</option>)}</select>
          :source==='Record Permission'?<select value={condition.value} onChange={e=>update(index,{...condition,value:e.target.value as 'Create'|'Edit'|'Delete'})}>{['Create','Edit','Delete'].map(v=><option key={v}>{v}</option>)}</select>
          :source==='Record Type'||source==='User Profile'?<select value={condition.value} onChange={e=>update(index,{...condition,value:e.target.value})}><option value="">Select</option>{(source==='Record Type'?recordTypes:profiles).map(v=><option value={v.id} key={v.id}>{v.label}</option>)}</select>
          :<input type={isNumericFilterField(field)?'number':'text'} aria-label="Visibility value" value={condition.value} onChange={e=>update(index,{...condition,value:e.target.value})}/>}</label>
        <span className="office-ribbon-group-heading">Condition {index+1}</span>
      </div>;
    })}</RibbonPages>
    <button className="office-ribbon-icon-button" type="button" title="Add condition" aria-label="Add condition" disabled={!draft||draft.conditions.length>=20} onClick={()=>draft&&onChange({...draft,conditions:[...draft.conditions,newCondition()]})}><Plus size={17}/></button>
    <div className="office-ribbon-commit-group"><button type="button" onClick={onCancel}>Cancel</button><button type="button" disabled={errors.length>0} title={errors.join('; ')} onClick={onApply}>Apply</button></div>
  </div>;
}
