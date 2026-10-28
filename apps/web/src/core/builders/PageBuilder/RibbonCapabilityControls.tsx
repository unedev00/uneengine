import {useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal,PaintBucket,Square,Scan,Layers,Blend,Type,Bold,AlignLeft,Palette,CaseSensitive,Image,Ratio,Move,CalendarDays,CalendarRange,Clock,Table2,ChartNoAxesCombined,Grid2X2,Columns3,WrapText,PanelTop,Menu,MousePointer,Settings2} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import PageBuilderRibbonMetadataPager from './PageBuilderRibbonMetadataPager';

type PropertyDefinition=NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number];
type Values=Record<string,unknown>;
/** A compact icon-first surface backed exclusively by the component's declared metadata. */
export default function RibbonCapabilityControls({group,definitions,properties,onChange,icon}:{
 group:string;definitions:readonly PropertyDefinition[];properties:Values;onChange:(next:Values)=>void;icon:ReactNode;
}){
 const [active,setActive]=useState<string|null>(null);
 const commands:Record<string,Array<{name:string;icon:ReactNode}>>={
  Card:[{name:'Fill',icon:<PaintBucket size={16}/>},{name:'Border',icon:<Square size={16}/>},{name:'Corners',icon:<Scan size={16}/>},{name:'Shadow',icon:<Layers size={16}/>},{name:'Opacity',icon:<Blend size={16}/>}],
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
 const named=commands[group]??[{name:group,icon},{name:'Settings',icon:<Settings2 size={16}/>},{name:'Options',icon:<SlidersHorizontal size={16}/>}];
 const aliases:Record<string,RegExp>={
   colour:/color|colour|tone|palette/i,fill:/fill|surface|background/i,
   corners:/radius|corner|round/i,border:/border|stroke|outline/i,
   shadow:/shadow|elevation/i,opacity:/opacity|alpha/i,
   size:/size|fontsize|font-size|width|height/i,bold:/bold|weight/i,
   align:/align|justify|alignment/i,text:/text|caption|description|label/i,
   shape:/shape|radius|crop/i,fit:/fit|objectfit|scale/i,
   ratio:/ratio|aspect/i,position:/position|offset|left|top|anchor/i,
   time:/time|hour|minute/i,weekends:/weekend|daysofweek/i,
   header:/header|title/i,view:/view|mode/i,
   columns:/column|colspan/i,grid:/grid|column/i,wrap:/wrap|overflow/i,
   direction:/direction|orientation/i,button:/button|variant|appearance/i,
   menu:/menu|navigation|nav/i,type:/type|variant|style/i
 };
 const matched=(name:string)=>definitions.filter(def=>{
   const key=(def.propertyKey+' '+def.label).toLowerCase().replace(/[\s_-]/g,'');
   return key.includes(name.toLowerCase().replace(/[\s_-]/g,''))||Boolean(aliases[name.toLowerCase()]?.test(key));
 });
 return <div className="office-ribbon-capabilities" aria-label={group+' commands'}>
   {named.map(cmd=><button key={cmd.name} type="button" className="office-ribbon-capability-icon"
     disabled={!matched(cmd.name).length} title={matched(cmd.name).length?group+' '+cmd.name:group+' '+cmd.name+' unavailable'}
     aria-label={group+' '+cmd.name} onClick={()=>setActive(cmd.name)}><span className="office-ribbon-command-glyph">{cmd.icon}</span><span className="office-ribbon-command-label">{cmd.name}</span></button>)}
   {active&&createPortal(<div className="office-ribbon-capability-backdrop" role="presentation" onMouseDown={()=>setActive(null)}>
     <section role="dialog" aria-modal="true" aria-label={group+' '+active+' properties'} className="office-ribbon-capability-dialog"
       onMouseDown={event=>event.stopPropagation()}>
       <header><strong>{group} · {active}</strong><button type="button" onClick={()=>setActive(null)}>Close</button></header>
       <PageBuilderRibbonMetadataPager definitions={matched(active)} properties={properties} onChange={onChange}/>
     </section>
   </div>,document.body)}
 </div>;
}
