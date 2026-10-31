import {resolveMetadataProperties} from '../../metadata/Definitions/metadataReferences';
import * as React from 'react';
import {useState,useEffect,useRef} from 'react';
import {loadFlowScreenRecordPage} from '../../authentication/Client/authClient';
// Load the browser API client only during the mounted effect, not on SSR import.
import {presentPageRecords,type ChannelGrant} from '../../records/RecordWorkspace/recordPresentationAdapters';
import {filterPageComponentRecords,pageComponentRecordQuery,pageComponentRelatedQuery,pageComponentActiveRecordQuery,bindPageStateProperties} from '../PageRuntime/pageComponentBindings';
import {resolveSmartToggleFieldBinding,updateSmartToggleField} from '../PageRuntime/smartToggleFieldBinding';
import {filterRelatedRecords} from '../PageRuntime/filterRelatedRecords.mjs';
import {resolveMentionProperties,mentionGroups,referencedMentionPaths,resolveCollectionMentionRows} from '../../../component-libraries/shared/primitives/SmartFieldInput/smartFieldMentions';
import { explicitMentionRecordId, useRelationshipMentionContext } from '../../records/RecordFormDialog/useRelationshipMentionContext';
import {resolvePageActionRoute} from '../PageRuntime/pageActionRouting';
import {resolveFlowOutputBindings,resolveStructuredFlowInput} from '../../automation/FlowScreen/flowInputBindings';
import {componentLayoutProps} from '../TemplatePageRuntime/pageComponentLayout';
import RegisteredComponent from '../../components/RegisteredComponent/RegisteredComponent';
import {behaviorValidation,behaviorAction,pageBehaviors,type BehaviorContext} from '../PageRuntime/pageBehaviorRuntime';
import type {LibraryComponentMetadata,PageComponentMetadata,ObjectMetadata,FieldMetadata,LightningAppMetadata,LightningPageMetadata,ReportMetadata,FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';
import type {AppRoute} from '../../workspace/Navigation/appRouting';

export default function MetadataBoundPageComponent({
  apiRequest, definition, component, objects, apps, pages, currentAppId, pageSessionKey, reports, availableFlows, formFactor, onNavigate, onLaunchFlow, disableActions = false, defaultObjectApiName = '', recordId = '', behaviorContext
}: {
  apiRequest:<T>(path:string,init?:RequestInit)=>Promise<T>;
  definition: LibraryComponentMetadata;
  component: PageComponentMetadata;
  objects: ObjectMetadata[];
  apps: LightningAppMetadata[];
  pages: LightningPageMetadata[];
  currentAppId: string;
  pageSessionKey: string;
  reports: ReportMetadata[];
  availableFlows: Array<Pick<FlowDefinitionMetadata, 'id' | 'apiName' | 'label' | 'flowType' | 'status'>>;
  formFactor: 'Desktop' | 'Phone';
  onNavigate: (route: AppRoute) => void;
  onLaunchFlow: (flowApiName: string, inputs?: Record<string, unknown>, context?:{requestId?:string}) => void;
  disableActions?: boolean;
  defaultObjectApiName?: string;
  recordId?: string;
  behaviorContext?:BehaviorContext;
}) {
  const properties = resolveMetadataProperties({...component.properties,objectApiName:component.properties.objectApiName||defaultObjectApiName},objects,availableFlows);
  const objectApiName = String(properties.objectApiName || defaultObjectApiName || '');
  const mentionRootObjectApiName = defaultObjectApiName || objectApiName;
  // An application-independent session can be referenced by configured Flows.
  const [sessionId, setSessionId] = useState(() => {
    const key = 'metadrive-page-session:' + pageSessionKey;
    try {
      let value = window.sessionStorage.getItem(key);
      if (!value) {
        value = crypto.randomUUID();
        window.sessionStorage.setItem(key, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  });
  const [pageState,setPageState]=useState<Record<string,unknown>>({});
  useEffect(()=>{
    const receive=(event:Event)=>{
      const data=(event as CustomEvent<{pageSessionKey:string;key:string;value:unknown}>).detail;
      if(data?.pageSessionKey!==pageSessionKey
        ||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(data.key))return;
      setPageState(previous=>({...previous,[data.key]:data.value}));
    };
    window.addEventListener('metadrive:page-local-state',receive);
    return ()=>window.removeEventListener('metadrive:page-local-state',receive);
  },[pageSessionKey]);
  const fields = objects.find((item) => item.apiName === objectApiName)?.fields ?? [];
  // Related filter targets retain the exact relationship path; type information
  // comes from the destination's permission-scoped metadata, not a name guess.
  const relatedFilterFields:FieldMetadata[]=mentionGroups(objects,objectApiName,[],'','text')
    .filter(group=>!group.primary).flatMap(group=>group.fields.flatMap(item=>{
      const source=objects.find(object=>object.apiName===item.objectApiName)
        ?.fields.find(field=>field.apiName===item.fieldApiName);
      return source?[{...source,apiName:item.reference,label:group.via+' → '+item.fieldLabel}]:[];
    }));
  const filterFields=[...fields,...relatedFilterFields];
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [recordsForRequest,setRecordsForRequest]=useState('');
  const [recordTotal,setRecordTotal]=useState(0);
  const [recordOffset,setRecordOffset]=useState(0);
  const recordPageSize=100;
  const [dataError, setDataError] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<string,string>>({});
  const [selectedFilterRecords, setSelectedFilterRecords] = useState<Record<string,{
    recordId:string;label:string;sourceObjectApiName:string
  }>>({});
  const relatedKey=String(properties.relatedFilterKey??'');
  const usesActiveRecordScope=properties.autoRecordScope===true||
    (properties.autoRecordScope!==false && ['smart_cart','Custom:smart_cart'].includes(component.type));
  const manualRelatedField=String(properties.relatedFieldApiName??'');
  const manualParentId=relatedKey?selectedFilterRecords[relatedKey]?.recordId||pageState[relatedKey]:undefined;
  const relatedQuery=relatedKey
    ?pageComponentRelatedQuery(properties,fields,manualParentId)
    :usesActiveRecordScope?pageComponentActiveRecordQuery(fields,pageState)
      :pageComponentRelatedQuery(properties,fields,undefined);
  const relatedField=relatedKey?manualRelatedField:relatedQuery.filter?.field??'';
  const parentId=relatedKey?manualParentId:relatedQuery.filter?.value;
  const recordQuery=pageComponentRecordQuery(properties.filters,filterFields,{pageState,recordId,sessionId},
    properties.filterLogic==='OR'?'OR':'AND');
  const recordQueryKey=JSON.stringify([recordQuery,relatedQuery]);
  const recordRequestKey=JSON.stringify([objectApiName,recordQueryKey,recordOffset,revision]);

  useEffect(() => {
    const listener = (event: Event) => {
      const data = (event as CustomEvent<{pageSessionKey:string;filterKey:string;value:string;
        recordId?:string;label?:string;sourceObjectApiName?:string}>).detail;
      if (data?.pageSessionKey !== pageSessionKey || !data.filterKey) return;
      setSelectedCategories(previous => ({...previous,[data.filterKey]:String(data.value??'')}));
      setSelectedFilterRecords(previous => ({...previous,[data.filterKey]:{
        recordId:String(data.recordId??''),label:String(data.label??data.value??''),
        sourceObjectApiName:String(data.sourceObjectApiName??'')
      }}));
    };
    window.addEventListener('metadrive:page-filter-selected',listener);
    return () => window.removeEventListener('metadrive:page-filter-selected',listener);
  },[pageSessionKey]);
  const [dataLoading, setDataLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [channelAccess, setChannelAccess] = useState<{userId: string;viewAll: boolean;grants: ChannelGrant[];eligibleAssignees: {id: string;name: string;channelAccountId: string}[]}>({
    userId: '', viewAll: false, grants: [], eligibleAssignees: []
  });
  const initializedSessions = useRef<Set<string>>(new Set());
  const pendingFlowOutputs=useRef(new Map<string,{flowApiName:string;mappings:Record<string,unknown>}>());
  useEffect(()=>setRecordOffset(0),[objectApiName,recordQueryKey]);
  useEffect(()=>{
    const complete=(event:Event)=>{
      const detail=(event as CustomEvent<{requestId?:string;flowApiName?:string;outputs?:Record<string,unknown>}>).detail;
      if(typeof detail?.requestId!=='string'||typeof detail.flowApiName!=='string')return;
      const pending=pendingFlowOutputs.current.get(detail.requestId);
      if(!pending||pending.flowApiName!==detail.flowApiName)return;
      pendingFlowOutputs.current.delete(detail.requestId);
      try{
        const outputs=detail.outputs&&typeof detail.outputs==='object'&&!Array.isArray(detail.outputs)
          ?detail.outputs:{};
        for(const item of resolveFlowOutputBindings(outputs,pending.mappings))
          window.dispatchEvent(new CustomEvent('metadrive:page-local-state',{
            detail:{pageSessionKey,key:item.key,value:item.value}
          }));
        window.dispatchEvent(new CustomEvent('metadrive:page-flow-mutated',{
          detail:{pageSessionKey,sessionId}
        }));
      }catch(error){
        setActionError(error instanceof Error?error.message:'Unable to apply Flow outputs');
      }
    };
    const fail=(event:Event)=>{
      const detail=(event as CustomEvent<{requestId?:string}>).detail;
      if(typeof detail?.requestId==='string')pendingFlowOutputs.current.delete(detail.requestId);
    };
    window.addEventListener('metadrive:flow-completed',complete);
    window.addEventListener('metadrive:flow-failed',fail);
    window.addEventListener('metadrive:flow-paused',fail);
    return ()=>{
      window.removeEventListener('metadrive:flow-completed',complete);
      window.removeEventListener('metadrive:flow-failed',fail);
      window.removeEventListener('metadrive:flow-paused',fail);
      pendingFlowOutputs.current.clear();
    };
  },[pageSessionKey]);
  // Any Flow mutation invalidates all components sharing this page session.
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{pageSessionKey:string;sessionId:string}>).detail;
      if (detail?.pageSessionKey !== pageSessionKey) return;
      if (detail.sessionId && detail.sessionId !== sessionId) {
        setSessionId(detail.sessionId);
        setSelectedCategories({});
        setSelectedFilterRecords({});
      }
      setRevision(value => value + 1);
    };
    window.addEventListener('metadrive:page-flow-mutated', sync);
    return () => window.removeEventListener('metadrive:page-flow-mutated', sync);
  }, [pageSessionKey, sessionId]);
  useEffect(() => {
    let active = true;
    setRecords([]);
    setRecordsForRequest('');
    setRecordTotal(0);
    setDataError('');
    if (!objectApiName || recordQuery.blocked || relatedQuery.blocked) {
      setDataLoading(false);
      return () => { active = false; };
    }
    setDataLoading(true);
    // Existing shared Object API enforces tenant, field and record permissions.
    void loadFlowScreenRecordPage(objectApiName,{
      limit:recordPageSize,offset:recordOffset,
      filter:relatedQuery.filter??(recordQuery.serverFilterable?recordQuery.filter:undefined),
      filters:recordQuery.filters,filterLogic:recordQuery.filterLogic
    })
      .then((page) => { if (active) {setRecords(page.records);setRecordsForRequest(recordRequestKey);setRecordTotal(page.total);} })
      .catch((reason: unknown) => {
        if (active) setDataError(reason instanceof Error ? reason.message : 'Unable to load records');
      })
      .finally(() => { if (active) setDataLoading(false); });
    return () => { active = false; };
  }, [objectApiName, recordQueryKey, recordOffset, revision]);
  useEffect(() => {
    setChannelAccess({userId:'',viewAll:false,grants:[],eligibleAssignees:[]});
    const accessPath=String(properties.channelAccessPath??'');
    if(!/^\/[A-Za-z0-9/_-]+$/.test(accessPath))return;
    let active = true;
    setChannelAccess({userId:'',viewAll:false,grants:[],eligibleAssignees:[]});
    void apiRequest<{userId:string;viewAll:boolean;grants:ChannelGrant[];eligibleAssignees:{id:string;name:string;channelAccountId:string}[]}>(accessPath)
      .then(value => {if(active) setChannelAccess(value);})
      .catch(() => {if(active) setChannelAccess({userId:'',viewAll:false,grants:[],eligibleAssignees:[]});});
    return () => {active = false;};
  }, [properties.channelAccessPath, properties.recordPresenterApiName, revision]);
  // Hydrate only referenced parent fields per row. Duplicate lookup IDs share
  // authorised requests and a concurrency limit; no cross-object first-row fallback.
  const mentionInputs:Record<string,unknown>={...properties};
  if(Array.isArray(properties.filters))properties.filters.forEach((filter,index)=>{
    if(!filter||typeof filter!=='object'||Array.isArray(filter))return;
    const entry=filter as {field?:unknown;value?:unknown};
    mentionInputs['filterField'+index]=entry.field;
    mentionInputs['filterValue'+index]=entry.value&&typeof entry.value==='object'
      ?(entry.value as {key?:unknown}).key:entry.value;
  });
  const mentionKey=JSON.stringify(Object.entries(mentionInputs)
    .filter(([,value])=>typeof value==='string'&&value.includes('@')));
  const currentRecords=recordsForRequest===recordRequestKey?records:[];
  const collectionKey=JSON.stringify([objectApiName,recordRequestKey,currentRecords.map(row=>row.Id),mentionKey]);
  const [collectionMentions,setCollectionMentions]=useState<{key:string;rows:Record<string,unknown>[]} | null>(null);
  useEffect(()=>{
    let active=true;
    setCollectionMentions(null);
    if(!objectApiName||!currentRecords.length||
      !referencedMentionPaths(mentionInputs,objects,objectApiName).length)return()=>{active=false;};
    const getRecord=async(target:string,id:string)=>{
      const result=await apiRequest<{record:Record<string,unknown>}>(
        '/records/'+encodeURIComponent(target)+'/'+encodeURIComponent(id));
      return result.record?.Id===id?result.record:undefined;
    };
    void resolveCollectionMentionRows(objects,objectApiName,currentRecords,mentionInputs,getRecord)
      .then(rows=>{if(active)setCollectionMentions({key:collectionKey,rows});})
      .catch(()=>{if(active)setCollectionMentions(null);});
    return()=>{active=false;};
  },[collectionKey,currentRecords,objects,objectApiName,apiRequest]);
  const sourceRecords=collectionMentions?.key===collectionKey?collectionMentions.rows:currentRecords;
  const filteredRecords=recordQuery.filters?sourceRecords:filterPageComponentRecords(
    sourceRecords,properties.filters,filterFields,{pageState,recordId,sessionId},properties.filterLogic==='OR'?'OR':'AND');
  const visibleRecords=relatedField?filterRelatedRecords(filteredRecords,parentId,relatedField):filteredRecords;
  const mentionContext = useRelationshipMentionContext(objects, mentionRootObjectApiName,
    recordId || explicitMentionRecordId(properties), properties, apiRequest, revision);
  const resolvedProperties = bindPageStateProperties(resolveMentionProperties(properties, mentionContext.records, mentionContext.fields, objects, mentionRootObjectApiName),pageState);
  const rowResolvedProperties={...resolvedProperties,...Object.fromEntries(
    Object.entries(properties).filter(([,value])=>typeof value==='string'&&
      /@[A-Za-z][A-Za-z0-9_]*\.[A-Za-z]/.test(value)))};
  const categoryFilterKey = typeof properties.filterKey === 'string' ? properties.filterKey : 'category';
  const categorySource = selectedFilterRecords[categoryFilterKey];
  const configuredCategoryField = String(properties.categoryFieldApiName??'').trim();
  const inferredCategoryField = !configuredCategoryField && categorySource?.sourceObjectApiName
    ? fields.find(field=>field.relationship?.targetObject===categorySource.sourceObjectApiName
      || field.dataType==='Lookup('+categorySource.sourceObjectApiName+')')?.apiName
    : undefined;
  const presented = presentPageRecords(properties.recordPresenterApiName, visibleRecords, channelAccess, properties);
  // A record page already fetched its exact authorised record by ID. Use it
  // even when the record is beyond the first page of the Object list.
  const boundRecordId=recordId||explicitMentionRecordId(properties);
  const currentBoundRecord=mentionContext.records[objectApiName];
  const boundRows=boundRecordId&&currentBoundRecord?.Id===boundRecordId
    ?[currentBoundRecord]:visibleRecords;
  const toggleBinding=resolveSmartToggleFieldBinding(definition.apiName,properties,objectApiName,fields,
    boundRows,recordTotal,boundRecordId);
  const toggleCanWrite=Boolean(toggleBinding?.ready&&!disableActions&&
    behaviorAction(properties,'change',behaviorContext??{formFactor})==='enabled');
  const changeBoundToggle=async(next:boolean)=>{
    if(!toggleBinding||!toggleCanWrite)throw new Error('Toggle field is not editable.');
    try{
      await updateSmartToggleField(apiRequest,objectApiName,toggleBinding,next);
      setActionError('');setRevision(value=>value+1);
      window.dispatchEvent(new CustomEvent('metadrive:page-flow-mutated',{
        detail:{pageSessionKey,sessionId}
      }));
    }catch(error){setActionError(error instanceof Error?error.message:'Toggle update failed');throw error;}
  };
  const rawActions = properties.actionFlows;
  const actionFlows = rawActions && typeof rawActions === 'object' && !Array.isArray(rawActions)
    ? rawActions as Record<string, unknown> : {};
  const resolveInput = (source: unknown, eventPayload: Record<string, unknown>): unknown => {
    if(source&&typeof source==='object'&&!Array.isArray(source))
      return resolveStructuredFlowInput(source as Record<string,unknown>,
       candidate=>resolveInput(candidate,eventPayload));
    if (source === '$session') return sessionId;
    if (typeof source === 'string' && source.startsWith('$state.')) {
      const key=source.slice(7);
      return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) ? pageState[key] : undefined;
    }
    if (source === '$event') return eventPayload;
    if (typeof source === 'string' && source.startsWith('$event.')) {
      return source.slice(7).split('.').reduce<unknown>((current, key) =>
        current && typeof current === 'object' && !['__proto__','prototype','constructor'].includes(key)
          ? (current as Record<string, unknown>)[key] : undefined, eventPayload);
    }
    if (typeof source === 'string' && source.startsWith('$record.')) {
      const fieldName = source.slice(8);
      return /^[A-Za-z][A-Za-z0-9_]*$/.test(fieldName) ? mentionContext.records[mentionRootObjectApiName]?.[fieldName] : undefined;
    }
    return source;
  };
  const onAction = async (action: { event: string; value?: unknown }) => {
    if(disableActions)throw new Error('Page Builder preview is read-only.');
    if(behaviorAction(properties,action.event,behaviorContext??{formFactor})!=='enabled')
      throw new Error('This action is unavailable under the published Page rules.');
    const validationError=behaviorValidation(properties,action.event,behaviorContext??{formFactor});
    if(validationError)throw new Error(validationError);
    const interactions=pageBehaviors(properties)?.interactions;
    const hasInteraction=Array.isArray(interactions)&&interactions.some(item=>item?.event===action.event);
    if(hasInteraction)window.dispatchEvent(new CustomEvent('metadrive:page-component-interaction',{
      detail:{pageSessionKey,componentId:component.id,event:action.event,value:action.value}
    }));
    const config = actionFlows[action.event];
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      if(hasInteraction)return {updated:true};
      throw new Error('No metadata event action is configured for "' + action.event + '".');
    }
    const binding = config as Record<string, unknown>;
    if (binding.actionType === 'SetFilter') {
      const filterKey = String(binding.filterKey || 'category');
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(filterKey)) throw new Error('Invalid filter key');
      const value = typeof action.value === 'object' && action.value !== null
        ? String(('value' in action.value ? (action.value as {value:unknown}).value : 'label' in action.value
          ? (action.value as {label:unknown}).label : '') ?? '')
        : String(action.value ?? '');
      const source = action.value && typeof action.value === 'object' ? action.value as Record<string,unknown> : {};
      window.dispatchEvent(new CustomEvent('metadrive:page-filter-selected', {detail:{
        pageSessionKey,filterKey,value,label:String(source.label??value),
        recordId:String(source.recordId??''),sourceObjectApiName:String(source.sourceObjectApiName??'')
      }}));
      return {selected:value};
    }
    if (disableActions) throw new Error('Builder preview permits local filters only. Publish the page to run Flows or navigation.');
    if (binding.actionType==='PageState'){
      const key=String(binding.stateKey??'');
      if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key))throw new Error('Page state action requires a valid key');
      const payload=action.value&&typeof action.value==='object'&&!Array.isArray(action.value)
        ?action.value as Record<string,unknown>:{value:action.value};
      const value=resolveInput(binding.value??'$event',payload);
      window.dispatchEvent(new CustomEvent('metadrive:page-local-state',{detail:{pageSessionKey,key,value}}));
      return {updated:true};
    }
    if (binding.actionType === 'Navigate') {
      const target = resolvePageActionRoute(binding, {
        objects, apps, pages, currentAppId, defaultObjectApiName: objectApiName
      });
      // Server endpoints enforce the final object and page authorization checks.
      onNavigate(target);
      return { navigated: true };
    }
    const flowApiName = String(binding.flowApiName ?? '');
    const selected = availableFlows.find((flow) => flow.apiName === flowApiName && flow.status === 'Active');
    if (!selected || selected.status !== 'Active') {
      throw new Error('Choose an active Flow for the "' + action.event + '" action in Page Builder.');
    }
    const payload = action.value && typeof action.value === 'object' && !Array.isArray(action.value)
      ? action.value as Record<string, unknown> : { value: action.value };
    const inputs = Object.fromEntries(Object.entries(
      binding.inputs && typeof binding.inputs === 'object' && !Array.isArray(binding.inputs)
        ? binding.inputs as Record<string, unknown> : {}
    ).map(([key, source]) => [key, resolveInput(source, payload)]));
    if(binding.outputs!==undefined&&(!binding.outputs||typeof binding.outputs!=='object'||Array.isArray(binding.outputs)))
      throw new Error('Flow output mappings must be an object.');
    const outputMappings:Record<string,unknown>={};
    if(binding.outputs!==undefined)Object.assign(outputMappings,binding.outputs);
    resolveFlowOutputBindings({},outputMappings);
    setActionError('');
    if (selected.flowType === 'Screen Flow') {
      const requestId=crypto.randomUUID();
      if(pendingFlowOutputs.current.size>=10)throw new Error('Too many pending Flow output mappings.');
      pendingFlowOutputs.current.set(requestId,{flowApiName,mappings:outputMappings});
      onLaunchFlow(flowApiName, inputs,{requestId});
      return { interviewStarted: true };
    }
    if (selected.flowType !== 'Autolaunched Flow') {
      throw new Error('Component event Flow must be Screen or Autolaunched.');
    }
    try {
      const response = await apiRequest<{ outputs?: Record<string, unknown>; interviewId?: string }>(
        '/flows/' + encodeURIComponent(flowApiName) + '/execute', {
          method: 'POST', body: JSON.stringify(inputs)
        });
      if (response.interviewId) throw new Error('This action was paused by a Flow Wait element.');
      const flowOutputs=response.outputs&&typeof response.outputs==='object'&&!Array.isArray(response.outputs)
        ?response.outputs:{};
      for(const item of resolveFlowOutputBindings(flowOutputs,outputMappings))
        window.dispatchEvent(new CustomEvent('metadrive:page-local-state',{
          detail:{pageSessionKey,key:item.key,value:item.value}
        }));
      let completedSessionId = sessionId;
      if (binding.resetSessionOnSuccess === true) {
        const key = 'metadrive-page-session:' + pageSessionKey;
        const newSession = crypto.randomUUID();
        try { window.sessionStorage.setItem(key, newSession); } catch { /* private session */ }
        completedSessionId = newSession;
        setSessionId(newSession);
      }
      setRevision((value) => value + 1);
      window.dispatchEvent(new CustomEvent('metadrive:page-flow-mutated', {
        detail: {pageSessionKey,sessionId: completedSessionId}
      }));
      return {
        ...response,
        completed: typeof binding.successOutput === 'string'
          && response.outputs?.[binding.successOutput] === binding.successValue
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Flow action failed';
      setActionError(message);
      throw error;
    }
  };
  useEffect(() => {
    if (disableActions || !actionFlows.start || initializedSessions.current.has(sessionId)) return;
    initializedSessions.current.add(sessionId);
    void onAction({ event: 'start', value: {} }).catch(() => {
      initializedSessions.current.delete(sessionId);
    });
  }, [sessionId, disableActions]);
  // When the component is placed on a free canvas, its frame owns geometry.
  // The record-binding layer must not introduce another auto-sized visual box.
  const smartCanvas=definition.apiName.startsWith('smart_')&&Boolean(component.position);
  // Data-bound Images need the same full-height wrapper as the unbound image
  // so the selected canvas dimensions also resize the picture itself.
  const imageCanvas=definition.apiName==='ui_image'&&Boolean(component.position);
  // A free-canvas Card Grid has an authored, bounded frame. Fill that frame
  // so the card list, not the page canvas, owns vertical scrolling.
  const boundedCardGrid=definition.apiName==='ui_item_grid'&&Boolean(component.position);
  return <div className={boundedCardGrid?'md-card-grid-bound':undefined}
    style={smartCanvas||imageCanvas||definition.apiName==='smart_toggle'||boundedCardGrid
    ?{width:'100%',height:'100%',minHeight:0,minWidth:0}:undefined}>
    {!objectApiName && <div className="records-message" role="alert">Select a bound object to load records for this component.</div>}
    {dataError && <div className="records-message" role="alert">{dataError}</div>}
    <RegisteredComponent definition={definition} layoutTransparent={smartCanvas} props={{
      ...rowResolvedProperties, ...componentLayoutProps(properties, formFactor),
      ...(smartCanvas?{width:component.position!.width,height:component.position!.height}:{}),
      ...(boundedCardGrid?{boundedViewport:true}:{}),
      ...(categoryFilterKey ? {
        selectedCategory:selectedCategories[categoryFilterKey] ?? String(properties.selectedCategory ?? ''),
        selectedCategoryLabel:categorySource?.label ?? '',selectedCategoryRecordId:categorySource?.recordId ?? '',
        categoryFieldApiName:configuredCategoryField||inferredCategoryField||''
      } : {}),
      ...(typeof properties.searchKey === 'string' && properties.searchKey ? {searchQuery:selectedCategories[properties.searchKey] ?? ''} : {}),
      label: component.label, properties: rowResolvedProperties, pageState, objects, reports, flows: availableFlows,
       pageSessionKey, componentId: component.id,
      device: formFactor, onNavigate, onLaunchFlow, onAction, actionError,
      disabled:behaviorAction(properties,'click',behaviorContext??{formFactor})!=='enabled',
      loadAsset: (id:string) => /^[0-9a-f-]{36}$/i.test(id)
        ? apiRequest<{contentType:string;contentBase64:string}>('/media-assets/'+id)
        : Promise.reject(new Error('Invalid media asset ID')),
      loadCompanySettings: () => apiRequest('/metadata/currencies'),
      onChange: (value: unknown) => {
        if (actionFlows.change || (Array.isArray(pageBehaviors(properties)?.interactions)
          &&(pageBehaviors(properties)!.interactions as Array<{event?:unknown}>).some(item=>item?.event==='change')))
          void onAction({ event: 'change', value }).catch(() => {});
      },
      loading: dataLoading, sessionId, previewOnly: disableActions,
      // Only bind scalar expressions when one authorised record is in scope.
      // Multi-row components resolve their per-row values inside their own renderer.
      ...(visibleRecords.length===1 ? {record:visibleRecords[0]} : {}),
      ...(objectApiName ? { records: visibleRecords } : {}),
      ...(objectApiName ? {recordPagination:{
        limit:recordPageSize,offset:recordOffset,total:recordTotal,
        hasPrevious:recordOffset>0,hasNext:recordOffset+recordPageSize<recordTotal,
        available:recordQuery.serverFilterable
      }} : {}),
      ...presented,
      ...(toggleBinding?{toggleFieldBound:true,toggleFieldReady:toggleCanWrite,
        toggleFieldError:toggleBinding.error??'',
        value:toggleBinding.ready?toggleBinding.value:false,
        onBoundToggleChange:changeBoundToggle}:{})
    }} />
    {objectApiName&&recordQuery.serverFilterable&&recordTotal>recordPageSize&&<nav
      className="records-pagination" aria-label={component.label+' record pages'}>
      <button type="button" className="btn" disabled={dataLoading||recordOffset===0}
        onClick={()=>setRecordOffset(offset=>Math.max(0,offset-recordPageSize))}>Previous</button>
      <span>{recordOffset+1}–{Math.min(recordOffset+recordPageSize,recordTotal)} of {recordTotal}</span>
      <button type="button" className="btn" disabled={dataLoading||recordOffset+recordPageSize>=recordTotal}
        onClick={()=>setRecordOffset(offset=>offset+recordPageSize)}>Next</button>
    </nav>}
    {objectApiName&&!recordQuery.serverFilterable&&recordTotal>recordPageSize&&<p role="status">
      Results are incomplete: this filter was applied only to the first 100 fetched records. Additional matches may exist; pagination is unavailable for this filter combination.
    </p>}
  </div>;
}
