import {RefreshCw,Italic,Underline} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import {availableComponentSettings,type PropertyDevice} from '../../components/Properties/componentSettingDefinitions';
import {isPresentationProperty} from '../ComponentProperties/presentationPropertyModel.mjs';
import {layoutSettings,updateLayoutSettings} from '../../pages/TemplatePageRuntime/pageComponentLayout';
import RibbonColorPalette from './RibbonColorPalette';

type Values=Record<string,unknown>;
type Definition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
const appearanceKeys=new Set(['theme','surface','tone','accentColor','glassBlur']);
const typographyKeys=new Set(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign']);
const borderKeys=new Set(['borderWidth','borderStyle']);
const included=new Set([...appearanceKeys,...typographyKeys,...borderKeys]);
const skipped=new Set(['radius','cardRadius','shadow','cardShadow','backgroundColor','borderColor',
  'textColor','opacity','padding','cardPadding','margin','gap','density','cardDensity','cardBorderWidth']);
/**
 * All previously hidden appearance properties are edited in the ribbon.
 * No modal, no alternate persistence format and no duplicate property owners.
 */
export default function PageBuilderAdvancedStyle({properties,componentType,definition,device,excludeKeys,onChange}:{
 properties:Values;componentType:string;definition?:LibraryComponentMetadata;
 device:PropertyDevice;excludeKeys:string[];onChange:(properties:Values)=>void;
}){
 const all=availableComponentSettings(definition?.propertyDefinitions??[],device,definition?.version)
   .filter(d=>isPresentationProperty(d)&&!excludeKeys.includes(d.propertyKey)&&
     !d.group&&!skipped.has(d.propertyKey)&&
     (included.has(d.propertyKey)||d.section==='Appearance'||d.section==='Design'));
 const control=(d:Definition)=>{
   const value=properties[d.propertyKey]??d.defaultValue??'';
   const change=(v:unknown)=>onChange({...properties,[d.propertyKey]:v});
   if(d.kind==='COLOR')return <div key={d.propertyKey} className="office-ribbon-extra-colour">
     <RibbonColorPalette kind="fill" label={d.label} value={String(value)} variant="capability" onChange={change}/>
   </div>;
   if(d.kind==='BOOLEAN')return <label key={d.propertyKey} className="office-ribbon-extra-field">
     <input aria-label={d.label} type="checkbox" checked={value===true} onChange={e=>change(e.target.checked)}/>
     <span title={d.label}>{d.label}</span>
   </label>;
   if(d.kind==='SELECT')return <label key={d.propertyKey} className="office-ribbon-extra-field">
     <span title={d.label}>{d.label}</span>
     <select aria-label={d.label} value={String(value)} onChange={e=>change(e.target.value)}>
       <option value="">Default</option>{d.choices?.map(choice=><option key={choice.key} value={choice.key}>{choice.label}</option>)}
     </select>
   </label>;
   if(d.kind==='NUMBER')return <label key={d.propertyKey} className="office-ribbon-extra-field">
     <span title={d.label}>{d.label}</span>
     <input type="number" aria-label={d.label} min={d.min} max={d.max}
       value={String(value)} onChange={e=>{
         const n=Number(e.target.value);if(e.target.value===''||Number.isFinite(n)&&(d.min===undefined||n>=d.min)&&(d.max===undefined||n<=d.max))
           change(e.target.value===''?undefined:n);
       }}/>
   </label>;
   return null;
 };
 const groups=[
   {name:'Appearance',defs:all.filter(d=>appearanceKeys.has(d.propertyKey))},
   {name:'Typography',defs:all.filter(d=>typographyKeys.has(d.propertyKey))},
   {name:'Borders',defs:all.filter(d=>borderKeys.has(d.propertyKey))},
   {name:'Other styles',defs:all.filter(d=>!included.has(d.propertyKey))}
 ].filter(group=>group.defs.length>0);
 const textEnabled=/text|button|label|badge|heading|paragraph|rich|input/i.test(componentType);
 const style=layoutSettings(properties,device==='Mobile'?'Phone':device==='Custom'?'Desktop':device);
 const changeStyle=(key:'fontStyle'|'textDecoration',value:string)=>
   onChange(updateLayoutSettings(properties,device==='Mobile'?'Phone':device==='Custom'?'Desktop':device,key,value));
 return <>
  {groups.map(group=><div key={group.name} className="office-ribbon-group office-ribbon-extra-appearance">
    <div className="office-ribbon-extra-grid">{group.defs.map(control)}</div>
    <span>{group.name}</span>
  </div>)}
  {textEnabled&&<div className="office-ribbon-group office-ribbon-extra-appearance">
    <div className="office-ribbon-extra-text-buttons">
      <button type="button" title="Italic" aria-label="Italic" aria-pressed={style.fontStyle==='italic'}
        onClick={()=>changeStyle('fontStyle',style.fontStyle==='italic'?'normal':'italic')}><Italic size={17}/></button>
      <button type="button" title="Underline" aria-label="Underline" aria-pressed={style.textDecoration==='underline'}
        onClick={()=>changeStyle('textDecoration',style.textDecoration==='underline'?'none':'underline')}><Underline size={17}/></button>
    </div><span>Text style</span>
  </div>}
  {properties.visualStyle!==undefined&&<div className="office-ribbon-group office-ribbon-extra-appearance">
    <button type="button" className="office-ribbon-reset-style" title="Reset legacy visual overrides"
      onClick={()=>onChange({...properties,visualStyle:{}})}><RefreshCw size={16}/> Reset overrides</button>
    <span>Reset</span>
  </div>}
 </>;
}
