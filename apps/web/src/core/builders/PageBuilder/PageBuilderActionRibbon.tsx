import {useState} from 'react';
import { Trash2, SlidersHorizontal } from 'lucide-react';
import type { FlowDefinitionMetadata } from '../../metadata/Definitions/metadata';
import { metadataReference, metadataSelection } from '../../metadata/Definitions/metadataReferences';
import {supportsSmartActionEvent} from './SmartEventActionsRibbon';
import SmartFormulaField from './SmartFormulaField';

type Binding=Record<string,unknown>;
type EventOption={apiName:string;label:string};
type ActionKind='Flow'|'Navigate'|'SetFilter'|'PageState'|'AdjustNumber';
const asBinding=(value:unknown):Binding=>
  value&&typeof value==='object'&&!Array.isArray(value)?value as Binding:{};
const actionTypes:ReadonlyArray<{kind:ActionKind;label:string;group:string}>=[
  {kind:'Flow',label:'Run automation',group:'Flows'},
  {kind:'Navigate',label:'Open another page',group:'Navigation'},
  {kind:'SetFilter',label:'Filter a list',group:'Page actions'},
  {kind:'PageState',label:'Update page value',group:'Page actions'},
  {kind:'AdjustNumber',label:'Change number (+/−)',group:'Page actions'}
];

/**
 * One action catalog for all Page Builder components. It edits the same
 * actionFlows metadata consumed by Page Runtime. Detailed Flow mappings and
 * navigation destinations are edited in the inline panel, never in a modal.
 */
