import {componentSettingAvailable,type PropertyDevice} from '../../components/Properties/componentSettingDefinitions';
import {metadataReference,metadataSelection,resolveMetadataProperties,metadataFieldObject} from '../../metadata/Definitions/metadataReferences';
import TenantMediaPicker from './TenantMediaPicker';
import { createPageRuntimeViews } from '../../pages/PageRuntime/pageRuntimeViews';
import { createSetupApp } from '../../workspace/SetupShell/setupAppShell';
import { createRecordWorkspaceViews } from '../../records/RecordWorkspace/recordWorkspaceViews';
import { createPageBuilder } from '../PageBuilder/pageBuilderView';
import { ReportBuilder } from '../ReportBuilder/reportBuilderView';
import { createPermissions } from '../../security/Permissions/permissionsView';
import { createObjectManager } from '../ObjectManager/objectManagerView';
import { createSetupHome } from '../../settings/SetupHome/setupHomeView';
import { createSettingsViews } from '../../settings/SettingsWorkspace/settingsWorkspaceViews';
import { pageLayoutForRecord, compactLayoutForRecord, matchesLookupFilterGroup, relatedLookupFilterOperators, type RecordData } from '../../records/RecordWorkspace/recordMetadataUtils';
import { formatRecordValue, parseCsvImport } from '../../records/RecordWorkspace/recordCsvUtils';
import { initialScreenValues, screenFieldIsVisible } from '../../automation/FlowScreen/flowScreenRuntimeUtils';
import { objectSettings, parseAppRoute, appRoutePath, type AppRoute } from '../../workspace/Navigation/appRouting';
import { NavigationLoadTime, resolveCurrentAppNavigation } from '../../workspace/Navigation/appNavigationView';
import { isStandalonePagePresentation, pageCanvasPresentationStyle } from '../../pages/PageRuntime/pageRuntimePresentation';
import { insertFlowElementAtPath } from '../FlowBuilder/flowInsertElement.mjs';
import AdvancedSharingSettings from '../../security/Permissions/AdvancedSharingSettings';
import {resolveSetupNavigation} from '../../platform/Workspace/platformSetupNavigation';
import {readVerifiedMetadata,saveVerifiedMetadata,type MetadataPublicationResponse} from '../../metadata/Cache/verifiedMetadataCache';
import { queueOfflineRecord, listOfflineRecords, markOfflineRecord, removeOfflineRecord,
  synchronizeOfflineRecords, type OfflineQueueOwner, type OfflineRecordItem, type OfflineRecordWrite } from '../../metadata/Cache/offlineRecordQueue';
