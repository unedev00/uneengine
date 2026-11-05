import {useState} from 'react';
import {Trash2, SlidersHorizontal, Eye, EyeOff} from 'lucide-react';
import type {FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';
import {metadataReference,metadataSelection} from '../../metadata/Definitions/metadataReferences';
import {supportsSmartActionEvent} from './SmartEventActionsRibbon';
import SmartFormulaField from './SmartFormulaField';
import type {PageStateChoice} from './pageStateChoices';
import {isFlowActionFormula,validateFlowActionFormula} from '../../pages/PageRuntime/actionFlowFormula';

type Binding=Record<string,unknown>;
type EventOption={apiName:string;label:string};
const asBinding=(value:unknown):Binding=>
  value&&typeof value==='object'&&!Array.isArray(value)?value as Binding:{};
const eventSlots=[
 {key:'click',label:'On Click'},
 {key:'change',label:'On Change'},
 {key:'start',label:'On Session Start'}
] as const;
const componentSlots=[
 {key:'qtyIncrease',label:'+ Icon'},
 {key:'qtyDecrease',label:'− Icon'},
 {key:'customButton1',label:'Custom Button 1'},
 {key:'customButton2',label:'Custom Button 2'}
] as const;
type CartButtonKey=(typeof componentSlots)[number]['key'];
const legacyLabels:Record<string,string>={
 Navigate:'Open another page',SetFilter:'Filter a list',
 PageState:'Update page value',AdjustNumber:'Change number'
};
/** Convert legacy settings only when a user explicitly changes that event to
 * Formula. No migration runs on load, so published metadata remains stable. */
const legacyFormula=(binding:Binding,eventName:string,field:string):string=>{
 const type=String(binding.actionType??'');
 const quoted=(value:string)=>JSON.stringify(value);
 if(type==='SetFilter'){
   const key=String(binding.filterKey??'category');
   return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
     ?'@filter.'+key+' := @event.value':'';
 }
 if(type==='PageState'){
   const key=String(binding.stateKey??'');
   const original=String(binding.value??'$event.value');
   const expression=original==='$session'?'@session.id':
     original==='$event'?'@event.value':
     original.startsWith('$event.')?'@event.'+original.slice(7):
     original.startsWith('$state.')?'@state.'+original.slice(7):quoted(original);
   return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
     ?'@state.'+key+' := '+expression:'';
 }
 if(type==='Navigate'){
   const mode=String(binding.navigationTargetType??'Record List');
   const app=String(binding.navigationAppId??'');
   const page=String(binding.navigationPageApiName??'');
   const object=String(binding.navigationObjectApiName??'');
   if(mode==='App Page'&&app&&page)
     return '@navigate.page := '+quoted(app+'/'+page);
   if(mode==='App Home'&&app)return '@navigate.home := '+quoted(app);
   if(mode==='Record List'&&object)return '@navigate.list := '+quoted(object);
   return '';
 }
 if(type==='AdjustNumber'||eventName==='qtyIncrease'||eventName==='qtyDecrease'){
   return String(binding.formula??
     (eventName==='qtyDecrease'?binding.decrementFormula:binding.incrementFormula)??
     (field?'@'+field+(eventName==='qtyDecrease'?' - 1':' + 1'):''));
 }
 return String(binding.formula??'');
};

/** One metadata-driven no-code action selector. Formulas and Flows are the only
 * choices for NEW actions. Legacy actions are retained and remain executable
 * until a user deliberately converts them; no business metadata is deleted.
 * Flow declarations belong to Flow Builder; existing action bindings remain intact.
 */
export default function PageBuilderActionRibbon({
 actions,eventDefinitions,flows,selectedEvent,onSelectEvent,onChange,
 api='',selectedApis,dataFields=[],disabled=false,
 buttonVisibility,onButtonVisibilityChange,stateOptions=[]
}:{
 actions:Binding;eventDefinitions:EventOption[];flows:FlowDefinitionMetadata[];
 selectedEvent:string;onSelectEvent:(name:string)=>void;
 onChange:(next:Binding)=>void;api?:string;selectedApis?:readonly string[];
 dataFields?:Array<{apiName:string;label:string;dataType:string}>;disabled?:boolean;
 stateOptions?:readonly PageStateChoice[];
 buttonVisibility?:Partial<Record<CartButtonKey,boolean>>;
 onButtonVisibilityChange?:(key:CartButtonKey,visible:boolean)=>void;
 // Deprecated parameters remain optional for existing Page Builder integrations.
 showDetails?:boolean;onToggleDetails?:()=>void;
}) {
 const active=Boolean(selectedEvent&&Object.prototype.hasOwnProperty.call(actions,selectedEvent));
 const selected=asBinding(actions[selectedEvent]);
 const numericFields=dataFields.filter(field=>
  /^(Number|Currency|Percent|Integer|Decimal|Double|Float|Long|Short|Int)(\(|$)/i.test(field.dataType));
 const formulaFields=numericFields.map(field=>({...field,required:false,unique:false}));
 // The Flow dropdown and the formula bar are one action: a chosen Flow shows as
 // $flow.ApiName, and editing it (e.g. IF(..., $flow.A, $flow.B)) makes it a Formula.
 const selectedFlow=active&&selected.actionType==='Flow'?metadataSelection(flows,selected.flowApiName):undefined;
 const selectedFlowName=String(selectedFlow?.apiName??(active&&selected.actionType==='Flow'?selected.flowApiName??'':''));
 const formulaValue=!active?'':selected.actionType==='Formula'?String(selected.formula??'')
  :selected.actionType==='Flow'&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(selectedFlowName)?'$flow.'+selectedFlowName:'';
 const formulaEditable=active&&(selected.actionType==='Formula'||selected.actionType==='Flow');
 const availableFlows=flows.filter(flow=>flow.status==='Active'&&
  ['Autolaunched Flow','Screen Flow','In-Screen Flow'].includes(flow.flowType));
 const eventLabels=new Map(eventDefinitions.map(item=>[item.apiName,item.label]));
 const members=selectedApis?.length?selectedApis:[api];
 const isCartSelection=members.length>0&&members.every(member=>member==='smart_cart');
  const hasCustomButtons=members.length>0&&members.every(member=>
   member==='smart_cart'||member==='smart_card_grid');
 const supports=(key:string)=>members.every(member=>member.startsWith('smart_')
   ?supportsSmartActionEvent(member,key)
   :eventDefinitions.some(item=>item.apiName===key));
 const otherEvents=[...new Set([
   ...eventDefinitions.map(item=>item.apiName),
   ...Object.keys(actions)
 ])].filter(key=>!eventSlots.some(slot=>slot.key===key)&&
   !componentSlots.some(slot=>slot.key===key));
 const [otherEvent,setOtherEvent]=useState('');
 const selectedOther=otherEvents.includes(selectedEvent)?selectedEvent:
   otherEvents.includes(otherEvent)?otherEvent:otherEvents[0]??'';
 const patch=(change:Binding)=>{
   if(disabled||!active)return;
   onChange({...actions,[selectedEvent]:{...selected,...change}});
 };
 const choose=(key:string,option:string)=>{
   if(disabled||!supports(key))return;
   const previous=asBinding(actions[key]??(
    (key==='qtyIncrease'||key==='qtyDecrease')?actions.qtyIcon:undefined));
   if(!option){
     const next={...actions};delete next[key];
     onChange(next);onSelectEvent(key);return;
   }
   if(option==='formula'){
     const preferred=numericFields.find(field=>/^(Quantity|Qty)$/i.test(field.apiName))??numericFields[0];
     const field=String(previous.fieldApiName??preferred?.apiName??'');
     const previousFormula=legacyFormula(previous,key,field);
     const formula=previousFormula||(
       (key==='qtyDecrease'||key==='qtyIncrease')&&field
        ?'@'+field+(key==='qtyDecrease'?' - 1':' + 1'):'');
     onChange({...actions,[key]:{...previous,actionType:'Formula',formula,
       ...(field&&(key==='qtyIncrease'||key==='qtyDecrease')?{fieldApiName:field}:{}),
       ...(key==='qtyDecrease'||key==='qtyIncrease'?{
         deltaSource:'$event.delta',minValue:previous.minValue??0,
         deleteOnZero:previous.deleteOnZero??true
       }:{})}});
   }else if(option==='flow'){
     onChange({...actions,[key]:{...previous,actionType:'Flow',
       flowApiName:'',inputs:asBinding(previous.inputs)}});
   }else if(option.startsWith('flow:')){
     const flow=availableFlows.find(item=>item.apiName===option.slice(5));
     if(!flow)return;
     onChange({...actions,[key]:{...previous,actionType:'Flow',
       flowApiName:flow.id?metadataReference(flow.id):flow.apiName,
       flowType:flow.flowType,inputs:asBinding(previous.inputs)}});
   }else return;
   onSelectEvent(key);
 };
 const slotPicker=(slot:{key:string;label:string})=>{
   const saved=asBinding(actions[slot.key]);
   const type=String(saved.actionType??(saved.flowApiName?'Flow':''));
   const flow=metadataSelection(flows,saved.flowApiName);
   const flowName=String(flow?.apiName??saved.flowApiName??'');
   const selectedValue=type==='Flow'?(flowName?'flow:'+flowName:'flow')
     :type==='Formula'?'formula':type?'legacy:'+type:'';
   const available=supports(slot.key)&&!disabled;
   const isSelected=selectedEvent===slot.key;
   return <div key={slot.key} className={'page-action-slot'+(isSelected?' is-selected':'')}
     data-action-event={slot.key} data-design-row={slot.key==='click'||slot.key==='qtyIncrease'||slot.key==='customButton1'?1:
       slot.key==='change'||slot.key==='qtyDecrease'||slot.key==='customButton2'?2:3}>
     <label htmlFor={'page-action-'+slot.key}>{slot.label}</label>
     <select id={'page-action-'+slot.key} aria-label={slot.label+' action'}
       value={selectedValue} disabled={!available}
       onFocus={()=>{if(saved.actionType)onSelectEvent(slot.key);}}
       onChange={event=>choose(slot.key,event.target.value)}>
       <option value="">Choose action…</option>
       <option value="formula">Formula</option>
       <option value="flow">Flow</option>
       {availableFlows.map(flow=><option key={flow.apiName} value={'flow:'+flow.apiName}>
         {flow.label}</option>)}
       {type&&type!=='Formula'&&type!=='Flow'&&
         <option value={'legacy:'+type}>Existing: {legacyLabels[type]??type}</option>}
       {type==='Flow'&&flowName&&!availableFlows.some(item=>item.apiName===flowName)&&
         <option value={'flow:'+flowName}>{flowName} (saved/unavailable)</option>}
     </select>
     {(isCartSelection||hasCustomButtons&&slot.key.startsWith('customButton'))&&componentSlots.some(item=>item.key===slot.key)&&
       <button type="button" className="page-action-visibility-toggle"
         aria-label={(buttonVisibility?.[slot.key as CartButtonKey]===false?'Show ':'Hide ')+slot.label}
         aria-pressed={buttonVisibility?.[slot.key as CartButtonKey]!==false}
         title={(buttonVisibility?.[slot.key as CartButtonKey]===false?'Show ':'Hide ')+slot.label}
         disabled={disabled||!available||!onButtonVisibilityChange}
         onClick={()=>onButtonVisibilityChange?.(slot.key as CartButtonKey,
           buttonVisibility?.[slot.key as CartButtonKey]===false)}>
         {buttonVisibility?.[slot.key as CartButtonKey]===false?<EyeOff size={15}/>:<Eye size={15}/>}
       </button>}
     {isSelected&&active&&<button className="page-action-icon-remove" type="button"
       aria-label={'Remove '+slot.label+' action'} title={'Remove '+slot.label+' action'}
       disabled={disabled} onClick={()=>{
         const next={...actions};delete next[slot.key];onChange(next);onSelectEvent('');
       }}><Trash2 size={15}/></button>}
   </div>;
 };
 return <div className="page-action-ribbon-workspace page-action-compact-workspace"
   aria-label="Actions ribbon workspace">
   <section className="page-action-compact-event" aria-label="Event">
     <div className="page-action-compact-event-rows">
       {eventSlots.map(slot=>slotPicker(slot))}
     </div>
     <span className="page-action-section-caption">Event</span>
   </section>
   <div className="page-action-compact-main">
     <div className="page-action-formula-bar" role="group" aria-label="Actions formula bar">
       <span className="page-action-formula-menu" aria-hidden="true"><SlidersHorizontal size={15}/></span>
       <span className="page-action-formula-symbol" aria-hidden="true"
         title={'Formula: @Quantity + 1; @state.key := @event.value; @filter.key := @event.value; @navigate.page := "App/Page"; IF($state.Total > 500, $flow.ApplePay, $flow.CardMachine)'}>ƒx</span>
       <SmartFormulaField label="Selected action formula" fields={formulaFields}
         stateOptions={stateOptions}
         flowReferences={availableFlows.map(flow=>({apiName:flow.apiName,label:flow.label}))}
         validate={value=>isFlowActionFormula(value)?validateFlowActionFormula(value,flows):null}
         disabled={disabled||!formulaEditable}
         value={formulaValue}
         onChange={value=>{
           if(value===formulaValue)return;
           patch(selected.actionType==='Formula'?{formula:value}:{actionType:'Formula',formula:value});
         }}/>
     </div>
     <div className="page-action-compact-sections">
       <section className="page-action-compact-group page-action-compact-custom" aria-label="Component Custom">
         <div className="page-action-compact-custom-grid">
           {componentSlots.map(slot=>slotPicker(slot))}
         </div>
         <span className="page-action-section-caption">Component Custom</span>
       </section>
       {otherEvents.length>0&&<section className="page-action-compact-group page-action-compact-extra" aria-label="Other events">
         <div className="page-action-compact-rows">
           <label className="page-action-compact-mapping">
             <span>Event</span><select aria-label="Other supported event" disabled={disabled}
               value={selectedOther} onChange={event=>{setOtherEvent(event.target.value);onSelectEvent(event.target.value);}}>
               {otherEvents.map(key=><option key={key} value={key}>{eventLabels.get(key)??key}</option>)}
             </select>
           </label>
           {selectedOther&&slotPicker({key:selectedOther,label:'Action'})}
         </div>
         <span className="page-action-section-caption">Other events</span>
       </section>}
     </div>
   </div>
 </div>;
}
