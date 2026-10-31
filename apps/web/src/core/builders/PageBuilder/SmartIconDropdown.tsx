import {useState,useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AlignLeft,AlignCenter,AlignRight,ChevronDown} from 'lucide-react';

type Choice={value:string;label:string;icon:ReactNode};
const shadowStyle=(name:string)=>({boxShadow:name==='none'?'none':name==='medium'?'1px 2px 3px #64748b':'2px 4px 8px #64748b'});
const choices=(kind:'align'|'shadow'):Choice[]=>kind==='align'
 ?[{value:'left',label:'Left',icon:<AlignLeft size={16}/>},
   {value:'center',label:'Centre',icon:<AlignCenter size={16}/>},
   {value:'right',label:'Right',icon:<AlignRight size={16}/>}]
 :['none','medium','large'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1),
   icon:<span className="smart-shadow-swatch" style={shadowStyle(value)}/>}));

/** Shared keyboard-accessible icon dropdown; popup uses a portal to avoid ribbon clipping. */
export default function SmartIconDropdown({kind,value,label,disabled,onChange}:{
 kind:'align'|'shadow';value:string;label:string;disabled:boolean;onChange:(value:string)=>void;
}){
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState({top:0,left:0});
 const trigger=useRef<HTMLButtonElement>(null);
 const popup=useRef<HTMLDivElement>(null);
 const options=choices(kind);
 const selected=options.find(item=>item.value===value)??options[0];
 useEffect(()=>{
  if(!open)return;
  const reposition=()=>{
   const rect=trigger.current?.getBoundingClientRect();
   if(!rect)return;
   setPosition({top:Math.min(rect.bottom+3,window.innerHeight-42),
    left:Math.max(4,Math.min(rect.left,window.innerWidth-104))});
  };
  const outside=(event:PointerEvent)=>{
   const node=event.target as Node;
   if(!trigger.current?.contains(node)&&!popup.current?.contains(node))setOpen(false);
  };
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  reposition();
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',keyboard);
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  return()=>{
   document.removeEventListener('pointerdown',outside);
   document.removeEventListener('keydown',keyboard);
   window.removeEventListener('resize',reposition);
   window.removeEventListener('scroll',reposition,true);
  };
 },[open]);
 return <>
  <button ref={trigger} type="button" className="smart-icon-dropdown-trigger" disabled={disabled}
   aria-label={label+': '+selected.label} title={label+': '+selected.label}
   aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   {selected.icon}<ChevronDown size={9} aria-hidden="true"/>
  </button>
  {open&&createPortal(<div ref={popup} className="smart-icon-dropdown-popup" role="menu"
    aria-label={label} style={{top:position.top,left:position.left}}>
    {options.map(option=><button key={option.value} type="button" role="menuitemradio"
      aria-label={label+': '+option.label} title={option.label}
      aria-checked={option.value===value} onClick={()=>{onChange(option.value);setOpen(false);trigger.current?.focus();}}>
      {option.icon}
    </button>)}
   </div>,document.body)}
 </>;
}
