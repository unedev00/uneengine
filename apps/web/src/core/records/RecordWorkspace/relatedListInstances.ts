import type {LightningPageMetadata,ObjectMetadata,PageLayoutMetadata,RelatedListSettingsMetadata} from '../../metadata/Definitions/metadata';
export type RelatedListInstance={key:string;relationshipName:string;componentId?:string;
  childObject:ObjectMetadata;fieldApiName:string;settings:RelatedListSettingsMetadata};
export const relatedListInstanceKey=(name:string,componentId?:string)=>componentId?`${componentId}:${name}`:name;
/** Each authored component owns its query, offset and settings, including duplicates. */
export function relatedListInstances(objectApi:string,objects:readonly ObjectMetadata[],
  layout:PageLayoutMetadata|undefined,page:LightningPageMetadata|null|undefined):RelatedListInstance[]{
  const requested=[...(layout?.relatedLists??[]).map(name=>({name,componentId:undefined as string|undefined,settings:{}})),
    ...(page?.components??[]).flatMap(component=>
      ['Related List','Related List Quick Links'].includes(component.type)&&Array.isArray(component.properties.relatedLists)
        ?component.properties.relatedLists.filter((name):name is string=>typeof name==='string').map(name=>({name,
          componentId:component.type==='Related List'?component.id:undefined,
          settings:((component.properties.relatedListSettings??{}) as Record<string,RelatedListSettingsMetadata>)[name]??{}})):[])];
  const instances=new Map<string,RelatedListInstance>();
  for(const request of requested)for(const childObject of objects)for(const field of childObject.fields){
    const relation=field.relationship;
    if(relation?.targetObject!==objectApi||![relation.childRelationshipName,childObject.pluralLabel]
      .some(name=>name.toLowerCase()===request.name.toLowerCase()))continue;
    const name=relation.childRelationshipName;
    const key=relatedListInstanceKey(name,request.componentId);
    instances.set(key,{key,relationshipName:name,componentId:request.componentId,childObject,
      fieldApiName:field.apiName,settings:{...(layout?.relatedListSettings?.[name]??{}),...request.settings}});
  }
  return [...instances.values()];
}
export function relatedListPageSize(value:unknown):number{
  return typeof value==='number'&&Number.isFinite(value)?Math.max(1,Math.min(100,Math.floor(value))):50;
}

/** Query filters always sit inside the independently enforced parent relationship. */
export function relatedListQuery(instance:RelatedListInstance,parentId:string,offset:number):URLSearchParams{
  if(!parentId)throw new Error('Select a parent record before loading related records');
  const {settings,fieldApiName}=instance;
  const params=new URLSearchParams({limit:String(relatedListPageSize(settings.pageSize)),
    offset:String(Math.max(0,Math.floor(offset)||0)),relatedField:fieldApiName,relatedId:parentId});
  if(settings.sortField){params.set('sortField',settings.sortField);params.set('sortDirection',settings.sortDirection??'asc');}
  if(settings.filters?.length){
    const operators:Record<string,string>={'Equals':'eq','Not Equals':'ne','Contains':'contains',
      'Greater Than':'gt','Greater Than or Equal':'gte','Less Than':'lt','Less Than or Equal':'lte',
      'Includes':'includes','Excludes':'excludes','Is Blank':'isBlank','Is Not Blank':'isNotBlank'};
    const filters=settings.filters.map(filter=>{
      const field=instance.childObject.fields.find(item=>item.apiName===filter.field);
      if(!field||!operators[filter.operator]||field.formula||field.rollup
        ||['Text (Encrypted)','Address','Geolocation','File'].includes(field.dataType))
        throw new Error('This related-list filter cannot be queried. Choose a stored, filterable field.');
      let value=filter.value;
      if(value&&typeof value==='object'){
        if((value as {source?:string}).source!=='CurrentRecord')throw new Error('Unsupported related-list filter value source');
        value=parentId;
      }
      return {field:filter.field,operator:operators[filter.operator],
        value:['Is Blank','Is Not Blank'].includes(filter.operator)?'':String(value??'')};
    });
    params.set('filters',JSON.stringify(filters));
    if(settings.filterLogic)params.set('filterLogic',settings.filterLogic);
  }else if(settings.filterField&&settings.filterValue!==undefined){
    params.set('filterField',settings.filterField);params.set('filterValue',settings.filterValue);
    params.set('filterOperator',settings.filterOperator??'Equals');
  }
  return params;
}
