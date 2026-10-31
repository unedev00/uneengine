import type {PageComponentMetadata} from '../../metadata/Definitions/metadata';
import type {UneRibbonProperty,UneBuilderTab} from './uneBuilderPropertyInventory';

type Values=Record<string,unknown>;
type Position=NonNullable<PageComponentMetadata['position']>;
const apiOf=(item:PageComponentMetadata)=>item.type.startsWith('Custom:')?item.type.slice(7):'';
const parentOf=(item:PageComponentMetadata)=>typeof item.properties.layoutParentId==='string'
  && item.properties.layoutParentId?item.properties.layoutParentId:item.parentId??null;
const keyOf=(property:UneRibbonProperty,item:PageComponentMetadata)=>
  property.valueKeys?.[apiOf(item)]??property.id;
const kindOf=(property:UneRibbonProperty,item:PageComponentMetadata)=>
  property.kindOverrides?.[apiOf(item)]??property.kind;

/** All selected components must support the same property and editor kind.
 * Incompatible properties remain visible but disabled, not copied silently. */
export function isSharedCanvasProperty(property:UneRibbonProperty,members:readonly PageComponentMetadata[]){
  return members.length>0 && members.every(item=>
    property.components.includes(apiOf(item)) &&
    item.properties.editorLocked!==true &&
    parentOf(item)===parentOf(members[0]) &&
    kindOf(property,item)===kindOf(property,members[0]));
}

export function mixedCanvasPropertyIds(
  definitions:readonly UneRibbonProperty[],tab:UneBuilderTab,
  members:readonly PageComponentMetadata[]
):string[]{
  if(members.length<2)return [];
  return definitions.filter(p=>p.tab===tab&&isSharedCanvasProperty(p,members)&&
    members.some(item=>JSON.stringify(item.properties[keyOf(p,item)]??p.defaultsOverrides?.[apiOf(item)]??p.default)
      !==JSON.stringify(members[0].properties[keyOf(p,members[0])]??
        p.defaultsOverrides?.[apiOf(members[0])]??p.default)))
    .map(p=>p.id);
}

/** One history entry for all members, preserving unrelated metadata and each
 * component's registry-defined value key. Never edit a non-shared property. */
export function updateSharedCanvasProperties(
  components:readonly PageComponentMetadata[],primaryId:string,members:readonly PageComponentMetadata[],
  definitions:readonly UneRibbonProperty[],tab:UneBuilderTab,next:Values
):PageComponentMetadata[]{
  const primary=members.find(item=>item.id===primaryId);
  if(!primary||members.length<2)return [...components];
  const changed=definitions.filter(p=>p.tab===tab&&isSharedCanvasProperty(p,members)&&
    !Object.is(next[keyOf(p,primary)],primary.properties[keyOf(p,primary)]));
  if(!changed.length)return [...components];
  const selectedIds=new Set(members.map(item=>item.id));
  return components.map(item=>{
    if(!selectedIds.has(item.id))return item;
    const properties={...item.properties};
    for(const property of changed){
      properties[keyOf(property,item)]=next[keyOf(property,primary)];
      // Media source mode is part of the same image-source user action.
      if(property.id==='imageSource'&&next.imageSourceMode!==undefined)
        properties.imageSourceMode=next.imageSourceMode;
    }
    return {...item,properties};
  });
}

export function updateSharedCanvasPositions(
  components:readonly PageComponentMetadata[],primaryId:string,members:readonly PageComponentMetadata[],
  definitions:readonly UneRibbonProperty[],next:Position
):PageComponentMetadata[]{
  const primary=members.find(item=>item.id===primaryId);
  if(!primary?.position||members.length<2)return [...components];
  const fields=(['x','y','width','height'] as const).filter(field=>
    next[field]!==primary.position![field] &&
    definitions.some(p=>p.tab==='Layout'&&p.id===field&&isSharedCanvasProperty(p,members)));
  if(!fields.length)return [...components];
  const ids=new Set(members.map(item=>item.id));
  return components.map(item=>{
    if(!ids.has(item.id)||!item.position)return item;
    const position={...item.position};
    for(const field of fields)position[field]=next[field];
    return {...item,position};
  });
}
