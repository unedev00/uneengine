import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, RefreshCw, Eye } from 'lucide-react';
import RibbonColorPalette from './RibbonColorPalette';
import ComponentPresentationProperties from '../ComponentProperties/ComponentPresentationProperties';
import {availableComponentSettings,type PropertyDevice} from '../../components/Properties/componentSettingDefinitions';
import {isPresentationProperty,presentationSection} from '../ComponentProperties/presentationPropertyModel.mjs';
import {updateLayoutSettings,layoutSettings,type LayoutSettingKey} from '../../pages/TemplatePageRuntime/pageComponentLayout';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';

type Properties=Record<string,unknown>;
type Props={properties:Properties;componentType:string;definition?:LibraryComponentMetadata;device:PropertyDevice;onChange:(next:Properties)=>void};
const object=(v:unknown):Properties=>v&&typeof v==='object'&&!Array.isArray(v)?v as Properties:{};
const mode=(v:string):'Base'|'Desktop'|'Tablet'|'Phone'=>v==='Mobile'?'Phone':v==='Tablet'?'Tablet':v==='Desktop'?'Desktop':'Base';
const num=(v:unknown,fallback:number)=>typeof v==='number'?v:Number(v??fallback);
const has=(definition:LibraryComponentMetadata|undefined,key:string)=>Boolean(definition?.propertyDefinitions?.some(d=>d.propertyKey===key));

export function RibbonDesign({properties,componentType,definition,device,onChange}:Props){
  const visual=object(properties.visualStyle);
  const responsive=object(object(properties.layoutResponsive)[mode(device)]);
  const write=(key:'color'|'backgroundColor'|'borderColor'|'accentColor',value:string)=>{
    const metadataKey=key==='color'?'textColor':key;
    if(has(definition,metadataKey)){onChange({...properties,[metadataKey]:value});return;}
    if(key==='accentColor')return;
    if(mode(device)!=='Base'&&mode(device)!=='Desktop'&&(key==='backgroundColor'||key==='borderColor')){
      onChange(updateLayoutSettings(properties,mode(device),key,value));return;
    }
    onChange({...properties,visualStyle:{...visual,[key]:value}});
  };
  const value=(key:'color'|'backgroundColor'|'borderColor'|'accentColor')=>{
    const metadataKey=key==='color'?'textColor':key;
    return String(properties[metadataKey]??responsive[key]??visual[key]??(key==='color'?'#111827':'#ffffff'));
  };
  const settings=availableComponentSettings(definition?.propertyDefinitions??[],device,definition?.version)
    .filter(d=>isPresentationProperty(d)&&['theme','surface','tone'].includes(d.propertyKey));
  return <>
    <div className="office-ribbon-group office-ribbon-icon-group office-ribbon-colour-group">
      <div className="office-ribbon-icon-line">
        <RibbonColorPalette kind="text" label="Text" value={value('color')} onChange={v=>write('color',v)}/>
        <RibbonColorPalette kind="fill" label="Background / Fill" value={value('backgroundColor')} onChange={v=>write('backgroundColor',v)}/>
        <RibbonColorPalette kind="border" label="Border" value={value('borderColor')} onChange={v=>write('borderColor',v)}/>
        {has(definition,'accentColor')&&<RibbonColorPalette kind="fill" label="Accent" value={value('accentColor')} onChange={v=>write('accentColor',v)}/>}
      </div><span>Colours</span>
    </div>
    {settings.length>0&&<div className="office-ribbon-inline-options office-ribbon-appearance-single">
      <ComponentPresentationProperties definitions={settings} properties={properties} onChange={onChange}/>
    </div>}
  </>;
}

