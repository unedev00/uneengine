import type { PageComponentMetadata } from '../../metadata/Definitions/metadata';
import { rawLayoutParentId } from '../../pages/TemplatePageRuntime/pageComponentLayout';

export type ComponentClipboard = { rootId: string; components: PageComponentMetadata[] };

export function remapComponentInteractionTargets<T extends PageComponentMetadata>(
  components:readonly T[],ids:ReadonlyMap<string,string>
):T[]{
  return components.map(component=>{
    const raw=component.properties.pagePropertyContract;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return component;
    const envelope=raw as Record<string,unknown>,interactions=envelope.interactions;
    if(!Array.isArray(interactions))return component;
    const next=interactions.map(interaction=>{
      if(!interaction||typeof interaction!=='object'||Array.isArray(interaction))return interaction;
      const targetId=(interaction as Record<string,unknown>).targetComponentId;
      const replacement=typeof targetId==='string'?ids.get(targetId):undefined;
      return replacement?{...interaction as Record<string,unknown>,targetComponentId:replacement}:interaction;
    });
    if(next.every((interaction,index)=>interaction===interactions[index]))return component;
    return {...component,properties:{...component.properties,
      pagePropertyContract:{...envelope,interactions:next}}};
  });
}

/** Snapshot the selected component and every descendant, in existing render order. */
export function copyComponentTree(
  components: readonly PageComponentMetadata[], rootId: string
): ComponentClipboard {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of components) {
      if (!ids.has(item.id) && ids.has(rawLayoutParentId(item) ?? '')) {
        ids.add(item.id);
        changed = true;
      }
    }
  }
  return { rootId, components: structuredClone(components.filter(item => ids.has(item.id))) };
}

/** Deep copy with newly allocated IDs and internally consistent parent references. */
export function cloneComponentTree(
  snapshot: ComponentClipboard,
  rootParentId: string | null,
  makeId: () => string = () => 'copy-' + crypto.randomUUID(),
  offset = 24
): { rootId: string; components: PageComponentMetadata[] } {
  if (!snapshot.components.some(item => item.id === snapshot.rootId))
    throw new Error('Cannot copy a missing component');
  const ids = new Map(snapshot.components.map(item => [item.id, makeId()]));
  const cloned = snapshot.components.map(item => {
    const root = item.id === snapshot.rootId;
    const originalParent = rawLayoutParentId(item);
    const parent = root ? rootParentId : ids.get(originalParent ?? '') ?? null;
    const properties = structuredClone(item.properties);
    if (parent) properties.layoutParentId = parent;
    else delete properties.layoutParentId;
    return {
      ...structuredClone(item),
      id: ids.get(item.id)!,
      label: root ? item.label + ' Copy' : item.label,
      parentId: parent ?? undefined,
      properties,
      position: item.position
        ? {...item.position,
          x: root ? item.position.x + offset : item.position.x,
          y: root ? item.position.y + offset : item.position.y}
        : undefined
    };
  });
  return { rootId: ids.get(snapshot.rootId)!, components: remapComponentInteractionTargets(cloned,ids) };
}

/** Dropping into a tab also establishes the selected tab, not just parentId. */
export function assignTabOnReparent(
  items: PageComponentMetadata[],movingId:string,parentId:string|null,selectedTab?:string
):PageComponentMetadata[] {
  const parent=items.find(item=>item.id===parentId);
  if(parent?.type!=='Tabs')return items;
  const tabNames=Array.isArray(parent.properties.tabs)
    ?parent.properties.tabs.filter((name):name is string=>typeof name==='string'&&name.length>0)
    :[];
  const tab=selectedTab&&tabNames.includes(selectedTab)?selectedTab:tabNames[0];
  if(!tab)return items;
  return items.map(item=>item.id===movingId
    ?{...item,properties:{...item.properties,tabLabel:tab}}:item);
}
