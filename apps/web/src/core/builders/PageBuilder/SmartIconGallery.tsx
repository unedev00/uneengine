import {useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import icons from '../../../component-libraries/smart_icon/iconCatalog.json';
import './SmartIconGallery.css';

type IconItem=(typeof icons)[number];
const categories=['All',...new Set(icons.map(icon=>icon.category))];

export default function SmartIconGallery({value,onChange}:{value:string;onChange:(iconId:string)=>void}){
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('All');
 const visible=useMemo(()=>icons.filter(icon=>
   (category==='All'||icon.category===category)&&
   (icon.label.toLowerCase().includes(query.trim().toLowerCase())||
    icon.id.includes(query.trim().toLowerCase()))),[query,category]);
 const current=icons.find(icon=>icon.id===value)??icons[0];
 const glyph=(icon:IconItem)=><span className="smart-icon-gallery-glyph" aria-hidden="true"
   style={{WebkitMaskImage:'url(/smart-icons/'+icon.id+'.svg)',maskImage:'url(/smart-icons/'+icon.id+'.svg)'}}/>;
 return <div className="smart-icon-gallery" aria-label="Smart Icon SVG selector">
   <div className="smart-icon-gallery-filters">
     <label className="smart-icon-gallery-search"><Search size={15} aria-hidden="true"/>
       <input type="search" aria-label="Search icons" placeholder="Search 50 icons"
         value={query} onChange={event=>setQuery(event.target.value)}/></label>
     <select aria-label="Icon category" value={category} onChange={event=>setCategory(event.target.value)}>
       {categories.map(item=><option key={item} value={item}>{item}</option>)}
     </select>
     <span className="smart-icon-gallery-current" aria-live="polite">
       {glyph(current)} {current.label} selected
     </span>
   </div>
   <div className="smart-icon-gallery-items" role="group" aria-label="Choose an icon">
    {visible.map(icon=><button type="button" key={icon.id} className="smart-icon-gallery-item"
      title={icon.label} aria-label={'Select '+icon.label+' icon'} aria-pressed={icon.id===current.id}
      onClick={()=>onChange(icon.id)}>
       {glyph(icon)}<span className="smart-icon-gallery-name">{icon.label}</span>
    </button>)}
    {visible.length===0&&<p role="status" className="smart-icon-gallery-empty">No matching icons</p>}
   </div>
 </div>;
}
