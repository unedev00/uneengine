import {useState, type KeyboardEvent} from 'react';
import type {FieldMetadata} from '../../metadata/Definitions/metadata';

/** A bounded @field picker; expressions are evaluated by the component runtime, never by eval(). */
export default function RibbonFieldExpressionInput({label,value,fields,onChange,placeholder}:{
  label:string;value:string;fields:FieldMetadata[];onChange:(value:string)=>void;placeholder?:string;
}){
  const [focused,setFocused]=useState(false);
  const [choice,setChoice]=useState(0);
  const token=/@([A-Za-z0-9_]*)$/.exec(value);
  const query=token?.[1]?.toLowerCase()??'';
  const suggestions=token?fields.filter(field=>field.apiName.toLowerCase().includes(query)||field.label.toLowerCase().includes(query)).slice(0,12):[];
  const insert=(index:number)=>{
    const field=suggestions[index];
    if(!field)return;
    onChange(value.slice(0,value.length-(token?.[0].length??0))+'@'+field.apiName);
    setFocused(false);setChoice(0);
  };
  const onKey=(event:KeyboardEvent<HTMLInputElement>)=>{
    if(!focused||!suggestions.length)return;
    if(event.key==='ArrowDown'){event.preventDefault();setChoice(value=>(value+1)%suggestions.length);}
    if(event.key==='ArrowUp'){event.preventDefault();setChoice(value=>(value+suggestions.length-1)%suggestions.length);}
    if(event.key==='Enter'){event.preventDefault();insert(Math.min(choice,suggestions.length-1));}
    if(event.key==='Escape'){setFocused(false);}
  };
  return <label className="office-ribbon-inline-field office-ribbon-expression-input">
    <span className="office-ribbon-field-name">{label}</span>
    <span className="office-ribbon-expression-anchor">
      <input type="text" aria-label={label+' expression'} autoComplete="off"
        value={value} placeholder={placeholder??'Type @ for fields'} onKeyDown={onKey}
        onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),120)}
        onChange={event=>{onChange(event.target.value);setChoice(0);setFocused(true);}}/>
      {focused&&token&&<div className="office-ribbon-field-suggestions" role="listbox" aria-label="Fields from selected source object">
        {!fields.length?<span className="office-ribbon-expression-hint">Choose a Source Object first</span>:suggestions.length===0?<span className="office-ribbon-expression-hint">No matching fields</span>:
        suggestions.map((field,index)=><button type="button" role="option" aria-selected={choice===index}
          key={field.apiName} onMouseDown={event=>event.preventDefault()} onClick={()=>insert(index)}>
          <span>{field.label}</span><small>{field.apiName}</small>
        </button>)}
      </div>}
    </span>
  </label>;
}
