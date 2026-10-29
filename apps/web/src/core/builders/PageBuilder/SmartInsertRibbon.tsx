import {useMemo,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight,Grid2X2,Search,Plus} from 'lucide-react';
import './SmartInsertRibbon.css';

/** A compact, SQL-catalog-backed Insert surface.
 * The source list comes from the tenant-aware Page Builder palette, not from a
 * second set of hardcoded component definitions. This is shared builder UI.
 */
export type SmartInsertItem={
 type:string;
 label:string;
 description?:string;
};
type SmartInsertScope='smart'|'all'|'other';
export function isSmartInsertItem(item:SmartInsertItem){
 return /^Custom:smart_[A-Za-z0-9_]+$/.test(item.type);
}
export function filterSmartInsertItems(items:readonly SmartInsertItem[],scope:SmartInsertScope,term:string){
 const query=term.trim().toLowerCase();
 return items.filter(item=>(scope==='all'||(scope==='smart')===isSmartInsertItem(item))
   &&(!query||[item.type,item.label,item.description??''].some(text=>text.toLowerCase().includes(query))));
}
export default function SmartInsertRibbon({items,onInsert,onOpenLibrary,renderIcon}:{
 items:readonly SmartInsertItem[];
 onInsert:(type:string)=>void;
 onOpenLibrary:()=>void;
 renderIcon:(item:SmartInsertItem)=>ReactNode;
}){
 const [scope,setScope]=useState<SmartInsertScope>('smart');
 const [term,setTerm]=useState('');
 const scroll=useRef<HTMLDivElement>(null);
 const [arrows,setArrows]=useState({left:false,right:false});
 const smartCount=items.filter(isSmartInsertItem).length;
 const visible=useMemo(()=>filterSmartInsertItems(items,scope,term),[items,scope,term]);
 const measure=()=>{
  const node=scroll.current;
  if(!node)return;
  setArrows({left:node.scrollLeft>2,right:node.scrollLeft+node.clientWidth<node.scrollWidth-2});
 };
 const move=(offset:number)=>{scroll.current?.scrollBy({left:offset,behavior:'smooth'});};
 return <div className="smart-insert-ribbon" aria-label="Insert components">
  <div className="smart-insert-browser">
   <label className="smart-insert-search"><Search size={14} aria-hidden="true"/>
    <input aria-label="Search Insert components" placeholder="Find a component"
      value={term} onChange={event=>setTerm(event.target.value)}/></label>
   <div className="smart-insert-categories" role="group" aria-label="Component sources">
    <button type="button" aria-pressed={scope==='smart'} onClick={()=>setScope('smart')}>
     Smart <span>{smartCount}</span></button>
    <button type="button" aria-pressed={scope==='all'} onClick={()=>setScope('all')}>
     All <span>{items.length}</span></button>
    <button type="button" aria-pressed={scope==='other'} onClick={()=>setScope('other')}>App &amp; standard</button>
   </div>
  </div>
  <div className="smart-insert-gallery">
   <div className="smart-insert-gallery-row">
    <button className="smart-insert-pager" type="button" title="Previous components"
      aria-label="Previous components" disabled={!arrows.left}
      onClick={()=>move(-500)}><ChevronLeft size={16}/></button>
    <div className="smart-insert-tiles" ref={scroll} onScroll={measure} key={scope+'-'+term}>
     {visible.map(item=><button className="smart-insert-tile" type="button"
       key={item.type} title={'Insert '+item.label+(item.description?': '+item.description:'')}
       onClick={()=>onInsert(item.type)}>
       <span className="smart-insert-tile-icon">{renderIcon(item)}</span>
       <span className="smart-insert-tile-label">{item.label}</span>
       <Plus size={12} className="smart-insert-tile-add" aria-hidden="true"/>
     </button>)}
     {visible.length===0&&<div role="status" className="smart-insert-empty">
       <Grid2X2 size={17}/>{items.length===0?'No available components were returned by the component library.':
       scope==='smart'&&smartCount===0?'No Smart components are installed for this tenant.':'No components match the search.'}
     </div>}
    </div>
    <button className="smart-insert-pager" type="button" title="Next components"
      aria-label="Next components" disabled={!arrows.right}
      onClick={()=>move(500)}><ChevronRight size={16}/></button>
   </div>
   <div className="smart-insert-footer"><span>{visible.length} component{visible.length===1?'':'s'} available</span>
    <button type="button" onClick={onOpenLibrary}><Grid2X2 size={12}/> Open full library</button>
   </div>
  </div>
 </div>;
}
