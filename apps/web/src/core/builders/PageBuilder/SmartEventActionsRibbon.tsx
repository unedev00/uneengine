import type {FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';

type Binding=Record<string,unknown>;
type Actions=Record<string,unknown>;
const clickComponents=new Set(['smart_button','smart_toggle','smart_calendar','smart_cart']);
const asObject=(value:unknown):Binding=>
 value&&typeof value==='object'&&!Array.isArray(value)?value as Binding:{};

/** Shared Actions slots: unsupported component properties remain visible and disabled. */
export default function SmartEventActionsRibbon({api,actions,flows,onChange}:{
 api:string;actions:Actions;flows:FlowDefinitionMetadata[];onChange:(value:Actions)=>void;
}){
 const slots=[
  {key:'click',label:'On Click',group:'Event',enabled:clickComponents.has(api)},
  {key:'qtyIcon',label:'Qty Icon',group:'Component Custom',enabled:api==='smart_cart'}
 ];
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
 return <div className="office-ribbon-compact-strip smart-event-actions-ribbon"
   aria-label="Smart component event properties">
   {slots.map(slot=>{
    const saved=asObject(actions[slot.key]);
    const selected=slot.enabled&&!['Navigate','PageState','SetFilter'].includes(String(saved.actionType))
      ?String(saved.flowApiName??''):'';
    return <section key={slot.key} className="office-ribbon-mini-group"
      aria-label={slot.group} style={{minWidth:240,padding:'8px 12px'}}>
      <label style={{display:'flex',gap:8,alignItems:'center',whiteSpace:'nowrap'}}>
        <span>{slot.label}</span>
        <select aria-label={slot.label+' flow'} disabled={!slot.enabled}
          title={!slot.enabled?'Not supported by selected component':'Select Autolaunched or Screen Flow'}
          value={selected} onChange={event=>update(slot.key,event.target.value)}
          style={{minWidth:155,maxWidth:240}}>
          <option value="">Select Flow…</option>
          {selected&&!active.some(flow=>flow.apiName===selected)&&
            <option value={selected}>{selected} (saved/inactive)</option>}
          {(['Autolaunched Flow','Screen Flow'] as const).map(kind=>
            <optgroup key={kind} label={kind}>
              {active.filter(flow=>flow.flowType===kind).map(flow=>
                <option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
            </optgroup>)}
        </select>
      </label>
      <span className="office-ribbon-group-heading">{slot.group}</span>
    </section>;
   })}
 </div>;
}
