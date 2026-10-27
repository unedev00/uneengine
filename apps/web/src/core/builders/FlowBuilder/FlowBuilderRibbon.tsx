import type {ReactNode} from 'react';
import {Search, Workflow} from 'lucide-react';

/** Office-style navigation for the SQL capability-backed Flow Builder catalogue.
 * Rendering controls only: insertion and all mutations remain in the parent Flow Builder.
 */
export type FlowRibbonElement = {type:string; group:string; icon:string};
type PathOption = {id:string; label:string};
type Props = {
  label:string;
  status:string;
  version:number;
  isDirty:boolean;
  onLabelChange:(value:string)=>void;
  tab:string;
  onTabChange:(tab:string)=>void;
  groups:string[];
  elements:FlowRibbonElement[];
  search:string;
  onSearchChange:(value:string)=>void;
  pathOptions:PathOption[];
  selectedPath:string;
  onPathChange:(id:string)=>void;
  onInsert:(type:string)=>void;
  home:ReactNode;
  manager:ReactNode;
};
export default function FlowBuilderRibbon({
  label,status,version,isDirty,onLabelChange,tab,onTabChange,groups,
  elements,search,onSearchChange,pathOptions,selectedPath,onPathChange,onInsert,home,manager
}:Props){
  const tabs=['Home',...groups,'Manager'];
  const displayed=elements.filter(item=>item.group===tab
    &&item.type.toLowerCase().includes(search.trim().toLowerCase()));
  // At most three element commands per Office-style ribbon group.
  const sections=Array.from({length:Math.ceil(displayed.length/3)},(_,index)=>displayed.slice(index*3,index*3+3));
  return <section className="office-builder-ribbon flow-office-ribbon" aria-label="Flow Builder ribbon">
    <nav className="office-ribbon-tabs" role="tablist" aria-label="Flow Builder tabs">
      {tabs.map(name=><button key={name} type="button" role="tab" aria-selected={tab===name}
        className={tab===name?'active':''} onClick={()=>onTabChange(name)}>{name}</button>)}
      <div className="office-ribbon-page-controls flow-ribbon-page-controls">
        <Workflow size={16} aria-hidden="true"/>
        <input value={label} onChange={event=>onLabelChange(event.target.value)}
          aria-label="Flow label" title="Flow label"/>
        <span className={status==='Active'?'flow-ribbon-status active':'flow-ribbon-status'}>
          {status} · v{version}
        </span>
        <span role="status" className={isDirty?'flow-save-state dirty':'flow-save-state'}>
          {isDirty?'Unsaved changes':'Saved'}
        </span>
      </div>
    </nav>
    <div className="office-ribbon-content" role="tabpanel" aria-label={tab}>
      {tab==='Home'&&home}
      {tab==='Manager'&&manager}
      {groups.includes(tab)&&<>
        <div className="office-ribbon-group flow-ribbon-find">
          <div className="office-ribbon-stack">
            <label><Search size={15}/><input aria-label="Search flow elements"
              placeholder="Find element" value={search} onChange={e=>onSearchChange(e.target.value)}/></label>
            {pathOptions.length>1&&<label>Insert on
              <select aria-label="Choose Flow insertion path" value={selectedPath}
                onChange={e=>onPathChange(e.target.value)}>
                <option value="">Select a branch</option>
                {pathOptions.map(path=><option key={path.id} value={path.id}>{path.label}</option>)}
              </select>
            </label>}
          </div><span>Insert options</span>
        </div>
        {sections.map((items,index)=><div className="office-ribbon-group" key={index}>
          <div className="office-ribbon-stack">
            {items.map(item=><button key={item.type} type="button"
              draggable onDragStart={event=>{
                event.dataTransfer.effectAllowed='copy';
                event.dataTransfer.setData('application/x-metadrive-flow-type',item.type);
              }}
              title={'Click to add '+item.type+' or drag onto the canvas'}
              onClick={()=>onInsert(item.type)}>
              <span className="flow-ribbon-element-icon" aria-hidden="true">{item.icon}</span>
              {item.type}</button>)}
          </div><span>{index===0?tab:tab+' · '+(index+1)}</span>
        </div>)}
        {!displayed.length&&<p className="flow-ribbon-empty">No available elements match your search.</p>}
      </>}
    </div>
  </section>;
}
