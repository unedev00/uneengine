import type {FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';

type Binding=Record<string,unknown>;
type Actions=Record<string,unknown>;
const clickComponents=new Set(['smart_button','smart_toggle','smart_calendar','smart_cart','smart_card_grid']);
const changeComponents=new Set(['smart_calendar','smart_lookup','smart_tabs','smart_toggle','smart_text']);
const asObject=(value:unknown):Binding=>
 value&&typeof value==='object'&&!Array.isArray(value)?value as Binding:{};

/** Shared Actions slots: unsupported component properties remain visible and disabled. */
export default function SmartEventActionsRibbon({api,actions,flows,onChange}:{
 api:string;actions:Actions;flows:FlowDefinitionMetadata[];onChange:(value:Actions)=>void;
}){
 const slots=[
  {key:'click',label:'On Click',enabled:clickComponents.has(api)},
  {key:'change',label:'On Change',enabled:changeComponents.has(api)},
  // The smart runtime currently does not emit a published on-load event.
  // Keep its slot visible but disabled instead of saving an inert flow.
  {key:'load',label:'On Load',enabled:false}
 ];
 const qtySlot={key:'qtyIcon',label:'Qty icon',enabled:api==='smart_cart'};
 const active=flows.filter(flow=>flow.status==='Active'&&
  (flow.flowType==='Autolaunched Flow'||flow.flowType==='Screen Flow'));
 const update=(event:string,flowName:string)=>{
  const next={...actions};
  if(!flowName){delete next[event];onChange(next);return;}
  const flow=active.find(item=>item.apiName===flowName);
  if(!flow)return;
  const previous=asObject(actions[event]);
  next[event]={...previous,actionType:'Flow',flowApiName:flow.apiName,flowType:flow.flowType,
   inputs:asObject(previous.inputs)};
  onChange(next);
 };
 const picker=(slot:{key:string;label:string;enabled:boolean})=>{
  const saved=asObject(actions[slot.key]);
  const selected=slot.enabled&&!['Navigate','PageState','SetFilter'].includes(String(saved.actionType))
    ?String(saved.flowApiName??''):'';
  return <label key={slot.key} className="smart-event-picker">
    <span>{slot.label}</span>
    <select aria-label={slot.label+' flow'} disabled={!slot.enabled}
      title={!slot.enabled?'Not supported by selected component':'Select Autolaunched or Screen Flow'}
      value={selected} onChange={event=>update(slot.key,event.target.value)}>
      <option value="">Select Flow…</option>
      {selected&&!active.some(flow=>flow.apiName===selected)&&
        <option value={selected}>{selected} (saved/inactive)</option>}
      {(['Autolaunched Flow','Screen Flow'] as const).map(kind=>
        <optgroup key={kind} label={kind}>
          {active.filter(flow=>flow.flowType===kind).map(flow=>
            <option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
        </optgroup>)}
    </select>
  </label>;
 };
 return <div className="office-ribbon-compact-strip smart-event-actions-ribbon"
   aria-label="Smart component event properties">
   <section className="office-ribbon-mini-group smart-event-group" aria-label="Events">
     <div className="smart-event-rows">{slots.map(picker)}</div>
     <span className="office-ribbon-group-heading">Events</span>
   </section>
   <section className="office-ribbon-mini-group smart-event-group" aria-label="Cart">
     <div className="smart-event-rows">{picker(qtySlot)}</div>
     <span className="office-ribbon-group-heading">Cart</span>
   </section>
 </div>;
}
