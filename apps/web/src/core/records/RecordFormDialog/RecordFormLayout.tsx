import {useState,type ReactNode} from 'react';
import type {LightningPageMetadata,PageComponentMetadata,PageLayoutMetadata} from '../../metadata/Definitions/metadata';
import type {ComponentVisibilityContext} from '../../components/Properties/componentVisibility';
import {recordComponentVisible} from '../RecordWorkspace/recordComponentVisibility';
import {childrenOf,resolvePageComponentStyle,type LayoutDevice} from '../../pages/TemplatePageRuntime/pageComponentLayout';
import {behaviorTabs,behaviorTabForChild} from '../../pages/PageRuntime/pageBehaviorRuntime';

/** Preserve the authored tree while reusing the CRUD field controls and layout rules. */
export default function RecordFormLayout({page,layout,context,device,renderField}:{
  page:LightningPageMetadata;layout:PageLayoutMetadata|undefined;context:ComponentVisibilityContext;
  device:LayoutDevice;renderField:(name:string)=>ReactNode;
}){
  const [activeTabs,setActiveTabs]=useState<Record<string,string>>({});
  const render=(component:PageComponentMetadata):ReactNode=>{
    if(!recordComponentVisible(component,page.components,context))return null;
    const nested=childrenOf(page.components,component.id);
    if(component.type==='Record Field')return <div key={component.id}>{renderField(String(component.properties.fieldApiName??''))}</div>;
    if(component.type==='Field Section'){
      const section=layout?.sections.find(item=>item.id===component.id);
      return section?<section key={component.id} className="record-form-section"><h3>{section.label}</h3>
        <div className={`record-form-grid columns-${section.columns}`}>{section.fieldApiNames.map(renderField)}</div>
      </section>:null;
    }
    if(component.type==='Tabs'){
      const configured=Array.isArray(component.properties.tabs)?component.properties.tabs.filter((item):item is string=>typeof item==='string'):['Related','Details'];
      const tabs=behaviorTabs(component.properties,configured,context);
      const active=tabs.includes(activeTabs[component.id])?activeTabs[component.id]:tabs[0];
      return <section key={component.id}><div role="tablist" aria-label={component.label}>
        {tabs.map((tab,index)=><button type="button" role="tab" key={tab} aria-selected={tab===active}
          tabIndex={tab===active?0:-1} onClick={()=>setActiveTabs(previous=>({...previous,[component.id]:tab}))}
          onKeyDown={event=>{
            const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:null;
            if(next===null)return;event.preventDefault();setActiveTabs(previous=>({...previous,[component.id]:tabs[next]}));
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}>{tab}</button>)}
      </div>{tabs.map(tab=><div key={tab} role="tabpanel" hidden={tab!==active} onInvalidCapture={()=>setActiveTabs(previous=>({...previous,[component.id]:tab}))}>
        {nested.filter(child=>behaviorTabForChild(child.properties.tabLabel,configured,tabs)===tab).map(render)}
      </div>)}</section>;
    }
    if(!nested.length)return null;
    // Expand all editable sections: native form validity can focus every required field.
    return <section key={component.id} style={resolvePageComponentStyle(component.properties,component.type,device)}>
      {component.type==='Accordion'&&<h3>{component.label}</h3>}{nested.map(render)}
    </section>;
  };
  return <>{childrenOf(page.components,null).map(render)}</>;
}
