import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings2, Trash2, X } from 'lucide-react';
import type { FlowDefinitionMetadata } from '../../metadata/Definitions/metadata';
type Binding=Record<string,unknown>;
const record=(value:unknown):Binding=>value&&typeof value==='object'&&!Array.isArray(value)?value as Binding:{};
const types=[['Flow','Run automation'],['Navigate','Open another page'],['SetFilter','Filter a list'],['PageState','Update page value']] as const;

/** Compact rendering of existing actionFlows. There is exactly one binding per event in the runtime. */
export default function PageBuilderActionRibbon({actions,eventDefinitions,flows,onChange,advanced}:{
  actions:Binding;
  eventDefinitions:Array<{apiName:string;label:string}>;
  flows:FlowDefinitionMetadata[];
  onChange:(next:Binding)=>void;
  advanced:ReactNode;
}) {
  const [eventToAdd,setEventToAdd]=useState('');
  const [customEvent,setCustomEvent]=useState('');
  const [start,setStart]=useState(0);
  const [showAdvanced,setShowAdvanced]=useState(false);
  const names=Object.keys(actions);
  const allowed=eventDefinitions.filter(e=>!Object.prototype.hasOwnProperty.call(actions,e.apiName));
  const currentName=eventDefinitions.length?eventToAdd:customEvent.trim();
  const valid=/^[A-Za-z][A-Za-z0-9_]*$/.test(currentName)&&!Object.prototype.hasOwnProperty.call(actions,currentName);
  const add=()=>{
    if(!valid)return;
    onChange({...actions,[currentName]:{actionType:'Flow',flowApiName:'',inputs:{}}});
    setEventToAdd('');setCustomEvent('');
    setStart(Math.max(0,names.length-2));
  };
  const patch=(name:string,partial:Binding)=>{
    const binding=record(actions[name]);
    onChange({...actions,[name]:{...binding,...partial}});
  };
  const count=3;
  const pageStart=Math.min(start,Math.max(0,names.length-count));
  const visible=names.slice(pageStart,pageStart+count);
  return <div className="office-ribbon-compact-strip office-ribbon-actions-strip" aria-label="Component event actions">
    {pageStart>0&&<button type="button" className="office-ribbon-icon-button" onClick={()=>setStart(Math.max(0,pageStart-count))} aria-label="Previous actions" title="Previous actions"><ChevronLeft size={17}/></button>}
    {visible.map((name,index)=>{
      const binding=record(actions[name]);
      const kind=types.some(t=>t[0]===binding.actionType)?String(binding.actionType):'Flow';
      const event=eventDefinitions.find(e=>e.apiName===name);
      const saved=String(binding.flowApiName??'');
      const selected=flows.find(f=>f.apiName===saved||f.id===saved);
      const chosen=selected?.apiName??saved;
      return <div className="office-ribbon-mini-group office-ribbon-action-card" key={name}>
        <button type="button" className="ribbon-condition-delete" aria-label={'Delete '+name+' action'} title="Remove action" onClick={()=>{const next={...actions};delete next[name];onChange(next);}}><Trash2 size={13}/></button>
        <label>When <select disabled aria-label="Component event" value={name}><option value={name}>{event?.label??name}</option></select></label>
        <label>Action <select aria-label={'Action type for '+name} value={kind} onChange={e=>patch(name,{actionType:e.target.value})}>
          {types.map(([type,label])=><option key={type} value={type}>{label}</option>)}
        </select></label>
        <div className="ribbon-action-target">
          {kind==='Flow'?<select aria-label={'Flow for '+name} value={chosen} onChange={e=>patch(name,{flowApiName:e.target.value})}>
            <option value="">Choose Flow</option>
            {saved&&!flows.some(f=>f.apiName===chosen)&&<option value={saved}>{saved} (saved)</option>}
            {flows.filter(f=>f.status==='Active'&&['Screen Flow','Autolaunched Flow'].includes(f.flowType)).map(f=><option key={f.apiName} value={f.apiName}>{f.label}</option>)}
          </select>:kind==='Navigate'?<select aria-label={'Destination type for '+name} value={String(binding.navigationTargetType??'Record List')} onChange={e=>patch(name,{navigationTargetType:e.target.value})}>
            <option value="Record List">Record list</option><option value="App Home">App home</option><option value="App Page">App page</option>
          </select>:<input aria-label={kind==='SetFilter'?'Shared filter key':'Page state key'} placeholder={kind==='SetFilter'?'Shared filter key':'Page state key'}
            value={String(kind==='SetFilter'?binding.filterKey??'category':binding.stateKey??'')}
            onChange={e=>patch(name,{[kind==='SetFilter'?'filterKey':'stateKey']:e.target.value})}/>}
          <button className="office-ribbon-icon-button" type="button" title={'Configure '+name+' mappings, destination and conditions'} aria-label={'Advanced settings for '+name} onClick={()=>setShowAdvanced(true)}><Settings2 size={15}/></button>
        </div>
        <span className="office-ribbon-group-heading">Action {pageStart+index+1}</span>
      </div>;
    })}
    {pageStart+count<names.length&&<button type="button" className="office-ribbon-icon-button" title="Next actions" aria-label="Next actions" onClick={()=>setStart(pageStart+count)}><ChevronRight size={17}/></button>}
    <div className="office-ribbon-mini-group ribbon-add-event">
      {eventDefinitions.length?<label>Event <select aria-label="New action event" value={eventToAdd} onChange={e=>setEventToAdd(e.target.value)}>
        <option value="">Choose event</option>{allowed.map(e=><option key={e.apiName} value={e.apiName}>{e.label}</option>)}
      </select></label>:<label>Event <input aria-label="Custom event" placeholder="Event ID" value={customEvent} onChange={e=>setCustomEvent(e.target.value)}/></label>}
      <button type="button" className="office-ribbon-icon-button" title="Add action to right" aria-label="Add action" disabled={!valid} onClick={add}><Plus size={17}/></button>
      <span className="office-ribbon-group-heading">Add action</span>
    </div>
    {showAdvanced&&<div className="office-ribbon-action-overlay" role="dialog" aria-label="Existing action mappings and settings">
      <div className="ribbon-action-overlay-header"><strong>Action mappings and destinations</strong><button type="button" title="Close advanced settings" onClick={()=>setShowAdvanced(false)}><X size={17}/></button></div>
      {advanced}
    </div>}
  </div>;
}
