import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import {sharedPropertyGroups,type UneBuilderApi,type UneBuilderTab,type UneRibbonProperty} from './uneBuilderPropertyInventory';
import UneExpressionEditor from './UneExpressionEditor';
import RibbonColorPalette from './RibbonColorPalette';
import './UneBuilderRibbon.css';

const WEEKDAYS=[['sun','Sun'],['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat']] as const;
function WeekdaysPicker({value,onChange,disabled}:{value:readonly string[];onChange:(next:string[])=>void;disabled:boolean}){
 const [open,setOpen]=useState(false),[rect,setRect]=useState<{left:number;bottom:number}>({left:0,bottom:0});
 const button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  const click=(event:PointerEvent)=>{
    const target=event.target;
    if(target instanceof Node&&!button.current?.contains(target)&&
      !(target instanceof Element&&target.closest('.une-v2-weekday-menu')))setOpen(false);
  };
  document.addEventListener('keydown',close);document.addEventListener('pointerdown',click);
  return ()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',click)};
 },[open]);
 return <>
  <button ref={button} type="button" className="une-v2-weekdays-trigger" disabled={disabled}
    aria-label="Show Days" aria-expanded={open} aria-haspopup="dialog"
    onClick={()=>{if(!open&&button.current){const r=button.current.getBoundingClientRect();setRect({left:r.left,bottom:r.bottom})}setOpen(v=>!v)}}>
    {value.length===7?'All days':value.length?value.map(day=>day.slice(0,2).toUpperCase()).join(', '):'No days'} ▾
  </button>
  {open&&createPortal(<div className="une-v2-weekday-menu" role="dialog" aria-label="Calendar displayed days"
    style={{position:'fixed',left:Math.max(4,Math.min(rect.left,window.innerWidth-192)),top:rect.bottom+4,zIndex:5200,width:186}}>
    {WEEKDAYS.map(([key,label])=><label key={key}>
       <input type="checkbox" checked={value.includes(key)}
        onChange={event=>onChange(event.target.checked?[...value,key]:value.filter(day=>day!==key))}/>
       {label}
     </label>)}
   </div>,document.body)}
 </>;
}
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
type Position={x:number;y:number;width:number;height:number};
export default function UneBuilderRibbon({tab,api,definitions,properties,onChange,objects,pageObjectApiName='',position,onPositionChange,layoutMode}:{
 tab:UneBuilderTab;api:UneBuilderApi;definitions:readonly UneRibbonProperty[];properties:Record<string,unknown>;
 onChange:(next:Record<string,unknown>)=>void;objects:readonly ObjectMetadata[];pageObjectApiName?:string;
 position?:Position;onPositionChange?:(next:Position)=>void;layoutMode:string;
}){
 const objectName=typeof properties.objectApiName==='string'&&properties.objectApiName?properties.objectApiName:pageObjectApiName;
 const set=(id:string,value:unknown)=>onChange({...properties,[id]:value});
 const control=(property:UneRibbonProperty)=>{
  const supported=property.components.includes(api);
  const kind=property.kindOverrides?.[api]??property.kind;
  const sourceKey=property.valueKeys?.[api]??property.id;
  const enabled=supported&&(kind!=='position'||layoutMode==='free-canvas'&&Boolean(position&&onPositionChange));
  const v=properties[sourceKey]??property.defaultsOverrides?.[api]??property.default??'';
  const choices=property.choicesOverrides?.[api]??property.choices;
  const name=property.label;
  let editor;
  const write=(next:unknown)=>{
    if(!enabled)return;
    if(kind==='position'&&position&&onPositionChange&&typeof next==='number')
      onPositionChange({...position,[property.id]:next});
    else if(kind!=='position')set(sourceKey,next);
  };
  if(kind==='expression')
    editor=<UneExpressionEditor value={String(v??'')} label={name} disabled={!enabled}
      onChange={next=>write(next)} objects={objects} objectApiName={objectName} field={property.field}/>;
  else if(kind==='object')
    editor=<select className="une-v2-select" aria-label={name} disabled={!enabled} value={String(v)}
      onChange={e=>write(e.target.value)}>
      <option value="">Choose Object</option>{objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label}</option>)}
    </select>;
  else if(kind==='color')
    editor=<RibbonColorPalette variant="property"
       kind={/border/i.test(property.id)?'border':/label|text|value/i.test(property.id)?'text':'fill'}
       label={name} value={typeof v==='string'?v:''} disabled={!enabled}
       onChange={next=>write(next)}/>;
  else if(kind==='number'||kind==='position')
    editor=<input className="une-v2-number" type="number" aria-label={name} disabled={!enabled}
      min={property.min??0} max={property.max}
      value={kind==='position'?number(position?.[property.id as keyof Position]):v===null||v===''?'':String(v)}
      onChange={e=>{if(e.target.value!==''){const n=Number(e.target.value);if(Number.isFinite(n))write(n);}}}/>;
  else if(kind==='boolean')
    editor=<input type="checkbox" aria-label={name} disabled={!enabled}
      checked={v===true} onChange={e=>write(e.target.checked)}/>;
  else if(kind==='shadow')
    editor=<div className="une-v2-icon-options" role="group" aria-label={name}>
      {['none','medium','large'].map((opt,i)=><button key={opt} type="button" disabled={!enabled}
       title={opt} aria-label={name+' '+opt} aria-pressed={v===opt} onClick={()=>write(opt)}>
        <span style={{boxShadow:i===0?'none':i===1?'1px 1px 2px #64748b':i===2?'2px 3px 5px #64748b':'3px 4px 9px #64748b'}}/>
       </button>)}
    </div>;
  else if(kind==='align')
    editor=<div className="une-v2-icon-options" role="group" aria-label={name}>
      {['left','center','right'].map(opt=><button key={opt} type="button" disabled={!enabled}
        title={opt} aria-label={name+' '+opt} aria-pressed={v===opt} onClick={()=>write(opt)}>
         {opt==='left'?'☰':opt==='center'?'≡':'☷'}
       </button>)}
    </div>;
  else if(kind==='choice')
    editor=<select className="une-v2-select" disabled={!enabled} aria-label={name} value={String(v)}
      onChange={e=>write(e.target.value)}>
     <option value="">Default</option>{choices?.map(opt=><option key={opt} value={opt}>{opt.replaceAll('-',' ')}</option>)}
    </select>;
  else if(kind==='weekdays')
    editor=<WeekdaysPicker value={Array.isArray(v)?v.map(String):[]} disabled={!enabled}
      onChange={next=>write(next)}/>;
  return <div key={property.id} className={'une-v2-property'+(!enabled?' is-disabled':'')}
      title={name} data-property={property.id} data-supported={supported?'true':'false'}>
    <span className="une-v2-name">{name}</span>{editor}
  </div>;
 };
 return <div className="une-v2-ribbon" aria-label="UNE application property ribbon"
    data-component={api} data-tab={tab}>
   {sharedPropertyGroups(definitions,tab).map(group=><section key={group} className="une-v2-group" aria-label={group}>
     <div className="une-v2-controls">
      {definitions.filter(prop=>prop.tab===tab&&prop.group===group).map(control)}
     </div>
     <span className="une-v2-caption">{group}</span>
   </section>)}
 </div>;
}
