import { useOneActions, css, arr, label, value, fire } from "../shared/OneActions.jsx";
export default function OneSearch(props) {
  const p={...props,kind:props.kind||"Search"};
  const {kind,root,query,setQuery,selected,setSelected,open,setOpen,localPage,setPage,options}=useOneActions(p);
  const containerRef=React.useRef(null);
  const [activeIndex,setActiveIndex]=React.useState(-1);
  const [suggestionsDismissed,setSuggestionsDismissed]=React.useState(false);
  const listId="one-search-list-"+React.useId().replace(/[^A-Za-z0-9_-]/g,"");
  const suggestions=p.showSuggestions===true&&query&&!suggestionsDismissed?options.filter(x=>label(x).toLowerCase().includes(query.toLowerCase())).slice(0,10):[];
  React.useEffect(()=>{
    if(!suggestions.length)return undefined;
    const outside=event=>{
      if(containerRef.current&&!containerRef.current.contains(event.target)){
        setSuggestionsDismissed(true);setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown',outside,true);
    return ()=>document.removeEventListener('pointerdown',outside,true);
  },[suggestions.length]);
  const choose=option=>{setQuery(label(option));setActiveIndex(-1);setSuggestionsDismissed(true);fire(p,"select",value(option));};
  const submitted=()=>p.controlledValue===true?String(p.value??""):query;
  const onKeyDown=event=>{
    if(!suggestions.length){
      if(event.key==="Enter"&&p.actionFlows?.submit){event.preventDefault();fire(p,"submit",submitted());}
      return;
    }
    if(event.key==="ArrowDown"){event.preventDefault();setActiveIndex(index=>(index+1)%suggestions.length);}
    else if(event.key==="ArrowUp"){event.preventDefault();setActiveIndex(index=>index<=0?suggestions.length-1:index-1);}
    else if(event.key==="Enter"&&activeIndex>=0){event.preventDefault();choose(suggestions[activeIndex]);}
    else if(event.key==="Home"){event.preventDefault();setActiveIndex(0);}
    else if(event.key==="End"){event.preventDefault();setActiveIndex(suggestions.length-1);}
    else if(event.key==="Escape"){setActiveIndex(-1);setSuggestionsDismissed(true);}
    else if(event.key==="Enter" && p.actionFlows?.submit){event.preventDefault();fire(p,"submit",submitted());}
  };
  const field=<input className="one-control" aria-label={p.label||"Search"} type="search" role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length>0} aria-controls={suggestions.length?listId:undefined} aria-activedescendant={activeIndex>=0?listId+"-option-"+activeIndex:undefined} placeholder={p.placeholder||"Search"} value={p.controlledValue===true?String(p.value??""):query} onKeyDown={onKeyDown} onFocus={()=>setSuggestionsDismissed(false)} onChange={e=>{
      const nextValue=e.target.value;setQuery(nextValue);setActiveIndex(-1);setSuggestionsDismissed(false);
      if(p.searchKey&&p.pageSessionKey&&typeof window!=="undefined")window.dispatchEvent(new CustomEvent("metadrive:page-filter-selected",{detail:{pageSessionKey:p.pageSessionKey,filterKey:p.searchKey,value:nextValue}}));
      if(p.actionFlows?.change)fire(p,"change",nextValue);else if(typeof p.onChange==="function")p.onChange(nextValue);
    }}/>;
  const showLabel=p.showLabel===true||(p.showLabel===undefined&&!p.pageSessionKey);
  return <div {...root} ref={containerRef}>
    {showLabel?<label className="one-label"><span>{p.label||"Search"}</span>{field}</label>:field}
    {suggestions.length>0&&<div id={listId} className="one-surface" role="listbox" aria-label={(p.label||"Search")+" suggestions"}>
      {suggestions.map((option,index)=><div key={index} id={listId+"-option-"+index} role="option" aria-selected={activeIndex===index} tabIndex={-1} className="one-btn one-btn--ghost" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option)}>{label(option)}</div>)}
    </div>}
    {p.showSubmitButton===true&&<button className="one-btn" type="button" disabled={!p.actionFlows?.submit}
      onClick={()=>{if(p.actionFlows?.submit)fire(p,"submit",submitted());}}>{p.submitLabel||"Search"}</button>}
  </div>;
}