export default function PageBuilderActionRibbon({actions,eventDefinitions,flows,selectedEvent,
  onSelectEvent,onChange,showDetails,onToggleDetails,api='',selectedApis,dataFields=[],disabled=false}:{
  actions:Binding;eventDefinitions:EventOption[];flows:FlowDefinitionMetadata[];
  selectedEvent:string;onSelectEvent:(name:string)=>void;
  api?:string;selectedApis?:readonly string[];dataFields?:Array<{apiName:string;label:string;dataType:string}>;
  onChange:(next:Binding)=>void;showDetails:boolean;onToggleDetails:()=>void;
  disabled?:boolean;
}) {
  const [customTrigger,setCustomTrigger]=useState('');
  const numericFields=dataFields.filter(field=>
    /^(Number|Currency|Percent|Integer|Decimal|Double|Float|Long|Short|Int)(\(|$)/i.test(field.dataType));
  const formulaFields=numericFields.map(field=>({...field,required:false,unique:false}));
  const numberTarget=String(asBinding(actions[selectedEvent]).fieldApiName??'Quantity');
  const defaultNumberFormula=(operation:'increment'|'decrement',field=numberTarget)=>
    '@'+field+(operation==='increment'?' + 1':' - 1');
  const selected=asBinding(actions[selectedEvent]);
  const active=Boolean(selectedEvent&&Object.prototype.hasOwnProperty.call(actions,selectedEvent));
  const inactive=disabled||!active;
  const kind:ActionKind=actionTypes.some(option=>option.kind===selected.actionType)
    ?selected.actionType as ActionKind:'Flow';
  const availableFlows=flows.filter(flow=>flow.status==='Active'&&
    (flow.flowType==='Autolaunched Flow'||flow.flowType==='Screen Flow'||flow.flowType==='In-Screen Flow'));
  const selectedFlow=metadataSelection(flows,selected.flowApiName);
  const activeEvents=[...new Set([...eventDefinitions.map(event=>event.apiName),...Object.keys(actions)])];
  const eventLabel=(apiName:string)=>eventDefinitions.find(event=>event.apiName===apiName)?.label??apiName;
  const patch=(update:Binding)=>{
    if(!active||disabled)return;
    onChange({...actions,[selectedEvent]:{...selected,...update}});
  };
  const choose=(value:string)=>{
    if(disabled||!value)return;
    if(value.startsWith('trigger:')){
      const name=value.slice(8);
      if(!activeEvents.includes(name))return;
      if(!Object.prototype.hasOwnProperty.call(actions,name))
        onChange({...actions,[name]:{actionType:'Flow',flowApiName:'',inputs:{}}});
      onSelectEvent(name);
      return;
    }
    if(!active)return;
    if(value.startsWith('type:')){
      const next=value.slice(5);
      if(actionTypes.some(item=>item.kind===next)){
        patch({actionType:next,...(next==='AdjustNumber'?{
          fieldApiName:String(selected.fieldApiName??numericFields.find(f=>/^(Quantity|Qty)$/i.test(f.apiName))?.apiName??numericFields[0]?.apiName??''),
          deltaSource:'$event.delta',minValue:0,deleteOnZero:true
        }:{})});
        if(next!=='Flow'&&!showDetails)onToggleDetails();
      }
    }else if(value.startsWith('flow:')){
      const flow=availableFlows.find(item=>item.apiName===value.slice(5));
      if(flow)patch({actionType:'Flow',flowApiName:flow.id?metadataReference(flow.id):flow.apiName,
        flowType:flow.flowType});
    }
  };
  const addCustomTrigger=()=>{
    const name=customTrigger.trim();
    if(disabled||eventDefinitions.length)return;
    if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)||Object.prototype.hasOwnProperty.call(actions,name))return;
    onChange({...actions,[name]:{actionType:'Flow',flowApiName:'',inputs:{}}});
    onSelectEvent(name);setCustomTrigger('');
  };
  // Do not replace the historical six property slots with the unified catalog.
  // All slots remain visible; unsupported component events are disabled.
  const members=selectedApis?.length?selectedApis:[api];
  const eventSlots=[
    {key:'click',label:'On Click'},
    {key:'change',label:'On Change'},
    {key:'start',label:'On Session Start'}
  ] as const;
  const componentSlots=[
    {key:'qtyIcon',label:'Qty Icon'},
    {key:'customButton1',label:'Custom Button 1'},
    {key:'customButton2',label:'Custom Button 2'}
  ] as const;
  const supportsSlot=(key:string)=>members.every(member=>member.startsWith('smart_')
    ?supportsSmartActionEvent(member,key)
    :eventDefinitions.some(item=>item.apiName===key));
  const chooseSlotAction=(key:string,choice:string)=>{
    if(disabled||!supportsSlot(key))return;
    const previous=asBinding(actions[key]);
    if(!choice){
      const next={...actions};delete next[key];
      onChange(next);onSelectEvent(key);return;
    }
    if(choice.startsWith('flow:')){
      const flow=availableFlows.find(item=>item.apiName===choice.slice(5));
      if(!flow)return;
      onChange({...actions,[key]:{...previous,actionType:'Flow',
        flowApiName:flow.id?metadataReference(flow.id):flow.apiName,
        flowType:flow.flowType,inputs:asBinding(previous.inputs)}});
    }else if(choice.startsWith('type:')){
      const actionType=choice.slice(5);
      if(!actionTypes.some(type=>type.kind===actionType))return;
      const suggested=numericFields.find(f=>/^(Quantity|Qty)$/i.test(f.apiName))??numericFields[0];
      onChange({...actions,[key]:{...previous,actionType,
        ...(actionType==='Flow'?{flowApiName:''}:{}),
        ...(actionType==='AdjustNumber'?{
          deltaSource:'$event.delta',fieldApiName:suggested?.apiName??'',
          minValue:0,deleteOnZero:true,
          incrementFormula:'@'+(suggested?.apiName??'Quantity')+' + 1',
          decrementFormula:'@'+(suggested?.apiName??'Quantity')+' - 1'
        }:{})}});
    }else return;
    onSelectEvent(key);
  };
  const slotPicker=(slot:{key:string;label:string})=>{
    const saved=asBinding(actions[slot.key]);
    const flow=metadataSelection(flows,saved.flowApiName);
    const storedFlow=String(flow?.apiName??saved.flowApiName??'');
    const type=String(saved.actionType??(storedFlow?'Flow':''));
    const value=type==='Flow'&&storedFlow?'flow:'+storedFlow
      :actionTypes.some(kind=>kind.kind===type)?'type:'+type:'';
    const available=supportsSlot(slot.key)&&!disabled;
    return <label className="page-action-property-picker" key={slot.key}>
      <span>{slot.label}</span>
      <select aria-label={slot.label+' action'} disabled={!available}
        title={!available?'Not supported by selected component':'Choose Flow, navigation or page action'}
        value={value} onChange={event=>chooseSlotAction(slot.key,event.target.value)}>
        <option value="">Choose action…</option>
        {value.startsWith('flow:')&&!availableFlows.some(f=>f.apiName===storedFlow)&&
          <option value={value}>{storedFlow} (saved/unavailable)</option>}
        <optgroup label="Flows"><option value="type:Flow">Run automation / choose Flow</option></optgroup>
        <optgroup label="Autolaunched Flows">
          {availableFlows.filter(f=>f.flowType==='Autolaunched Flow').map(flow=>
            <option key={flow.apiName} value={'flow:'+flow.apiName}>{flow.label}</option>)}
        </optgroup>
        <optgroup label="Screen Flows">
          {availableFlows.filter(f=>f.flowType==='Screen Flow'||f.flowType==='In-Screen Flow').map(flow=>
            <option key={flow.apiName} value={'flow:'+flow.apiName}>{flow.label}</option>)}
        </optgroup>
        <optgroup label="Navigation"><option value="type:Navigate">Open another page</option></optgroup>
        <optgroup label="Page actions">
          <option value="type:SetFilter">Filter a list</option>
          <option value="type:PageState">Update page value</option>
          <option value="type:AdjustNumber">Change number (+/−)</option>
        </optgroup>
      </select>
    </label>;
  };
  const remove=()=>{
    if(disabled||!active)return;
    const next={...actions};
    delete next[selectedEvent];
    onChange(next);
    onSelectEvent(Object.keys(next)[0]??'');
  };
  return <div className="page-action-ribbon-workspace" aria-label="Actions ribbon workspace">
    {/* Formula bar placeholder is visual only; do not bind it to the editable quantity formulas. */}
    <div className="page-action-formula-bar" role="group" aria-label="Actions formula bar preview">
      <button type="button" disabled className="page-action-formula-menu"
        aria-label="Formula options (coming soon)" title="Formula options (coming soon)">
        <SlidersHorizontal size={15}/>
      </button>
      <span className="page-action-formula-symbol" aria-hidden="true">ƒx</span>
      <input aria-label="Actions formula preview" type="text" readOnly
        aria-disabled="true" placeholder="Select an action property to edit its formula (coming soon)"/>
    </div>
    <div className="office-ribbon-compact-strip page-unified-actions-ribbon" aria-label="Unified component actions">
    <section className="office-ribbon-mini-group page-action-property-group" aria-label="Event">
      <div className="page-action-property-rows">{eventSlots.map(slotPicker)}</div>
      <span className="office-ribbon-group-heading">Event</span>
    </section>
    <section className="office-ribbon-mini-group page-action-property-group" aria-label="Component Custom">
      <div className="page-action-property-rows">{componentSlots.map(slotPicker)}</div>
      <span className="office-ribbon-group-heading">Component Custom</span>
    </section>
    <section
      className="office-ribbon-mini-group page-action-formula-group" data-inactive={!active||kind!=='AdjustNumber'
      aria-label="Editable quantity action formulas">
      <div className="page-action-formula-rows">
        <label><span>+ fx</span><SmartFormulaField
          label="Increase quantity formula" disabled={disabled||!active||kind!=='AdjustNumber'} fields={formulaFields}
          value={String(selected.incrementFormula??defaultNumberFormula('increment'))}
          onChange={value=>patch({incrementFormula:value})}/></label>
        <label><span>− fx</span><SmartFormulaField
          label="Decrease quantity formula" disabled={disabled||!active||kind!=='AdjustNumber'} fields={formulaFields}
          value={String(selected.decrementFormula??defaultNumberFormula('decrement'))}
          onChange={value=>patch({decrementFormula:value})}/></label>
      </div>
      <small>Edit +1 to +2 or −1 to −2; @ selects a field.</small>
      <span className="office-ribbon-group-heading">Quantity formulas</span>
    </section>
    <section className="office-ribbon-mini-group page-action-library" aria-label="All actions">
      <label>Actions
        <select aria-label="All component actions" value="" disabled={disabled}
          onChange={event=>choose(event.target.value)}>
          <option value="">Choose trigger or action…</option>
          <optgroup label="Triggers">
            {activeEvents.map(name=><option key={name} value={'trigger:'+name}>
              {eventLabel(name)}{Object.prototype.hasOwnProperty.call(actions,name)?' (configured)':''}
            </option>)}
          </optgroup>
          <optgroup label="Flows">
            <option value="type:Flow" disabled={!active}>Run automation</option>
            {availableFlows.map(flow=><option key={flow.apiName} value={'flow:'+flow.apiName} disabled={!active}>
              {flow.label}
            </option>)}
          </optgroup>
          <optgroup label="Navigation">
            <option value="type:Navigate" disabled={!active}>Open another page</option>
          </optgroup>
          <optgroup label="Page actions">
            <option value="type:SetFilter" disabled={!active}>Filter a list</option>
            <option value="type:PageState" disabled={!active}>Update page value</option>
            <option value="type:AdjustNumber" disabled={!active}>Change number (+/−)</option>
          </optgroup>
        </select>
      </label>
      <small>Choose a trigger first, then its action.</small>
      <div className="page-action-custom-trigger">
        <input aria-label="Custom action trigger" placeholder="Custom event ID"
          value={customTrigger} disabled={disabled||eventDefinitions.length>0} onChange={event=>setCustomTrigger(event.target.value)}/>
        <button type="button" disabled={disabled||eventDefinitions.length>0||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(customTrigger.trim())||
          Object.prototype.hasOwnProperty.call(actions,customTrigger.trim())}
          onClick={addCustomTrigger}>Add trigger</button>
      </div>
      <span className="office-ribbon-group-heading">All actions</span>
    </section>
    <section className="office-ribbon-mini-group page-action-selected" aria-label="Selected action" data-inactive={!active}>
      <label>Trigger <select aria-label="Selected action trigger" value={active?selectedEvent:''}
        disabled={inactive} onChange={event=>onSelectEvent(event.target.value)}>
        {!active&&<option value="">Choose trigger…</option>}
        {Object.keys(actions).map(name=><option key={name} value={name}>{eventLabel(name)}</option>)}
      </select></label>
      <label>Action <span className="page-action-current-kind">
        {active?actionTypes.find(option=>option.kind===kind)?.label:'Choose action…'}
      </span></label>
      <button type="button" className="office-ribbon-icon-button page-action-remove"
        disabled={inactive} onClick={remove} title="Remove action from this trigger"
        aria-label="Remove selected trigger action"><Trash2 size={15}/> Remove</button>
      <span className="office-ribbon-group-heading">Selected action</span>
    </section>
    <section className="office-ribbon-mini-group page-action-target" aria-label="Configuration" data-inactive={!active}>
      {kind==='AdjustNumber' ? <>
        <label>Number field
          <select aria-label="Number field to adjust" disabled={inactive}
            value={String(selected.fieldApiName??'')}
            onChange={e=>{
              const oldField=String(selected.fieldApiName??'Quantity');
              const next=e.target.value;
              patch({fieldApiName:next,
                ...(selected.incrementFormula===defaultNumberFormula('increment',oldField)
                  ?{incrementFormula:defaultNumberFormula('increment',next)}:{}),
                ...(selected.decrementFormula===defaultNumberFormula('decrement',oldField)
                  ?{decrementFormula:defaultNumberFormula('decrement',next)}:{})
              });
            }}>
            <option value="">Choose numeric field…</option>
            {dataFields.filter(field=>/^(Number|Currency|Percent|Integer|Decimal|Double|Float)(\(|$)/i.test(field.dataType))
              .map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
          </select>
        </label>
        <label>Minimum <input type="number" min={0} step={1} disabled={inactive}
          aria-label="Minimum number after adjustment"
          value={Number(selected.minValue??0)}
          onChange={e=>patch({minValue:Math.max(0,Number(e.target.value)||0)})}/></label>
        <label><input type="checkbox" disabled={inactive}
          aria-label="Delete row when number reaches zero"
          checked={selected.deleteOnZero===true}
          onChange={e=>patch({deleteOnZero:e.target.checked,minValue:0})}/> Remove row at zero</label>
        <label>Related record field
          <select aria-label="Optional relation guard field" disabled={inactive}
            value={String(selected.relatedFieldApiName??'')}
            onChange={e=>patch({relatedFieldApiName:e.target.value})}>
            <option value="">No relation guard</option>
            {dataFields.filter(field=>/^(Lookup|Reference)(\(|$)/i.test(field.dataType))
              .map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
          </select>
        </label>
        <label>Related page state key
          <input aria-label="Related page state key for permission-scoped row"
            disabled={inactive} placeholder="e.g. currentCartId"
            value={String(selected.relatedStateKey??'')}
            onChange={e=>patch({relatedStateKey:e.target.value})}/>
        </label>
        <label>Page collection key
          <input aria-label="Optional Page State collection to refresh"
            disabled={inactive} placeholder="e.g. cartItems"
            value={String(selected.stateCollectionKey??'')}
            onChange={e=>patch({stateCollectionKey:e.target.value})}/>
        </label>
        <label>Total page state key
          <input aria-label="Optional Page State total to recalculate"
            disabled={inactive} placeholder="e.g. total"
            value={String(selected.totalStateKey??'')}
            onChange={e=>patch({totalStateKey:e.target.value})}/>
        </label>
        <label>Unit price field
          <select aria-label="Optional unit price field" disabled={inactive}
            value={String(selected.unitPriceFieldApiName??'')}
            onChange={e=>patch({unitPriceFieldApiName:e.target.value,totalFieldApiName:e.target.value?selected.totalFieldApiName??'':''})}>
            <option value="">No calculated total</option>
            {dataFields.filter(field=>/^(Number|Currency|Percent|Integer|Decimal|Double|Float)(\(|$)/i.test(field.dataType))
              .map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
          </select>
        </label>
        <label>Line total field
          <select aria-label="Optional line total field" disabled={inactive}
            value={String(selected.totalFieldApiName??'')}
            onChange={e=>patch({totalFieldApiName:e.target.value})}>
            <option value="">None</option>
            {dataFields.filter(field=>/^(Number|Currency|Percent|Integer|Decimal|Double|Float)(\(|$)/i.test(field.dataType))
              .map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
          </select>
        </label>
      </> : null}
      {kind==='Flow'?<label>Flow
        <select aria-label="Flow for selected action" disabled={inactive}
          value={selectedFlow?.apiName??String(selected.flowApiName??'')}
          onChange={event=>{
            const flow=availableFlows.find(item=>item.apiName===event.target.value);
            patch({flowApiName:flow?.id?metadataReference(flow.id):flow?.apiName??'',
              ...(flow?{flowType:flow.flowType}:{})});
          }}>
          <option value="">Select Flow…</option>
          {Boolean(selected.flowApiName)&&!selectedFlow&&
            <option value={String(selected.flowApiName)}>{String(selected.flowApiName)} (saved/unavailable)</option>}
          {availableFlows.map(flow=><option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
        </select></label>:kind==='Navigate'?<label>Destination
        <select aria-label="Destination type for selected action" disabled={inactive}
          value={String(selected.navigationTargetType??'Record List')}
          onChange={event=>patch({navigationTargetType:event.target.value,
            navigationPageApiName:''})}>
          <option value="Record List">Record list</option>
          <option value="App Home">App home</option>
          <option value="App Page">App page</option>
        </select></label>:<label>{kind==='SetFilter'?'Filter key':'Page state key'}
        <input aria-label={kind==='SetFilter'?'Shared filter key':'Page state key'}
          disabled={inactive} value={String(kind==='SetFilter'?selected.filterKey??'category':selected.stateKey??'')}
          onChange={event=>patch({[kind==='SetFilter'?'filterKey':'stateKey']:event.target.value})}/></label>}
      <button type="button" className="office-ribbon-icon-button page-action-details-toggle"
        aria-label={showDetails?'Hide action details':'Show action details'} aria-expanded={showDetails}
        disabled={inactive} onClick={onToggleDetails}><SlidersHorizontal size={15}/>{showDetails?'Hide details':'Configure details'}</button>
      <span className="office-ribbon-group-heading">Configuration</span>
    </section>
    </div>
  </div>;
}
