import {isComponentVisible,type ComponentVisibilityContext} from '../../components/Properties/componentVisibility';
import {isPropertyRecord,validateComponentSetting} from '../../components/Properties/componentSettingDefinitions';
import type {ComponentSettingDefinition,PropertyDevice} from '../../components/Properties/componentSettingDefinitions';

/**
 * Runtime adapter for the versioned Page Property Contract. It deliberately
 * delegates condition evaluation to the existing visibility engine, and never
 * grants Object, Field, Record, Action or Flow permissions.
 */
export type BehaviorContext = ComponentVisibilityContext;
type Row = Record<string,unknown>;
const namePattern=/^[A-Za-z][A-Za-z0-9_]{0,127}$/;
const denied=new Set(['__proto__','prototype','constructor','pagePropertyContract',
  'actionFlows','stateBindings','filters','objectApiName','records','onAction','onChange',
  'children','sessionId','pageSessionKey','componentId','key','ref','loadAsset',
  'loadCompanySettings','onLaunchFlow','onNavigate','preview','previewOnly']);
const colorPattern=/^(?:#[a-f0-9]{3}(?:[a-f0-9]{3})?(?:[a-f0-9]{2})?|transparent)$/i;
const asRows=(value:unknown):Row[]=>Array.isArray(value)?value.filter(isPropertyRecord):[];
export function pageBehaviors(properties:Readonly<Record<string,unknown>>):Row|null{
  const raw=properties.pagePropertyContract;
  return isPropertyRecord(raw)&&raw.version===1?raw:null;
}
export function behaviorMatches(rule:unknown,context:BehaviorContext):boolean{
  if(!isPropertyRecord(rule))return false;
  return isComponentVisible({visible:true,properties:{visibilityRules:rule}},context,
    Boolean(context.fields?.length&&context.readableFieldApiNames));
}
export function behaviorTabs(properties:Readonly<Record<string,unknown>>,
  tabs:readonly string[],context:BehaviorContext):string[]{
  const rules=asRows(pageBehaviors(properties)?.tabVisibility);
  return tabs.filter(tab=>{
    const rule=rules.find(row=>row.tabId===tab);
    return !rule||behaviorMatches(rule.when,context);
  });
}
export type BehaviorActionState='enabled'|'disabled'|'hidden';
export function behaviorAction(properties:Readonly<Record<string,unknown>>,
  actionId:string,context:BehaviorContext):BehaviorActionState{
  const rule=asRows(pageBehaviors(properties)?.actionVisibility)
    .find(row=>row.actionId===actionId);
  if(!rule)return 'enabled';
  if(behaviorMatches(rule.when,context))return 'enabled';
  return rule.unavailable==='Hide'?'hidden':'disabled';
}
export function behaviorAppearance(properties:Readonly<Record<string,unknown>>,
  context:BehaviorContext,fieldApiName?:string):Record<string,string>{
  const output:Record<string,string>={};
  for(const rule of asRows(pageBehaviors(properties)?.conditionalFormatting)){
    if(fieldApiName!==undefined&&rule.fieldApiName!==fieldApiName)continue;
    if(!behaviorMatches(rule.when,context)||!isPropertyRecord(rule.appearance))continue;
    for(const key of ['color','backgroundColor'] as const){
      const value=rule.appearance[key];
      if(typeof value==='string'&&colorPattern.test(value))output[key]=value;
    }
  }
  return output;
}
/** A field rule never overrides OneEngine's authorization; hidden fields are omitted. */
export function behaviorField(properties:Readonly<Record<string,unknown>>,
  fieldApiName:string,context:BehaviorContext):
  {visible:boolean;required:boolean;readOnly:boolean}|null{
  const rules=asRows(pageBehaviors(properties)?.fieldRules).filter(row=>row.fieldApiName===fieldApiName);
  if(!rules.length)return null;
  let required=false,readOnly=false;
  for(const rule of rules){
    if(rule.visibilityRules!==undefined&&!behaviorMatches(rule.visibilityRules,context))
      return {visible:false,required:false,readOnly:false};
    if(rule.behavior==='Required')required=true;
    else if(rule.behavior==='ReadOnly')readOnly=true;
  }
  return {visible:true,required:required&&!readOnly,readOnly};
}
export type BehaviorInteraction={targetComponentId:string;targetProperty:string;value:string|number|boolean|null};
/** Resolve only primitive values and declared bindable target properties. */
export function behaviorInteractions(
  sourceProperties:Readonly<Record<string,unknown>>,eventName:string,payload:unknown,
  pageState:Readonly<Record<string,unknown>>,
  targets:ReadonlyArray<{id:string;propertyDefinitions?:readonly ComponentSettingDefinition[]}>,
  device?:PropertyDevice,componentVersion?:number
):BehaviorInteraction[]{
  const actions=asRows(pageBehaviors(sourceProperties)?.interactions);
  const result:BehaviorInteraction[]=[];
  for(const row of actions){
    if(row.event!==eventName||typeof row.targetComponentId!=='string'
      ||typeof row.targetProperty!=='string'
      ||!namePattern.test(row.targetProperty)||denied.has(row.targetProperty))continue;
    const target=targets.find(item=>item.id===row.targetComponentId);
    if(!target)continue;
    const definition=target.propertyDefinitions?.find(item=>item.propertyKey===row.targetProperty
      &&item.isBindable===true&&(!device||!item.devices||item.devices.includes(device))
      &&(!componentVersion||!item.sinceVersion||item.sinceVersion<=componentVersion));
    if(!definition)continue;
    let value:unknown;
    if(row.source==='Literal')value=row.value;
    else if(row.source==='PageState'){
      const key=row.sourceKey;
      if(typeof key!=='string'||!namePattern.test(key))continue;
      value=pageState[key];
    } else if(row.source==='Event'){
      const key=row.sourceKey;
      if(key===undefined||key==='')value=payload;
      else if(typeof key==='string'&&namePattern.test(key)&&isPropertyRecord(payload))
        value=payload[key];
      else continue;
    } else continue;
    if(value!==null&&!['string','number','boolean'].includes(typeof value))continue;
    if(typeof value==='string'&&value.length>20000)continue;
    if(typeof value==='number'&&!Number.isFinite(value))continue;
    if(definition.kind==='NUMBER'||definition.kind==='CURRENCY'){
      if(typeof value!=='number')continue;
    }else if(definition.kind==='BOOLEAN'){
      if(typeof value!=='boolean')continue;
    }else if(!['TEXT','COLOR','SELECT'].includes(definition.kind)
      ||typeof value!=='string')continue;
    if(!validateComponentSetting(definition,value))continue;
    result.push({targetComponentId:target.id,targetProperty:row.targetProperty,
      value:value as string|number|boolean|null});
  }
  return result;
}
