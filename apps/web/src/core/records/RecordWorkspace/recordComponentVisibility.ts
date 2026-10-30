import type {PageComponentMetadata} from '../../metadata/Definitions/metadata';
import {isComponentVisible,type ComponentVisibilityContext} from '../../components/Properties/componentVisibility';
import {rawLayoutParentId} from '../../pages/TemplatePageRuntime/pageComponentLayout';
import {behaviorTabs,behaviorTabForChild} from '../../pages/PageRuntime/pageBehaviorRuntime';

/** Ancestor and tab rules also apply when deriving an edit form from a page. */
export function recordComponentVisible(component:PageComponentMetadata,
  components:readonly PageComponentMetadata[],context:ComponentVisibilityContext):boolean {
  const visited=new Set<string>();
  let current:PageComponentMetadata|undefined=component;
  while(current){
    if(visited.has(current.id)||!isComponentVisible(current,context,
      Boolean(context.fields||context.record||context.recordPermissions||context.profileId)))return false;
    visited.add(current.id);
    const parentId=rawLayoutParentId(current);
    if(!parentId)return true;
    const parent=components.find(item=>item.id===parentId);
    if(!parent)return false;
    if(parent.type==='Tabs'){
      const tabs=Array.isArray(parent.properties.tabs)?parent.properties.tabs.filter((tab):tab is string=>typeof tab==='string'):['Related','Details'];
      if(!behaviorTabForChild(current.properties.tabLabel,tabs,behaviorTabs(parent.properties,tabs,context)))return false;
    }
    current=parent;
  }
  return true;
}