import SchemaBuilder from '../SchemaBuilder/SchemaBuilder';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ClipboardPaste,
  Command,
  Copy,
  Database,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  FileText,
  Filter,
  GripVertical,
  Grid2X2,
  ListFilter,
  Maximize2,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Puzzle,
  Smartphone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Scissors,
  Settings2,
  SlidersHorizontal,
  Star,
  Undo2,
  Redo2,
  Trash2,
  Tablet,
  UsersRound,
  X,
  Workflow,
  Wifi,
  WifiOff,
  PanelLeft,
  PanelRight
} from 'lucide-react';
import FlowBuilderWorkspace from '../FlowBuilder/FlowBuilder';
import FlowScreenContent from '../../automation/FlowScreen/FlowScreenContent';
import FlowLogs from '../../automation/FlowLogs/FlowLogs';
import FlowInterviews from '../../automation/FlowInterviews/FlowInterviews';
import ScheduledFlows from '../../automation/ScheduledFlows/ScheduledFlows';
import DashboardBuilder from '../DashboardBuilder/DashboardBuilder';
import ComponentLibrary from '../../components/ComponentLibrary/ComponentLibrary';
import RegisteredComponent from '../../components/RegisteredComponent/RegisteredComponent';
import CustomComponentPropertyEditor from './CustomComponentPropertyEditor';
import {pagePropertyContract} from '../../components/Properties/pagePropertyContract';
import SmartFieldInput from '../../../one/OneSmartFieldInput/SmartFieldInput';
import FlowInputBindingEditor from '../FlowInputBindingEditor/FlowInputBindingEditor';
import RecordFilterEditor from '../../../one/OneRecordFilterEditor/RecordFilterEditor';
import TableRowConfigurationEditor from './TableRowConfigurationEditor';
import PageStatePropertyBindingsEditor from './PageStatePropertyBindingsEditor';
import ComponentVisibilityEditor from './ComponentVisibilityEditor';
import PageRouteDirectory from '../../pages/PageRouteDirectory/PageRouteDirectory';
import { isComponentVisible } from '../../components/Properties/componentVisibility';
import PageComponentVisualEditor from '../ComponentStyleEditor/PageComponentVisualEditor';
import { canNestComponent, componentVisualStyle, directChildren, isLayoutType, isDescendantOf, layoutTypes } from '../../pages/TemplatePageRuntime/pageComponentLayout';
import PageComponentStyleEditor from '../ComponentStyleEditor/PageComponentStyleEditor';
import { isCanvasLocked, wrapCanvasComponent, ungroupCanvasComponent } from '../PageBuilder/canvasInteractions';
import { filterPageComponentRecords, needsMetadataComponentRuntime } from '../../pages/PageRuntime/pageComponentBindings';
import { childrenOf, canNest, componentLayoutProps, hasPageComponentAppearance, isLayoutContainer, rawLayoutParentId, reparentComponent, resolvePageComponentStyle, type LayoutDevice } from '../../pages/TemplatePageRuntime/pageComponentLayout';
import AppExchange from '../../applications/AppExchange/AppExchange';
import AppManager from '../../applications/AppManager/AppManager';
import PlatformWorkspaceSurface from '../../platform/Workspace/PlatformWorkspaceSurface';
import {GlobalRecordSearch} from '../../../one/OneGlobalRecordSearch/GlobalRecordSearch';
import {RecordObjectPicker} from '../../../one/OneRecordObjectPicker/RecordObjectPicker';
import {useDismissOnOutside} from '../../accessibility/Dismiss/useDismissOnOutside';
import { pageIsAvailableInApp, resolvePageActionRoute } from '../../pages/PageRuntime/pageActionRouting';
import NamedCredentials from '../../integrations/NamedCredentials/NamedCredentials';
import TenantManagement from '../../platform/TenantManagement/TenantManagement';
import TenantDomains from '../../platform/TenantDomains/TenantDomains';
import TenantRecoveryPanel from '../../platform/TenantRecoveryPanel/TenantRecoveryPanel';
import TenantUsagePanel from '../../platform/TenantUsagePanel/TenantUsagePanel';
import DeveloperAccountSettings from '../../settings/DeveloperAccountSettings/DeveloperAccountSettings';
import SettingsViewRow from '../../settings/SettingsViewRow/SettingsViewRow';
import ApprovalProcessManager from '../../automation/ApprovalProcessManager/ApprovalProcessManager';
import { standardPageComponents } from '../../components/Catalog/index';
import EmbeddedDashboard from '../../pages/EmbeddedDashboard/EmbeddedDashboard';
import { inspectPageDependencies } from '../../pages/PageRuntime/pageDependencies';
import {
  canvasDimensionsForOrientation,
  canvasBoundPosition,
  canvasOrientation,
  canvasScaleToFitWidth,
  canvasUnitsFromScreenDelta
} from '../../pages/PageRuntime/pageCanvas';
import {
  createComponentPreviewProps,
  getPageBuilderComponentCategories,
  pageBuilderPaletteCategories
} from '../PageBuilder/pageBuilderPalette';
import {
  defaultFlow,
  defaultLightningPage,
  defaultAccessControl,
  objectMetadata,
  setupShortcuts,
  workspaces,
  type ObjectMetadata,
  type FieldMetadata,
  type FieldSetMetadata,
  type PageLayoutMetadata,
  type PageLayoutCustomLinkMetadata,
  type CompactLayoutMetadata,
  type RecordTypeMetadata,
  type RelatedLookupFilterMetadata,
  type ObjectActionMetadata,
  type ObjectSettingsMetadata,
  type ProfileMetadata,
  type PageActivationAssignmentMetadata,
  type FlowDefinitionMetadata,
  type FlowExecutionLogMetadata,
  type FlowInterviewMetadata,
  type FlowElementMetadata,
  type FlowResourceMetadata,
  type FlowValidationMetadata,
  type PlatformEventMetadata,
  type LightningPageTemplate,
  type NamedCredentialMetadata,
  type EmailAlertMetadata,
  type CustomNotificationMetadata,
  type ApprovalRequestMetadata,
  type ApprovalProcessMetadata,
  type ApprovalProcessInput,
  type ConnectorProviderMetadata,
  type IntegrationConnectionMetadata,
  type LightningPageMetadata,
  type PageComponentMetadata,
  type LibraryComponentMetadata,
  type DashboardFilterMetadata,
  type DashboardMetadata,
  type DashboardFolderMetadata,
  type DashboardFolderInput,
  type DashboardTerritoryMetadata,
  type DashboardSubscription,
  type DashboardSubscriptionInput,
  type DashboardSnapshot,
  type ReportMetadata,
  type ReportBucketMetadata,
  type ReportFolderMetadata,
  type ReportFolderInput,
  type ReportRunMetadata,
  type ReportStandardFiltersMetadata,
  type ReportFilterMetadata,
  type ReportDateRange,
  type ReportDateGrouping,
  type ReportSummaryOperation,
  type ReportCrossFilterMetadata,
  type AccessControlMetadata,
  type CurrencySettingsMetadata,
  type LightningAppMetadata,
  type PermissionSetMetadata,
  type PermissionSetGroupMetadata,
  type PublicGroupMetadata,
  type QueueMetadata,
  type SharingRuleMetadata,
  type UserMetadata,
  type WorkspaceId
} from '../../metadata/Definitions/metadata';


