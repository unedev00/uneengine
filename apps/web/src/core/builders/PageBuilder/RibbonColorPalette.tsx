import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Baseline,ChevronDown,PaintBucket,Square} from 'lucide-react';

type ColourKind='text'|'fill'|'border';
const themeColumns=[
  ['#ffffff','#f2f2f2','#d9d9d9','#bfbfbf','#a6a6a6','#808080'],
  ['#111111','#595959','#404040','#262626','#171717','#000000'],
  ['#e7e6e6','#d0cece','#aeaaaa','#757171','#3a3838','#222222'],
  ['#44546a','#d6dce4','#acb9ca','#8497b0','#5b6f8e','#333f50'],
  ['#4472c4','#d9e2f3','#b4c6e7','#8eaadb','#2f5597','#203864'],
  ['#ed7d31','#fbe5d6','#f8cbad','#f4b183','#c65911','#843c0c'],
  ['#a5a5a5','#ededed','#d9d9d9','#bfbfbf','#7f7f7f','#525252'],
  ['#ffc000','#fff2cc','#ffe699','#ffd966','#bf9000','#806000'],
  ['#5b9bd5','#ddebf7','#bdd7ee','#9dc3e6','#2e75b6','#1f4e78'],
  ['#70ad47','#e2f0d9','#c6e0b4','#a9d18e','#548235','#375623']
];
const standard=['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0'];

export default function RibbonColorPalette({kind,label,value,onChange,variant='icon'}:{
  kind:ColourKind;label:string;value:string;onChange:(color:string)=>void;
  variant?:'icon'|'capability';
}){
  const [open,setOpen]=useState(false);
  const [customHex,setCustomHex]=useState(value);
  const [position,setPosition]=useState({top:0,left:0});
  const trigger=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  const icon=kind==='text'?<Baseline size={17}/>:kind==='fill'?<PaintBucket size={17}/>:<Square size={17}/>;
  const choose=(colour:string)=>{onChange(colour);setOpen(false);trigger.current?.focus();};
  useEffect(()=>setCustomHex(value),[value]);
  const toggle=()=>{
    if(!open&&trigger.current){
      const rect=trigger.current.getBoundingClientRect();
      const paletteHeight=390;
      setPosition({top:window.innerHeight-rect.bottom>=paletteHeight?rect.bottom+5:Math.max(8,rect.top-paletteHeight-5),
        left:Math.max(8,Math.min(rect.left,window.innerWidth-371))});
    }
    setOpen(current=>!current);
  };
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{
      if(!popup.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setOpen(false);
    };
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    const dismiss=()=>setOpen(false);
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',key);
    window.addEventListener('resize',dismiss);
    window.addEventListener('scroll',dismiss,true);
    return()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',key);
      window.removeEventListener('resize',dismiss);
      window.removeEventListener('scroll',dismiss,true);
    };
  },[open]);
  const swatch=(colour:string,key:string)=>(
    <button key={key} type="button" className={'office-ribbon-swatch'+(value.toLowerCase()===colour?' selected':'')}
      title={colour} aria-label={label+': '+colour} aria-pressed={value.toLowerCase()===colour}
      style={{backgroundColor:colour==='transparent'?'#fff':colour}}
      onClick={()=>choose(colour)}/>
  );
  return <>
    <button ref={trigger} type="button" className={variant==='capability'?'office-ribbon-capability-icon office-ribbon-direct-colour':'office-ribbon-icon-button office-ribbon-colour-command'}
      title={label} aria-label={label+' colour palette'} aria-expanded={open} aria-haspopup="dialog"
      onClick={toggle}>
      <span className="office-ribbon-command-glyph">{icon}<span className="office-ribbon-colour-underline" style={{background:value||'#111827'}}/></span>
      {variant==='capability'?<span className="office-ribbon-command-label">{label}</span>:<ChevronDown size={11}/>}
    </button>
    {open&&createPortal(<div ref={popup} className="office-ribbon-colour-palette" role="dialog"
      aria-label={label+' colour palette'} style={{top:position.top,left:position.left}}>
      <div className="office-ribbon-palette-heading">Theme colours</div>
      <div className="office-ribbon-palette-theme">
        {themeColumns.map((column,index)=><div className="office-ribbon-palette-column" key={index}>
          {column.map((colour,row)=>swatch(colour,index+'-'+row))}
        </div>)}
      </div>
      <div className="office-ribbon-palette-heading">Standard colours</div>
      <div className="office-ribbon-palette-standard">
        {standard.map(colour=>swatch(colour,colour))}
      </div>
      <div className="office-ribbon-palette-hex">
        <label>HEX <input type="text" aria-label={'HEX for '+label} value={customHex} placeholder="#RRGGBB" maxLength={7}
          onChange={event=>setCustomHex(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&/^#[0-9a-f]{6}$/i.test(customHex))choose(customHex);}}/></label>
        <button type="button" disabled={!/^#[0-9a-f]{6}$/i.test(customHex)} onClick={()=>choose(customHex)}>Apply</button>
      </div>
      <div className="office-ribbon-palette-footer">
        <button type="button" onClick={()=>choose(kind==='text'?'':'transparent')}>
          {kind==='text'?'Automatic':kind==='fill'?'No fill':'No colour'}
        </button>
        <label>More colours… <input type="color" aria-label={'Custom '+label+' colour'}
          value={/^#[0-9a-f]{6}$/i.test(value)?value:'#000000'}
          onChange={event=>choose(event.target.value)}/></label>
      </div>
    </div>,document.body)}
  </>;
}
