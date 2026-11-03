import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,Check} from 'lucide-react';
import {choiceIcon,type Design2ChoiceKind} from './Design2RibbonIcons';

const choiceSets:Record<Design2ChoiceKind,readonly string[]>={
 placement:['top','middle','bottom','left','center','right'],
 imageFill:['center','fill','fit','stretch'],
 orientation:['horizontal','vertical']
};
/** Used exclusively by Design 2. Closed button shows the current icon; the
 * opened menu includes the approved icon and caption for each valid choice.
 * Values not supported by the SQL metadata remain visible but disabled. */
export default function Design2ChoiceDropdown({kind,label,value,choices,disabled,onChange}:{
 kind:Design2ChoiceKind;label:string;value:string;choices:readonly string[];
 disabled:boolean;onChange:(value:string)=>void;
}){
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState({top:0,left:0});
 const button=useRef<HTMLButtonElement>(null);
 const menu=useRef<HTMLDivElement>(null);
 const options=choiceSets[kind];
 const accepted=choices.length?choices:options;
 const selected=options.includes(value)?value:accepted.find(option=>options.includes(option))??options[0];
 useEffect(()=>{
  if(!open)return;
  const reposition=()=>{
   const rect=button.current?.getBoundingClientRect();if(!rect)return;
   setPosition({top:Math.max(4,Math.min(rect.bottom+3,window.innerHeight-210)),
    left:Math.max(4,Math.min(rect.left,window.innerWidth-170))});
  };
  const outside=(event:PointerEvent)=>{
   const node=event.target as Node;
   if(!button.current?.contains(node)&&!menu.current?.contains(node))setOpen(false);
  };
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}};
  reposition();document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',key);
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  return()=>{document.removeEventListener('pointerdown',outside);
   document.removeEventListener('keydown',key);
   window.removeEventListener('resize',reposition);
   window.removeEventListener('scroll',reposition,true);};
 },[open]);
 return <>
  <button ref={button} type="button" disabled={disabled} className="design2-choice-trigger"
    aria-label={label+': '+selected} title={label+': '+selected}
    aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)}>
   {choiceIcon(kind,selected)}<ChevronDown size={10} aria-hidden="true"/>
  </button>
  {open&&createPortal(<div ref={menu} className="design2-choice-popup"
    role="menu" aria-label={label} style={position}>
    {options.map(option=><button key={option} type="button" role="menuitemradio"
      aria-checked={option===value} disabled={!accepted.includes(option)}
      title={!accepted.includes(option)?'Not supported by this property':option}
      onClick={()=>{onChange(option);setOpen(false);button.current?.focus();}}>
      {choiceIcon(kind,option)}<span>{option[0].toUpperCase()+option.slice(1)}</span>
      {option===value&&<Check size={15} aria-hidden="true"/>}
    </button>)}
   </div>,document.body)}
 </>;
}
