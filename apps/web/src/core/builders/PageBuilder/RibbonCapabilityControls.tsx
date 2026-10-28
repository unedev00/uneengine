import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal,PaintBucket,Square,Scan,Layers,Blend,Type,Bold,AlignLeft,AlignCenter,AlignRight,Palette,CaseSensitive,Image,Ratio,Move,CalendarDays,CalendarRange,Clock,Table2,ChartNoAxesCombined,Grid2X2,Columns3,WrapText,PanelTop,Menu,MousePointer,Settings2} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import PageBuilderRibbonMetadataPager from './PageBuilderRibbonMetadataPager';
import RibbonColorPalette from './RibbonColorPalette';

type PropertyDefinition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
type Values=Record<string,unknown>;
type Command={name:string;icon:ReactNode};
const commandGroups:Record<string,Command[]>={
  Surface:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Border',icon:<Square size={16}/>},{name:'Radius',icon:<Scan size={16}/>},{name:'Shadow',icon:<Layers size={16}/>},{name:'Opacity',icon:<Blend size={16}/>}],
  Event:[{name:'Text',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Border',icon:<Square size={16}/>},{name:'Size',icon:<Ratio size={16}/>}],
  Size:[{name:'Width',icon:<Ratio size={16}/>},{name:'Height',icon:<Ratio size={16}/>},{name:'Min',icon:<Scan size={16}/>}],
  Position:[{name:'Position',icon:<Move size={16}/>},{name:'Align',icon:<AlignLeft size={16}/>}],
  Spacing:[{name:'Padding',icon:<Grid2X2 size={16}/>},{name:'Margin',icon:<Square size={16}/>},{name:'Gap',icon:<Columns3 size={16}/>}],
  Component:[{name:'Columns',icon:<Columns3 size={16}/>},{name:'Fit',icon:<Image size={16}/>},{name:'Wrap',icon:<WrapText size={16}/>}],
  Card:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Border',icon:<Square size={16}/>},{name:'Corners',icon:<Scan size={16}/>},{name:'Shadow',icon:<Layers size={16}/>},{name:'Stroke',icon:<Square size={16}/>}],
  Heading:[{name:'Size',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Bold',icon:<Bold size={16}/>},{name:'Align',icon:<AlignLeft size={16}/>}],
  'Supporting text':[{name:'Size',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Bold',icon:<Bold size={16}/>},{name:'Align',icon:<AlignLeft size={16}/>}],
  Badge:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Text',icon:<CaseSensitive size={16}/>},{name:'Border',icon:<Square size={16}/>}],
  Image:[{name:'Fit',icon:<Image size={16}/>},{name:'Shape',icon:<Square size={16}/>},{name:'Ratio',icon:<Ratio size={16}/>},{name:'Position',icon:<Move size={16}/>}],
  Calendar:[{name:'View',icon:<CalendarDays size={16}/>},{name:'Header',icon:<PanelTop size={16}/>},{name:'Time',icon:<Clock size={16}/>},{name:'Weekends',icon:<CalendarRange size={16}/>}],
  Chart:[{name:'Type',icon:<ChartNoAxesCombined size={16}/>},{name:'Colour',icon:<Palette size={16}/>},{name:'Size',icon:<Ratio size={16}/>}],
  Table:[{name:'Table',icon:<Table2 size={16}/>},{name:'Columns',icon:<Columns3 size={16}/>}],
  Container:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Grid',icon:<Grid2X2 size={16}/>},{name:'Wrap',icon:<WrapText size={16}/>}],
  Navigation:[{name:'Menu',icon:<Menu size={16}/>},{name:'Direction',icon:<Move size={16}/>}],
  Button:[{name:'Button',icon:<MousePointer size={16}/>},{name:'Colour',icon:<Palette size={16}/>}],
  Text:[{name:'Text',icon:<Type size={16}/>},{name:'Colour',icon:<Palette size={16}/>}]
};
const aliases:Record<string,RegExp>={
  colour:/color|colour|tone|palette/i,fill:/fill|surface|background/i,
  corners:/radius|corner|round/i,radius:/radius|corner|round/i,border:/border|stroke|outline/i,
  shadow:/shadow|elevation/i,opacity:/opacity|alpha/i,
  size:/size|fontsize|font-size|width|height/i,width:/width|colspan/i,height:/height|rowspan/i,min:/minheight|minwidth/i,bold:/bold|weight/i,
  align:/align|justify|alignment/i,text:/text|caption|description|label/i,
  shape:/shape|radius|crop/i,fit:/fit|objectfit|scale/i,
  ratio:/ratio|aspect/i,position:/position|offset|left|top|anchor/i,
  time:/time|hour|minute/i,weekends:/weekend|daysofweek/i,
  header:/header|title/i,view:/view|mode/i,
  columns:/column|colspan/i,grid:/grid|column/i,wrap:/wrap|overflow/i,
  padding:/padding|inset/i,margin:/margin/i,gap:/gap|spacing/i,direction:/direction|orientation/i,button:/button|variant|appearance/i,
  menu:/menu|navigation|nav/i,type:/type|variant|style/i
};
const matches=(definitions:readonly PropertyDefinition[],name:string)=>definitions.filter(def=>{
  const key=(def.propertyKey+' '+def.label).toLowerCase().replace(/[\s_-]/g,'');
  return key.includes(name.toLowerCase().replace(/[\s_-]/g,''))||Boolean(aliases[name.toLowerCase()]?.test(key));
});
/** Use declared COLOR metadata to choose the appropriate part. Never write an invented style key. */
function colourFor(definitions:readonly PropertyDefinition[],command:string){
  const colours=definitions.filter(def=>def.kind==='COLOR');
  if(!colours.length)return undefined;
  const patterns:Record<string,RegExp>={
    Fill:/background|fill|surface/i,Border:/border|stroke|outline/i,
    Text:/text|font/i,Colour:/color|colour/i
  };
  const pattern=patterns[command];
  if(!pattern)return undefined;
  if(command==='Colour')return colours.find(def=>!/background|border|fill|surface/i.test(def.propertyKey))??colours[0];
  return colours.find(def=>pattern.test(def.propertyKey))??(command==='Text'?colours[0]:undefined);
}
function propertyFor(definitions:readonly PropertyDefinition[],kind:'size'|'weight'|'align'|'lines'){
  const pattern=kind==='size'?/fontSize|textSize/i:kind==='weight'?/fontWeight|textWeight/i:kind==='align'?/textAlign|textAlignment/i:/lineLimit|maxLines/i;
  return definitions.find(def=>pattern.test(def.propertyKey)&&
    (kind==='size'||kind==='lines'?def.kind==='NUMBER':def.kind==='SELECT'));
}
function SizeSelect({definition,properties,onChange,label}:{
  definition:PropertyDefinition;properties:Values;onChange:(next:Values)=>void;label:string;
}){
  const current=Number(properties[definition.propertyKey]??definition.defaultValue??16);
  const values=[...new Set([8,9,10,11,12,14,16,18,20,22,24,26,28,32,36,48,72,96,...(Number.isFinite(current)?[current]:[])])].sort((a,b)=>a-b);
  return <label className="office-ribbon-compact-size" title={label+' font size'}>
    <select aria-label={label+' font size'} value={Number.isFinite(current)?current:16}
      onChange={event=>onChange({...properties,[definition.propertyKey]:Number(event.target.value)})}>
      {values.map(size=><option key={size} value={size}>{size}</option>)}
    </select><span>Size</span>
  </label>;
}
/** Reusable bounded, metadata-backed Excel-style numeric selector. */
function DirectNumber({definition,properties,onChange,label,icon}:{
 definition:PropertyDefinition;properties:Values;onChange:(next:Values)=>void;label:string;icon?:ReactNode;
}){
 const current=Number(properties[definition.propertyKey]??definition.defaultValue??0);
 const min=definition.min??0,max=definition.max??128;
 const choices=[...new Set([0,1,2,3,4,6,8,10,12,16,20,24,28,32,40,48,64,80,96,100,120,128,...(Number.isFinite(current)?[current]:[])])]
  .filter(n=>n>=min&&n<=max).sort((a,b)=>a-b);
 return <label className="office-ribbon-direct-number" title={definition.label}>
  {icon&&<span className="office-ribbon-command-glyph">{icon}</span>}
  <select aria-label={definition.label} value={Number.isFinite(current)?current:''}
    onChange={e=>onChange({...properties,[definition.propertyKey]:Number(e.target.value)})}>
    {choices.map(n=><option key={n} value={n}>{n}</option>)}
  </select><span className="office-ribbon-command-label">{label}</span>
 </label>;
}
function SpacingControls({definitions,properties,onChange}:{
 definitions:readonly PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;
}){
 const items=[{key:'padding',label:'Padding',icon:<Grid2X2 size={15}/>},
  {key:'cardPadding',label:'Card padding',icon:<Grid2X2 size={15}/>},
  {key:'margin',label:'Margin',icon:<Square size={15}/>},
  {key:'gap',label:'Gap',icon:<Columns3 size={15}/>}];
 return <div className="office-ribbon-direct-spacing" aria-label="Spacing controls">
  {items.map(item=>{
   const definition=definitions.find(d=>d.propertyKey===item.key&&d.kind==='NUMBER');
   return definition?<DirectNumber key={item.key} definition={definition} properties={properties}
     onChange={onChange} label={item.label} icon={item.icon}/>:null;
  })}
 </div>;
}
function WeightOptions({definition,properties,onChange,label}:{
  definition:PropertyDefinition;properties:Values;onChange:(next:Values)=>void;label:string;
}){
  return <div className="office-ribbon-weight-direct" role="group" aria-label={label+' weight'}>
    {(definition.choices??[]).map(choice=><button key={choice.key} type="button"
      title={label+' '+choice.label} aria-label={label+' weight '+choice.label}
      aria-pressed={String(properties[definition.propertyKey]??definition.defaultValue??'')===String(choice.key)}
      onClick={()=>onChange({...properties,[definition.propertyKey]:choice.key})}
      style={{fontWeight:Number(choice.key)||400}}>B</button>)}
  </div>;
}
function AlignmentOptions({definition,properties,onChange,label}:{
  definition:PropertyDefinition;properties:Values;onChange:(next:Values)=>void;label:string;
}){
  const allowed=new Set((definition.choices??[]).map(choice=>String(choice.key).toLowerCase()));
  return <div className="office-ribbon-align-direct" role="group" aria-label={label+' alignment'}>
    {([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([alignment,Icon])=>
      <button key={alignment} type="button" title={label+' align '+alignment}
        aria-label={label+' align '+alignment} disabled={allowed.size>0&&!allowed.has(alignment)}
        aria-pressed={String(properties[definition.propertyKey]??definition.defaultValue??'').toLowerCase()===alignment}
        onClick={()=>onChange({...properties,[definition.propertyKey]:alignment})}>
        <Icon size={16}/>
      </button>)}
  </div>;
}
/** Anchored, nonmodal editing surface: clicking the command opens its actual settings immediately. */
function CommandPopover({group,command,definitions,properties,onChange}:{
  group:string;command:Command;definitions:PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;
}){
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState({top:0,left:0});
  const trigger=useRef<HTMLButtonElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const simple=definitions.length===1&&['SELECT','NUMBER'].includes(definitions[0].kind);
  const property=definitions[0];
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{
      if(!panel.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    const dismiss=()=>setOpen(false);
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    window.addEventListener('resize',dismiss);
    window.addEventListener('scroll',dismiss,true);
    return()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',escape);
      window.removeEventListener('resize',dismiss);
      window.removeEventListener('scroll',dismiss,true);
    };
  },[open]);
  const toggle=()=>{
    if(!open&&trigger.current){
      const rect=trigger.current.getBoundingClientRect();
      setPosition({top:window.innerHeight-rect.bottom>240?rect.bottom+5:Math.max(8,rect.top-245),
        left:Math.max(8,Math.min(rect.left,window.innerWidth-370))});
    }
    setOpen(value=>!value);
  };
  return <>
    <button ref={trigger} type="button" className="office-ribbon-capability-icon"
      disabled={!definitions.length} title={definitions.length?group+' '+command.name:group+' '+command.name+' unavailable'}
      aria-label={group+' '+command.name} aria-expanded={open} aria-haspopup="dialog" onClick={toggle}>
      <span className="office-ribbon-command-glyph">{command.icon}</span><span className="office-ribbon-command-label">{command.name}</span>
    </button>
    {open&&createPortal(<div ref={panel} className={'office-ribbon-capability-dialog office-ribbon-capability-popover'+(simple?' is-compact':'')}
      role="dialog" aria-label={group+' '+command.name+' settings'} style={{top:position.top,left:position.left}}>
      {simple?<label className="office-ribbon-direct-property">
        <span>{property.label}</span>
        {property.kind==='SELECT'?<select aria-label={property.label}
          value={String(properties[property.propertyKey]??property.defaultValue??'')}
          onChange={event=>{onChange({...properties,[property.propertyKey]:event.target.value});setOpen(false);}}>
          <option value="">Default</option>
          {(property.choices??[]).map(choice=><option key={choice.key} value={choice.key}>{choice.label}</option>)}
        </select>:<input type="number" aria-label={property.label} min={property.min} max={property.max}
          value={String(properties[property.propertyKey]??property.defaultValue??'')}
          onChange={event=>{const input=event.target.value;const n=Number(input);
            if(input===''||Number.isFinite(n))onChange({...properties,[property.propertyKey]:input===''?undefined:n});}}/>}
      </label>:<>
        <header><strong>{group} · {command.name}</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Close settings">×</button></header>
        <PageBuilderRibbonMetadataPager definitions={definitions} properties={properties} onChange={onChange}/>
      </>}
    </div>,document.body)}
  </>;
}
/** Update an authored legacy page-style layer only when it already owns the
 * same property. This prevents a stale visual/responsive override concealing
 * a direct ribbon edit, without authoring overrides on other devices. */
function reconcileAuthoredLayers(before:Values,after:Values,device:string):Values{
 const styleKeys:Record<string,string>={
   radius:'borderRadius',backgroundColor:'backgroundColor',borderColor:'borderColor',
   textColor:'color',padding:'padding',margin:'margin',gap:'gap'
 };
 const changed=Object.entries(styleKeys).filter(([key])=>before[key]!==after[key]);
 if(!changed.length)return after;
 const next={...after};
 const existingVisual=before.visualStyle&&typeof before.visualStyle==='object'&&!Array.isArray(before.visualStyle)
   ?before.visualStyle as Values:{};
 const visual={...existingVisual};
 let changedVisual=false;
 const existingBase=before.layoutStyle&&typeof before.layoutStyle==='object'&&!Array.isArray(before.layoutStyle)
   ?before.layoutStyle as Values:{};
 const base={...existingBase};
 let changedBase=false;
 const responsive=before.layoutResponsive&&typeof before.layoutResponsive==='object'&&!Array.isArray(before.layoutResponsive)
   ?before.layoutResponsive as Values:{};
 const activeDevice=device==='Mobile'?'Phone':device==='Custom'?'Desktop':device;
 const active=responsive[activeDevice]&&typeof responsive[activeDevice]==='object'&&!Array.isArray(responsive[activeDevice])
   ?responsive[activeDevice] as Values:{};
 const override={...active};
 let changedOverride=false;
 for(const [key,visualKey] of changed){
   if(existingVisual[visualKey]!==undefined){visual[visualKey]=after[key];changedVisual=true;}
   if(existingBase[visualKey]!==undefined){base[visualKey]=after[key];changedBase=true;}
   if(active[visualKey]!==undefined){override[visualKey]=after[key];changedOverride=true;}
 }
 if(changedVisual)next.visualStyle=visual;
 if(changedBase)next.layoutStyle=base;
 if(changedOverride)next.layoutResponsive={...responsive,[activeDevice]:override};
 return next;
}
/** Icon commands and direct controls use the same registered, persisted property definitions. */
export default function RibbonCapabilityControls({group,definitions,properties,onChange,icon,device='Desktop'}:{
  group:string;definitions:readonly PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;icon:ReactNode;device?:string;
}){
  const update=(next:Values)=>onChange(reconcileAuthoredLayers(properties,next,device));
  const named=commandGroups[group]??[{name:group,icon},{name:'Settings',icon:<Settings2 size={16}/>},{name:'Options',icon:<SlidersHorizontal size={16}/>}];
  if(group==='Spacing')return <SpacingControls definitions={definitions} properties={properties} onChange={update}/>;
  const colourCommand=(name:string)=>{
    const definition=colourFor(definitions,name);
    if(!definition)return null;
    const kind=name==='Border'?'border':name==='Fill'?'fill':'text';
    return <RibbonColorPalette key={name} kind={kind} label={name} variant="capability"
      value={String(properties[definition.propertyKey]??definition.defaultValue??'')}
      onChange={value=>update({...properties,[definition.propertyKey]:value})}/>;
  };
  const renderCommand=(command:Command)=>{
    if((group==='Surface'&&command.name==='Radius')||(group==='Card'&&command.name==='Corners')){
      const key=group==='Card'?'cardRadius':'radius';
      const definition=definitions.find(d=>d.propertyKey===key&&d.kind==='NUMBER');
      if(definition)return <DirectNumber key={key} definition={definition} properties={properties}
        onChange={update} label={group==='Card'?'Card radius':'Radius'} icon={<Scan size={16}/>}/>;
    }
    if(group==='Card'&&command.name==='Stroke'){
      const definition=definitions.find(d=>d.propertyKey==='cardBorderWidth'&&d.kind==='NUMBER');
      if(definition)return <DirectNumber key="cardBorderWidth" definition={definition}
        properties={properties} onChange={update} label="Border width" icon={<Square size={16}/>}/>;
    }
    if(['Fill','Border','Colour','Text'].includes(command.name)){
      const direct=colourCommand(command.name);
      if(direct)return direct;
    }
    return <CommandPopover key={command.name} group={group} command={command}
      definitions={matches(definitions,command.name)} properties={properties} onChange={update}/>;
  };
  const size=propertyFor(definitions,'size');
  const weight=propertyFor(definitions,'weight');
  const align=propertyFor(definitions,'align');
  const lines=propertyFor(definitions,'lines');
  const typography=(group==='Heading'||group==='Supporting text'||group==='Text')&&Boolean(size||weight||align);
  if(typography)return <div className="office-ribbon-capabilities office-ribbon-typography-capabilities" aria-label={group+' commands'}>
    <div className="office-ribbon-typography-primary">
      {size&&<SizeSelect definition={size} properties={properties} onChange={update} label={group}/>}
      {colourCommand('Colour')}
      {lines&&<DirectNumber definition={lines} properties={properties} onChange={update}
        label="Lines" icon={<WrapText size={16}/>}/>}
    </div>
    {align&&<AlignmentOptions definition={align} properties={properties} onChange={update} label={group}/>}
    {weight&&<WeightOptions definition={weight} properties={properties} onChange={update} label={group}/>}
  </div>;
  if(group==='Badge'&&(size||weight))return <div className="office-ribbon-capabilities office-ribbon-typography-capabilities" aria-label={group+' commands'}>
    <div className="office-ribbon-typography-primary">
      {colourCommand('Fill')}{colourCommand('Text')}
      {size&&<SizeSelect definition={size} properties={properties} onChange={update} label={group}/>}
    </div>
    {matches(definitions,'Border').length>0&&<div className="office-ribbon-typography-secondary">
      {renderCommand({name:'Border',icon:<Square size={16}/>})}
    </div>}
    {weight&&<WeightOptions definition={weight} properties={properties} onChange={update} label={group}/>}
  </div>;
  return <div className="office-ribbon-capabilities" aria-label={group+' commands'}>
    {named.map(renderCommand)}
  </div>;
}