type ComponentPropertyRecord = Record<string, unknown>;

export function MetadataComponentProperties({ properties, objects, apps, pages, currentAppId, flows, onChange, definitions, device, componentVersion, eventDefinitions = [], primaryObjectApiName = '', pageComponents = [], componentCatalog = [] }: { definitions?: LibraryComponentMetadata['propertyDefinitions']; eventDefinitions?: LibraryComponentMetadata['eventDefinitions'];
  pageComponents?:PageComponentMetadata[];componentCatalog?:LibraryComponentMetadata[];
  device?:PropertyDevice; componentVersion?:number;
  primaryObjectApiName?: string;
  properties: ComponentPropertyRecord;
  objects: ObjectMetadata[];
  apps: LightningAppMetadata[];
  pages: LightningPageMetadata[];
  currentAppId: string;
  flows: FlowDefinitionMetadata[];
  onChange: (next: ComponentPropertyRecord) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [guidedStep,setGuidedStep] = useState<'data'|'filters'|'actions'>('data');
  const [newEventName, setNewEventName] = useState('');
  const [fieldSearch, setFieldSearch] = useState<Record<string,string>>({});
  const [advancedDraft, setAdvancedDraft] = useState('');
  const [advancedError, setAdvancedError] = useState('');
  const objectApiName = String(resolveMetadataProperties(properties,objects,flows).objectApiName ?? properties.targetObject ?? primaryObjectApiName ?? '');
  const selectedObject = objects.find((candidate) => candidate.apiName === objectApiName);
  const actionFlows = properties.actionFlows && typeof properties.actionFlows === 'object' && !Array.isArray(properties.actionFlows)
    ? properties.actionFlows as Record<string, unknown> : null;
  const fields = selectedObject?.fields ?? [];
  const app = apps.find(candidate => candidate.apiName === currentAppId);
  const appObjectApiNames = Array.from(new Set([
    ...(app?.navigationItems ?? []),
    ...(app?.navigationOrder ?? []).filter(entry => entry.type === 'Object').map(entry => entry.apiName),
    objectApiName, primaryObjectApiName
  ].filter(Boolean)));
  const update = (key: string, value: unknown) => onChange({ ...properties, [key]: value });
  const bindableNames=[...new Set(componentCatalog.flatMap(component=>(component.propertyDefinitions??[])
    .filter(definition=>definition.isBindable===true).map(definition=>definition.propertyKey)))].sort();
  const allowedEventNames=[...new Set(['click','change',...eventDefinitions.map(e=>e.apiName)])];
  const actionNames=[...new Set([...allowedEventNames,...(Array.isArray(properties.actions)
    ?properties.actions.filter((name):name is string=>typeof name==='string'):[]),
    ...(selectedObject?.actions??[]).map(action=>action.id)])];
  const targetBindableOptions:Record<string,Array<{key:string;label:string}>>={};
  for(const target of pageComponents){
    const library=target.type.startsWith('Custom:')?componentCatalog.find(c=>c.apiName===target.type.slice(7)):undefined;
    targetBindableOptions[target.id]=(library?.propertyDefinitions??[])
      .filter(d=>d.isBindable===true).map(d=>({key:d.propertyKey,label:d.label}));
  }
  const behaviorPickers:Record<string,Array<{key:string;label:string}>>={
    fieldApiName:fields.map(field=>({key:field.apiName,label:field.label})),
    actionId:actionNames.map(key=>({key,label:key})),
    event:allowedEventNames.map(key=>({key,label:eventDefinitions.find(e=>e.apiName===key)?.label??key})),
    tabId:(Array.isArray(properties.tabs)?properties.tabs:[]).filter((name):name is string=>typeof name==='string').map(key=>({key,label:key})),
    targetComponentId:pageComponents.map(component=>({key:component.id,label:component.label+' ('+component.type+')'})),
    targetProperty:bindableNames.map(key=>({key,label:key}))
  };
  const availableDefinitions=(definitions??[]).filter(d=>componentSettingAvailable(d,device,componentVersion));
  const structuredDefinitions=availableDefinitions.filter(d=>['GROUP','COLLECTION','STRING_LIST'].includes(d.kind));
  const structuredKeys=new Set(structuredDefinitions.map(d=>d.propertyKey));
  const unavailableKeys=new Set((definitions??[]).filter(d=>!componentSettingAvailable(d,device,componentVersion)).map(d=>d.propertyKey));
  const definitionsByKey = new Map(availableDefinitions.map(definition => [definition.propertyKey, definition]));
  const listProperty = (key: string) => {
    const value = properties[key];
    return Array.isArray(value) ? value : [];
  };
  const sourceKeys = new Set(['libraryComponentId', 'targetObject', 'flowApiName',
    'actionFlows', 'pagePropertyContract', 'columns', 'rowActions', 'stateBindings', 'layoutContainer', 'layoutParentId', 'layoutStyle', 'layoutResponsive']);
  const isObjectBinding = (key: string) => key === 'objectApiName' || key.endsWith('ObjectApiName');
  const isField = (key: string) => /(?:Field|FieldApiName)$/.test(key);
  const isFilter = (key: string) => key === 'filters' || key.endsWith('Filters');
  const objectBindings = Array.from(new Set(['objectApiName', ...Object.keys(properties).filter(isObjectBinding)]));
  const fieldsFor = (key:string) => metadataFieldObject(objects,{...properties,objectApiName},key)?.fields??[];
  const labelFor = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ApiName$/, '').replace(/^./, (v) => v.toUpperCase());
  const propertySectionFor = (key: string, definition?: NonNullable<LibraryComponentMetadata['propertyDefinitions']>[number]) => {
    const metadata = definition as { section?: string; group?: string } | undefined;
    const declared = String(metadata?.section ?? metadata?.group ?? '').toLowerCase();
    const name = (declared + ' ' + key).toLowerCase();
    if (/responsive|breakpoint|mobile|tablet|desktop|device|orientation/.test(name)) return 'Responsive';
    if (/layout|position|width|height|align|column|rowspan|grid|gap|padding|margin|flex|wrap|direction|span/.test(name)) return 'Layout';
    if (/content|title|label|text|description|placeholder|heading|icon|image|src|empty|badge|subtitle|price|button|message|option/.test(name)) return 'Content';
    return 'Appearance';
  };
  const showCurrencySetting = Boolean(properties.priceFieldApiName) && (() => {
    const field = metadataSelection(fieldsFor('priceFieldApiName'), properties.priceFieldApiName);
    return Boolean(field && /currency|money/i.test(String(field.dataType ?? '')));
  })();
  const fieldPicker = (key: string, value: unknown) => {
    const choices=fieldsFor(key);
    const selected=metadataSelection(choices,value);
    const selectedName=selected?.label ?? selected?.apiName ?? String(value??'');
    const searchId='field-list-'+key.replace(/[^A-Za-z0-9_-]/g,'');
    return <label className="form-label" key={key}>{labelFor(key)}
      <input className="form-control" list={searchId} placeholder={choices.length?'Search or choose a field…':'Select an object first'}
        disabled={!choices.length} value={fieldSearch[key]??selectedName}
        onChange={event=>{
          const entered=event.target.value;
          setFieldSearch(previous=>({...previous,[key]:entered}));
          const match=choices.find(field=>field.label===entered||field.apiName===entered);
          if(match) update(key,match.id?metadataReference(match.id):match.apiName);
          if(!entered) update(key,'');
        }}
        onBlur={()=>setFieldSearch(previous=>{const next={...previous};delete next[key];return next;})}/>
      <datalist id={searchId}>
        {choices.map(field=><option key={field.apiName} value={field.label} label={field.apiName}/>)}
      </datalist>
    </label>;
  };
  return <div className="metadata-component-properties">
    <nav className="builder-connect-steps" aria-label="Configure block without code">
      {([{id:'data',name:'1. Connect data'},{id:'filters',name:'2. Choose records'},
        {id:'actions',name:'3. Set actions'}] as const).map(step=>
        <button type="button" key={step.id} className={guidedStep===step.id?'active':''}
          aria-pressed={guidedStep===step.id} onClick={()=>setGuidedStep(step.id)}>{step.name}</button>)}
    </nav>
    <section hidden={guidedStep!=='data'} aria-label="Choose data and field bindings">
      <p className="properties-help">Choose an object, then select fields and how records are displayed. These options use the shared data engine.</p>
    {typeof properties.layoutParentId === 'string' && properties.layoutParentId && <label className="form-label">Split pane placement
      <select className="form-control" value={String(properties.layoutPane ?? 'first')}
        onChange={(event) => update('layoutPane', event.target.value)}>
        <option value="first">First / left pane</option>
        <option value="second">Second / right pane</option>
      </select>
    </label>}

    {objectBindings.map((key) => <label className="form-label" key={key}>{key === 'objectApiName' ? 'Connect to data' : labelFor(key)}
      <select className="form-control" value={metadataSelection(objects,properties[key])?.apiName??String(properties[key]??'')}
        onChange={(event) => {
          const object=objects.find(o=>o.apiName===event.target.value);
          update(key,object?.id?metadataReference(object.id):event.target.value);
        }}>
        <option value="">No object selected</option>
        {objects.map((object) => <option key={object.apiName} value={object.apiName}>{object.label}</option>)}
      </select>
    </label>)}
    {Object.keys(properties).filter(isField).map((key) => fieldPicker(key, properties[key]))}
    {(properties.kind === 'Table' || (definitionsByKey.has('striped') && definitionsByKey.has('pageSize')))
      && <TableRowConfigurationEditor properties={properties} object={selectedObject} onChange={onChange}/>}
    <details className="builder-advanced-panel"><summary>Advanced: connect to a page value</summary><p className="properties-help">Optional: use a value supplied by another block or automation.</p><PageStatePropertyBindingsEditor properties={properties} definitions={definitions} onChange={onChange}/></details>
      <button type="button" className="btn btn-small" onClick={()=>setGuidedStep('filters')}>Next: Choose records</button>
    </section>
    <section hidden={guidedStep!=='filters'} aria-label="Filter records">
      <p className="properties-help">Show all records or add field conditions. Date and number options follow each field type.</p>
      {Array.from(new Set(['filters', ...Object.keys(properties).filter(isFilter)])).map(key =>
        <RecordFilterEditor key={key} title={key === 'filters' ? 'Which records?' : labelFor(key)} fields={fieldsFor(key)}
          filters={listProperty(key)} onChange={filters => update(key, filters)} />)}
      <button type="button" className="btn btn-small" onClick={()=>setGuidedStep('actions')}>Next: Set actions</button>
    </section>
    <section hidden={guidedStep!=='actions'} aria-label="Configure actions and automations">
    <div className="properties-section-title">What happens?</div>
    <p className="properties-help">Choose what this block should do when someone uses it. Available actions and destinations depend on the block.</p>
    {Object.entries(actionFlows ?? {}).map(([eventName, raw]) => {
      const binding = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      const map = binding.inputs && typeof binding.inputs === 'object' && !Array.isArray(binding.inputs) ? binding.inputs as Record<string, unknown> : {};
      const outputMap = binding.outputs && typeof binding.outputs === 'object' && !Array.isArray(binding.outputs)
        ? binding.outputs as Record<string, unknown> : {};
      const selectedFlow = metadataSelection(flows,binding.flowApiName);
      const setBinding = (next: Record<string, unknown>) => update('actionFlows', {...(actionFlows ?? {}), [eventName]:next});
      const actionType = binding.actionType === 'Navigate' ? 'Navigate' : binding.actionType === 'SetFilter' ? 'SetFilter' : binding.actionType==='PageState'?'PageState':'Flow';
      const navigationTargetType = binding.navigationTargetType === 'App Home' || binding.navigationTargetType === 'App Page'
        ? binding.navigationTargetType : 'Record List';
      const navigationAppId = String(binding.navigationAppId || (navigationTargetType === 'Record List' ? 'Records' : currentAppId));
      const navigationApp = apps.find((app) => app.apiName === navigationAppId);
      const navigationPages = navigationApp ? pages.filter((page) => pageIsAvailableInApp(page, navigationApp)) : [];
      const navigationPreview = actionType === 'Navigate' ? (() => {
        try {
          return appRoutePath(resolvePageActionRoute(binding, {
            objects, apps, pages, currentAppId, defaultObjectApiName: objectApiName
          }));
        } catch {
          return '';
        }
      })() : '';
      return <div className="home-page-assignment" key={eventName}>
        <strong>{eventDefinitions.find(event => event.apiName === eventName)?.label ?? labelFor(eventName)}</strong>
        <button type="button" className="btn btn-small" onClick={() => {const next={...(actionFlows ?? {})};delete next[eventName];update('actionFlows',next);}}>Remove action</button>
        <label className="form-label">Choose an action<select className="form-control" value={actionType}
          onChange={(e) => setBinding({...binding,actionType:e.target.value})}>
          <option value="Flow">Run automation</option><option value="Navigate">Open another page</option><option value="SetFilter">Filter a list</option><option value="PageState">Update page value</option>
        </select></label>
        {actionType==='PageState' ? <div>
               <label className="form-label">Page state key<input className="form-control"
                 value={String(binding.stateKey??'')} placeholder="selectedRecord"
                 onChange={e=>setBinding({...binding,stateKey:e.target.value})}/></label>
               <label className="form-label">Value source<select className="form-control"
                 value={String(binding.value??'$event')} onChange={e=>setBinding({...binding,value:e.target.value})}>
                 <option value="$event">Entire component event</option>
                 <option value="$event.value">Selected value</option>
                 <option value="$event.record">Selected record (use a Flow for collections)</option>
                 <option value="$session">Current session</option>
               </select></label>
             </div> : actionType==='SetFilter' ? <label className="form-label">Shared filter key
          <input className="form-control" value={String(binding.filterKey ?? 'category')}
            onChange={(e) => setBinding({...binding,filterKey:e.target.value})}
            placeholder="category" pattern="[A-Za-z][A-Za-z0-9_]*" />
        </label> : actionType==='Flow' ? <>
          <label className="form-label">Automation
            <select className="form-control" value={selectedFlow?.apiName??String(binding.flowApiName??'')}
              onChange={(e) => {const flow=flows.find(f=>f.apiName===e.target.value&&f.status==='Active');setBinding({ ...binding, flowApiName: flow?.id?metadataReference(flow.id):e.target.value });}}>
              <option value="">Choose an automation…</option>
              {flows.filter(flow => flow.status === 'Active'
                && ['Screen Flow','Autolaunched Flow'].includes(flow.flowType)).map(flow =>
                  <option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
              {selectedFlow && (selectedFlow.status !== 'Active'
                || !['Screen Flow','Autolaunched Flow'].includes(selectedFlow.flowType))
                && <option value={selectedFlow.apiName} disabled>{selectedFlow.label} (not available)</option>}
            </select>
          </label>
          <FlowInputBindingEditor flow={selectedFlow} inputs={map} fields={fields}
            outputs={outputMap}
            onChange={inputs => setBinding({ ...binding, inputs })}
            onOutputChange={outputs => setBinding({ ...binding, outputs })} />
        </> : <div className="metadata-navigation-target" aria-label="Navigation destination">
          <label className="form-label">Destination type
            <select className="form-control" value={navigationTargetType}
              onChange={(e) => setBinding({ ...binding, navigationTargetType: e.target.value,
                navigationAppId: e.target.value === 'Record List' ? 'Records' : currentAppId,
                navigationPageApiName: '' })}>
              <option value="Record List">Record list</option>
              <option value="App Home">App home</option>
              <option value="App Page">App page</option>
            </select>
          </label>
          <label className="form-label">Application
            <select className="form-control" value={navigationAppId}
              onChange={(e) => setBinding({ ...binding, navigationAppId: e.target.value, navigationPageApiName: '' })}>
              <option value="">Select application…</option>
              {apps.map((app) => <option key={app.apiName} value={app.apiName}>{app.label}</option>)}
            </select>
          </label>
          {navigationTargetType === 'Record List' && <label className="form-label">Destination object
            <select className="form-control" value={String(binding.navigationObjectApiName ?? objectApiName)}
              onChange={(e) => setBinding({ ...binding, navigationObjectApiName: e.target.value })}>
              <option value="">Choose object…</option>
              {objects.map((object) => <option key={object.apiName} value={object.apiName}>{object.label}</option>)}
            </select>
          </label>}
          {navigationTargetType === 'App Page' && <label className="form-label">App page
            <select className="form-control" value={String(binding.navigationPageApiName ?? '')}
              onChange={(e) => setBinding({ ...binding, navigationPageApiName: e.target.value })}>
              <option value="">Select active app page…</option>
              {navigationPages.map((item) => <option key={item.apiName} value={item.apiName}>{item.label}</option>)}
            </select>
          </label>}
          {navigationTargetType === 'App Page' && !navigationPages.length
            && <p className="properties-help">Activate an App Page and add it to the application in App Settings first.</p>}
          {navigationPreview && <div className="properties-help">
            Destination: <code>{navigationPreview}</code>
            <a href={navigationPreview} target="_blank" rel="noopener noreferrer"> Test route in a new tab</a>
          </div>}
        </div>}
      </div>;
    })}
    {eventDefinitions?.length ? <label className="form-label">When someone…
      <select className="form-control" value={newEventName}
        onChange={e=>setNewEventName(e.target.value)}>
        <option value="">Choose an interaction…</option>
        {eventDefinitions.map(event=><option key={event.apiName} value={event.apiName}>
          {event.label}</option>)}
      </select></label> : null}
    {!eventDefinitions?.length && <details className="builder-advanced-panel"><summary>Advanced: custom interaction</summary>
    <label className="form-label">Event ID
      <input className="form-control" type="text" value={newEventName}
        placeholder="e.g. tabChange or itemSelect"
        onChange={(event) => setNewEventName(event.target.value)} />
    </label>
    </details>}
    <button type="button" className="btn btn-small" disabled={!/^[A-Za-z][A-Za-z0-9_]*$/.test(newEventName.trim()) || Object.prototype.hasOwnProperty.call(actionFlows ?? {},newEventName.trim())}
      onClick={() => {
        const key=newEventName.trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key) || Object.prototype.hasOwnProperty.call(actionFlows ?? {},key)) return;
        update('actionFlows',{...(actionFlows??{}),[key]:{actionType:'Flow',flowApiName:'',inputs:{}}});
        setNewEventName('');
      }}>Add action</button>
    {!actionFlows && <label className="form-label">Automation
      <select className="form-control" value={metadataSelection(flows,properties.flowApiName)?.apiName??String(properties.flowApiName??'')}
        onChange={(event) => {const flow=flows.find(f=>f.apiName===event.target.value);update('flowApiName',flow?.id?metadataReference(flow.id):event.target.value);}}>
        <option value="">No automation selected</option>
        {flows.filter(flow=>flow.status==='Active').map(flow => <option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
      </select>
    </label>}
    </section>
    {typeof properties.platformSlotKey === 'string' && properties.platformSlotKey && <>
      <div className="properties-section-title">Administration control presentation</div>
      <p className="properties-help">Configure this existing protected control without changing its OneEngine action, validation or permissions.</p>
      {([
        ['controlLabel','Control label'],
        ['controlPlaceholder','Placeholder'],
        ['controlHelpText','Help text'],
        ['controlDescription','Description']
      ] as const).map(([key,label])=><label key={key} className="form-label">{label}
        <input className="form-control" type="text" value={String(properties[key] ?? '')}
          onChange={(event)=>update(key,event.target.value)} />
      </label>)}
    </>}
    {(['Content', 'Layout', 'Responsive', 'Appearance'] as const).map(section => {
      const entries = Object.entries(properties).filter(([key, value]) =>
        !sourceKeys.has(key) && !structuredKeys.has(key) && !unavailableKeys.has(key) && !(key === 'currencyCode' && !showCurrencySetting) && !isObjectBinding(key) && !isField(key) && !isFilter(key)
        && !Array.isArray(value) && propertySectionFor(key, definitionsByKey.get(key)) === section);
      if (!entries.length) return null;
      return <section key={section} className="metadata-property-section" aria-label={section + ' properties'}>
        <div className="properties-section-title">{section}</div>
        {entries.map(([key, value]) => {
          const definition = definitionsByKey.get(key);
          const label = definition?.label ?? labelFor(key);
          if (definition?.kind === 'IMAGE') return <div className="form-label" key={key}>
            <label>{label}</label><TenantMediaPicker value={String(value??'')} onChange={next=>update(key,next)}/></div>;
          if (definition?.kind === 'SELECT' && definition.choices) return <label className="form-label" key={key}>{label}
            <select className="form-control" value={String(value ?? '')} onChange={(event) => update(key, event.target.value)}>
              <option value="">Not configured / default</option>
              {definition.choices.map(choice => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
            </select>
          </label>;
          if (typeof value === 'boolean') return <label className="checkbox-row" key={key}>
            <input type="checkbox" checked={value} onChange={(event) => update(key, event.target.checked)} />{label}
          </label>;
          if (typeof value === 'number') return <label className="form-label" key={key}>{label}
            <input className="form-control" type="number" value={value}
              onChange={(event) => event.target.value === '' ? onChange(Object.fromEntries(Object.entries(properties).filter(([name])=>name!==key))) : update(key, Number(event.target.value))} />
          </label>;
          if (typeof value === 'string') return <div className="form-label" key={key}>
            <label>{label}</label>
            {definition?.kind === 'COLOR' || /color/i.test(key)
              ? <input className="form-control" type="text" value={value} onChange={event => update(key, event.target.value)} />
              : <SmartFieldInput value={value} onChange={next => update(key, next)}
                  objects={objects} primaryObjectApiName={primaryObjectApiName || objectApiName}
                  appObjectApiNames={appObjectApiNames}
                  kind={/image|src/i.test(key) ? 'image' : /url|link/i.test(key) ? 'url' : /formula|expression/i.test(key) ? 'formula' : 'text'}
                  multiline={/text|description|body|content|formula|expression/i.test(key) && value.length > 90} />}
          </div>;
          return null;
        })}
      </section>;
    })}
    {Object.entries(properties).filter(([key, value]) => !sourceKeys.has(key) && !structuredKeys.has(key) && !unavailableKeys.has(key) && !isFilter(key) && Array.isArray(value)).map(([key, value]) => {
      const items = value as unknown[];
      const template = items.find((item) => item && typeof item === 'object' && !Array.isArray(item));
      const keys = template ? Object.keys(template) : [];
      return <div key={key} className="metadata-array-property">
        <div className="properties-section-title">{labelFor(key)}</div>
        {items.map((item, index) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const record = item as ComponentPropertyRecord;
          return <div className="home-page-assignment" key={index}>
            <strong>{labelFor(key)} {index + 1}</strong>
            {Object.entries(record).filter(([, fieldValue]) => ['string', 'number', 'boolean'].includes(typeof fieldValue)).map(([fieldKey, fieldValue]) =>
              <label className="form-label" key={fieldKey}>{labelFor(fieldKey)}
                {typeof fieldValue === 'boolean'
                  ? <input type="checkbox" checked={fieldValue} onChange={(event) => update(key, items.map((entry, i) => i === index ? { ...record, [fieldKey]: event.target.checked } : entry))} />
                  : <input className="form-control" type={typeof fieldValue === 'number' ? 'number' : 'text'} value={String(fieldValue)}
                      onChange={(event) => update(key, items.map((entry, i) => i === index ? { ...record, [fieldKey]: typeof fieldValue === 'number' ? Number(event.target.value) : event.target.value } : entry))} />}
              </label>)}
            <button className="btn" type="button" onClick={() => update(key, items.filter((_, i) => i !== index))}>Remove</button>
          </div>;
        })}
        {keys.length > 0 && <button className="btn" type="button" onClick={() => update(key, [...items, Object.fromEntries(keys.map((fieldKey) =>
          [fieldKey, typeof (template as ComponentPropertyRecord)[fieldKey] === 'number' ? 0 : '']))])}>Add {labelFor(key)}</button>}
      </div>;
    })}
    {structuredDefinitions.length>0&&<CustomComponentPropertyEditor definitions={structuredDefinitions}
      properties={Object.fromEntries(Object.entries(properties).filter(([key])=>structuredKeys.has(key)))}
      onChange={next=>onChange({...Object.fromEntries(Object.entries(properties).filter(([key])=>!structuredKeys.has(key))),...next})}
      device={device} componentVersion={componentVersion} objects={objects} flows={flows}
      primaryObjectApiName={objectApiName||primaryObjectApiName} appObjectApiNames={appObjectApiNames}/>}
    <details className="builder-advanced-panel" aria-label="Page behaviour rules"><summary>Show / Hide, conditions and interactions</summary>
      <p className="properties-help">Configure field behaviour, conditional appearance, action and tab availability, or link a component event to a bindable property. Rules are evaluated by the published page runtime and never override OneEngine permissions.</p>
      <CustomComponentPropertyEditor definitions={[pagePropertyContract]}
        choiceOverrides={behaviorPickers} targetBindableOptions={targetBindableOptions}
        properties={{pagePropertyContract:properties.pagePropertyContract ?? {version:1}}}
        onChange={next=>update('pagePropertyContract',next.pagePropertyContract)}
        device={device} componentVersion={componentVersion} objects={objects} flows={flows}
        primaryObjectApiName={objectApiName||primaryObjectApiName} appObjectApiNames={appObjectApiNames}/>
    </details>
    <details className="builder-advanced-panel"><summary>More technical settings</summary>
      <CustomComponentPropertyEditor properties={properties} onChange={onChange} definitions={availableDefinitions.filter(d=>!structuredKeys.has(d.propertyKey))} addOnly device={device} componentVersion={componentVersion}
        objects={objects} flows={flows} primaryObjectApiName={objectApiName || primaryObjectApiName} appObjectApiNames={appObjectApiNames} />
    </details>
    {false && <><button className="btn" type="button" onClick={() => {
      if (!advancedOpen) { setAdvancedDraft(JSON.stringify(properties, null, 2)); setAdvancedError(''); }
      setAdvancedOpen(!advancedOpen);
    }}>{advancedOpen ? 'Hide advanced metadata' : 'Advanced metadata'}</button>
    {advancedOpen && <>
      <textarea className="form-control component-properties-json" aria-label="Advanced component metadata"
        value={advancedDraft} onChange={(event) => setAdvancedDraft(event.target.value)} />
      <button type="button" className="btn" onClick={() => {
        try {
          const parsed: unknown = JSON.parse(advancedDraft);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Expected a properties object');
          onChange(parsed as ComponentPropertyRecord); setAdvancedError('');
        } catch (error) { setAdvancedError(error instanceof Error ? error.message : 'Invalid metadata'); }
      }}>Apply advanced metadata</button>
      {advancedError && <div className="auth-error" role="alert">{advancedError}</div>}
    </>}</>}
  </div>;
}
