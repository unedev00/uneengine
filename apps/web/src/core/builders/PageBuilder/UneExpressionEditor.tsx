import {useRef,useState,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import './UneExpressionEditor.css';
import {relationshipFormulaFields} from './relationshipFormulaFields';

const safeName=(name:string)=>/^[A-Za-z][A-Za-z0-9_]*$/.test(name);
const fieldToken=/(@[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*)/g;
function activeReference(value:string,caret:number):{start:number;filter:string}|null{
 const before=value.slice(0,caret);
 // A quoted literal (e.g. "@Name") never triggers a field picker.
 let quoted=false;
 for(let i=0;i<before.length;i++){
   if(before[i]==='"'){if(before[i+1]==='"'){i++;continue;}quoted=!quoted;}
 }
 if(quoted)return null;
 const found=/@([A-Za-z0-9_.]*)$/.exec(before);
 if(!found)return null;
 return {start:caret-found[0].length,filter:found[1]};
}
export default function UneExpressionEditor({value,onChange,objects,objectApiName,disabled,label,field=false}:{
 value:string;onChange:(value:string)=>void;objects:readonly ObjectMetadata[];
 objectApiName:string;disabled:boolean;label:string;field?:boolean;
}){
 const input=useRef<HTMLInputElement>(null);
 const [picker,setPicker]=useState<{start:number;filter:string;caret:number;rect:DOMRect}|null>(null);
 const [active,setActive]=useState(0);
 const object=objects.find(item=>item.apiName===objectApiName);
 const matches=picker?relationshipFormulaFields(objects,[objectApiName],picker.filter).slice(0,200):[];
 const update=(next:string,caret:number)=>{
   onChange(next);
   const ref=activeReference(next,caret);
   if(ref&&object){
     setPicker({...ref,caret,rect:input.current?.getBoundingClientRect()??new DOMRect()});
     setActive(0);
   }else setPicker(null);
 };
 const insert=(reference:string)=>{
   if(!picker)return;
   const next=value.slice(0,picker.start)+reference+value.slice(picker.caret);
   const pos=picker.start+reference.length;
   onChange(next);setPicker(null);
   input.current?.focus();
   requestAnimationFrame(()=>input.current?.setSelectionRange(pos,pos));
 };
 const onKey=(event:KeyboardEvent<HTMLInputElement>)=>{
   if(!picker)return;
   if(event.key==='Escape'){setPicker(null);event.preventDefault();}
   if(event.key==='ArrowDown'){event.preventDefault();setActive(i=>Math.min(matches.length-1,i+1));}
   if(event.key==='ArrowUp'){event.preventDefault();setActive(i=>Math.max(0,i-1));}
   if(event.key==='Enter'&&matches.length){event.preventDefault();insert(matches[active]?.reference??matches[0].reference);}
 };
 return <div className="une-expression-editor" data-expression-kind={field?'field':'text'}>
   <div className="une-expression-highlight" aria-hidden="true">{value.split(fieldToken).map((part,index)=>
      part.startsWith('@')&&part.slice(1).split('.').every(safeName)
       ?<span className="une-expression-reference" key={index}>{part}</span>
       :<span key={index}>{part}</span>)}</div>
   <input ref={input} type="text" autoComplete="off" spellCheck={false}
     aria-label={label} aria-autocomplete="list" aria-expanded={Boolean(picker&&matches.length)}
     aria-controls={picker?'une-expression-picker':undefined}
     placeholder={object?'Type @ for fields':field?'Select Object, then type @':'Text or formula'}
     disabled={disabled} value={value} onKeyDown={onKey}
     onChange={event=>update(event.currentTarget.value,event.currentTarget.selectionStart??event.currentTarget.value.length)}
     onClick={event=>{const el=event.currentTarget;const ref=activeReference(el.value,el.selectionStart??0);
       if(ref&&object)setPicker({...ref,caret:el.selectionStart??0,rect:el.getBoundingClientRect()});}}
     onBlur={()=>setPicker(null)}
   />
   {picker&&matches.length>0&&createPortal(<div id="une-expression-picker"
      className="une-expression-picker" role="listbox" aria-label={label+' fields'}
      style={{position:'fixed',left:Math.max(6,Math.min(picker.rect.left,window.innerWidth-280)),
       top:picker.rect.bottom+4,maxHeight:240,width:276,zIndex:5000}}>
      {matches.map((item,index)=><button key={item.reference} type="button"
        role="option" aria-selected={index===active}
        onMouseDown={event=>{event.preventDefault();insert(item.reference);}}>
        <strong>{item.reference}</strong><span>{item.label}</span>
      </button>)}
     </div>,document.body)}
  </div>;
}
