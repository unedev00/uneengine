import {type ComponentSettingDefinition,validateComponentSettings,isPropertyRecord} from './component-property-contract.js';
const text=(propertyKey:string,label:string,required=false):ComponentSettingDefinition=>({propertyKey,label,kind:'TEXT',required});
const choice=(propertyKey:string,label:string,values:string[]):ComponentSettingDefinition=>({propertyKey,label,kind:'SELECT',choices:values.map(key=>({key,label:key}))});
export const conditionSettings:ComponentSettingDefinition[]=[
 {...choice('logic','Match conditions',['All','Any']),defaultValue:'All'},
 {propertyKey:'conditions',label:'Conditions',kind:'COLLECTION',minItems:1,maxItems:20,fields:[
  {...choice('source','Source',['Device','Record Field','Record Type','User Profile','Record Permission']),required:true},
  text('fieldApiName','Record field'),{...choice('operator','Comparison',['Equals','Not Equals','Contains','Greater Than','Less Than']),required:true},text('value','Value')
 ]}
];
/** Reusable schema fragments; consumers opt in only when they implement the behaviour.
 * These are data contracts, not a second condition/action/Flow engine. */
export const pageBehaviorSchemas:Record<string,ComponentSettingDefinition>={
 fieldRules:{propertyKey:'fieldRules',label:'Field behaviour',kind:'COLLECTION',maxItems:400,fields:[
  {...text('fieldApiName','Field',true),kind:'OBJECT_FIELD'},
  {...choice('behavior','Behaviour',['Editable','Required','ReadOnly']),defaultValue:'Editable'},
  {propertyKey:'visibilityRules',label:'Show / Hide rules',kind:'GROUP',fields:conditionSettings}
 ]},
 conditionalFormatting:{propertyKey:'conditionalFormatting',label:'Conditional appearance',kind:'COLLECTION',maxItems:100,fields:[
  text('id','Rule ID',true),{...text('fieldApiName','Field',true),kind:'OBJECT_FIELD'},
  {propertyKey:'when',label:'When',kind:'GROUP',required:true,fields:conditionSettings},
  {propertyKey:'appearance',label:'Appearance',kind:'GROUP',required:true,fields:[
   {...text('color','Text colour'),kind:'COLOR'},{...text('backgroundColor','Background colour'),kind:'COLOR'},text('icon','Icon'),text('accessibleLabel','Accessible label')
  ]}
 ]},
 validationRules:{propertyKey:'validationRules',label:'Action validation rules',kind:'COLLECTION',maxItems:100,fields:[
  text('event','Event',true),text('message','Error message',true),
  {propertyKey:'when',label:'Reject when',kind:'GROUP',required:true,fields:conditionSettings}
 ]},
 actionVisibility:{propertyKey:'actionVisibility',label:'Action rules',kind:'COLLECTION',maxItems:100,fields:[
  text('actionId','Action',true),{...choice('unavailable','When unavailable',['Hide','Disable']),defaultValue:'Disable'},
  {propertyKey:'when',label:'Show / Enable when',kind:'GROUP',required:true,fields:conditionSettings}
 ]},
 tabVisibility:{propertyKey:'tabVisibility',label:'Tab rules',kind:'COLLECTION',maxItems:100,fields:[
  text('tabId','Tab ID',true),{propertyKey:'when',label:'Show when',kind:'GROUP',required:true,fields:conditionSettings}
 ]},
 interactions:{propertyKey:'interactions',label:'Component interactions',kind:'COLLECTION',maxItems:100,fields:[
  text('event','Source event',true),text('targetComponentId','Target component',true),text('targetProperty','Target property',true),
  {...choice('source','Value source',['Event','PageState','Literal']),required:true},text('sourceKey','Source key'),text('value','Literal value')
 ]}
};
export const recordFieldSettings:ComponentSettingDefinition[]=[
 {propertyKey:'requiredOnLayout',label:'Required on this layout',kind:'BOOLEAN'},
 {propertyKey:'readOnlyOnLayout',label:'Read-only on this layout',kind:'BOOLEAN'}
];
export const recordSectionSettings:ComponentSettingDefinition[]=[
 {propertyKey:'requiredFieldApiNames',label:'Required fields',kind:'STRING_LIST',maxItems:400,maxLength:128},
 {propertyKey:'readOnlyFieldApiNames',label:'Read-only fields',kind:'STRING_LIST',maxItems:400,maxLength:128}
];
/** Reserved versioned envelope prevents accidental reinterpretation of legacy/custom keys. */
export const pagePropertyContract:ComponentSettingDefinition={
 propertyKey:'pagePropertyContract',label:'Page behaviour metadata',kind:'GROUP',schemaVersion:1,fields:[
  {propertyKey:'version',label:'Contract version',kind:'NUMBER',required:true,min:1,max:1,defaultValue:1},
  ...Object.values(pageBehaviorSchemas)
 ]
};
export function pagePropertyIssues(type:string,properties:unknown){
 if(properties===undefined)return [];
 if(!isPropertyRecord(properties))return [{path:'properties',message:'Invalid component properties'}];
 const definitions=[pagePropertyContract,
  ...(type==='Record Field'?recordFieldSettings:type==='Field Section'?recordSectionSettings:[])];
 return validateComponentSettings(definitions,properties);
}
export function requirePagePropertyContract(type:string,properties:unknown){
 const issues=pagePropertyIssues(type,properties);
 if(issues.length)throw Error('Invalid Page properties: '+issues.map(x=>x.path+': '+x.message).join('; '));
}
