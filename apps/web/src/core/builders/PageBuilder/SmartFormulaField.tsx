import {useState,useRef,type KeyboardEvent} from 'react';
import type {FieldMetadata} from '../../metadata/Definitions/metadata';
import './SmartFormulaField.css';
/** Presentation tokenizer; the shared bounded expression evaluator owns semantics.
 * Quoted operators (+ - * / &) and @names are literal strings, never formulas.
 */
export function splitSmartFormula(value:string){
 const parts:{value:string;kind:'field'|'string'|'operator'|'text'}[]=[];
 const token=/("(?:[^"]|"")*"|@[A-Za-z][A-Za-z0-9_]*|[+*\/&-])/g;
 let cursor=0;let match:RegExpExecArray|null;
 while((match=token.exec(value))){
  if(match.index>cursor)parts.push({value:value.slice(cursor,match.index),kind:'text'});
  parts.push({value:match[0],kind:match[0].startsWith('"')?'string':
   match[0].startsWith('@')?'field':'operator'});
  cursor=match.index+match[0].length;
 }
 if(cursor<value.length)parts.push({value:value.slice(cursor),kind:'text'});
 return parts;
}
export default function SmartFormulaField({value,onChange,fields,disabled,label}:{
 value:string;onChange:(next:string)=>void;fields:readonly FieldMetadata[];disabled:boolean;label:string
}){
 const input=useRef<HTMLInputElement>(null);
 const [matches,setMatches]=useState<{start:number;end:number;query:string}|null>(null);
 const filtered=matches?fields.filter(f=>f.apiName.toLowerCase().includes(matches.query.toLowerCase())||
   f.label.toLowerCase().includes(matches.query.toLowerCase())).slice(0,12):[];
 const update=(next:string,caret:number)=>{
  onChange(next);
  const before=next.slice(0,caret);
  const parts=splitSmartFormula(before);
  // A field picker is never offered while editing a quoted string.
  const last=parts[parts.length-1];
  const openString=(before.match(/"/g)||[]).length%2===1;
  const found=!openString?/@([A-Za-z0-9_]*)$/.exec(before):null;
  setMatches(found?{start:caret-found[0].length,end:caret,query:found[1]}:null);
 };
 const insert=(field:string)=>{
  if(!matches)return;
  const next=value.slice(0,matches.start)+'@'+field+value.slice(matches.end);
  const end=matches.start+field.length+1;
  onChange(next);setMatches(null);
  requestAnimationFrame(()=>{input.current?.focus();input.current?.setSelectionRange(end,end)});
 };
 const keyDown=(event:KeyboardEvent<HTMLInputElement>)=>{
  if(event.key==='Escape')setMatches(null);
  if(event.key==='Enter'&&filtered.length&&matches){event.preventDefault();insert(filtered[0].apiName);}
 };
 return <div className="smart-formula" title={'Formula: @Field, + - * / and &; quoted symbols are text'}>
  <div className="smart-formula-highlight" aria-hidden="true">{splitSmartFormula(value).map((part,i)=>
    <span key={i} className={'smart-formula-'+part.kind}>{part.value}</span>)}</div>
  <input ref={input} type="text" aria-label={label} value={value} spellCheck={false} autoComplete="off"
   placeholder='@Field & "text"' disabled={disabled} onKeyDown={keyDown}
   onChange={e=>update(e.currentTarget.value,e.currentTarget.selectionStart??e.currentTarget.value.length)}/>
  {matches&&filtered.length>0&&<div className="smart-formula-list" role="listbox">
   {filtered.map(item=><button key={item.apiName} type="button" role="option"
     onMouseDown={e=>{e.preventDefault();insert(item.apiName)}}>@{item.apiName} · {item.label}</button>)}
  </div>}
 </div>;
}