export function RibbonFormat({properties,componentType,definition,device,onChange}:Props){
  const visual=object(properties.visualStyle);
  const activeDevice=mode(device);
  const style=layoutSettings(properties,activeDevice==='Base'?'Desktop':activeDevice);
  const setVisual=(key:string,value:unknown)=>{
    const metadataKey=key==='borderRadius'?'radius':key;
    if(has(definition,metadataKey)){onChange({...properties,[metadataKey]:value});return;}
    onChange({...properties,visualStyle:{...visual,[key]:value}});
  };
  const setLayout=(key:LayoutSettingKey,value:string|number|null)=>onChange(updateLayoutSettings(properties,mode(device),key,value));
  const supportedText=/text|button|label|badge|heading|paragraph|rich|input/i.test(componentType);
  const radius=num(properties.radius??visual.borderRadius,8);
  const border=num(properties.borderWidth??visual.borderWidth,0);
  const padding=num(properties.padding??visual.padding,0);
  const opacity=num(style.opacity??properties.opacity,100);
  const fontSize=num(style.fontSize??properties.fontSize,16);
  const weight=num(style.fontWeight??properties.fontWeight,400);
  const remaining=availableComponentSettings(definition?.propertyDefinitions??[],device,definition?.version)
    .filter(d=>isPresentationProperty(d)&&presentationSection(d)!=='Content'&&presentationSection(d)!=='Layout'&&!/^(?:theme|surface|tone|textColor|accentColor|backgroundColor|borderColor|fontFamily|fontWeight|fontSize|textAlign|borderWidth|borderRadius|radius|padding|margin|gap|opacity|minWidth|maxWidth|minHeight|maxHeight)$/.test(d.propertyKey));
  return <>
    {supportedText&&<div className="office-ribbon-group office-ribbon-typography"><div className="office-ribbon-stack">
      <label className="office-ribbon-inline-field">Text size <input type="number" aria-label="Text size" min={8} max={96} value={fontSize} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=8&&n<=96)setLayout('fontSize',n);}}/></label>
      <div className="office-ribbon-icon-line">
        <button type="button" className="office-ribbon-icon-button" title="Bold" aria-label="Bold" aria-pressed={weight>=700} onClick={()=>setLayout('fontWeight',weight>=700?'400':'700')}><Bold size={16}/></button>
        <button type="button" className="office-ribbon-icon-button" title="Italic" aria-label="Italic" aria-pressed={style.fontStyle==='italic'} onClick={()=>setLayout('fontStyle',style.fontStyle==='italic'?'normal':'italic')}><Italic size={16}/></button>
        <button type="button" className="office-ribbon-icon-button" title="Underline" aria-label="Underline" aria-pressed={style.textDecoration==='underline'} onClick={()=>setLayout('textDecoration',style.textDecoration==='underline'?'none':'underline')}><Underline size={16}/></button>
      </div>
      <div className="office-ribbon-icon-line">{([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([value,Icon])=><button key={value} className="office-ribbon-icon-button" type="button" title={'Text align '+value} aria-label={'Text align '+value} aria-pressed={style.textAlign===value} onClick={()=>setLayout('textAlign',value)}><Icon size={16}/></button>)}</div>
    </div><span>Typography</span></div>}
    <div className="office-ribbon-group office-ribbon-corners"><div className="office-ribbon-corner-grid">
      {([0,4,6,8,12,14,16,28,64] as const).map(n=><button className="office-ribbon-icon-button" type="button" key={n} title={'Corners '+n+'px'} aria-label={'Corners '+n+'px'} aria-pressed={radius===n} onClick={()=>setVisual('borderRadius',n)}><span className="ribbon-corner-shape" style={{borderRadius:n===64?'50%':Math.min(10,n/3)}}/></button>)}
    </div><span>Corners</span></div>
    <div className="office-ribbon-group"><div className="office-ribbon-stack">
      <div className="office-ribbon-icon-line">{([0,1,2,4] as const).map(n=><button className="office-ribbon-icon-button" type="button" key={n} title={'Border width '+n+'px'} aria-label={'Border width '+n+'px'} aria-pressed={border===n} onClick={()=>setVisual('borderWidth',n)}><span className="ribbon-stroke" style={{borderBottomWidth:Math.max(1,n),borderBottomStyle:n===0?'dashed':'solid'}}/></button>)}</div>
      <label className="office-ribbon-inline-field">Padding <input type="number" min={0} max={128} aria-label="Padding" value={padding} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=128)setVisual('padding',n);}}/></label>
      <button className="office-ribbon-icon-button" type="button" title="Reset appearance" aria-label="Reset appearance" onClick={()=>onChange({...properties,visualStyle:{}})}><RefreshCw size={16}/></button>
    </div><span>Borders & spacing</span></div>
    <div className="office-ribbon-group"><div className="office-ribbon-stack">
      <label className="office-ribbon-inline-field">Opacity <input type="number" aria-label="Opacity percent" min={0} max={100} value={opacity} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=100)setLayout('opacity',n);}}/></label>
    </div><span>Effects</span></div>
    {remaining.length>0&&<div className="office-ribbon-inline-options"><ComponentPresentationProperties definitions={remaining} properties={properties} onChange={onChange}/></div>}
  </>;
}

export function RibbonResponsive({properties,onChange,onVisibilityRules}:Props&{onVisibilityRules:()=>void}){
  return <div className="office-ribbon-group"><div className="office-ribbon-stack">
    <button type="button" onClick={onVisibilityRules}><Eye size={16}/> Visibility rules</button>
    {([['hideOnPhone','Mobile'],['hideOnTablet','Tablet'],['hideOnDesktop','Desktop']] as const).map(([key,label])=>
      <label key={key} className="office-ribbon-checkbox"><input type="checkbox" checked={properties[key]!==true} onChange={e=>onChange({...properties,[key]:!e.target.checked})}/> Show on {label}</label>)}
  </div><span>Devices & rules</span></div>;
}
