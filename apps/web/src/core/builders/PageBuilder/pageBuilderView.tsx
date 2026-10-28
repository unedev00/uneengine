import {availableComponentSettings,resolveComponentSettings,validateComponentSettings} from '../../components/Properties/componentSettingDefinitions';
import {pagePropertyIssues} from '../../components/Properties/pagePropertyContract';
import {resolveMetadataProperties} from '../../metadata/Definitions/metadataReferences';
import {generateMetadataApiName,suggestMetadataApiName} from '../../metadata/Definitions/metadataApiNames';
import { useFormFactor } from '../../workspace/Responsive/useFormFactor';
import './MobileBuilderReadMode.css';
import {confirmDestructiveAction} from '../../components/ConfirmAction/confirmDestructiveAction';
import './PageBuilderNoCode.css';
import './PageBuilderRibbonGallery.css';
import './PageBuilderRibbonBlueprint.css';
import './PageBuilderRibbonNonDesign.css';
import './PageBuilderDesignReference.css';
import RibbonCapabilityControls from './RibbonCapabilityControls';
import '../../pages/TemplatePageRuntime/pageComponentAppearance.css';
import '../SharedBuilderFrame/adaptiveBuilder.css';
import { libraryComponentLabel } from '../../components/Registry/componentLibraryDiscovery';
import { relatedListRelationships } from './relatedListRelationships';
import {legacyLayoutToRecordComponents} from '../../records/RecordWorkspace/recordPageLayoutMigration';
import { standaloneTemplateCanvasStyle } from './standaloneTemplateCanvasStyle';
import { pageTemplates, pageStringList } from './pageEditorMetadata';
import BuilderTemplatePreviewLayout from '../TemplatePreview/BuilderTemplatePreviewLayout';import { reconcileNavigationOrder } from '../../workspace/Navigation/appNavigation';
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
  Grid2X2,
  Type,
  Square,
  Image as ImageIcon,
  MousePointer2,
  BarChart3,
  FormInput,
  List,
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
  PanelRight,
  Layers3,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Group,
  Ungroup,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShoppingCart,
  PanelsTopLeft,
  MessageCircle,
  BadgeCheck,
  Table2,
  Menu,
  Repeat
} from 'lucide-react';
import FlowBuilderWorkspace from '../FlowBuilder/FlowBuilder';
import FlowScreenContent from '../../automation/FlowScreen/FlowScreenContent';
import FlowLogs from '../../automation/FlowLogs/FlowLogs';
import FlowInterviews from '../../automation/FlowInterviews/FlowInterviews';
import ScheduledFlows from '../../automation/ScheduledFlows/ScheduledFlows';
import DashboardBuilder from '../DashboardBuilder/DashboardBuilder';
import ComponentLibrary from '../../components/ComponentLibrary/ComponentLibrary';
import RegisteredComponent from '../../components/RegisteredComponent/RegisteredComponent';
import CustomComponentPropertyEditor from '../ComponentProperties/CustomComponentPropertyEditor';
import ComponentPresentationProperties from '../ComponentProperties/ComponentPresentationProperties';
import {presentationSection,isPresentationProperty} from '../ComponentProperties/presentationPropertyModel.mjs';
import FlowInputBindingEditor from '../FlowInputBindingEditor/FlowInputBindingEditor';
import RecordFilterEditor from '../../../one/OneRecordFilterEditor/RecordFilterEditor';
import ComponentVisibilityEditor from '../ComponentProperties/ComponentVisibilityEditor';
import RichTextBlockEditor from '../ComponentProperties/RichTextBlockEditor';
import PageRouteDirectory from '../../pages/PageRouteDirectory/PageRouteDirectory';
import { isComponentVisible } from '../../components/Properties/componentVisibility';
import PageComponentVisualEditor from '../ComponentStyleEditor/PageComponentVisualEditor';
import RibbonColorPalette from './RibbonColorPalette';
import {RibbonFilters,RibbonVisibilityRules} from './PageBuilderRibbonEditors';
import PageBuilderActionRibbon from './PageBuilderActionRibbon';
import PageBuilderRibbonMetadataPager from './PageBuilderRibbonMetadataPager';
import UniversalRibbonInventory from './UniversalRibbonInventory';
import './UniversalRibbonInventory.css';
import RibbonFieldExpressionInput from './RibbonFieldExpressionInput';
import {RibbonResponsive} from './PageBuilderRibbonStyle';
import PageBuilderAdvancedStyle from './PageBuilderAdvancedStyle';
import PageBuilderRibbonData from './PageBuilderRibbonData';
import PageBuilderRibbonContent from './PageBuilderRibbonContent';
import type {ComponentVisibilityRule} from '../../components/Properties/componentVisibility';
import { canNestComponent, pageAppearanceTarget, pageAppearanceStyleKeys, updateLayoutSettings, type LayoutSettingKey, directChildren, isLayoutType, isDescendantOf, layoutTypes } from '../../pages/TemplatePageRuntime/pageComponentLayout';
import PageComponentStyleEditor from '../ComponentStyleEditor/PageComponentStyleEditor';
import { isCanvasLocked, wrapCanvasComponent, groupCanvasComponents, ungroupCanvasComponent, snapCanvasPosition, alignCanvasComponents, distributeCanvasComponents } from './canvasInteractions';
import { copyComponentTree, cloneComponentTree, assignTabOnReparent, type ComponentClipboard } from './pageComponentTree';
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
import { findRegisteredComponent } from '../../components/Registry/componentRegistryLookup';
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
  createComponentPreviewProps, getPageBuilderComponentCategories,
  publishedPageLibraryComponents, pageBuilderPaletteCategories
} from './pageBuilderPalette';
import { addRecentPageBlock, describeBuilderFilters, loadRecentPageBlocks, pageBuilderCategoryLabels, pageBuilderStartOptions } from './pageBuilderUx';
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
  type PageLayoutVariant,
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
import SavedListViewPicker from './SavedListViewPicker';
import RibbonImageContent from './RibbonImageContent';
export function createPageBuilder(MetadataComponentProperties: React.ComponentType<any>, MetadataBoundPageComponent: React.ComponentType<any>) {
function PageBuilder({
  page, pages, objects, apps, profiles, reports, dashboards, libraryComponents, flows, onChange, onSelectPage, onTargetObjectChange, onSave, onPublish, onDeactivate, onSaveApp, onDeleteApp, onDeletePage, onExit, onNotify, onLaunchFlow,
  preparedAppId, onPrepareApp, onAppLinked, request, canManageRoutes, editorMode, onBackToPages, recordPageContext,
  initialLayoutVariant, onLayoutVariantChange
}: {
  page: LightningPageMetadata;
  pages: LightningPageMetadata[];
  objects: ObjectMetadata[];
  apps: LightningAppMetadata[];
  profiles: ProfileMetadata[];
  reports: ReportMetadata[];
  dashboards: DashboardMetadata[];
  libraryComponents: LibraryComponentMetadata[];
  flows: FlowDefinitionMetadata[];
  onChange: (page: LightningPageMetadata) => void;
  onSelectPage: (apiName: string) => void;
  onTargetObjectChange: (targetObject: string) => void;
  onSave: (page: LightningPageMetadata, previousApiName: string, successMessage?: string) => Promise<LightningPageMetadata | false>;
  onPublish: (apiName:string,variant:'Mobile'|'Desktop'|'Tablet'|'Custom',draftRevision?:number)=>Promise<boolean>;
  onDeactivate: (apiName:string)=>Promise<boolean>;
  onSaveApp: (app: LightningAppMetadata, updating: boolean) => Promise<void>;
  onDeleteApp: (apiName: string) => Promise<void>;
  onDeletePage: (apiName: string) => Promise<void>;
  onExit: () => void;
  onNotify: (message: string) => void;
  onLaunchFlow: (flowApiName: string, inputs?: Record<string, unknown>) => void;
  preparedAppId: string;
  onPrepareApp: (pageApiName: string, appId: string) => void;
  onAppLinked: (pageApiName: string) => void;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  canManageRoutes: boolean;
  editorMode: boolean;
  onBackToPages: () => void;
  /** Record Page administration lives under Object Manager, never the global Page Builder. */
  recordPageContext?: string;
  /** Initial device layout from an Object Manager deep link. */
  initialLayoutVariant?: PageLayoutVariant;
  onLayoutVariantChange?: (variant:PageLayoutVariant) => void;
}) {
  const isPhoneBuilder = useFormFactor() === 'Phone';
  const [builderAppApiName, setBuilderAppApiName] = useState(preparedAppId);
  useEffect(() => {
    if (preparedAppId) setBuilderAppApiName(preparedAppId);
  }, [preparedAppId]);
  const template = pageTemplates.find((item) => item.id === page.template) ?? pageTemplates[0];
  const builderApp = apps.find((app) => app.apiName === builderAppApiName);
  const appPageApiNames = new Set(builderApp?.navigationPageApiNames ?? []);
  const appPages = builderApp
    ? pages.filter((item) => item.status === 'Active' && (
      appPageApiNames.has(item.apiName)
      || (item.activationAssignments ?? []).some((assignment) => assignment.appId === builderApp.apiName)
    ))
    : [];
  // Show all tenant pages even if an installation needs activation repair.
  const pagePickerPages = [...pages.filter((item) => item.apiName !== page.apiName), page]
    .filter(item => recordPageContext
      ? item.pageType === 'Record Page' && item.targetObject === recordPageContext
      : item.pageType !== 'Record Page')
    .sort((left, right) => (Date.parse(right.updatedAt ?? '') || 0) - (Date.parse(left.updatedAt ?? '') || 0));
  const currentPageIsAssignedToBuilderApp = appPages.some((item) => item.apiName === page.apiName);
  const targetObject = objects.find((object) => object.apiName === page.targetObject);
  const pageTypeComponents = page.pageType === 'Record Page'
    ? standardPageComponents.map((component) => component.apiName)
    : standardPageComponents
      .filter((component) => ['Accordion', 'Tabs', 'Report Chart', 'Dashboard', 'Rich Text', 'List View', 'Screen Flow', 'Items to Approve'].includes(component.apiName))
      .map((component) => component.apiName);
  const relatedListOptions = [...new Map(
    relatedListRelationships(objects, page.targetObject)
      .filter((item) => Boolean(item.childRelationshipName))
      .map((item) => [item.childRelationshipName, item.pluralLabel] as const)
  )].map(([apiName, label]) => ({ apiName, label }));
  const defaultRelatedLists = relatedListOptions.slice(0, 3).map((item) => item.apiName);
  const availableComponents = pageTypeComponents.filter((component) =>
    (component !== 'Activities' || targetObject?.settings?.allowActivities)
    && (component !== 'Chatter' || targetObject?.settings?.allowInChatter)
    && (component !== 'Report Chart' || targetObject?.settings?.allowReports));
  const stringList = pageStringList;
  const [selectedId, setSelectedId] = useState(page.components[0]?.id ?? '');
  const [selectedRegion, setSelectedRegion] = useState<'header' | 'main' | 'sidebar' | null>(null);
  const [selectionIds, setSelectionIds] = useState<string[]>(page.components[0] ? [page.components[0].id] : []);
  const [openBuilderTabs,setOpenBuilderTabs]=useState<Record<string,string>>({});
  const [previewRecords,setPreviewRecords]=useState<RecordData[]>([]);
  const [previewRecordId,setPreviewRecordId]=useState('');
  const previewRecord=previewRecords.find(item=>String(item.Id)===previewRecordId)??previewRecords[0];
  useEffect(()=>{
    if(!editorMode||page.pageType!=='Record Page'||!page.targetObject){
      setPreviewRecords([]);setPreviewRecordId('');return;
    }
    let active=true;
    setPreviewRecords([]);setPreviewRecordId('');
    void request<{records:RecordData[]}>(`/records/${encodeURIComponent(page.targetObject)}?limit=20&offset=0`)
      .then(result=>{if(active)setPreviewRecords(result.records??[]);})
      .catch(()=>{if(active)setPreviewRecords([]);});
    return ()=>{active=false;};
  },[page.pageType,page.targetObject,editorMode]);
  const previewFieldValue=(apiName:string)=>{
    if(!previewRecord)return 'No accessible record selected';
    if(!Object.prototype.hasOwnProperty.call(previewRecord,apiName))return 'Field not readable';
    return formatRecordValue(previewRecord[apiName]);
  };
  useEffect(() => {
    setSelectionIds(current => selectedId && current.includes(selectedId) ? current : selectedId ? [selectedId] : []);
  }, [selectedId]);
  const savedPageApiName = useRef(page.apiName);
  const device: 'Desktop' | 'Tablet' | 'Phone' = page.devices.length === 1 && page.devices[0] === 'Phone' || page.canvasWidth <= 600
    ? 'Phone' : page.canvasWidth < 1400 ? 'Tablet' : 'Desktop';
  const orientation = canvasOrientation(page.canvasWidth, page.canvasHeight);
  const [paletteTab, setPaletteTab] = useState<'Components' | 'Fields' | 'Layers'>('Components');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [paletteInsertRegion, setPaletteInsertRegion] = useState<'header' | 'main' | 'sidebar' | null>(null);
  const [paletteCategory, setPaletteCategory] = useState<(typeof pageBuilderPaletteCategories)[number]>('All Components');
  const [favouriteComponents, setFavouriteComponents] = useState<string[]>([]);
  const [recentComponents, setRecentComponents] = useState<string[]>(() => {
    try { return loadRecentPageBlocks(window.localStorage.getItem('metadrive:page-builder:recent')); }
    catch { return []; }
  });
  const [favouritesLoaded, setFavouritesLoaded] = useState(false);
  const [componentPanelWidth, setComponentPanelWidth] = useState(336);
  // One Canva-style contextual rail and one collapsible panel; never two competing sidebars.
  const [activePanel, setActivePanel] = useState<'palette' | 'properties' | 'page' | null>(() => {
    try { return window.localStorage.getItem('metadrive:page-builder:panel') === 'collapsed' ? null : 'palette'; }
    catch { return 'palette'; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('metadrive:page-builder:panel', activePanel === null ? 'collapsed' : 'expanded'); }
    catch { /* Optional browser preference, not page metadata. */ }
  }, [activePanel]);
  const [pageListObject, setPageListObject] = useState('');
  const [pageListSearch, setPageListSearch] = useState('');
  const paletteResizeStart = useRef<{ pointerId: number; pointerX: number; width: number } | null>(null);
  const [customPropertiesDraft, setCustomPropertiesDraft] = useState('');
  const [customPropertiesError, setCustomPropertiesError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const externalPreviewWindowRef = useRef<Window | null>(null);
  const [externalPreviewTarget, setExternalPreviewTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    return () => { externalPreviewWindowRef.current?.close(); externalPreviewWindowRef.current = null; };
  }, []);
  const openExternalPreview = () => {
    if (externalPreviewWindowRef.current && !externalPreviewWindowRef.current.closed) {
      externalPreviewWindowRef.current.focus();
      return;
    }
    const popup = window.open('', 'metadrive-page-preview', 'popup=yes,width=1280,height=860,resizable=yes,scrollbars=yes');
    if (!popup) { onNotify('Please allow the page preview popup in your browser.'); return; }
    externalPreviewWindowRef.current = popup;
    popup.document.title = `${page.label} — Preview`;
    for (const sheet of Array.from(document.querySelectorAll('link[rel="stylesheet"],style'))) {
      popup.document.head.appendChild(sheet.cloneNode(true));
    }
    popup.document.body.style.margin = '0';
    const container = popup.document.createElement('main');
    container.id = 'metadrive-popup-preview';
    popup.document.body.appendChild(container);
    popup.addEventListener('beforeunload', () => {
      if (externalPreviewWindowRef.current === popup) {
        externalPreviewWindowRef.current = null;
        setExternalPreviewTarget(null);
      }
    });
    setExternalPreviewTarget(container);
  };
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const loadedEditorVariantRef=useRef<string|null>(null);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [dynamicFormsUpgradeOpen, setDynamicFormsUpgradeOpen] = useState(false);
  const [migrationLayoutId, setMigrationLayoutId] = useState('');
  const [newRecordLinkLabel,setNewRecordLinkLabel]=useState('');
  const [newRecordLinkUrl,setNewRecordLinkUrl]=useState('');
  const [fitCanvas, setFitCanvas] = useState(true);
  const [fitScale, setFitScale] = useState(1);
  const pagePreviewAreaRef = useRef<HTMLDivElement | null>(null);
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [routeDirectoryOpen, setRouteDirectoryOpen] = useState(false);
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPageType, setNewPageType] = useState<LightningPageMetadata['pageType']>(recordPageContext ? 'Record Page' : 'App Page');
  const [newRecordMode,setNewRecordMode]=useState<'View'|'Edit'>('View');
  const [newPageTemplate, setNewPageTemplate] = useState<LightningPageTemplate>('header-main-sidebar');
  const [newPageLayoutMode, setNewPageLayoutMode] = useState<LightningPageMetadata['layoutMode']>('template');
  const [newPageTargetObject, setNewPageTargetObject] = useState(page.targetObject || objects[0]?.apiName || '');
  const [newPageAppId, setNewPageAppId] = useState('');
  const [newPageDevices, setNewPageDevices] = useState<Array<'Desktop' | 'Phone'>>(['Desktop']);
  const [newPageDeviceChoice, setNewPageDeviceChoice] = useState<'Desktop' | 'Tablet' | 'Phone'>('Desktop');
  const [newPageCanvasWidth, setNewPageCanvasWidth] = useState(1440);
  const [newPageCanvasHeight, setNewPageCanvasHeight] = useState(900);
  const [dragOverId, setDragOverId] = useState('');
  const [undoStack, setUndoStack] = useState<LightningPageMetadata[]>([]);
  const [redoStack, setRedoStack] = useState<LightningPageMetadata[]>([]);
  type CanvasSelectionSnapshot = { selectedId: string; selectionIds: string[] };
  const [selectionUndoStack, setSelectionUndoStack] = useState<CanvasSelectionSnapshot[]>([]);
  const [selectionRedoStack, setSelectionRedoStack] = useState<CanvasSelectionSnapshot[]>([]);
  type ResizeEdge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  const canvasResizeStart = useRef<{ id: string; pointerId: number; pointerX: number; pointerY: number; x: number; y: number; width: number; height: number; edge: ResizeEdge; element: HTMLElement; current: { x: number; y: number; width: number; height: number } } | null>(null);
  const canvasGuideXRef = useRef<HTMLDivElement | null>(null);
  const canvasGuideYRef = useRef<HTMLDivElement | null>(null);
  const canvasSnap = false;
  const [componentMenuId, setComponentMenuId] = useState('');
  const canvasMoveStart = useRef<{
    id: string; pointerId: number; pointerX: number; pointerY: number;
    original: { x: number; y: number; width: number; height: number };
    element: HTMLElement; x: number; y: number;
    group: Array<{ id: string; element: HTMLElement; original: { x: number; y: number; width: number; height: number }; x: number; y: number }>;
  } | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'Design' | 'Data & Actions' | 'Visibility' | 'Position'>('Design');
  const [ribbonPropertyHost, setRibbonPropertyHost] = useState<HTMLDivElement | null>(null);
  const [ribbonFilterDraft,setRibbonFilterDraft] = useState<Record<string,unknown>>({});
  const [ribbonVisibilityDraft,setRibbonVisibilityDraft] = useState<ComponentVisibilityRule|undefined>(undefined);
  const [ribbonSourceOffset,setRibbonSourceOffset] = useState(0);
  const [additionalPropertyDialogOpen,setAdditionalPropertyDialogOpen] = useState(false);
  const [pageSettingsDialogOpen,setPageSettingsDialogOpen] = useState(false);
  const [focusedCardMapping,setFocusedCardMapping] = useState('');
  const ribbonStripRef=useRef<HTMLDivElement|null>(null);
  const [ribbonOverflow,setRibbonOverflow]=useState({left:false,right:false});
  const measureRibbonOverflow=()=>{
    const element=ribbonStripRef.current;
    if(!element)return;
    setRibbonOverflow({left:element.scrollLeft>3,right:element.scrollLeft+element.clientWidth<element.scrollWidth-3});
  };
  const [ribbonTab, setRibbonTab] = useState<'Home' | 'Add Block' | 'Component Content' | 'Component Properties' | 'Component Style' | 'Component Data' | 'Component Action' | 'Component Layout' | 'Component Responsive' | 'Preview' | 'Filters' | 'Source' | 'Visibility Rules'>('Home');
  useEffect(()=>{
    const element=ribbonStripRef.current;
    if(!element)return;
    element.scrollLeft=0;
    const update=()=>measureRibbonOverflow();
    const frame=window.requestAnimationFrame(update);
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;
    observer?.observe(element);
    window.addEventListener('resize',update);
    return ()=>{window.cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',update);};
  },[ribbonTab,selectedId,page.layoutVariant,page.components.length]);
  const componentNeedsData = (type: string) => {
    const metadata = type.startsWith('Custom:') ? findRegisteredComponent(libraryComponents,type.slice('Custom:'.length),'page') : undefined;
    return Boolean(metadata?.propertyDefinitions?.some(definition=>definition.kind==='OBJECT'||definition.kind==='OBJECT_FIELD'))
      || /^(?:Record Field|Record Detail|Related List|List View|Report Chart|Dashboard)$/.test(type);
  };
  const selectRibbonTab = (tab: typeof ribbonTab) => {
    setRibbonTab(tab);
    setPageSettingsDialogOpen(false);
    if (tab === 'Add Block') { setPageSettingsOpen(false); openPalette('Components', 'All Components'); }
    if (tab === 'Home') { setPageSettingsOpen(false); }
    const inspector = { 'Component Properties': 'Design', 'Component Style': 'Design', 'Component Data': 'Data & Actions', 'Component Content': 'Data & Actions', 'Component Action': 'Visibility', 'Component Layout': 'Position', 'Component Responsive': 'Position' } as const;
    if (tab in inspector) { setPageSettingsOpen(false); openComponentInspector(inspector[tab as keyof typeof inspector]); }
  };
  useEffect(()=>{
    if(!focusedCardMapping||ribbonTab!=='Component Content')return;
    const select=document.querySelector<HTMLSelectElement>(`select[data-card-mapping-field="${focusedCardMapping}"]`);
    if(select)select.focus();
  },[focusedCardMapping,ribbonTab,selectedId]);
  const [componentClipboard, setComponentClipboard] = useState<ComponentClipboard | null>(null);
  const [recordScope, setRecordScope] = useState<PageActivationAssignmentMetadata['scope']>('Org Default');
  const [recordAppId, setRecordAppId] = useState(builderAppApiName || apps[0]?.apiName || '');
  const [recordProfileId, setRecordProfileId] = useState('');
  const [recordTypeId, setRecordTypeId] = useState('');
  const [recordFormFactors, setRecordFormFactors] = useState<Array<'Desktop' | 'Phone' | 'Tablet' | 'Custom'>>(['Desktop']);
  const [homeAppId, setHomeAppId] = useState(apps[0]?.apiName ?? '');
  const [homeScope, setHomeScope] = useState<'App Default' | 'App and Profile'>('App Default');
  const [homeProfileId, setHomeProfileId] = useState('');
  const [homeFormFactors, setHomeFormFactors] = useState<Array<'Desktop' | 'Phone' | 'Tablet' | 'Custom'>>(['Desktop']);
  const [saving, setSaving] = useState(false);
  const [archivingPageApiName, setArchivingPageApiName] = useState('');
  const [pendingArchivePageApiName, setPendingArchivePageApiName] = useState('');
  const [switchingLayout, setSwitchingLayout] = useState(false);
  const [layoutVersions, setLayoutVersions] = useState<Array<{version:number;createdAt:string;published:boolean;draft:boolean}>>([]);
  const [showLayoutHistory, setShowLayoutHistory] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<number | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const fields = targetObject?.fields ?? [];
  const pageLayouts = targetObject?.pageLayouts ?? [];
  const selected = page.components.find((component) => component.id === selectedId);
  const textStyle = selected?.properties.layoutStyle && typeof selected.properties.layoutStyle==='object'
    ? selected.properties.layoutStyle as Record<string,unknown> : {};
  const currentRibbonDevice = page.layoutVariant==='Mobile'?'Phone':page.layoutVariant==='Custom'?'Base':page.layoutVariant??'Desktop';
  const updateTextStyle = (key:LayoutSettingKey,value:string|number|null) => {
    if (!selected)return;
    updateComponent(selected.id,{properties:updateLayoutSettings(selected.properties,currentRibbonDevice,key,value)});
  };
  const writeRibbonVisual = (key:string,value:unknown) => {
    if(!selected)return;
    const visual=selected.properties.visualStyle && typeof selected.properties.visualStyle==='object'
      ? selected.properties.visualStyle as Record<string,unknown>:{};
    updateComponent(selected.id,{properties:{...selected.properties,visualStyle:{...visual,[key]:value}}});
  };
  const writeRibbonColour = (key:'color'|'backgroundColor'|'borderColor'|'accentColor',value:string) => {
    if (!selected)return;
    const metadataKey=key==='color'?'textColor':key;
    const declared=selectedCustomDefinition?.propertyDefinitions?.some(item=>item.propertyKey===metadataKey);
    if(declared)updateComponent(selected.id,{properties:{...selected.properties,[metadataKey]:value}});
    else if(key!=='accentColor'&&key!=='color'&&currentRibbonDevice!=='Desktop'&&currentRibbonDevice!=='Base')updateTextStyle(key,value);
    else if(key!=='accentColor')writeRibbonVisual(key,value);
  };
  useEffect(() => {
    if (!selected && (ribbonTab.startsWith('Component ')||['Filters','Source','Visibility Rules'].includes(ribbonTab))) setRibbonTab('Home');
  }, [selectedId, page.components, ribbonTab]);
  // Metadata pages may hydrate after PageBuilder mounts; select their first
  // component when records arrive so the inspector is immediately usable.
  useEffect(() => {
    if (pageSettingsOpen || page.components.length === 0) return;
    if (!page.components.some(component => component.id === selectedId)) {
      setSelectedId(page.components[0].id);
    }
  }, [page.apiName, page.components.length]);
  const openExpandedEditor = (kind:'source'|'filters'|'visibility') => {
    if(!selected)return;
    if(kind==='filters'){setRibbonFilterDraft({...selected.properties});setRibbonTab('Filters');return;}
    if(kind==='visibility'){setRibbonVisibilityDraft(selected.properties.visibilityRules as ComponentVisibilityRule|undefined);setRibbonTab('Visibility Rules');return;}
    if(kind==='source'){setRibbonTab('Source');return;}
  };
  const selectedCustomDefinition = selected?.type.startsWith('Custom:')
    ? findRegisteredComponent(libraryComponents, selected.type.slice('Custom:'.length), 'page')
    : undefined;
  // Group positions stay fixed for every canvas selection. Metadata controls
  // availability; keys listed here are existing renderer-supported properties.
  // Disabled ribbon controls remain discoverable as icons, never blank panels.
  const ribbonPartIcons:Record<string,ReactNode>={
    Card:<Grid2X2 size={15}/>,Heading:<Type size={15}/>,
    'Supporting text':<AlignHorizontalJustifyStart size={15}/>,Badge:<Star size={15}/>,
    Image:<ImageIcon size={15}/>,Gallery:<Grid2X2 size={15}/>,
    Text:<Type size={15}/>,Button:<MousePointer2 size={15}/>,
    Table:<List size={15}/>,Calendar:<CalendarDays size={15}/>,Chart:<BarChart3 size={15}/>,
    Input:<FormInput size={15}/>,Navigation:<PanelLeft size={15}/>,Container:<Square size={15}/>
  };
  // Visible slots follow the selected component, as in the accepted blueprint.
  // Within each slot, the registry determines which commands are actually enabled.
  const designRibbonGroups:readonly string[] = selectedCustomDefinition?.apiName==='une_item_grid'
    ? ['Surface','Card','Heading','Supporting text','Badge','Image']
    : selectedCustomDefinition?.apiName==='une_calendar'
    ? ['Surface','Card','Heading','Event','Calendar']
    : ['Surface',...([
      ['une_text','Text'],['une_button','Button'],['une_image','Image'],['une_chart','Chart'],
      ['une_table','Table'],['une_navigation','Navigation'],['une_search','Input'],
      ['une_input','Input'],['une_container','Container'],['une_grid','Container'],
      ['une_stack','Container'],['une_split_pane','Container']
    ] as const).filter(([api])=>api===selectedCustomDefinition?.apiName).map(([,group])=>group)];
  const layoutRibbonGroups:readonly string[] = selected?.position ? ['Spacing','Component'] : ['Size','Position','Spacing','Component'];
  const appearanceDefinitions = availableComponentSettings(selectedCustomDefinition?.propertyDefinitions??[],page.layoutVariant??'Desktop',selectedCustomDefinition?.version);
  // Registry metadata remains authoritative. Legacy property declarations which omit
  // a presentation group are assigned only where the component already declares the key.
  const implicitParts:Record<string,Record<string,{group:string;section:'Design'|'Layout'}>> = {
    une_text:{fontSize:{group:'Text',section:'Design'}},
    une_button:{variant:{group:'Button',section:'Design'}},
    une_item_grid:{cardDensity:{group:'Card',section:'Design'},cardHover:{group:'Card',section:'Design'},featuredColumnSpan:{group:'Component',section:'Layout'},featuredRowSpan:{group:'Component',section:'Layout'}},
    une_calendar:{view:{group:'Calendar',section:'Design'},firstDayOfWeek:{group:'Calendar',section:'Design'},showWeekends:{group:'Calendar',section:'Design'}},
    une_chart:{chartType:{group:'Chart',section:'Design'}},
    une_image:{imageFit:{group:'Image',section:'Design'},imageHeight:{group:'Image',section:'Layout'}},
    une_grid:{desktopColumns:{group:'Container',section:'Layout'},tabletColumns:{group:'Container',section:'Layout'},mobileColumns:{group:'Container',section:'Layout'}},
    une_container:{direction:{group:'Container',section:'Layout'}},
    une_stack:{direction:{group:'Container',section:'Layout'},wrap:{group:'Container',section:'Layout'}},
    une_split_pane:{splitRatio:{group:'Container',section:'Layout'}},
    une_navigation:{direction:{group:'Navigation',section:'Design'}},
    une_table:{phoneLayout:{group:'Table',section:'Layout'}},
    une_input:{inputType:{group:'Input',section:'Design'},multiline:{group:'Input',section:'Layout'},rows:{group:'Input',section:'Layout'}}
  };
  const inferredAppearanceGroup=(key:string)=>implicitParts[selectedCustomDefinition?.apiName??'']?.[key];
  const baseSurfaceKeys=new Set(['theme','surface','tone','accentColor','backgroundColor',
    'textColor','borderColor','density','radius','shadow','glassBlur','opacity']);
  const inferredRibbonGroup=(key:string,section:'Design'|'Layout')=>{
    if(section==='Design'&&baseSurfaceKeys.has(key))return 'Surface';
    if(section==='Layout'){
      if(/(?:min|max)?(?:Width|Height)$|^width$|^height$|^imageAspectRatio$/i.test(key))return 'Size';
      if(/(?:^|[A-Z])(padding|margin|gap)|^padding$|^margin$|^gap$/i.test(key))return 'Spacing';
      if(/position|offset|anchor/i.test(key))return 'Position';
      if(/columns|rows|span|fit|align|wrap|direction/i.test(key))return 'Component';
    }
    return undefined;
  };
  const definitionsForPart=(group:string,section:'Design'|'Layout')=>appearanceDefinitions.filter(definition=>{
    const mapped=inferredAppearanceGroup(definition.propertyKey);
    const part=section==='Layout'
      ? (mapped?.section==='Layout'?mapped.group:inferredRibbonGroup(definition.propertyKey,section))
      : ((definition as {group?:string}).group??mapped?.group??inferredRibbonGroup(definition.propertyKey,section));
    const mirroredImageDesign=section==='Design'&&selectedCustomDefinition?.apiName==='une_item_grid'
      &&group==='Image'&&['imageAspectRatio','imagePosition'].includes(definition.propertyKey);
    const isDuplicateImageLayout=section==='Layout'&&selectedCustomDefinition?.apiName==='une_item_grid'
      &&['imageAspectRatio','imagePosition'].includes(definition.propertyKey);
    const isInactiveFeaturedLayout=section==='Layout'&&selectedCustomDefinition?.apiName==='une_item_grid'
      &&['featuredColumnSpan','featuredRowSpan'].includes(definition.propertyKey)
      &&!selected?.properties.featuredFieldApiName;
    return part===group&&!/(?:FieldApiName|ObjectApiName)$/.test(definition.propertyKey)
      &&!isDuplicateImageLayout&&!isInactiveFeaturedLayout
      && (mirroredImageDesign||(section==='Layout'
        ? ((definition as {section?:string}).section!=='Design')
          &&Boolean(inferredRibbonGroup(definition.propertyKey,section))
        : ((definition as {section?:string}).section??mapped?.section??'Design')===section));
  });
  const inferredGroupKeys=appearanceDefinitions.filter(d=>inferredAppearanceGroup(d.propertyKey)&&!(d as {group?:string}).group).map(d=>d.propertyKey);
  const selectedComponentDescription = selectedCustomDefinition?.description
    ?? standardPageComponents.find((component) => component.apiName === selected?.type)?.description
    ?? (selected?.type === 'Field Section' ? 'Group record fields into a configurable section.' : '');
  const assignedMigrationLayout = pageLayouts.find((layout) =>
    layout.id === targetObject?.pageLayoutAssignments?.[0]?.pageLayoutId) ?? pageLayouts[0];
  const selectedMigrationLayout = pageLayouts.find((layout) => layout.id === migrationLayoutId) ?? assignedMigrationLayout;
  const dynamicFormsEnabled = page.components.some((component) => component.type === 'Field Section' || component.type === 'Record Field');
  const paletteComponents = [
    ...layoutTypes.map((type) => ({ id: type, type, label: type, description: `Nest components inside a ${type.toLowerCase()} layout.`, categories: ['Layout'] as (typeof pageBuilderPaletteCategories)[number][] })),
    ...(page.layoutMode === 'template' ? standardPageComponents
      .filter((component) => availableComponents.includes(component.apiName))
      .map((component) => ({
        id: component.apiName,
        type: component.apiName,
        label: component.label,
        description: component.description,
        categories: getPageBuilderComponentCategories(component.apiName, component.label, component.description, true)
      })) : []),
    ...(page.layoutMode === 'template' && dynamicFormsEnabled ? [{
      id: 'Field Section',
      type: 'Field Section',
      label: 'Field Section',
      description: 'Group selected record fields into a one- or two-column section.',
      categories: ['Layout'] as (typeof pageBuilderPaletteCategories)[number][]
    }] : []),
    ...publishedPageLibraryComponents(libraryComponents).map((component) => ({
      id: `Custom:${component.apiName}`,
      type: `Custom:${component.apiName}`,
      label: libraryComponentLabel(component),
      description: component.description,
      categories: getPageBuilderComponentCategories(component.apiName, component.label, component.description, false, component.category)
    }))
  ];
  const filteredPaletteComponents = paletteComponents.filter((component) => {
    const inCategory = paletteCategory === 'All Components'
      || (paletteCategory === 'Favourites'
        ? favouriteComponents.includes(component.id)
        : paletteCategory === 'Recent'
          ? recentComponents.includes(component.id)
          : component.categories.includes(paletteCategory));
    const searchContent = `${component.label} ${component.id} ${component.description} ${component.categories.map(category => pageBuilderCategoryLabels[category]).join(' ')}`.toLowerCase();
    return inCategory && searchContent.includes(paletteSearch.trim().toLowerCase());
  });
  // The most useful blocks appear first, while published registry definitions remain authoritative.
  filteredPaletteComponents.sort((a, b) => {
    const priority = (id: string) => favouriteComponents.includes(id) ? -10 : recentComponents.includes(id) ? recentComponents.indexOf(id) : 100;
    return priority(a.id) - priority(b.id);
  });
  // Show each eligible UNE registry component exactly once. Do not surface legacy
  // layout shortcuts or platform component aliases as duplicate Insert commands.
  const ribbonGroupRules = [
    {label:'Text',match:/text|image|photo|picture|paragraph|heading|label|media/i},
    {label:'Buttons',match:/button|link|action|menu/i},
    {label:'Sections',match:/section|container|column|row|layout|split.pane|stack/i},
    {label:'Data',match:/item[_ -]?grid|card[_ -]?grid|\bgrid\b|record|table|repeater|list/i},
    {label:'Forms',match:/form|input|choice|toggle|lookup|select|date.picker|search/i},
    {label:'Navigation',match:/tab|navigation|route|breadcrumb/i},
    {label:'Commerce',match:/cart|shopping|checkout|line.items|price/i},
    {label:'Widgets',match:/calendar|chart|badge|metric|progress|alert|document|conversation|modal|drawer/i}
  ] as const;
  const ribbonCategories = new Map<string,typeof paletteComponents>();
  for(const rule of ribbonGroupRules) ribbonCategories.set(rule.label,[]);
  ribbonCategories.set('Other',[]);
  const seenRibbonComponents=new Set<string>();
  for(const component of paletteComponents){
    const apiName=component.type.startsWith('Custom:')?component.type.slice('Custom:'.length):component.type;
    if(!/^une_[a-z0-9_]+$/.test(apiName)||seenRibbonComponents.has(apiName))continue;
    seenRibbonComponents.add(apiName);
    const name=`${apiName} ${component.label}`;
    const category=ribbonGroupRules.find(group=>group.match.test(name))?.label??'Other';
    ribbonCategories.get(category)!.push({...component,label:component.label.replace(/^UNE[ _-]+/i,'')});
  }
  const ribbonComponentGroups = Array.from(ribbonCategories).flatMap(([label,components])=>
    Array.from({length:Math.ceil(components.length/4)},(_,index)=>({
      id:label+'-'+index,
      label,
      components:components.slice(index*4,index*4+4)
    })));
  const renderPaletteIcon = (component: { type: string; label: string }) => {
    const name = `${component.label} ${component.type}`.toLowerCase();
    if (/\b(text|heading|paragraph|rich text|label)\b/.test(name)) return <Type size={15} />;
    if (/\b(image|photo|picture|avatar|logo)\b/.test(name)) return <ImageIcon size={15} />;
    if (/\b(cart|checkout|shopping)\b/.test(name)) return <ShoppingCart size={15} />;
    if (/\b(calendar|date.picker)\b/.test(name)) return <CalendarDays size={15} />;
    if (/\b(tabs?|accordion)\b/.test(name)) return <PanelsTopLeft size={15} />;
    if (/\b(conversation|chat|message)\b/.test(name)) return <MessageCircle size={15} />;
    if (/\b(badge|status)\b/.test(name)) return <BadgeCheck size={15} />;
    if (/\b(table)\b/.test(name)) return <Table2 size={15} />;
    if (/\b(menu)\b/.test(name)) return <Menu size={15} />;
    if (/\b(repeater|repeat)\b/.test(name)) return <Repeat size={15} />;
    if (/\b(search|lookup)\b/.test(name)) return <Search size={15} />;
    if (/\b(grid|columns?|rows?|layout)\b/.test(name)) return <Grid2X2 size={15} />;
    if (/\b(shape|rectangle|square|circle|line|divider|spacer)\b/.test(name)
      || layoutTypes.some((type) => type === component.type)) return <Square size={15} />;
    if (/\b(button|link|navigation|action)\b/.test(name)) return <MousePointer2 size={15} />;
    if (/\b(input|form|checkbox|select|field|date|toggle)\b/.test(name)) return <FormInput size={15} />;
    if (/\b(chart|metric|dashboard|activity|report)\b/.test(name)) return <BarChart3 size={15} />;
    if (/\b(table|list|related|record|database)\b/.test(name)) return <List size={15} />;
    return <Puzzle size={15} />;
  };
  const toggleFavourite = (componentId: string) => setFavouriteComponents((current) =>
    current.includes(componentId) ? current.filter((item) => item !== componentId) : [...current, componentId]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('metadrive:page-builder:favourites');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
          throw new Error('Saved favourites are not a list of component IDs.');
        }
        setFavouriteComponents(parsed);
      }
    } catch (failure) {
      onNotify(`Unable to load component favourites: ${failure instanceof Error ? failure.message : 'Browser storage is unavailable.'}`);
    } finally {
      setFavouritesLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!favouritesLoaded) return;
    try {
      window.localStorage.setItem('metadrive:page-builder:favourites', JSON.stringify(favouriteComponents));
    } catch (failure) {
      onNotify(`Unable to save component favourites: ${failure instanceof Error ? failure.message : 'Browser storage is unavailable.'}`);
    }
  }, [favouriteComponents, favouritesLoaded]);
  useEffect(() => {
    try { window.localStorage.setItem('metadrive:page-builder:recent', JSON.stringify(recentComponents)); }
    catch { /* Recent blocks are optional device-local preferences. */ }
  }, [recentComponents]);
  useEffect(() => {
    const savedIdentityExists = pages.some((item) => item.apiName === savedPageApiName.current);
    const currentIdentityExists = pages.some((item) => item.apiName === page.apiName);
    if (!savedIdentityExists && currentIdentityExists) savedPageApiName.current = page.apiName;
  }, [page.apiName, pages]);
  useEffect(() => {
    setCustomPropertiesDraft(selected?.type.startsWith('Custom:') ? JSON.stringify(selected.properties, null, 2) : '');
    setCustomPropertiesError('');
  }, [selected?.id, selected?.type]);
  useEffect(() => {
    setSelectedId(page.components[0]?.id ?? '');
    setPaletteTab('Components');
    // Render the saved page at its fixed device size; no editor device switch.
    setFitCanvas(true);
    setUndoStack([]);
    setRedoStack([]);
    setSelectionUndoStack([]);
    setSelectionRedoStack([]);
    setPreviewMode(false);
    setSavedFeedback(false);
    setPageSettingsOpen(false);
    setDynamicFormsUpgradeOpen(false);
    setMigrationLayoutId('');
  }, []);
  useEffect(() => {
    setFitCanvas(true);
  }, [page.apiName]);
  useEffect(() => {
    const previewArea = pagePreviewAreaRef.current;
    if (!fitCanvas || page.layoutMode !== 'free-canvas' || !previewArea) {
      setFitScale(1);
      return;
    }
    const updateScale = () => {
      const availableWidth = Math.max(1, previewArea.clientWidth - 72);
      setFitScale(canvasScaleToFitWidth(page.canvasWidth, availableWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(previewArea);
    return () => observer.disconnect();
  }, [fitCanvas, page.layoutMode, page.canvasWidth, page.canvasHeight]);
  useEffect(() => {
    if (page.pageType !== 'Record Page') setPaletteTab('Components');
  }, [page.pageType]);
  useEffect(() => {
    if (builderAppApiName) setRecordAppId(builderAppApiName);
  }, [builderAppApiName]);
  /** Editor metadata is separate from the published runtime snapshot. */
  useEffect(() => {
    if (!editorMode) return;
    let active=true;
    const variant=initialLayoutVariant??page.layoutVariant??'Desktop';
    // A user-initiated device switch already fetched this draft. Do not fetch
    // it a second time when the deep-link changes and overwrite new edits.
    if(loadedEditorVariantRef.current===variant)return;
    void request<{page:LightningPageMetadata}>(
      `/metadata/pages/${encodeURIComponent(page.apiName)}/layouts/${variant}/editor`)
      .then(result => {if(active){loadedEditorVariantRef.current=variant;onChange(result.page);}})
      .catch(error => {if(active)onNotify(error instanceof Error?error.message:'Unable to load page draft');});
    return ()=>{active=false;};
  },[editorMode,page.apiName,initialLayoutVariant]);
  const switchLayoutVariant=async(variant:'Mobile'|'Desktop'|'Tablet'|'Custom')=>{
    if((page.layoutVariant??'Desktop')===variant||switchingLayout)return;
    if(undoStack.length&&!window.confirm('Discard unsaved edits on this layout? Save before switching.'))return;
    setSwitchingLayout(true);
    try {
      const {page:layout}=await request<{page:LightningPageMetadata}>(
        `/metadata/pages/${encodeURIComponent(page.apiName)}/layouts/${variant}/editor`);
      loadedEditorVariantRef.current=variant;
      onChange(layout);
      onLayoutVariantChange?.(variant);
      setSelectedId(layout.components[0]?.id??'');
      setSelectionIds(layout.components[0]?[layout.components[0].id]:[]);
      setUndoStack([]);setRedoStack([]);setSelectionUndoStack([]);setSelectionRedoStack([]);
      setSavedFeedback(false);setShowLayoutHistory(false);setFitCanvas(true);
    }catch(error){onNotify(error instanceof Error?error.message:'Unable to change layout');}
    finally{setSwitchingLayout(false);}
  };
  const loadLayoutHistory=async()=>{
    try{
      const result=await request<{versions:Array<{version:number;createdAt:string;published:boolean;draft:boolean}>}>(
        `/metadata/pages/${encodeURIComponent(page.apiName)}/layouts/${page.layoutVariant??'Desktop'}/history`);
      setLayoutVersions(result.versions);setShowLayoutHistory(true);setSelectedHistoryVersion(result.versions.find(item=>!item.draft)?.version??null);
    }catch(error){onNotify(error instanceof Error?error.message:'Unable to load layout history');}
  };
  const restoreLayoutVersion=async(version:number)=>{
    if(!window.confirm('Restore this version to your draft? The live layout stays unchanged until you publish.'))return;
    try{
      const {page:restored}=await request<{page:LightningPageMetadata}>(
        `/metadata/pages/${encodeURIComponent(page.apiName)}/layouts/${page.layoutVariant??'Desktop'}/restore`,{
          method:'POST',body:JSON.stringify({version})
        });
      onChange(restored);setUndoStack([]);setRedoStack([]);setSelectionUndoStack([]);
      setSelectionRedoStack([]);setSavedFeedback(true);
      await loadLayoutHistory();
    }catch(error){onNotify(error instanceof Error?error.message:'Unable to restore page layout');}
  };
  const confirmDiscardPageChanges = () =>
    !editorMode || !undoStack.length ||
    window.confirm('Discard unsaved Page Builder edits?');
  useEffect(()=>{
    if(!editorMode||!undoStack.length)return;
    const preventClose=(event:BeforeUnloadEvent)=>{
      event.preventDefault();
      event.returnValue='';
    };
    window.addEventListener('beforeunload',preventClose);
    return ()=>window.removeEventListener('beforeunload',preventClose);
  },[editorMode,undoStack.length]);
  const safeBackToPages=()=>{if(confirmDiscardPageChanges())onBackToPages();};
  const selectSavedPage = (apiName: string) => {
    if(!confirmDiscardPageChanges())return;
    savedPageApiName.current = apiName;
    onSelectPage(apiName);
  };
  const changeTargetObject = (apiName: string) => {
    if(!confirmDiscardPageChanges())return;
    const existingPage = pages.find((item) => item.pageType === 'Record Page' && item.targetObject === apiName);
    const nextApiName = existingPage?.apiName ?? `${apiName.replace(/__c$/, '')}_Record_Page`;
    const nextObject = objects.find((item) => item.apiName === apiName);
    savedPageApiName.current = nextApiName;
    setMigrationLayoutId(nextObject?.pageLayoutAssignments?.[0]?.pageLayoutId ?? nextObject?.pageLayouts?.[0]?.id ?? '');
    onTargetObjectChange(apiName);
  };
  const applyPage = (nextPage: LightningPageMetadata) => {
    if (JSON.stringify(page) === JSON.stringify(nextPage)) return;
    setUndoStack((current) => [...current.slice(-49), page]);
    setRedoStack([]);
    setSelectionUndoStack(current => [...current.slice(-49), { selectedId, selectionIds: [...selectionIds] }]);
    setSelectionRedoStack([]);
    setSavedFeedback(false);
    onChange(nextPage);
  };
  const updateComponent = (id: string, update: Partial<LightningPageMetadata['components'][number]>) => {
    const target = page.components.find(component => component.id === id);
    if (!target) return;
    // Lock prevents accidental edits; an explicit unlock is always allowed.
    if (isCanvasLocked(target) && update.properties?.editorLocked !== false) return;
    applyPage({ ...page, components: page.components.map((component) => component.id === id ? { ...component, ...update } : component) });
  };
  const toggleCanvasLock = (component: PageComponentMetadata) =>
    updateComponent(component.id, { properties: { ...component.properties, editorLocked: !isCanvasLocked(component) } });
  const moveLayer = (id: string, offset: -1 | 1) => {
    const index = page.components.findIndex(component => component.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= page.components.length ||
      isCanvasLocked(page.components[index]) || isCanvasLocked(page.components[target])) return;
    const components = [...page.components];
    [components[index], components[target]] = [components[target], components[index]];
    applyPage({ ...page, components });
  };
  const wrapSelectedInContainer = () => {
    if (!selected || !selected.position || isCanvasLocked(selected) || rawLayoutParentId(selected)) return;
    if (selectionIds.length<2 || selectionIds.some(id=>{
      const item=page.components.find(component=>component.id===id);
      return !item?.position||Boolean(rawLayoutParentId(item))||isCanvasLocked(item)||item.properties.canvasLocked===true;
    }))return;
    const groupId = 'group-' + crypto.randomUUID();
    const eligible=page.components.filter(item=>selectionIds.includes(item.id)&&item.position&&!rawLayoutParentId(item)&&item.properties.canvasLocked!==true&&!isCanvasLocked(item));
    const next=eligible.length>1
      ?groupCanvasComponents(page.components,eligible.map(item=>item.id),groupId)
      :wrapCanvasComponent(page.components,selected.id,groupId);
    applyPage({ ...page, components: next });
    setSelectionIds([groupId]);
    setSelectedId(groupId);
    setPaletteTab('Layers');
  };
  const ungroupSelected = () => {
    if (!selected || selected.type !== 'Container' || isCanvasLocked(selected)) return;
    const children = childrenOf(page.components, selected.id);
    if (!children.length || children.some(isCanvasLocked)) return;
    applyPage({ ...page, components: ungroupCanvasComponent(page.components, selected.id) });
    setSelectedId(children[0].id);
  };
  const startComponentPanelResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    paletteResizeStart.current = { pointerId: event.pointerId, pointerX: event.clientX, width: componentPanelWidth };
  };
  const moveComponentPanelResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = paletteResizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setComponentPanelWidth(Math.min(528, Math.max(264, start.width + event.clientX - start.pointerX)));
  };
  const endComponentPanelResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (paletteResizeStart.current?.pointerId === event.pointerId) paletteResizeStart.current = null;
  };
  const openComponentInspector = (tab: typeof inspectorTab = 'Design') => {
    setInspectorTab(tab); setPageSettingsOpen(false); setActivePanel('properties'); setComponentMenuId('');
  };
  const openPalette = (tab: typeof paletteTab = 'Components', category?: typeof paletteCategory) => {
    setPaletteTab(tab); if (category) setPaletteCategory(category);
    setActivePanel('palette'); setComponentMenuId(''); setPaletteInsertRegion(null);
  };
  const updateCustomProperties = (value: string) => {
    setCustomPropertiesDraft(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Properties must be a JSON object.');
      }
      if (selected) updateComponent(selected.id, { properties: parsed as Record<string, unknown> });
      setCustomPropertiesError('');
    } catch (failure) {
      setCustomPropertiesError(failure instanceof Error ? failure.message : 'Enter valid JSON properties.');
    }
  };
  // Move only the selected DOM element while dragging. Commit metadata and
  // a single undo step on release, avoiding a page-wide render per pointer frame.
  const startCanvasMove = (event: React.PointerEvent<HTMLDivElement>, component: PageComponentMetadata) => {
    if (previewMode || !component.position || isCanvasLocked(component) || component.properties.canvasLocked === true
      || event.button !== 0 || event.shiftKey || canvasMoveStart.current) return;
    if ((event.target as HTMLElement).closest('button,input,select,textarea,a,[contenteditable="true"],.free-canvas-resize-handle,.canvas-element-actions')) return;
    const element = event.currentTarget.closest<HTMLElement>('.free-canvas-component');
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stage = element.closest('.free-canvas-stage');
    const group = page.components.filter(item => item.id !== component.id && selectionIds.includes(item.id)
      && item.position && !rawLayoutParentId(item) && !isCanvasLocked(item) && item.properties.canvasLocked !== true)
      .flatMap(item => {
        const node = Array.from(stage?.querySelectorAll<HTMLElement>('.free-canvas-component') ?? [])
          .find(candidate => candidate.dataset.componentId === item.id);
        return node && item.position ? [{ id: item.id, element: node, original: { ...item.position },
          x: item.position.x, y: item.position.y }] : [];
      });
    canvasMoveStart.current = {
      id: component.id, pointerId: event.pointerId, group,
      pointerX: event.clientX, pointerY: event.clientY,
      original: { ...component.position }, element,
      x: component.position.x, y: component.position.y
    };
    setSelectedRegion(null);
    setSelectedId(component.id);
    if (!selectionIds.includes(component.id)) setSelectionIds([component.id]);
    setPageSettingsOpen(false);
  };
  const moveCanvasPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = canvasMoveStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const scale = fitCanvas ? fitScale : 1;
    const x = start.original.x + canvasUnitsFromScreenDelta(event.clientX - start.pointerX, scale);
    const y = start.original.y + canvasUnitsFromScreenDelta(event.clientY - start.pointerY, scale);
    const next = canvasSnap
      ? snapCanvasPosition({ ...start.original, x, y },
          { width: page.canvasWidth, height: page.canvasHeight },
          page.components.filter(item => item.id !== start.id && !rawLayoutParentId(item) && item.position).map(item => item.position!), true)
      : { position: canvasBoundPosition({ ...start.original, x, y }, { width: page.canvasWidth, height: page.canvasHeight }, false),
          guides: { x: false, y: false } };
    const positions = [start.original, ...start.group.map(item => item.original)];
    const deltaX = Math.max(-Math.min(...positions.map(item => item.x)),
      Math.min(Math.min(...positions.map(item => page.canvasWidth - item.x - item.width)), next.position.x - start.original.x));
    const deltaY = Math.max(-Math.min(...positions.map(item => item.y)),
      Math.min(Math.min(...positions.map(item => page.canvasHeight - item.y - item.height)), next.position.y - start.original.y));
    start.x = start.original.x + deltaX; start.y = start.original.y + deltaY;
    for (const other of start.group) {
      other.x = other.original.x + deltaX; other.y = other.original.y + deltaY;
      other.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    if (canvasGuideXRef.current) {
      canvasGuideXRef.current.style.display = next.guides.x ? 'block' : 'none';
      canvasGuideXRef.current.style.left = `${start.x}px`;
    }
    if (canvasGuideYRef.current) {
      canvasGuideYRef.current.style.display = next.guides.y ? 'block' : 'none';
      canvasGuideYRef.current.style.top = `${start.y}px`;
    }
    start.element.style.transform =
      `translate(${deltaX}px, ${deltaY}px)`;
  };
  const endCanvasMove = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = canvasMoveStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    canvasMoveStart.current = null;
    start.element.style.transform = '';
    for (const other of start.group) other.element.style.transform = '';
    if (canvasGuideXRef.current) canvasGuideXRef.current.style.display = 'none';
    if (canvasGuideYRef.current) canvasGuideYRef.current.style.display = 'none';
    if (!cancelled && (start.x !== start.original.x || start.y !== start.original.y)) {
      const positions = new Map<string, { x: number; y: number; width: number; height: number }>([
        [start.id, { ...start.original, x: start.x, y: start.y }],
        ...start.group.map(other => [other.id, { ...other.original, x: other.x, y: other.y }] as const)
      ]);
      applyPage({ ...page, components: page.components.map(item => {
        const position = positions.get(item.id);
        return position ? { ...item, position } : item;
      }) });
    }
  };
  const reorderLayer = (id: string, direction: -1 | 1) => {
    const items = [...page.components];
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    const parent = rawLayoutParentId(items[index]);
    const siblings = items.map((item, position) => rawLayoutParentId(item) === parent ? position : -1).filter(position => position >= 0);
    const indexAmongSiblings = siblings.indexOf(index);
    const target = siblings[indexAmongSiblings + direction];
    if (target === undefined) return;
    [items[index], items[target]] = [items[target], items[index]];
    applyPage({ ...page, components: items });
  };
  const startCanvasResize = (event: React.PointerEvent<HTMLButtonElement>, component: PageComponentMetadata, edge: ResizeEdge) => {
    if (!component.position || isCanvasLocked(component) || component.properties.canvasLocked === true) return;
    const element = event.currentTarget.closest<HTMLElement>('.free-canvas-component');
    if (!element) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    canvasResizeStart.current = { id: component.id, pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY,
      x: component.position.x, y: component.position.y, width: component.position.width, height: component.position.height, edge,
      element, current: { ...component.position } };
    setSelectedId(component.id);
  };
  const moveCanvasResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = canvasResizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const component = page.components.find(item => item.id === start.id);
    if (!component?.position) return;
    const definition = component.type.startsWith('Custom:') ? findRegisteredComponent(libraryComponents, component.type.slice('Custom:'.length), 'page') : undefined;
    const minWidth = Math.min(start.width, definition?.resize?.minWidth ?? 20);
    const minHeight = Math.min(start.height, definition?.resize?.minHeight ?? 20);
    const dx = Math.round(canvasUnitsFromScreenDelta(event.clientX - start.pointerX, fitCanvas ? fitScale : 1));
    const dy = Math.round(canvasUnitsFromScreenDelta(event.clientY - start.pointerY, fitCanvas ? fitScale : 1));
    const west = start.edge.includes('w'), east = start.edge.includes('e'), north = start.edge.includes('n'), south = start.edge.includes('s');
    let x = start.x, y = start.y, width = start.width, height = start.height;
    if (east) width = Math.max(minWidth, Math.min(page.canvasWidth - start.x, start.width + dx));
    if (south) height = Math.max(minHeight, Math.min(page.canvasHeight - start.y, start.height + dy));
    if (west) { x = Math.max(0, Math.min(start.x + start.width - minWidth, start.x + dx)); width = start.width + start.x - x; }
    if (north) { y = Math.max(0, Math.min(start.y + start.height - minHeight, start.y + dy)); height = start.height + start.y - y; }
    start.current = { x, y, width, height };
    Object.assign(start.element.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
  };
  const endCanvasResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = canvasResizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const size = start.current;
    Object.assign(start.element.style, { left: `${start.x}px`, top: `${start.y}px`, width: `${start.width}px`, height: `${start.height}px` });
    canvasResizeStart.current = null;
    const component = page.components.find(item => item.id === start.id);
    if (component?.position && (size.x !== start.x || size.y !== start.y || size.width !== start.width || size.height !== start.height))
      updateComponent(start.id, { position: size });
  };
  const hasOverlappingPageAssignment = (assignment: PageActivationAssignmentMetadata) =>
    (page.activationAssignments ?? []).some((existing) =>
      existing.scope === assignment.scope
      && existing.appId === assignment.appId
      && existing.profileId === assignment.profileId
      && existing.recordTypeId === assignment.recordTypeId
      && existing.formFactors.some((factor) => assignment.formFactors.includes(factor)));
  const addComponent = (type: string, position = page.components.length, region: 'header' | 'main' | 'sidebar' = 'main', canvasPosition?: PageComponentMetadata['position'], parentId: string | null = null) => {
    const customApiName = type.startsWith('Custom:') ? type.slice('Custom:'.length) : '';
    const custom = findRegisteredComponent(libraryComponents, customApiName, 'page');
    const dynamicFormComponent = type === 'Field Section' && page.pageType === 'Record Page' && dynamicFormsEnabled;
    if (!availableComponents.includes(type) && !custom && !dynamicFormComponent && !isLayoutType(type)) {
      onNotify(`Enable the matching object feature before adding the ${type} component`);
      return;
    }
    const id = `${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}`;
    const components = [...page.components];
    const defaultWidth = Math.min(page.canvasWidth, custom?.resize?.defaultWidth ?? 320);
    const defaultHeight = Math.min(page.canvasHeight, custom?.resize?.defaultHeight ?? 180);
    const freeCanvasPosition = page.layoutMode === 'free-canvas'
      ? {
        x: Math.min(canvasPosition?.x ?? 24 + (page.components.length * 24) % Math.max(1, page.canvasWidth - defaultWidth), page.canvasWidth - defaultWidth),
        y: Math.min(canvasPosition?.y ?? 24 + (page.components.length * 24) % Math.max(1, page.canvasHeight - defaultHeight), page.canvasHeight - defaultHeight),
        width: defaultWidth,
        height: defaultHeight
      }
      : undefined;
    components.splice(Math.max(0, Math.min(position, components.length)), 0, {
      id, type, label: custom ? libraryComponentLabel(custom) : type,
      properties: custom
        ? { libraryComponentId: custom.apiName,
            ...Object.fromEntries((custom.propertyDefinitions??[]).filter(def=>Array.isArray(def.defaultValue)
              || (def.propertyKey==='layoutContainer'&&def.defaultValue===true))
              .map(def=>[def.propertyKey,Array.isArray(def.defaultValue)?[...def.defaultValue]:def.defaultValue])),
            ...(parentId ? { layoutParentId: parentId } : {}) }
        : type === 'Report Chart'
          ? { reportApiName: '' }
          : type === 'Dashboard'
            ? { dashboardApiName: '' }
          : type === 'Related List Quick Links'
            ? { relatedLists: defaultRelatedLists }
          : type === 'Rich Text'
            ? { content: '' }
          : type === 'List View'
            ? { listObjectApiName: page.targetObject, savedViewId: '', columns: [], pageSize: 25 }
          : type === 'Screen Flow'
            ? { flowApiName: '', inputRecordIdAs: '', embed: true }
          : type === 'Path'
            ? { stageFieldApiName: '' }
          : type === 'Related List'
            ? { relatedLists: defaultRelatedLists }
            : type === 'Field Section'
              ? { fieldApiNames: [], columns: 2 }
            : {},
      visible: true, parentId: parentId ?? undefined, region,
      ...(freeCanvasPosition ? { position: freeCanvasPosition } : {})
    });
    applyPage({ ...page, components: assignTabOnReparent(
      components,id,parentId,parentId ? openBuilderTabs[parentId] : undefined) });
    setRecentComponents(current => addRecentPageBlock(current, type));
    setSelectedId(id);
    setPageSettingsOpen(false);
    setActivePanel('properties');
    setInspectorTab(componentNeedsData(type)?'Data & Actions':'Design');
    setRibbonTab(componentNeedsData(type)?'Component Data':'Component Properties');
  };
  const addField = (fieldApiName: string) => {
    if (dynamicFormsEnabled) {
      const field = fields.find((item) => item.apiName === fieldApiName);
      if (!field) return;
      const id = `record-field-${crypto.randomUUID()}`;
      const component: PageComponentMetadata = {
        id,
        type: 'Record Field',
        label: field.label,
        properties: { fieldApiName },
        visible: true,
        region: 'main'
      };
      applyPage({ ...page, components: [...page.components, component] });
      setSelectedId(id);
      setPageSettingsOpen(false);
      return;
    }
    const detail = page.components.find((component) => component.type === 'Record Detail');
    if (!detail) {
      const id = `record-detail-${crypto.randomUUID()}`;
      applyPage({ ...page, components: [...page.components, { id, type: 'Record Detail', label: 'Record Detail', properties: { fields: [fieldApiName] }, visible: true }] });
      setSelectedId(id);
      return;
    }
    const currentFields = Array.isArray(detail.properties.fields) ? detail.properties.fields.filter((value): value is string => typeof value === 'string') : [];
    const nextFields = currentFields.includes(fieldApiName) ? currentFields.filter((value) => value !== fieldApiName) : [...currentFields, fieldApiName];
    updateComponent(detail.id, { properties: { ...detail.properties, fields: nextFields } });
    setSelectedId(detail.id);
  };
  const addFieldToSection = (sectionId: string, fieldApiName: string) => {
    const section = page.components.find((component) => component.id === sectionId && component.type === 'Field Section');
    if (!section) {
      addField(fieldApiName);
      return;
    }
    const fieldApiNames = stringList(section.properties.fieldApiNames, []);
    if (fieldApiNames.includes(fieldApiName)) return;
    updateComponent(sectionId, { properties: { ...section.properties, fieldApiNames: [...fieldApiNames, fieldApiName] } });
    setSelectedId(sectionId);
    setPageSettingsOpen(false);
  };
  const moveSectionField = (sectionId: string, fieldIndex: number, offset: -1 | 1) => {
    const section = page.components.find((component) => component.id === sectionId && component.type === 'Field Section');
    if (!section) return;
    const fieldApiNames = stringList(section.properties.fieldApiNames, []);
    const nextIndex = fieldIndex + offset;
    if (nextIndex < 0 || nextIndex >= fieldApiNames.length) return;
    [fieldApiNames[fieldIndex], fieldApiNames[nextIndex]] = [fieldApiNames[nextIndex]!, fieldApiNames[fieldIndex]!];
    updateComponent(sectionId, { properties: { ...section.properties, fieldApiNames } });
  };
  const importLegacyRecordLayout = () => {
    if (!selectedMigrationLayout || page.pageType !== 'Record Page') return;
    if ((dynamicFormsEnabled || page.components.some(c=>c.type==='Record Actions'))
      && !window.confirm('Replace this device layout’s field sections, record actions and related lists with the selected legacy layout? Only this unpublished draft will change.')) return;
    applyPage({...page,components:legacyLayoutToRecordComponents(
      selectedMigrationLayout,page.components,page.layoutVariant??'Desktop')});
    setDynamicFormsUpgradeOpen(false);
    setPageSettingsOpen(true);
    onNotify('Legacy layout imported into this device draft. Review it, then Save and Publish.');
  };
  const upgradeRecordDetail = (_recordDetail: PageComponentMetadata) => importLegacyRecordLayout();
  const updateRecordPageControls = (next:Record<string,unknown>) => {
    const existing=page.components.find(component=>component.type==='Record Actions');
    if (existing) updateComponent(existing.id,{properties:{...existing.properties,...next}});
    else applyPage({...page,components:[...page.components,{
      id:'record-actions-'+crypto.randomUUID(),type:'Record Actions',label:'Record Actions',
      region:'header',visible:true,properties:{
        actions:[...(assignedMigrationLayout?.actions??['New','Edit','Delete'])],
        customLinks:[...(assignedMigrationLayout?.customLinks??[])],
        relatedListSettings:{...(assignedMigrationLayout?.relatedListSettings??{})},...next}
    }]});
  };
  const recordPageControls=page.components.find(component=>component.type==='Record Actions');
  const recordPageActionIds=Array.isArray(recordPageControls?.properties.actions)
    ?recordPageControls.properties.actions.filter((name):name is string=>typeof name==='string')
    :assignedMigrationLayout?.actions??['New','Edit','Delete'];
  const rawActionOverrides=recordPageControls?.properties.actionOverrides;
  const recordPageActionOverrides:Partial<Record<'Edit'|'Clone'|'Delete',string>>={};
  if(rawActionOverrides&&typeof rawActionOverrides==='object'&&!Array.isArray(rawActionOverrides)){
    for(const name of ['Edit','Clone','Delete'] as const){
      const id=(rawActionOverrides as Record<string,unknown>)[name];
      if(typeof id==='string')recordPageActionOverrides[name]=id;
    }
  }
  const rawActionVisibility=recordPageControls?.properties.actionVisibility;
  const recordPageActionVisibility:Record<string,{fieldApiName:string;equalsValue:string;operator?:'Equals'|'NotEquals'|'Contains'|'IsBlank'|'IsNotBlank'}>={}
  if(rawActionVisibility&&typeof rawActionVisibility==='object'&&!Array.isArray(rawActionVisibility))
    for(const [actionId,value] of Object.entries(rawActionVisibility)){
      if(!value||typeof value!=='object'||Array.isArray(value))continue;
      const item=value as Record<string,unknown>;
      if(typeof item.fieldApiName==='string'&&typeof item.equalsValue==='string'
        &&(item.operator===undefined||['Equals','NotEquals','Contains','IsBlank','IsNotBlank'].includes(String(item.operator))))
        recordPageActionVisibility[actionId]={fieldApiName:item.fieldApiName,equalsValue:item.equalsValue,
          ...(item.operator!==undefined?{operator:item.operator as 'Equals'|'NotEquals'|'Contains'|'IsBlank'|'IsNotBlank'}:{})};
    }
  const recordPageLinks=Array.isArray(recordPageControls?.properties.customLinks)
    ?recordPageControls.properties.customLinks.filter((item):item is PageLayoutCustomLinkMetadata=>
      Boolean(item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.url==='string'
        &&typeof item.label==='string'&&typeof item.openInNewWindow==='boolean'))
    :assignedMigrationLayout?.customLinks??[];
  type RecordListSetting={columns?:string[];pageSize?:10|25|50;showNewAction?:boolean;showRowActions?:boolean;sortField?:string;sortDirection?:'asc'|'desc'};
  const rawRecordListSettings=recordPageControls?.properties.relatedListSettings;
  const recordPageRelatedSettings:Record<string,RecordListSetting>=
    rawRecordListSettings&&typeof rawRecordListSettings==='object'&&!Array.isArray(rawRecordListSettings)
      ?rawRecordListSettings as Record<string,RecordListSetting>
      :assignedMigrationLayout?.relatedListSettings??{};
  const updateRecordPageRelatedList=(name:string,settings:RecordListSetting)=>{
    updateRecordPageControls({relatedListSettings:{
      ...recordPageRelatedSettings,[name]:{...(recordPageRelatedSettings[name]??{}),...settings}
    }});
  };
  const removeSelected = () => {
    if (!selected) {
      onNotify('Select a component to remove');
      return;
    }
    if (isCanvasLocked(selected)) {
      onNotify('Unlock this component before deleting it');
      return;
    }
    if (!confirmDestructiveAction('Delete', 'Page component "'+selected.label+'"',
      'The component will be removed from this layout draft. Save and publish to make the change live.')) return;
    const parentId = rawLayoutParentId(selected);
    // Preserve children of deleted layout containers by updating both metadata
    // parent references. A stale parentId otherwise leaves orphaned components.
    const remaining = page.components.filter((component) => component.id !== selected.id)
      .map((component) => rawLayoutParentId(component) === selected.id
        ? { ...component, parentId: parentId ?? undefined, properties: {
            ...component.properties, layoutParentId: parentId ?? undefined
          } }
        : component);
    applyPage({ ...page, components: remaining });
    setSelectedId('');
    setComponentMenuId('');
    onNotify('Component removed from draft. Save the page to keep this change.');
  };
  const addRecordAssignment = () => {
    const needsApp = recordScope !== 'Org Default';
    const needsProfile = recordScope === 'App and Profile' || recordScope === 'App, Record Type, and Profile';
    const needsRecordType = recordScope === 'App, Record Type, and Profile';
    const availableRecordTypes = (targetObject?.recordTypes ?? []).filter((recordType) => recordType.active);
    const formFactors = recordFormFactors.filter((factor) => factor === 'Tablet' || factor === 'Custom' || page.devices.includes(factor));
    if (!formFactors.length
      || (needsApp && !recordAppId)
      || (needsProfile && !recordProfileId)
      || (needsRecordType && !availableRecordTypes.some((recordType) => recordType.id === recordTypeId))) {
      onNotify('Choose all required assignment values and at least one supported form factor');
      return;
    }
    const assignment: PageActivationAssignmentMetadata = {
      id: `record-activation-${crypto.randomUUID()}`,
      scope: recordScope,
      appId: needsApp ? recordAppId : null,
      profileId: needsProfile ? recordProfileId : null,
      recordTypeId: needsRecordType ? recordTypeId : null,
      formFactors
    };
    if (hasOverlappingPageAssignment(assignment)) {
      onNotify('An activation assignment already exists for this target and form factor');
      return;
    }
    applyPage({ ...page, activationAssignments: [...(page.activationAssignments ?? []), assignment] });
  };
  const addHomeAssignment = () => {
    const formFactors = homeFormFactors.filter((factor) => factor === 'Tablet' || factor === 'Custom' || page.devices.includes(factor));
    if (!homeAppId || !formFactors.length || (homeScope === 'App and Profile' && !homeProfileId)) {
      onNotify('Choose an app, form factor, and profile when required');
      return;
    }
    const assignment: PageActivationAssignmentMetadata = {
      id: `home-activation-${crypto.randomUUID()}`,
      scope: homeScope,
      appId: homeAppId,
      profileId: homeScope === 'App and Profile' ? homeProfileId : null,
      recordTypeId: null,
      formFactors
    };
    if (hasOverlappingPageAssignment(assignment)) {
      onNotify('An activation assignment already exists for this app, profile, and form factor');
      return;
    }
    applyPage({ ...page, activationAssignments: [...(page.activationAssignments ?? []), assignment] });
  };
  const removePageAssignment = (id: string) => {
    const activationAssignments = (page.activationAssignments ?? []).filter((assignment) => assignment.id !== id);
    applyPage({
      ...page,
      activationAssignments,
      status: page.status === 'Active' && !activationAssignments.length ? 'Draft' : page.status
    });
  };
  const copySelected = () => {
    if (selected) setComponentClipboard(copyComponentTree(page.components, selected.id));
  };
  const cutSelected = () => {
    if (!selected || isCanvasLocked(selected)) return;
    const snapshot=copyComponentTree(page.components,selected.id);
    setComponentClipboard(snapshot);
    const removedIds=new Set(snapshot.components.map(item=>item.id));
    applyPage({...page,components:page.components.filter(item=>!removedIds.has(item.id))});
    setSelectedId('');
  };
  const pasteComponent = () => {
    if (!componentClipboard) return;
    const parentId=selected
      ? (isLayoutContainer(selected) ? selected.id : rawLayoutParentId(selected))
      : null;
    const cloned=cloneComponentTree(componentClipboard,parentId);
    const root=cloned.components.find(item=>item.id===cloned.rootId)!;
    const position=root.position ? {
      ...root.position,
      x:Math.max(0,Math.min(page.canvasWidth-root.position.width,root.position.x)),
      y:Math.max(0,Math.min(page.canvasHeight-root.position.height,root.position.y))
    }:undefined;
    const inserted=cloned.components.map(item=>item.id===root.id?{...item,position,region:selected?.region??item.region}:item);
    const originalIndex=selected?page.components.findIndex(item=>item.id===selected.id):-1;
    const components=[...page.components];
    components.splice(originalIndex<0?components.length:originalIndex+1,0,...inserted);
    applyPage({...page,components});
    setSelectedId(cloned.rootId);
    setSelectionIds([cloned.rootId]);
  };
  const duplicateSelected = () => {
    if (!selected || isCanvasLocked(selected)) return;
    const snapshot=copyComponentTree(page.components,selected.id);
    const clone=cloneComponentTree(snapshot,rawLayoutParentId(selected));
    const ids=new Set(snapshot.components.map(item=>item.id));
    const lastIndex=page.components.reduce((last,item,index)=>ids.has(item.id)?index:last,-1);
    const components=[...page.components];
    components.splice(lastIndex+1,0,...clone.components);
    applyPage({...page,components});
    setSelectedId(clone.rootId);
    setSelectionIds([clone.rootId]);
    setComponentMenuId('');
  };
  const alignSelected = (axis: 'x' | 'y', anchor: 'start' | 'center' | 'end') => {
    const targets = page.components.filter(component =>
      selectionIds.includes(component.id) && component.position
      && !rawLayoutParentId(component) && !isCanvasLocked(component)
      && component.properties.canvasLocked !== true);
    const selectedTargets = targets.length > 1 ? targets
      : selected?.position && !isCanvasLocked(selected) && selected.properties.canvasLocked !== true
        ? [selected] : [];
    if (!selectedTargets.length) return;
    const aligned = alignCanvasComponents(page.components, selectedTargets.map(component => component.id),
      axis, anchor, { width: page.canvasWidth, height: page.canvasHeight });
    applyPage({ ...page, components: aligned });
  };
  const distributeSelected = (axis: 'x'|'y') => {
    if (selectionIds.length < 3) return;
    applyPage({...page,components:distributeCanvasComponents(page.components,selectionIds,axis)});
  };
  const moveSelected = (offset: -1 | 1) => { if (selected) moveLayer(selected.id, offset); };
  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setRedoStack(current => [...current, page]);
    setUndoStack(current => current.slice(0, -1));
    setSelectionRedoStack(current => [...current, { selectedId, selectionIds: [...selectionIds] }]);
    setSelectionUndoStack(current => current.slice(0, -1));
    onChange(previous);
    const previousIds = new Set(previous.components.map(component => component.id));
    const snapshot = selectionUndoStack[selectionUndoStack.length - 1];
    const restoredSelection = (snapshot?.selectionIds ?? selectionIds).filter(id => previousIds.has(id));
    setSelectionIds(restoredSelection);
    const requestedId = snapshot?.selectedId ?? selectedId;
    setSelectedId(previousIds.has(requestedId) ? requestedId : (restoredSelection[0] ?? ''));
  };
  const redo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack(current => [...current, page]);
    setRedoStack(current => current.slice(0, -1));
    setSelectionUndoStack(current => [...current, { selectedId, selectionIds: [...selectionIds] }]);
    setSelectionRedoStack(current => current.slice(0, -1));
    onChange(next);
    const nextIds = new Set(next.components.map(component => component.id));
    const snapshot = selectionRedoStack[selectionRedoStack.length - 1];
    const restoredSelection = (snapshot?.selectionIds ?? selectionIds).filter(id => nextIds.has(id));
    setSelectionIds(restoredSelection);
    const requestedId = snapshot?.selectedId ?? selectedId;
    setSelectedId(nextIds.has(requestedId) ? requestedId : (restoredSelection[0] ?? ''));
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.defaultPrevented || (target instanceof HTMLElement &&
        (['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable))) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (command && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (command && key === 'c' && selected && !previewMode) {
        event.preventDefault(); copySelected();
      } else if (command && key === 'v' && componentClipboard && !previewMode) {
        event.preventDefault(); pasteComponent();
      } else if (command && key === 'd' && selected && !previewMode) {
        event.preventDefault(); duplicateSelected();
      } else if (!command && (event.key === 'Delete' || event.key === 'Backspace')
        && selected && !previewMode && !isCanvasLocked(selected)) {
        event.preventDefault(); removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const savePage = async (status?: 'Active' | 'Draft', candidate: LightningPageMetadata = page, returnToList = false) => {
    const propertyIssues=candidate.components.flatMap(c=>{
      const definition=c.type.startsWith('Custom:')?findRegisteredComponent(libraryComponents,c.type.slice(7),'page'):undefined;
      const definitions=availableComponentSettings(definition?.propertyDefinitions??[],candidate.layoutVariant??'Desktop',definition?.version);
      return [...pagePropertyIssues(c.type,c.properties),...validateComponentSettings(definitions.filter(d=>d.schemaVersion===1),resolveComponentSettings(definitions,c.properties??{}))]
        .map(issue=>c.label+': '+issue.path+' '+issue.message);
    });
    if(propertyIssues.length){onNotify(propertyIssues.join('; '));return;}
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(candidate.apiName)) {
      onNotify('API Name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }
    if (pages.some((item) => item.apiName.toLowerCase() === candidate.apiName.toLowerCase()
      && item.apiName !== savedPageApiName.current)) {
      onNotify('A Lightning page with this API name already exists');
      return;
    }
    if (status === 'Active' && candidate.pageType === 'Record Page' && !candidate.activationAssignments?.length) {
      onNotify('Add at least one activation assignment before activating this record page');
      return;
    }
    if (status === 'Active' && candidate.pageType === 'Home Page' && !candidate.activationAssignments?.length) {
      onNotify('Assign this Home Page to an app or app and profile before activating it');
      return;
    }
    if (status === 'Active' && candidate.pageType === 'App Page' && apps.length === 0) {
      onNotify('Create a Lightning app before activating an App Page');
      return;
    }
    const nextPage = status ? { ...candidate, status } : candidate;
    // App Page availability is resolved from SQL activation assignments.
    const targetAppId = builderAppApiName || preparedAppId;
    if (nextPage.status === 'Active' && nextPage.pageType === 'App Page'
      && !(nextPage.activationAssignments ?? []).some(item => item.appId === targetAppId)) {
      if (!targetAppId || !apps.some(item => item.apiName === targetAppId)) {
        onNotify('Select an installed application before activating this App Page');
        return;
      }
      nextPage.activationAssignments = [...(nextPage.activationAssignments ?? []), {
        id: crypto.randomUUID(), scope: 'App Default', appId: targetAppId,
        profileId: null, recordTypeId: null, formFactors: [...nextPage.devices]
      }];
    }
    setSaving(true);
    try {
      const saved = await onSave(nextPage, candidate === page ? savedPageApiName.current : candidate.apiName);
      if (saved) {
        if (status === 'Active') {
          const published=await onPublish(nextPage.apiName,nextPage.layoutVariant??'Desktop',saved.draftRevision||undefined);
          if(!published)return;
        }
        if (status === 'Active' && nextPage.pageType === 'App Page') {
          const targetAppId = builderAppApiName || preparedAppId;
          const destinationApp = apps.find(item => item.apiName === targetAppId);
          if (destinationApp && !destinationApp.navigationPageApiNames.includes(nextPage.apiName)) {
            const navigationPageApiNames = [...destinationApp.navigationPageApiNames, nextPage.apiName];
            try {
              await onSaveApp({
                ...destinationApp, navigationPageApiNames,
                navigationOrder: reconcileNavigationOrder(
                  destinationApp.navigationItems, navigationPageApiNames, destinationApp.navigationOrder
                )
              }, true);
              onAppLinked(nextPage.apiName);
            } catch (error) {
              onNotify(error instanceof Error ? error.message : 'Page activated, but app navigation could not be updated');
            }
          } else if (destinationApp) onAppLinked(nextPage.apiName);
        }
        savedPageApiName.current = nextPage.apiName;
        setSavedFeedback(true);
        setUndoStack([]);
        setSelectionUndoStack([]);
        setSelectionRedoStack([]);
        setRedoStack([]);
        if (returnToList) onBackToPages();
      }
    } finally {
      setSaving(false);
    }
  };
  const publishCurrentLayout=async()=>{
    if(saving)return;
    if(undoStack.length||!page.draftRevision||page.status==='Draft'){
      await savePage('Active');return;
    }
    setSaving(true);
    try{
      const published=await onPublish(page.apiName,page.layoutVariant??'Desktop',page.draftRevision);
      if(published){setSavedFeedback(true);setShowLayoutHistory(false);}
    }finally{setSaving(false);}
  };
  const clonePage = async () => {
    const baseApiName = `${page.apiName}_Copy`;
    let apiName = baseApiName;
    let suffix = 2;
    while (pages.some((item) => item.apiName.toLowerCase() === apiName.toLowerCase())) {
      apiName = `${baseApiName}_${suffix}`;
      suffix += 1;
    }
    const clonedIds = new Map<string,string>(page.components.map(component => [component.id, `${component.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}`] as const));
    const cloned: LightningPageMetadata = {
      ...structuredClone(page),
      revision: undefined,
      apiName,
      label: `${page.label} Copy`,
      updatedAt: undefined,
      status: 'Draft',
      activationAssignments: [],
      components: page.components.map((component) => ({
        ...component,
        id: clonedIds.get(component.id)!,
        parentId: component.parentId ? clonedIds.get(component.parentId) ?? component.parentId : component.parentId,
        properties: { ...component.properties,
          ...(typeof component.properties?.layoutParentId === 'string'
            ? { layoutParentId: clonedIds.get(component.properties.layoutParentId) ?? component.properties.layoutParentId }
            : {}) }
      }))
    };
    setSaving(true);
    try {
      const saved = await onSave(cloned, apiName, 'Lightning page cloned as a new draft');
      if (saved) {
        savedPageApiName.current = apiName;
        // A page clone includes every independently authored form factor, not
        // only the variant currently open. Keep the clone unpublished.
        const sourcePageName=page.apiName;
        const variants=['Mobile','Desktop','Tablet','Custom'] as const;
        try {
          for(const variant of variants){
            if(variant===(page.layoutVariant??'Desktop'))continue;
            const loaded=await request<{page:LightningPageMetadata}>(
              `/metadata/pages/${encodeURIComponent(sourcePageName)}/layouts/${variant}/editor`);
            const source=loaded.page;
            const ids=new Map(source.components.map(item=>[item.id,
              item.type.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+crypto.randomUUID()]));
            const components=source.components.map(item=>({
              ...structuredClone(item),
              id:ids.get(item.id)!,
              parentId:item.parentId?(ids.get(item.parentId)??item.parentId):undefined,
              properties:{...structuredClone(item.properties),
                ...(typeof item.properties.layoutParentId==='string'
                  ?{layoutParentId:ids.get(item.properties.layoutParentId)??item.properties.layoutParentId}:{})}
            }));
            await request(`/metadata/pages/${encodeURIComponent(apiName)}/layouts/${variant}/draft`,{
              method:'PUT',
              body:JSON.stringify({...source,apiName,label:cloned.label,status:'Draft',
                activationAssignments:[],components,draftRevision:1,publishedRevision:0})
            });
          }
        }catch(error){
          onNotify('Page cloned, but another device layout could not be copied: '+
            (error instanceof Error?error.message:String(error)));
          return;
        }
        savedPageApiName.current = apiName;
        setSelectedId(cloned.components[0]?.id ?? '');
        setPageSettingsOpen(cloned.components.length === 0);
        setPreviewMode(false);
        setUndoStack([]);
        setSelectionUndoStack([]);
        setSelectionRedoStack([]);
        setRedoStack([]);
      }
    } finally {
      setSaving(false);
    }
  };
  const pageDeviceLabel = (item: LightningPageMetadata) => item.canvasWidth <= 600 || (item.devices.length === 1 && item.devices[0] === 'Phone') ? 'Phone' : item.canvasWidth < 1400 ? 'Tablet' : 'Desktop';
  const archiveSavedPage = async (candidate: LightningPageMetadata) => {
    setArchivingPageApiName(candidate.apiName);
    try {
      await onDeletePage(candidate.apiName);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to archive page';
      onNotify(reason.includes('App-owned Page') || reason.includes('App Home Page')
        ? reason + '. Manage the app or reassign its Home Page first.'
        : reason);
    } finally {
      setArchivingPageApiName('');
      setPendingArchivePageApiName('');
    }
  };
  const visiblePages = pages.filter(item => (recordPageContext
    ? item.pageType === 'Record Page' && item.targetObject === recordPageContext
    : item.pageType !== 'Record Page') && (!pageListObject || item.targetObject === pageListObject) && `${item.label} ${item.apiName}`.toLowerCase().includes(pageListSearch.trim().toLowerCase())).sort((a,b) => (Date.parse(b.updatedAt ?? '') || 0) - (Date.parse(a.updatedAt ?? '') || 0));
  const openCreatePage = () => { setNewPageTargetObject(pageListObject || page.targetObject || objects[0]?.apiName || ''); setNewPageLayoutMode('free-canvas'); setNewPageType(recordPageContext ? 'Record Page' : 'Home Page'); setNewPageDeviceChoice('Desktop'); setNewPageDevices(['Desktop']); setNewPageCanvasWidth(1440); setNewPageCanvasHeight(900); setCreatePageOpen(true); };
  const createPage = async () => {
    if (saving) return;
    const label = newPageLabel.trim();
    if (!label) return;
    if (newPageType === 'Record Page' && !recordPageContext) {
      onNotify('Record Pages can only be created from Object Manager.');
      return;
    }
    if (newPageType === 'Record Page' && !objects.some(item => item.apiName === newPageTargetObject)) {
      onNotify('Record Pages need an existing data object; Home and App Pages do not.');
      return;
    }
    if (newPageTargetObject && !objects.some(item => item.apiName === newPageTargetObject)) {
      onNotify('Choose a valid data object or leave it unbound.');
      return;
    }
    if (!newPageDevices.length) {
      onNotify('Choose at least one supported device');
      return;
    }
    const baseApiName = generateMetadataApiName(label) || 'New_Page';
    const apiName = suggestMetadataApiName(baseApiName,[page.apiName,...pages.map(item=>item.apiName)]);
    if (!apiName) {onNotify('Enter a valid page name');return;}
    if (apiName !== baseApiName) onNotify(`Duplicate API Name; created as ${apiName}`);
    const nextPage: LightningPageMetadata = {
      apiName, label, targetObject: newPageTargetObject,
      pageType: newPageType,
      ...(newPageType === 'Record Page' ? { recordMode: newRecordMode } : {}),
      layoutMode: newPageLayoutMode, template: newPageTemplate,
      canvasWidth: newPageCanvasWidth,
      canvasHeight: newPageCanvasHeight,
      status: 'Draft', devices: [...newPageDevices], components: [],
      // App Pages belong to app navigation; only Record/Home pages use activation assignments.
      activationAssignments: newPageAppId
        ? [{
          id: crypto.randomUUID(), scope: 'App Default', appId: newPageAppId,
          profileId: null, recordTypeId: null, formFactors: [...newPageDevices]
        }] : []
    };
    setSaving(true);
    try {
      // Persist first: the route resolver must never replace a new unsaved page
      // with the previously selected page on its next metadata refresh.
      if (newPageAppId) onPrepareApp(apiName, newPageAppId);
      const saved = await onSave(nextPage, apiName, 'Lightning page draft created');
      if (!saved) { onAppLinked(apiName); return; }
      savedPageApiName.current = apiName;
      if (newPageAppId) setBuilderAppApiName(newPageAppId);
      setSelectedId('');
      setPageSettingsOpen(true);
      setCreatePageOpen(false);
      setNewPageLabel('');
      setUndoStack([]);
      setSelectionUndoStack([]);
      setSelectionRedoStack([]);
      setRedoStack([]);
      setPreviewMode(false);
    } finally {
      setSaving(false);
    }
  };
  const setPageTemplate = (nextTemplate: LightningPageTemplate) => {
    const definition = pageTemplates.find((item) => item.id === nextTemplate);
    if (!definition) return;
    const availableRegions = new Set(definition.regions);
    applyPage({
      ...page,
      template: nextTemplate,
      components: page.components.map((component) => ({
        ...component,
        region: availableRegions.has(component.region ?? 'main') ? component.region ?? 'main' : 'main'
      }))
    });
  };
  const setPageLayoutMode = (layoutMode: LightningPageMetadata['layoutMode']) => {
    if (layoutMode === 'free-canvas') {
      if (page.components.some((component) => !component.type.startsWith('Custom:'))) {
        onNotify('Remove standard components before switching this page to Free Canvas');
        return;
      }
      applyPage({
        ...page,
        layoutMode,
        components: page.components.map((component, index) => ({
          ...component,
          position: component.position ?? {
            x: Math.min(24 + index * 24, page.canvasWidth - 320),
            y: Math.min(24 + index * 24, page.canvasHeight - 180),
            width: 320,
            height: 180
          }
        }))
      });
    } else {
      applyPage({ ...page, layoutMode });
    }
  };
  const canvasPositionFromEvent = (event: React.DragEvent<HTMLElement>, width = 320, height = 180) => {
    const canvas = event.currentTarget.closest('.page-stage')?.querySelector<HTMLElement>('.free-canvas-stage');
    if (!canvas) return undefined;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = page.canvasWidth / bounds.width;
    const scaleY = page.canvasHeight / bounds.height;
    const bound = canvasBoundPosition({
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
      width, height
    }, { width: page.canvasWidth, height: page.canvasHeight }, canvasSnap);
    return { ...bound, width, height };
  };
  const moveCanvasComponent = (event: React.DragEvent<HTMLElement>, component: PageComponentMetadata) => {
    if (page.layoutMode !== 'free-canvas' || previewMode) return;
    const nextPosition = canvasPositionFromEvent(event, component.position?.width ?? 320, component.position?.height ?? 180);
    if (!nextPosition || !component.position) return;
    updateComponent(component.id, {
      position: {
        ...component.position,
        x: Math.min(nextPosition.x, page.canvasWidth - component.position.width),
        y: Math.min(nextPosition.y, page.canvasHeight - component.position.height)
      }
    });
  };
  const handleDrop = (event: React.DragEvent<HTMLElement>, targetIndex = page.components.length, region: 'header' | 'main' | 'sidebar' = 'main', parentId: string | null = null) => {
    event.preventDefault();
    event.stopPropagation();
    const data = event.dataTransfer.getData('text/plain');
    setDragOverId('');
    if (data.startsWith('component:')) {
      const draggedId = event.dataTransfer.getData('application/x-metadrive-component-id');
      if (!draggedId) {
        addComponent(data.slice('component:'.length), targetIndex, region,
          page.layoutMode === 'free-canvas' ? canvasPositionFromEvent(event) : undefined, parentId);
        return;
      }
      const dragged = page.components.find(item => item.id === draggedId);
      if (dragged?.properties.canvasLocked === true) {
        onNotify('Unlock this component before moving it.');
        return;
      }
      if (!canNest(page.components, draggedId, parentId)) {
        onNotify('Cannot nest a component inside itself or one of its descendants.');
        return;
      }
      if (page.layoutMode === 'free-canvas') {
        const draggedComponent = page.components.find((component) => component.id === draggedId);
        if (!draggedComponent || isCanvasLocked(draggedComponent)) return;
        const reparented = reparentComponent(page.components, draggedId, parentId);
        const position = !parentId ? canvasPositionFromEvent(event,
          draggedComponent.position?.width ?? 320, draggedComponent.position?.height ?? 180) : undefined;
        applyPage({ ...page, components: assignTabOnReparent(reparented.map((item) =>
          item.id === draggedId && position && item.position
            ? { ...item, position: {
                ...item.position,
                x: position.x,
                y: position.y
              } } : item),draggedId,parentId,
          parentId ? openBuilderTabs[parentId] : undefined) });
        setSelectedId(draggedId);
        return;
      }
      const sourceIndex = page.components.findIndex((component) => component.id === draggedId);
      if (sourceIndex < 0) return;
      const components = [...page.components];
      if (isCanvasLocked(components[sourceIndex])) return;
      const [draggedComponent] = components.splice(sourceIndex, 1);
      if (!draggedComponent) return;
      const targetElement = event.currentTarget;
      const isComponentTarget = targetElement.classList.contains('record-component');
      const insertAfterTarget = isComponentTarget
        && event.clientY > targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height / 2;
      const dropIndex = targetIndex + (insertAfterTarget ? 1 : 0);
      const insertionIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
      components.splice(Math.max(0, Math.min(insertionIndex, components.length)), 0, { ...draggedComponent, parentId: undefined, region });
      applyPage({ ...page, components: assignTabOnReparent(reparentComponent(components, draggedId, parentId),draggedId,parentId,parentId ? openBuilderTabs[parentId] : undefined) });
      setSelectedId(draggedId);
    } else if (data.startsWith('field:')) {
      const sectionId = event.currentTarget.getAttribute('data-component-id');
      if (sectionId && page.components.some((component) => component.id === sectionId && component.type === 'Field Section')) {
        addFieldToSection(sectionId, data.slice('field:'.length));
      } else {
        addField(data.slice('field:'.length));
      }
    }
  };
  // Template components use responsive CSS dimensions rather than absolute canvas coordinates.
  // Pointer moves preview dimensions directly; only the finished size becomes draft metadata.
  const templatePlacementRef = useRef<{ id: string; pointerId: number; mode: 'move' | 'rotate'; node: HTMLElement; startX: number; startY: number; x: number; y: number; rotation: number; nextX: number; nextY: number; nextRotation: number; centreX: number; centreY: number; startAngle: number } | null>(null);
  const templatePlacement = (component: PageComponentMetadata) => {
    const entry = component.properties.templatePlacement;
    const values = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return { x: number(values.x), y: number(values.y), rotation: number(values.rotation) };
  };
  const beginTemplatePlacement = (event: React.PointerEvent<HTMLButtonElement>, component: PageComponentMetadata, mode: 'move' | 'rotate') => {
    if (previewMode || isCanvasLocked(component) || component.properties.canvasLocked === true || event.button !== 0) return;
    const node = event.currentTarget.closest<HTMLElement>('.record-component');
    if (!node) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = node.getBoundingClientRect();
    const current = templatePlacement(component);
    const centreX = rect.left + rect.width / 2, centreY = rect.top + rect.height / 2;
    templatePlacementRef.current = { id: component.id, pointerId: event.pointerId, mode, node,
      startX: event.clientX, startY: event.clientY, ...current,
      nextX: current.x, nextY: current.y, nextRotation: current.rotation,
      centreX, centreY, startAngle: Math.atan2(event.clientY - centreY, event.clientX - centreX) };
    setSelectedId(component.id); setSelectedRegion(null);
  };
  const previewTemplatePlacement = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = templatePlacementRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (start.mode === 'move') {
      start.nextX = Math.round(start.x + event.clientX - start.startX);
      start.nextY = Math.round(start.y + event.clientY - start.startY);
    } else {
      const angle = Math.atan2(event.clientY - start.centreY, event.clientX - start.centreX);
      start.nextRotation = Math.round(start.rotation + (angle - start.startAngle) * 180 / Math.PI);
      if (event.shiftKey) start.nextRotation = Math.round(start.nextRotation / 15) * 15;
    }
    start.node.style.transform = `translate(${start.nextX}px, ${start.nextY}px) rotate(${start.nextRotation}deg)`;
    start.node.style.transformOrigin = 'center center';
  };
  const finishTemplatePlacement = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const start = templatePlacementRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    templatePlacementRef.current = null;
    start.node.style.transform = '';
    start.node.style.transformOrigin = '';
    const component = page.components.find(item => item.id === start.id);
    if (!cancelled && component && (start.x !== start.nextX || start.y !== start.nextY || start.rotation !== start.nextRotation))
      updateComponent(component.id, { properties: { ...component.properties,
        templatePlacement: { x: start.nextX, y: start.nextY, rotation: start.nextRotation } } });
  };
  type TemplateResizeEdge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  const templateResizeRef = useRef<{ id: string; pointerId: number; edge: TemplateResizeEdge; width: number; height: number; x: number; y: number; node: HTMLElement; nextWidth: number; nextHeight: number; initialX: number; initialY: number; rotation: number; nextX: number; nextY: number } | null>(null);
  const beginTemplateResize = (event: React.PointerEvent<HTMLButtonElement>, component: PageComponentMetadata, edge: TemplateResizeEdge) => {
    if (previewMode || isCanvasLocked(component) || component.properties.canvasLocked === true || event.button !== 0) return;
    const node = event.currentTarget.closest<HTMLElement>('.record-component');
    if (!node) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = node.getBoundingClientRect();
    const placement = templatePlacement(component);
    templateResizeRef.current = { id: component.id, pointerId: event.pointerId, edge, width: bounds.width,
      height: bounds.height, x: event.clientX, y: event.clientY, node,
      initialX: placement.x, initialY: placement.y, rotation: placement.rotation,
      nextX: placement.x, nextY: placement.y,
      nextWidth: Math.round(bounds.width), nextHeight: Math.round(bounds.height) };
    setSelectedId(component.id); setSelectedRegion(null);
  };
  const previewTemplateResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = templateResizeRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const region = start.node.closest<HTMLElement>('.page-region');
    const maximumWidth = Math.max(80, region?.clientWidth ?? start.width);
    const horizontal = start.edge.includes('e') ? 1 : start.edge.includes('w') ? -1 : 0;
    const vertical = start.edge.includes('s') ? 1 : start.edge.includes('n') ? -1 : 0;
    start.nextWidth = Math.round(Math.max(80, Math.min(maximumWidth, start.width + horizontal * (event.clientX - start.x))));
    start.nextHeight = Math.round(Math.max(40, start.height + vertical * (event.clientY - start.y)));
    // Keep the opposite edge stationary when resizing from north or west.
    // Use the existing published transform contract instead of a new geometry store.
    start.nextX = start.initialX + (horizontal < 0 ? Math.round(start.width) - start.nextWidth : 0);
    start.nextY = start.initialY + (vertical < 0 ? Math.round(start.height) - start.nextHeight : 0);
    if (horizontal) start.node.style.width = start.nextWidth + 'px';
    if (vertical) start.node.style.height = start.nextHeight + 'px';
    start.node.style.transform = `translate(${start.nextX}px, ${start.nextY}px) rotate(${start.rotation}deg)`;
    start.node.style.transformOrigin = 'center center';
  };
  const finishTemplateResize = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const start = templateResizeRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    templateResizeRef.current = null;
    start.node.style.width = '';
    start.node.style.height = '';
    start.node.style.transform = '';
    start.node.style.transformOrigin = '';
    const component = page.components.find(item => item.id === start.id);
    if (!cancelled && component && (start.nextWidth !== Math.round(start.width) || start.nextHeight !== Math.round(start.height))) {
      updateComponent(component.id, { properties: { ...component.properties,
        templatePlacement: { x: start.nextX, y: start.nextY, rotation: start.rotation },
        visualStyle: {
          ...(typeof component.properties.visualStyle === 'object' && component.properties.visualStyle ? component.properties.visualStyle : {}),
          ...(start.edge.includes('e') || start.edge.includes('w') ? { width: start.nextWidth + 'px' } : {}),
          ...(start.edge.includes('n') || start.edge.includes('s') ? { height: start.nextHeight + 'px' } : {})
        } } });
    }
  };
  const renderPageComponent = (component: LightningPageMetadata['components'][number], index: number, libraryPreview = false, interactivePreview = false) => {
    if (!component.visible) return null;
    const customDefinition = component.type.startsWith('Custom:')
      ? findRegisteredComponent(libraryComponents, component.type.slice('Custom:'.length), 'page')
      : undefined;
    const inPage = page.components.some((item) => item.id === component.id);
    const nested = inPage && !childrenOf(page.components, null).some((item) => item.id === component.id);
    const nestedChildren = isLayoutContainer(component) && (!libraryPreview || interactivePreview)
      ? childrenOf(page.components, component.id).map((child) =>
          renderPageComponent(child, page.components.findIndex((item) => item.id === child.id), libraryPreview, interactivePreview))
      : undefined;
    const visualStyle = resolvePageComponentStyle(component.properties, component.type, device);
    const previewProperties = createComponentPreviewProps(
      customDefinition?.apiName ?? component.type,
      component.label,
      customDefinition?.description ?? selectedComponentDescription
    );
    const customPreviewProps = {
      ...previewProperties,
      ...component.properties,
      ...componentLayoutProps(component.properties, device),
      label: component.label,
      properties: component.properties,
      object: page.pageType === 'Record Page' ? targetObject : undefined,
      device,
      preview: true, previewOnly: true, pageSessionKey: (builderAppApiName || apps[0]?.apiName || 'Records') + ':' + page.apiName,
       loadAsset:(id:string)=>request<{contentType:string;contentBase64:string}>('/media-assets/'+id),
      disabled: !interactivePreview,
      onAction: previewProperties.onAction,
      onChange: previewProperties.onChange,
      onNavigate: previewProperties.onNavigate,
      children: nestedChildren
    };
    const accordionContent=typeof component.properties.content==='string'?component.properties.content:'';
    const tabs=stringList(component.properties.tabs,['Related','Details','News']);
    const chosenTab=tabs.includes(openBuilderTabs[component.id])?openBuilderTabs[component.id]:tabs[0];
    const tabChildren=childrenOf(page.components,component.id).filter(child=>
      (typeof child.properties.tabLabel==='string'&&tabs.includes(child.properties.tabLabel)
        ?child.properties.tabLabel:tabs[0])===chosenTab);
    return <div
      key={component.id}
      data-page-appearance={isLayoutType(component.type) ? 'layout' : pageAppearanceTarget(component.type)}
      data-page-style={pageAppearanceStyleKeys(visualStyle)}
      ref={libraryPreview && !interactivePreview ? (element) => { if (element) element.inert = true; } : undefined}
      className={`record-component ${(!libraryPreview || interactivePreview) && page.layoutMode === 'free-canvas' ? 'free-canvas-component' : ''} ${isCanvasLocked(component) ? 'canvas-component-locked' : ''} ${nested ? 'nested-page-component' : ''} ${isLayoutContainer(component) ? 'layout-container-component' : ''} ${libraryPreview ? 'component-rendered-preview' : ''} ${selectedId === component.id && !previewMode && !libraryPreview ? 'selected' : ''} ${selectionIds.includes(component.id) && !previewMode && !libraryPreview ? 'multi-selected' : ''} ${dragOverId === component.id && !libraryPreview ? 'drop-target' : ''}`}
      style={{
        ...((!libraryPreview || interactivePreview) && page.layoutMode === 'free-canvas'
          ? nested
            ? { position: 'relative', left: 'auto', top: 'auto', width: '100%', height: 'auto', minHeight: 40 }
            : {
                left: component.position?.x ?? 0,
                top: component.position?.y ?? 0,
                width: component.position?.width ?? customDefinition?.resize?.defaultWidth ?? 320,
                height: component.position?.height ?? customDefinition?.resize?.defaultHeight ?? 180
              }
          : {}),
        ...(isLayoutType(component.type) ? {} : visualStyle),
        ...(component.properties?.fillRegion===true && page.layoutMode==='template' ? {height:'100%',minHeight:0}: {})
      } as React.CSSProperties}
      onClick={!libraryPreview ? (event) => { event.stopPropagation(); if (!previewMode) {
        if (event.shiftKey && page.layoutMode === 'free-canvas') {
          const next = selectionIds.includes(component.id) && selectionIds.length > 1
            ? selectionIds.filter(id => id !== component.id) : [...new Set([...selectionIds, component.id])];
          setSelectionIds(next);
          setSelectedId(next.includes(component.id) ? component.id : next[0]);
        } else {
          setSelectionIds([component.id]);
          setSelectedRegion(null);
          setSelectedId(component.id);
        }
        if(component.type==='Custom:une_item_grid'){
          const target=event.target as HTMLElement;
          const mapping=target.closest('.md-product-image')?'imageFieldApiName'
            :target.closest('.md-product-name')?'titleFieldApiName'
            :target.closest('.md-product-description')?'descriptionFieldApiName'
            :target.closest('.md-product-price')?'priceFieldApiName'
            :target.closest('.md-product-badge')?'badgeFieldApiName':'';
          setFocusedCardMapping(mapping);
        }else setFocusedCardMapping('');
        setPageSettingsOpen(false); setComponentMenuId('');
        if (!(event.shiftKey && page.layoutMode === 'free-canvas') && ['Home','Add Block','Preview'].includes(ribbonTab)) { setRibbonTab(componentNeedsData(component.type)?'Component Data':'Component Properties'); openComponentInspector(componentNeedsData(component.type)?'Data & Actions':'Design'); }
      } } : undefined}
      onDoubleClick={!libraryPreview ? event => { event.stopPropagation(); if (!previewMode) { setSelectedRegion(null); setSelectedId(component.id); selectRibbonTab(componentNeedsData(component.type)?'Component Data':'Component Properties'); } } : undefined}
      onContextMenu={!libraryPreview && !previewMode ? event => { event.preventDefault(); event.stopPropagation(); setSelectedRegion(null); setSelectedId(component.id); setComponentMenuId(component.id); } : undefined}
      onPointerDown={!libraryPreview && page.layoutMode === 'free-canvas' && !nested ? event => startCanvasMove(event, component) : undefined}
      onPointerMove={!libraryPreview && page.layoutMode === 'free-canvas' && !nested ? moveCanvasPointer : undefined}
      onPointerUp={!libraryPreview && page.layoutMode === 'free-canvas' && !nested ? event => endCanvasMove(event) : undefined}
      onPointerCancel={!libraryPreview && page.layoutMode === 'free-canvas' && !nested ? event => endCanvasMove(event, true) : undefined}
      onClickCapture={libraryPreview && !interactivePreview ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}
      onKeyDown={!libraryPreview ? (event) => {
         if (event.currentTarget !== event.target || previewMode) return;
         if (event.key === 'Enter' || event.key === ' ') {
           event.preventDefault(); setSelectedId(component.id); setPageSettingsOpen(false);
         } else if (page.layoutMode === 'free-canvas' && component.position && !nested && component.properties.canvasLocked !== true
           && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
           event.preventDefault();
           const delta = event.shiftKey ? 1 : canvasSnap ? 8 : 1;
           const pos = component.position;
           const x = pos.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0);
           const y = pos.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0);
           updateComponent(component.id, { position: {
             ...pos, x: Math.max(0, Math.min(page.canvasWidth - pos.width, x)),
             y: Math.max(0, Math.min(page.canvasHeight - pos.height, y))
           } });
         }
       } : undefined}
      onDragOver={!libraryPreview && !isPhoneBuilder ? (event) => { event.preventDefault(); event.stopPropagation(); setDragOverId(isLayoutContainer(component) ? component.id : rawLayoutParentId(component) ?? component.id); } : undefined}
      onDragLeave={!libraryPreview ? () => setDragOverId('') : undefined}
      onDrop={!libraryPreview && !isPhoneBuilder ? (event) => handleDrop(event, index, component.region ?? 'main', isLayoutContainer(component) ? component.id : rawLayoutParentId(component)) : undefined}
      draggable={!isPhoneBuilder && !previewMode && !libraryPreview && page.layoutMode !== 'free-canvas' && !isCanvasLocked(component)}
      data-component-id={libraryPreview ? undefined : component.id}
      onDragStart={!libraryPreview && !isPhoneBuilder ? (event) => { if (component.properties.canvasLocked === true || canvasMoveStart.current?.id === component.id) { event.preventDefault(); return; } event.stopPropagation(); event.dataTransfer.setData('text/plain', `component:${component.type}`); event.dataTransfer.setData('application/x-metadrive-component-id', component.id); } : undefined}
      role={libraryPreview ? undefined : page.layoutMode === 'free-canvas' ? 'group' : 'button'} tabIndex={previewMode || libraryPreview ? -1 : 0} aria-label={libraryPreview ? undefined : `${component.label} component`}
      aria-hidden={libraryPreview && !interactivePreview || undefined}
    >
      {!previewMode && !libraryPreview && selectedId === component.id && !nested && <div
        className="canvas-element-actions" role="toolbar" aria-label={`Actions for ${component.label}`}
        style={component.position && component.position.y < 60 ? {bottom:'auto',top:'calc(100% + 12px)'} : undefined}
        onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => openComponentInspector('Design')} title="Edit block"><Pencil size={15}/> Edit</button>
        {page.layoutMode === 'free-canvas' && <button type="button" onClick={() => openComponentInspector('Position')} title="Position and size"><Maximize2 size={15}/> Position</button>}
        <button type="button" onClick={() => toggleCanvasLock(component)} title={isCanvasLocked(component) ? 'Unlock' : 'Lock'}>{isCanvasLocked(component) ? <Unlock size={16}/> : <Lock size={16}/>}</button>
        <button type="button" onClick={duplicateSelected} disabled={isCanvasLocked(component)} title="Duplicate"><Copy size={16}/></button>
        <button type="button" onClick={() => setComponentMenuId(current => current === component.id ? '' : component.id)}
          aria-expanded={componentMenuId === component.id} aria-label="More component actions"><MoreHorizontal size={18}/></button>
        {componentMenuId === component.id && <div className="canvas-action-menu" role="menu" aria-label="More component actions">
          <button type="button" role="menuitem" onClick={() => {copySelected();setComponentMenuId('');}}>Copy <kbd>Ctrl+C</kbd></button>
          <button type="button" role="menuitem" disabled={!componentClipboard} onClick={() => {pasteComponent();setComponentMenuId('');}}>Paste <kbd>Ctrl+V</kbd></button>
          <button type="button" role="menuitem" disabled={isCanvasLocked(component)} onClick={duplicateSelected}>Duplicate <kbd>Ctrl+D</kbd></button>
          <button type="button" role="menuitem" onClick={() => openComponentInspector('Position')}>Align and position</button>
          <button type="button" role="menuitem" onClick={() => {moveSelected(-1);setComponentMenuId('');}}>Bring forward</button>
          <button type="button" role="menuitem" onClick={() => {moveSelected(1);setComponentMenuId('');}}>Send backward</button>
          <button type="button" role="menuitem" onClick={() => openComponentInspector('Data & Actions')}>Data, links and actions</button>
          <button type="button" role="menuitem" onClick={() => {updateComponent(component.id,{visible:!component.visible});setComponentMenuId('');}}>{component.visible ? 'Hide' : 'Show'} element</button>
          <button type="button" role="menuitem" disabled={isCanvasLocked(component)} onClick={() => {removeSelected();setComponentMenuId('');}}>Delete <kbd>Delete</kbd></button>
        </div>}
      </div>}
      {isLayoutType(component.type)
        ? <div className="page-nested-layout" style={visualStyle}>
          {directChildren(page.components, component.id).map((child) => renderPageComponent(child, page.components.indexOf(child), libraryPreview, interactivePreview))}
          {!libraryPreview && !previewMode && <div className="canvas-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); const draggedId = event.dataTransfer.getData('application/x-metadrive-component-id'); if (draggedId && canNestComponent(page.components, draggedId, component.id)) { applyPage({ ...page, components: page.components.map((item) => item.id === draggedId ? { ...item, parentId: component.id } : item) }); } else if (!draggedId) { const type = event.dataTransfer.getData('text/plain').replace(/^component:/, ''); if (type) addComponent(type, page.components.length, component.region ?? 'main', undefined, component.id); } }}>Drop components inside {component.label}</div>}
        </div>
        : component.type === 'Record Detail'
        ? <div className="record-detail-grid">{(Array.isArray(component.properties.fields) ? component.properties.fields : fields.slice(0, 6).map((field) => field.apiName)).map((apiName) => { const field = fields.find((item) => item.apiName === apiName); return field ? <div className="record-detail-field" key={apiName}><small>{field.label}</small><span>{previewFieldValue(field.apiName)}</span></div> : null; })}</div>
        : component.type === 'Field Section'
          ? <div className={`record-detail-grid columns-${component.properties.columns === 1 ? 1 : 2}`}>{stringList(component.properties.fieldApiNames, []).map((apiName) => fields.find((field) => field.apiName === apiName)).filter((field): field is FieldMetadata => Boolean(field)).map((field) => <div className="record-detail-field" key={field.apiName}><small>{field.label}</small><span>{previewFieldValue(field.apiName)}</span></div>)}</div>
          : component.type === 'Record Field'
            ? (() => {
              const field = fields.find((item) => item.apiName === component.properties.fieldApiName);
              return <div className="record-detail-field"><small>{field?.label ?? component.label}</small><span>{previewFieldValue(field?.apiName??'')}</span></div>;
            })()
          : component.type === 'Related List'
          ? <div className="record-fields-card surface">
              {stringList(component.properties.relatedLists,defaultRelatedLists).map(name=>
                <div className="record-fields-heading" key={name}>
                  <strong>{relatedListOptions.find(option=>option.apiName===name)?.label??name}</strong>
                  <small>Rows load for the selected record when published</small>
                </div>)}
              {!stringList(component.properties.relatedLists,defaultRelatedLists).length&&<p>Select related lists in block settings.</p>}
            </div>
          : component.type === 'Tabs'
            ? <div className="record-fields-card surface">
                <div className="record-tabs" role="tablist" aria-label={component.label}>
                  {tabs.map(tab=><button type="button" role="tab" key={tab} aria-selected={chosenTab===tab}
                    className={chosenTab===tab?'active':''} onClick={event=>{
                      event.stopPropagation();setOpenBuilderTabs(old=>({...old,[component.id]:tab}));
                    }}>{tab}</button>)}
                </div>
                <div className="record-runtime-tab-panel" role="tabpanel">
                  {tabChildren.map(child=>renderPageComponent(child,page.components.indexOf(child),libraryPreview,interactivePreview))}
                  {!tabChildren.length&&<p>No blocks in this tab.</p>}
                  {!previewMode&&!libraryPreview&&<div className="canvas-drop-zone" onDragOver={event=>event.preventDefault()}
                    onDrop={event=>handleDrop(event,page.components.length,component.region??'main',component.id)}>Drop blocks into {chosenTab}</div>}
                </div>
              </div>
          : component.type === 'Highlights Panel'
            ? <div className="record-highlights surface">
                {(targetObject?(compactLayoutForRecord(targetObject,'master','')?.fieldApiNames??fields.slice(0,5).map(field=>field.apiName)):[])
                  .map(name=>fields.find(field=>field.apiName===name))
                  .filter((field):field is FieldMetadata=>Boolean(field))
                  .map(field=><div key={field.apiName}><span>{field.label}</span><strong>{previewFieldValue(field.apiName)}</strong></div>)}
              </div>
          : component.type === 'Dashboard'
            ? <div className="record-fields-card surface">
                <strong>{dashboards.find(d=>d.apiName===component.properties.dashboardApiName)?.label??'Select a published dashboard'}</strong>
                <p>Dashboard charts load from authorised published data.</p>
              </div>
          : component.type === 'Report Chart'
            ? <div className="record-fields-card surface">
                <strong>{reports.find(report=>report.apiName===component.properties.reportApiName)?.label??'Select a report'}</strong>
                <p>Report results load when the page runs.</p>
              </div>
          : component.type === 'Accordion'
            ? <details className="record-fields-card surface app-page-accordion" open>
                <summary>{component.label}</summary>
                {childrenOf(page.components,component.id).map(child=>
                  renderPageComponent(child,page.components.indexOf(child),libraryPreview,interactivePreview))}
                {!childrenOf(page.components,component.id).length&&
                  (accordionContent?<p>{accordionContent}</p>:<p>Drop a block inside this accordion.</p>)}
                {!previewMode&&!libraryPreview&&<div className="canvas-drop-zone"
                  onDragOver={event=>event.preventDefault()}
                  onDrop={event=>handleDrop(event,page.components.length,component.region??'main',component.id)}>
                  Drop blocks inside this accordion
                </div>}
              </details>
          : component.type === 'Items to Approve'
            ? <div className="record-fields-card surface"><strong>{component.label}</strong><p>Pending approvals assigned to the signed-in user load at runtime.</p></div>
          : component.type === 'Related List Quick Links'
            ? <nav className="record-fields-card surface" aria-label={component.label}>
                {stringList(component.properties.relatedLists,defaultRelatedLists).map(name=>
                  <a key={name} href={'#related-'+name}>{name}</a>)}
              </nav>
          : component.type === 'Rich Text'
            ? <div className="record-fields-card surface" style={{whiteSpace:'pre-wrap'}}>{String(component.properties.content??'')}</div>
          : component.type === 'List View'
            ? <div className="record-fields-card surface"><strong>{objects.find(item=>item.apiName===component.properties.listObjectApiName)?.pluralLabel??'Select an Object'}</strong>
                <p>Authorised records, sorting, search and pagination load when this page runs.</p></div>
          : component.type === 'Path'
            ? <div className="record-fields-card surface"><strong>{component.label}</strong>
                <ol className="record-path">{(fields.find(field=>field.apiName===component.properties.stageFieldApiName)?.picklistValues??[]).map(value=>
                  <li key={value}>{value}</li>)}</ol></div>
          : component.type === 'Screen Flow'
            ? <div className="record-fields-card surface"><strong>{component.label}</strong>
                <p>{flows.find(flow=>flow.apiName===component.properties.flowApiName)?.label??'Select an active Screen Flow'}</p></div>
          : component.type === 'Activities'
            ? <div className="record-fields-card surface"><strong>{component.label}</strong>
                <p>Activities for the current record load when this page is opened.</p></div>
          : component.type === 'Chatter'
            ? <div className="record-fields-card surface"><strong>{component.label}</strong>
                <p>Posts and comments for the current record load when this page is opened.</p></div>
                  : customDefinition?.apiName === 'une_item_grid' && !previewMode && !libraryPreview && !component.properties.titleFieldApiName
                    ? <div className="une-card-grid-editor-preview" aria-label="Card Grid example layout" style={{padding:12,display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,height:'100%',alignContent:'start',pointerEvents:'none'}}>
                        {[1,2,3].map(n=><div key={n} style={{border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',overflow:'hidden',minWidth:0}}><div style={{height:72,background:'#e2e8f0',display:'grid',placeItems:'center',color:'#475569'}}>Image</div><div style={{padding:8,color:'#273449',fontWeight:600}}>Card {n}</div><div style={{padding:'0 8px 10px',fontSize:12,color:'#64748b'}}>Choose fields to show records</div></div>)}
                      </div>
                  : customDefinition && !isLayoutContainer(component) && (!libraryPreview || interactivePreview) &&
                    needsMetadataComponentRuntime(component.properties)
                    ? <MetadataBoundPageComponent apiRequest={request} definition={customDefinition} component={component}
                        objects={objects} apps={apps} pages={pages} currentAppId={builderAppApiName || apps[0]?.apiName || 'Records'}
                        pageSessionKey={(builderAppApiName || apps[0]?.apiName || 'Records') + ':' + page.apiName}
                        reports={reports} formFactor={device === 'Phone' ? 'Phone' : 'Desktop'}
                        availableFlows={flows.filter((flow) => ['Screen Flow', 'Autolaunched Flow'].includes(flow.flowType))}
                        onNavigate={() => {}} onLaunchFlow={(flowApiName: string, inputs: Record<string, unknown>) => { onLaunchFlow(flowApiName, inputs); externalPreviewWindowRef.current?.opener?.focus?.(); }} disableActions />
                  : customDefinition
                    ? <RegisteredComponent definition={customDefinition} layoutTransparent props={libraryPreview ? customPreviewProps : {
                      ...component.properties,
                      ...componentLayoutProps(component.properties, device),
                      label: component.label,
                      properties: component.properties,
                      object: page.pageType === 'Record Page' ? targetObject : undefined,
                      device, previewOnly: true, pageSessionKey: (builderAppApiName || apps[0]?.apiName || 'Records') + ':' + page.apiName,
                       loadAsset:(id:string)=>request<{contentType:string;contentBase64:string}>('/media-assets/'+id),
                      children: nestedChildren
                    }} />
                    : libraryPreview
                      ? <div className="component-demo-fallback"><strong>{component.label}</strong><span>{selectedComponentDescription || 'Preview of a reusable page component.'}</span><div><i /><i /><i /></div></div>
                      : <div className="component-demo-fallback"><strong>{component.label}</strong><span>This component is no longer registered. Re-register it to restore its live preview.</span><div><i /><i /><i /></div></div>}
      {!libraryPreview && customDefinition && customDefinition.trustedBundled !== true && isLayoutContainer(component)
        && <div className="metadata-nested-host">{nestedChildren}</div>}
      {!libraryPreview && !previewMode && isLayoutContainer(component) && !nestedChildren?.length
        && <div className="page-nested-empty">Drop components into this {component.label} or choose a child from the palette</div>}
      {!libraryPreview && page.layoutMode === 'template' && selectedId === component.id && !previewMode && !isCanvasLocked(component) && component.properties.canvasLocked !== true
        && (['move', 'rotate'] as const).map(mode => <button key={mode} type="button"
          className={`template-placement-handle template-placement-${mode}`}
          aria-label={mode === 'move' ? `Move ${component.label}` : `Rotate ${component.label}`}
          title={mode === 'move' ? 'Drag to position block (responsive space reserved)' : 'Drag to rotate; hold Shift for 15 degree steps'}
          draggable={false}
          onPointerDown={event => beginTemplatePlacement(event, component, mode)}
          onPointerMove={previewTemplatePlacement}
          onPointerUp={event => finishTemplatePlacement(event)}
          onPointerCancel={event => finishTemplatePlacement(event, true)}
          onClick={event => event.stopPropagation()}>
          {mode === 'move' ? <MousePointer2 size={13}/> : <RefreshCw size={13}/>}
        </button>)}
      {!libraryPreview && page.layoutMode === 'template' && selectedId === component.id && !previewMode && !isCanvasLocked(component) && component.properties.canvasLocked !== true
        && (['n','ne','e','se','s','sw','w','nw'] as const).map(edge =>
          <button key={edge} type="button" className={`template-component-resize-handle resize-${edge}`}
            aria-label={`Resize ${component.label} ${edge}`} title="Drag edge or corner to resize"
            draggable={false}
            onPointerDown={event => beginTemplateResize(event, component, edge)}
            onPointerMove={previewTemplateResize}
            onPointerUp={event => finishTemplateResize(event)}
            onPointerCancel={event => finishTemplateResize(event, true)}
            onClick={event => event.stopPropagation()} />)}
      {!libraryPreview && page.layoutMode === 'free-canvas' && !nested && selectedId === component.id && !previewMode && !isCanvasLocked(component) && component.properties.canvasLocked !== true
        && (['n','ne','e','se','s','sw','w','nw'] as const).map(edge =>
          <button key={edge} type="button" className={`free-canvas-resize-handle resize-${edge}`}
            aria-label={`Resize ${component.label} ${edge}`} title="Drag edge or corner to resize"
            onPointerDown={event => startCanvasResize(event, component, edge)}
            onPointerMove={moveCanvasResize} onPointerUp={endCanvasResize} onPointerCancel={endCanvasResize}
            onClick={event => event.stopPropagation()}/>)}
    </div>;
  };
  const renderRegion = (region: 'header' | 'main' | 'sidebar') => {
    const regionComponents = page.components
      .map((component, index) => ({ component, index }))
      .filter(({ component }) => childrenOf(page.components, null).some((root) => root.id === component.id) && (component.region ?? 'main') === region);
    return <section
      className={`page-region page-region-${region} ${selectedRegion === region && !previewMode ? 'selected' : ''}`}
      aria-label={`${region[0].toUpperCase()}${region.slice(1)} region`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event, page.components.length, region)}
      onClick={(event) => { if (previewMode || (event.target as HTMLElement).closest('.record-component,.canvas-drop-zone')) return; setSelectedRegion(region); setSelectedId(''); setPageSettingsOpen(false); setActivePanel('properties'); }}
    >
      <div className="page-region-label">{region}{!previewMode && <button type="button" className="icon-button subtle" aria-label={`Edit ${region} section`} onClick={(event) => { event.stopPropagation(); setSelectedRegion(region); setSelectedId(''); setPageSettingsOpen(false); setActivePanel('properties'); }}><Pencil size={13}/></button>}</div>
      {regionComponents.map(({ component, index }) => renderPageComponent(component, index))}
      {!regionComponents.length && <div className="canvas-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, page.components.length, region)}><Plus size={15}/>{previewMode ? <span>Empty section</span> : <button type="button" onClick={() => openAddBlocks(region)}>Add a block here</button>}</div>}
      {regionComponents.length > 0 && !previewMode && <div className="canvas-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, page.components.length, region)}><Plus size={15} /><span>Drop here to add to {region}</span></div>}
    </section>;
  };
  const selectedRelatedLists = selected
    ? stringList(selected.properties.relatedLists, defaultRelatedLists)
    : defaultRelatedLists;
  const componentRelatedListOptions = [
    ...relatedListOptions,
    ...selectedRelatedLists
      .filter((name) => !relatedListOptions.some((option) => option.apiName === name))
      .map((apiName) => ({ apiName, label: apiName }))
  ];
  const openAddBlocks = (region: 'header' | 'main' | 'sidebar' | null = null) => {
    setPaletteInsertRegion(region); setPaletteTab('Components'); setPaletteCategory('All Components'); setActivePanel('palette');
  };
  const journeyTabs: Array<typeof ribbonTab> = ['Home','Add Block','Component Data','Component Content','Component Properties','Component Layout','Component Responsive','Component Action','Preview'];
  const journeyIndex=journeyTabs.indexOf(ribbonTab as typeof journeyTabs[number]);
  const ribbonTabsVisible: Array<typeof ribbonTab> = [...journeyTabs];
  if(ribbonTab==='Filters')ribbonTabsVisible.splice(journeyTabs.indexOf('Component Data')+1,0,'Filters');
  if(ribbonTab==='Source')ribbonTabsVisible.splice(journeyTabs.indexOf('Component Data')+1,0,'Source');
  if(ribbonTab==='Visibility Rules')ribbonTabsVisible.splice(journeyTabs.indexOf('Component Responsive')+1,0,'Visibility Rules');
  const addPaletteComponent = (type: string) => {
    const selectedIndex = page.components.findIndex((component) => component.id === selectedId);
    const selectedRegion = paletteInsertRegion ?? page.components[selectedIndex]?.region ?? 'main';
    const parentId = paletteInsertRegion ? null : selected && isLayoutContainer(selected) ? selected.id : selected ? rawLayoutParentId(selected) : null;
    addComponent(type, paletteInsertRegion ? page.components.length : selectedIndex >= 0 ? selectedIndex + 1 : page.components.length, selectedRegion, undefined, parentId);
    setPaletteInsertRegion(null);
  };
  return (
    <div className={`builder-page ${editorMode ? "builder-editor-mode" : "builder-list-mode"} ${isPhoneBuilder ? 'builder-phone-read-mode' : ''}`}>
      {editorMode&&selected?.type==='Related List'&&(()=>{
        const names=Array.isArray(selected.properties.relatedLists)
          ?selected.properties.relatedLists.filter((name):name is string=>typeof name==='string'):[];
        const relation=names[0]??'';
        const settings=((selected.properties.relatedListSettings??{}) as Record<string,Record<string,unknown>>);
        const current=settings[relation]??{};
        const setRelatedSetting=(key:string,value:unknown)=>updateComponent(selected.id,{properties:{
          ...selected.properties,relatedListSettings:{...settings,[relation]:{...current,[key]:value}}}});
        return <section className="builder-related-list-settings" aria-label="Related List configuration">
          <label className="form-label">Related list
            <select className="form-control" value={relation}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,relatedLists:[event.target.value]}})}>
              <option value="">Choose relationship</option>
              {[...new Set([...defaultRelatedLists,...names])].map(name=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          {relation&&<>
            <label className="form-label"><input type="checkbox"
              checked={selected.properties.serverPaged===true}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,serverPaged:event.target.checked}})}/>
              Independent server-side paging, search and sorting
            </label>
            <label className="form-label">Records per page
              <select className="form-control" value={Number(current.pageSize??25)}
                onChange={event=>setRelatedSetting('pageSize',Number(event.target.value))}>
                {[10,25,50].map(size=><option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <label className="form-label">Sort field
              <input className="form-control" value={String(current.sortField??'')}
                onChange={event=>setRelatedSetting('sortField',event.target.value)} />
            </label>
            <label className="form-label">Filter field
              <input className="form-control" value={String(current.filterField??'')}
                onChange={event=>setRelatedSetting('filterField',event.target.value)} />
            </label>
            <label className="form-label">Filter value
              <input className="form-control" value={String(current.filterValue??'')}
                onChange={event=>setRelatedSetting('filterValue',event.target.value)} />
            </label>
          </>}
        </section>;
      })()}
      {editorMode&&selected?.type==='Record Field'&&(()=>{
        const source=objects.find(item=>item.apiName===page.targetObject);
        const lookupName=String(selected.properties.relatedLookupFieldApiName??'');
        const lookup=source?.fields.find(item=>item.apiName===lookupName&&item.relationship);
        const target=objects.find(item=>item.apiName===lookup?.relationship?.targetObject);
        return <section className="builder-cross-object-settings" aria-label="Cross-object field configuration">
          <label className="form-label">Related record lookup
            <select className="form-control" value={lookupName}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,relatedLookupFieldApiName:event.target.value,relatedFieldApiName:''}})}>
              <option value="">Current record field (no relationship)</option>
              {(source?.fields??[]).filter(item=>Boolean(item.relationship)).map(item=>
                <option key={item.apiName} value={item.apiName}>{item.label}</option>)}
            </select>
          </label>
          {lookup&&<label className="form-label">Related field from {target?.label??lookup.relationship?.targetObject}
            <select className="form-control" value={String(selected.properties.relatedFieldApiName??'')}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,relatedFieldApiName:event.target.value}})}>
              <option value="">Choose a related field</option>
              {(target?.fields??[]).map(item=><option key={item.apiName} value={item.apiName}>{item.label}</option>)}
            </select>
          </label>}
        </section>;
      })()}
      {editorMode&&selected?.type==='Highlights Panel'&&(()=>{
        const source=objects.find(item=>item.apiName===page.targetObject);
        const fields=source?.fields??[];
        const configured=(key:'primaryFieldApiNames'|'secondaryFieldApiNames')=>
          Array.isArray(selected.properties[key])
            ?(selected.properties[key] as unknown[]).filter((name):name is string=>typeof name==='string'):[];
        return <section className="builder-highlights-settings" aria-label="Highlights Panel configuration">
          {(['primaryFieldApiNames','secondaryFieldApiNames'] as const).map(key=>{
            const names=configured(key);
            return <div key={key}>
              <label className="form-label">{key==='primaryFieldApiNames'?'Primary fields':'Secondary fields'}
                <select className="form-control" multiple value={names}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    [key]:Array.from(event.target.selectedOptions,option=>option.value)}})}>
                  {fields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                </select>
              </label>
              {names.map((name,index)=><div key={name}>
                <span>{fields.find(field=>field.apiName===name)?.label??name}</span>
                <button type="button" disabled={index===0}
                  aria-label={'Move '+name+' up'}
                  onClick={()=>{const updated=[...names];[updated[index-1],updated[index]]=[updated[index],updated[index-1]];
                    updateComponent(selected.id,{properties:{...selected.properties,[key]:updated}});}}>Up</button>
                <button type="button" disabled={index===names.length-1}
                  aria-label={'Move '+name+' down'}
                  onClick={()=>{const updated=[...names];[updated[index+1],updated[index]]=[updated[index],updated[index+1]];
                    updateComponent(selected.id,{properties:{...selected.properties,[key]:updated}});}}>Down</button>
              </div>)}
            </div>;
          })}
        </section>;
      })()}
      {editorMode&&selected?.type==='Path'&&(()=>{
        const source=objects.find(item=>item.apiName===page.targetObject);
        const stage=String(selected.properties.stageFieldApiName??'');
        const field=source?.fields.find(item=>item.apiName===stage);
        const guidance=(selected.properties.guidanceByStage??{}) as Record<string,string>;
        const keys=(selected.properties.keyFieldsByStage??{}) as Record<string,string[]>;
        return <section className="builder-path-settings" aria-label="Path configuration">
          <label className="form-label">Stage field
            <select className="form-control" value={stage}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,stageFieldApiName:event.target.value}})}>
              <option value="">Choose picklist</option>
              {(source?.fields??[]).filter(item=>item.dataType==='Picklist').map(item=>
                <option key={item.apiName} value={item.apiName}>{item.label}</option>)}
            </select>
          </label>
          {(field?.picklistValues??[]).map(value=><div key={value}>
            <label className="form-label">Guidance for {value}
              <input className="form-control" value={guidance[value]??''}
                onChange={event=>updateComponent(selected.id,{properties:{
                  ...selected.properties,guidanceByStage:{...guidance,[value]:event.target.value}}})}/>
            </label>
            <label className="form-label">Key fields for {value}
              <select className="form-control" multiple
                aria-label={'Key fields for '+value} value={keys[value]??[]}
                onChange={event=>updateComponent(selected.id,{properties:{
                  ...selected.properties,keyFieldsByStage:{...keys,
                    [value]:Array.from(event.target.selectedOptions,option=>option.value)}}})}>
                {(source?.fields??[]).map(item=><option key={item.apiName} value={item.apiName}>{item.label}</option>)}
              </select>
            </label>
          </div>)}
        </section>;
      })()}
      {editorMode&&selected?.type==='List View'&&
        <section className="builder-list-view-settings" aria-label="Saved List View block configuration">
          <label className="form-label">List Object
            <select className="form-control" aria-label="List View Object"
              value={String(selected.properties.listObjectApiName??'')}
              onChange={event=>updateComponent(selected.id,{properties:{
                ...selected.properties,listObjectApiName:event.target.value,savedViewId:''}})}>
              <option value="">Select Object</option>
              {objects.map(item=><option key={item.apiName} value={item.apiName}>{item.pluralLabel}</option>)}
            </select>
          </label>
          <SavedListViewPicker objectApi={String(selected.properties.listObjectApiName??'')}
            savedViewId={String(selected.properties.savedViewId??'')} request={request}
            onChange={id=>updateComponent(selected.id,{properties:{...selected.properties,savedViewId:id}})}/>
        </section>}
      {editorMode && isPhoneBuilder && <p className="builder-phone-guidance" role="status">
        Phone preview: tap a component to edit its properties. Drag-and-drop and canvas positioning are available on tablet and desktop.
      </p>}
      {externalPreviewTarget && createPortal(
        <div className="external-page-preview">
          <div className={`external-preview-viewport ${device.toLowerCase()}`}>
            <div className={`record-preview ${page.layoutMode === 'free-canvas' ? 'free-canvas-preview' : 'record-page-preview'} ${device === 'Phone' ? 'phone-preview' : device === 'Tablet' ? 'tablet-preview' : ''}`}>
              {page.layoutMode === 'free-canvas'
                ? <div className="free-canvas-stage" style={{ width: page.canvasWidth, height: page.canvasHeight, position: 'relative' }}>
                    {childrenOf(page.components, null).map((component) => renderPageComponent(component, page.components.findIndex((item) => item.id === component.id), true, true))}
                  </div>
                : <BuilderTemplatePreviewLayout page={page} phone={device==='Phone'}
                    header={childrenOf(page.components,null).filter(item=>(item.region??'main')==='header').map((item,index)=>renderPageComponent(item,index,true,true))}
                    main={childrenOf(page.components,null).filter(item=>(item.region??'main')==='main').map((item,index)=>renderPageComponent(item,index,true,true))}
                    sidebar={childrenOf(page.components,null).filter(item=>item.region==='sidebar').map((item,index)=>renderPageComponent(item,index,true,true))}/>}
            </div>
          </div>
        </div>,
        externalPreviewTarget
      )}
      {!editorMode && <section className="page-manager-view" aria-label="Page management">
        <header className="page-manager-header"><div><h1>{recordPageContext ? 'Record Page Editor' : 'Page Builder'}</h1><p>{recordPageContext ? 'Object-owned record pages: view, edit, activate and publish device layouts.' : 'Manage Home and App Pages. Record Pages are managed inside Object Manager.'}</p></div>
          <div className="page-manager-header-actions">
            <button className="btn btn-brand" type="button" onClick={openCreatePage}><Plus size={16}/> New Page</button>
          </div></header>
        <div className="page-manager-filters">
          <label className="form-label">Related Record / Object<select className="form-control" value={pageListObject} aria-label="Related Record or Object" onChange={event=>setPageListObject(event.target.value)}><option value="">All objects</option>{objects.map(item=><option key={item.apiName} value={item.apiName}>{item.label}</option>)}</select></label>
          <label className="form-label">Search pages<input className="form-control" type="search" value={pageListSearch} onChange={event=>setPageListSearch(event.target.value)} placeholder="Search page name…"/></label>
        </div>
        <div className="page-manager-table-scroll"><table className="records-table page-manager-table"><thead><tr><th>Page name</th><th>Type</th><th>Related object</th><th>Device</th><th>Dimensions</th><th>Orientation</th><th>Last modified</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{visiblePages.map(item=><tr key={item.apiName}>
          <td><button type="button" className="page-manager-page-link" onClick={()=>selectSavedPage(item.apiName)}>{item.label}</button><small>{item.apiName}</small></td>
          <td>{item.pageType}</td><td>{item.targetObject ? objects.find(object=>object.apiName===item.targetObject)?.label ?? item.targetObject : 'Not object-specific'}</td><td>{pageDeviceLabel(item)}</td><td>{item.canvasWidth} × {item.canvasHeight} px</td><td>{canvasOrientation(item.canvasWidth,item.canvasHeight)}</td>
          <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}</td>
          <td><span className={item.status === 'Active' ? 'page-status-badge active' : 'page-status-badge'}>{item.status}</span></td>
          <td className="page-manager-actions"><button className="btn btn-small" type="button" aria-label={'Edit '+item.label} onClick={()=>selectSavedPage(item.apiName)}><Pencil size={14}/> Edit</button>
          <button className="btn btn-small" type="button" disabled={saving} aria-label={(item.status==='Active'?'Deactivate ':'Activate ')+item.label} onClick={()=>void(item.status==='Active'?onDeactivate(item.apiName):savePage('Active',item,true))}>{item.status==='Active'?'Deactivate':'Activate'}</button>
          <button className="btn btn-small" type="button" disabled={saving||Boolean(archivingPageApiName)}
            aria-label={'Delete '+item.label} onClick={()=>setPendingArchivePageApiName(item.apiName)}>
            <Trash2 size={14}/>{archivingPageApiName===item.apiName?'Deleting…':'Delete'}
          </button></td>
        </tr>)}</tbody></table>{!visiblePages.length && <div className="records-empty">No pages match the selected filter. Create a new page to begin.</div>}</div>
      </section>}
      {editorMode && <>
      <section className="office-builder-ribbon" aria-label="Page Builder ribbon">
        <div className="office-ribbon-topbar">
          {selected && !['Home','Add Block','Preview'].includes(ribbonTab) &&
            <div className="office-ribbon-selection-context" title={selected.label||selected.type}>
              {selected.label||selected.type} selected
            </div>}
          <div className="office-ribbon-navigation">
            <nav className="office-ribbon-tabs" role="tablist" aria-label="Page Builder tabs">
              {ribbonTabsVisible.map((tab,index) => {
                const Icon = {
                  Home: PanelsTopLeft,
                  'Add Block': Puzzle,
                  'Component Data': Database,
                  'Component Content': Type,
                  'Component Properties': SlidersHorizontal,
                  'Component Style': Type,
                  'Component Responsive': Smartphone,
                  'Component Layout': Layers3,
                  'Component Action': Workflow,
                  Preview: Eye, Filters: Filter, Source: Database, 'Visibility Rules': Eye
                }[tab];
                const label = {
                  Home: 'Home',
                  'Add Block': 'Insert',
                  'Component Data': 'Data',
                  'Component Content': 'Content',
                  'Component Properties': 'Design',
                  'Component Style': 'Format',
                  'Component Responsive': 'Responsive',
                  'Component Layout': 'Layout',
                  'Component Action': 'Actions',
                  Preview: 'Preview', Filters: 'Filters', Source: 'Source', 'Visibility Rules': 'Visibility Rules'
                }[tab];
                return <button key={tab} id={`page-builder-tab-${index}`} type="button"
                  role="tab" tabIndex={ribbonTab===tab?0:-1} aria-selected={ribbonTab === tab}
                  aria-controls="page-builder-tab-content"
                  className={ribbonTab===tab?'active':''} disabled={!selected && tab.startsWith('Component ')} title={!selected && tab.startsWith('Component ')?'Select a component to edit its settings':label} onClick={() => selectRibbonTab(tab)}>
                  <Icon size={16} aria-hidden="true"/><span>{label}</span>
                </button>;
              })}
            </nav>
            <div className="office-ribbon-stepper" aria-label="Page Builder journey navigation">
              <button type="button" aria-label="Previous Page Builder step" title="Previous step" disabled={journeyIndex<=0} onClick={()=>selectRibbonTab(journeyTabs[journeyIndex-1])}><ChevronLeft size={16}/></button>
              <button type="button" aria-label="Next Page Builder step" title="Next step" disabled={journeyIndex<0||journeyIndex===journeyTabs.length-1} onClick={()=>selectRibbonTab(journeyTabs[journeyIndex+1])}><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="office-ribbon-header-tools">
            <span className="office-ribbon-header-status" role="status">
              {saving?'Saving…':undoStack.length?'Unsaved edits':savedFeedback?'Saved':page.draftRevision&&page.draftRevision!==page.publishedRevision?'Saved draft · unpublished':'Draft'}
            </span>
          </div>
        </div>
        <div id="page-builder-tab-content" ref={ribbonStripRef} onScroll={measureRibbonOverflow} className="office-ribbon-content" role="tabpanel"
          aria-label={ribbonTab} aria-labelledby={`page-builder-tab-${Math.max(0,ribbonTabsVisible.indexOf(ribbonTab))}`}>
          {selected && selectedCustomDefinition && (['Component Data','Component Content','Component Properties','Component Layout','Component Responsive','Component Action'] as string[]).includes(ribbonTab) &&
            <UniversalRibbonInventory tab={ribbonTab as 'Component Data'|'Component Content'|'Component Properties'|'Component Layout'|'Component Responsive'|'Component Action'}
              definition={selectedCustomDefinition} properties={selected.properties} objects={objects} flows={flows}
              onChange={properties=>updateComponent(selected.id,{properties})}
              builder={{
                position:selected.position,
                onPositionChange:position=>updateComponent(selected.id,{position}),
                visible:selected.visible!==false,
                onVisibleChange:visible=>updateComponent(selected.id,{visible}),
                layoutMode:page.layoutMode,canvasWidth:page.canvasWidth,canvasHeight:page.canvasHeight,
                onOpenSource:()=>openExpandedEditor('source'),
                onOpenFilters:()=>openExpandedEditor('filters'),
                onOpenVisibility:()=>openExpandedEditor('visibility')
              }}/>}
          {ribbonTab === 'Home' && <>
            <div className="office-ribbon-group office-ribbon-page-identity"><div className="office-ribbon-stack">
              <button type="button" onClick={safeBackToPages}><ArrowLeft size={16}/> Back to pages</button>
              <label className="office-ribbon-inline-field"><span className="office-ribbon-field-name">Page</span><input aria-label="Page name" value={page.label} onChange={event=>applyPage({...page,label:event.target.value})}/></label>
              <label className="office-ribbon-inline-field"><span className="office-ribbon-field-name">Device</span><select aria-label="Choose page layout" value={page.layoutVariant??'Desktop'} disabled={switchingLayout||saving} onChange={event=>void switchLayoutVariant(event.target.value as 'Desktop'|'Tablet'|'Mobile'|'Custom')}>{(['Desktop','Tablet','Mobile','Custom'] as const).map(v=><option key={v}>{v}</option>)}</select></label>
            </div><span>Page</span></div>
            <div className="office-ribbon-group office-ribbon-quick-access"><div className="office-ribbon-quick-grid">
              <button className="office-ribbon-icon-button" title="Cut (Ctrl+X)" aria-label="Cut" disabled={!selected||isCanvasLocked(selected)} onClick={cutSelected}><Scissors size={16}/></button>
              <button className="office-ribbon-icon-button" title="Copy (Ctrl+C)" aria-label="Copy" disabled={!selected} onClick={copySelected}><Copy size={16}/></button>
              <button className="office-ribbon-icon-button" title="Paste (Ctrl+V)" aria-label="Paste" disabled={!componentClipboard} onClick={pasteComponent}><ClipboardPaste size={16}/></button>
              <button className="office-ribbon-icon-button" title="Delete selected" aria-label="Delete" disabled={!selected||isCanvasLocked(selected)} onClick={removeSelected}><Trash2 size={16}/></button>
              <button className="office-ribbon-icon-button" title="Save page" aria-label="Save" disabled={saving} onClick={()=>void savePage()}><Save size={16}/></button>
              <button className="office-ribbon-icon-button" title="Activate / publish" aria-label="Activate" disabled={saving||switchingLayout||(page.status==='Active'&&!undoStack.length&&page.draftRevision===page.publishedRevision)} onClick={()=>void publishCurrentLayout()}><Check size={16}/></button>
              <button className="office-ribbon-icon-button" title="Undo" aria-label="Undo" disabled={!undoStack.length} onClick={undo}><Undo2 size={16}/></button>
              <button className="office-ribbon-icon-button" title="Redo" aria-label="Redo" disabled={!redoStack.length} onClick={redo}><Redo2 size={16}/></button>
              <button className="office-ribbon-icon-button" title="Refresh canvas" aria-label="Refresh canvas" onClick={()=>setCanvasRefreshKey(key=>key+1)}><RefreshCw size={16}/></button>
            </div><span>Quick Access</span></div>
            <div className="office-ribbon-group"><div className="office-ribbon-stack">
              <label className="office-ribbon-inline-field">Mode <select aria-label="Design mode" value={page.layoutMode} onChange={event=>setPageLayoutMode(event.target.value as LightningPageMetadata['layoutMode'])}><option value="template">Responsive sections</option><option value="free-canvas">Free canvas</option></select></label>
              <label className="office-ribbon-inline-field">Width <input aria-label="Page width" type="number" min={320} max={10000} value={page.canvasWidth} onChange={event=>{const n=Number(event.target.value);if(Number.isInteger(n)&&n>=320&&n<=10000)applyPage({...page,canvasWidth:n});}}/></label>
              <label className="office-ribbon-inline-field">Height <input aria-label="Page height" type="number" min={320} max={10000} value={page.canvasHeight} onChange={event=>{const n=Number(event.target.value);if(Number.isInteger(n)&&n>=320&&n<=10000)applyPage({...page,canvasHeight:n});}}/></label>
            </div><span>Canvas</span></div>
            <div className="office-ribbon-group office-ribbon-version-group"><div className="office-ribbon-stack">
              <button type="button" onClick={()=>void loadLayoutHistory()}><Undo2 size={16}/> {showLayoutHistory?'Refresh versions':'Version history'}</button>
              <select aria-label="Choose version to restore" disabled={!showLayoutHistory||!layoutVersions.length} value={selectedHistoryVersion??''} onChange={event=>setSelectedHistoryVersion(Number(event.target.value))}><option value="">Choose version…</option>{layoutVersions.map(item=><option key={item.version} value={item.version}>v{item.version}{item.published?' · Published':''}{item.draft?' · Draft':''}</option>)}</select>
              <button type="button" disabled={saving||selectedHistoryVersion===null||layoutVersions.find(v=>v.version===selectedHistoryVersion)?.draft===true} onClick={()=>{if(selectedHistoryVersion!==null)void restoreLayoutVersion(selectedHistoryVersion);}}><RefreshCw size={16}/> Restore draft</button>
            </div><span>Versions</span></div>
            {page.pageType==='App Page'&&<div className="office-ribbon-group"><div className="office-ribbon-stack">
              <button type="button" disabled={page.status!=='Active'||!currentPageIsAssignedToBuilderApp||!builderAppApiName} onClick={()=>{const url=appRoutePath({kind:'app-page',appId:builderAppApiName,pageApiName:page.apiName});const opened=window.open(url,'_blank','noopener,noreferrer');if(!opened)onNotify('Allow popups to test the published page.');}}><ExternalLink size={16}/> Test active app</button>
            </div><span>Test</span></div>}
          </>}
          {ribbonTab === 'Add Block' && <div className="office-ribbon-add-library" aria-label="Add component library">
            <div className="office-ribbon-gallery-pages">
              {ribbonComponentGroups.filter(group=>group.components.length>0).map(group=>
                <section key={group.id} className="office-ribbon-gallery-group" aria-label={group.label}>
                  <div className="office-ribbon-gallery-group-tiles">
                    {group.components.map(component=><button className="office-ribbon-component-tile" type="button"
                      key={component.type} title={component.description} onClick={()=>addPaletteComponent(component.type)}>
                      {renderPaletteIcon(component)}<span>{component.label}</span>
                    </button>)}
                  </div>
                  <span className="office-ribbon-gallery-group-caption">{group.label}</span>
                </section>)}
            </div>
          </div>}
          {selected && ribbonTab==='Component Data' && <PageBuilderRibbonData
            properties={selected.properties} definition={selectedCustomDefinition}
            objects={objects} fallbackObject={String(page.targetObject??'')}
            onChange={properties=>updateComponent(selected.id,{properties})}
            onOpenSource={()=>openExpandedEditor('source')}
            onOpenFilters={()=>openExpandedEditor('filters')}/>}
          {selected && ribbonTab === 'Component Content' && selectedCustomDefinition?.apiName==='une_image' &&
            <RibbonImageContent
              properties={selected.properties}
              definitions={selectedCustomDefinition.propertyDefinitions??[]}
              onChange={properties=>updateComponent(selected.id,{properties})}/>}
          {selected && ribbonTab === 'Component Content' && selectedCustomDefinition && !['une_item_grid','une_calendar','une_image'].includes(selectedCustomDefinition.apiName) &&
            selectedCustomDefinition.propertyDefinitions?.some(definition=>definition.kind==='OBJECT_FIELD') &&
            <div className="office-ribbon-group"><div className="office-ribbon-stack">
              {selectedCustomDefinition.propertyDefinitions.filter(definition=>definition.kind==='OBJECT_FIELD').slice(0,3).map(definition=><label key={definition.propertyKey} className="office-ribbon-inline-field">
                <span className="office-ribbon-field-name">{definition.label}</span>
                <select aria-label={definition.label} value={String(selected.properties[definition.propertyKey]??'')}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,[definition.propertyKey]:event.target.value}})}>
                  <option value="">Not mapped</option>
                  {(objects.find(obj=>obj.apiName===(selected.properties.objectApiName||page.targetObject))?.fields??[]).map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                </select>
              </label>)}
            </div><span>Content Source</span></div>}
          
          {selected && ribbonTab === 'Component Content' && !['une_item_grid','une_calendar','une_image'].includes(selectedCustomDefinition?.apiName??'')
            && selectedCustomDefinition && <div className="office-ribbon-inline-options">
              <ComponentPresentationProperties
                definitions={availableComponentSettings(selectedCustomDefinition.propertyDefinitions??[],
                  page.layoutVariant??'Desktop',selectedCustomDefinition.version)
                  .filter(definition=>isPresentationProperty(definition)&&presentationSection(definition)==='Content')}
                expressionFields={objects.find(obj=>obj.apiName===String(selected.properties.objectApiName||page.targetObject))?.fields??[]}
                properties={selected.properties}
                onChange={properties=>updateComponent(selected.id,{properties})}/>
            </div>}
          {selected && ribbonTab==='Component Content' && selectedCustomDefinition
            && (selectedCustomDefinition.apiName==='une_item_grid'||selectedCustomDefinition.apiName==='une_calendar')
            && <PageBuilderRibbonContent key={selected.id}
              componentApiName={selectedCustomDefinition.apiName} properties={selected.properties}
              definition={selectedCustomDefinition} objects={objects}
              onChange={properties=>updateComponent(selected.id,{properties})}/>}
          {ribbonTab==='Component Properties' && designRibbonGroups.map(group=>{
            const definitions=selected?definitionsForPart(group,'Design'):[];
            return <div className="office-ribbon-group office-ribbon-part-group" data-ribbon-group={group} key={group}>
              <fieldset className="office-ribbon-part-fieldset" title={definitions.length?group:'Not supported by selected component'}><RibbonCapabilityControls group={group} device={page.layoutVariant??'Desktop'} definitions={definitions} properties={selected?.properties??{}} icon={ribbonPartIcons[group]??<Settings2 size={15}/>} onChange={properties=>{if(selected)updateComponent(selected.id,{properties});}}/></fieldset><span>{group}</span>
            </div>;
          })}
          {selected && ribbonTab==='Component Layout' && layoutRibbonGroups.map(group=>{
            const definitions=definitionsForPart(group,'Layout');
            return <div className="office-ribbon-group office-ribbon-part-group" data-ribbon-group={group} key={group}>
              <fieldset className="office-ribbon-part-fieldset" title={definitions.length?group:'Not supported by selected component'}><RibbonCapabilityControls group={group} device={page.layoutVariant??'Desktop'} definitions={definitions} properties={selected?.properties??{}} icon={ribbonPartIcons[group]??<Settings2 size={15}/>} onChange={properties=>{if(selected)updateComponent(selected.id,{properties});}}/></fieldset><span>{group} layout</span>
            </div>;
          })}
          {selected && ribbonTab==='Component Layout' && (selectedCustomDefinition?.propertyDefinitions??[]).some(d=>d.propertyKey==='lineHeight'||d.propertyKey==='density') &&
            <div className="office-ribbon-group office-ribbon-layout-typography">
              <div className="office-ribbon-stack">
                {selectedCustomDefinition?.propertyDefinitions?.some(d=>d.propertyKey==='lineHeight')&&
                  <label className="office-ribbon-inline-field"><span className="office-ribbon-field-name">Line height</span>
                    <input aria-label="Line height" type="number" min={50} max={300} step={5}
                      value={Number(selected.properties.lineHeight??100)}
                      onChange={event=>{const n=Number(event.target.value);
                        if(Number.isFinite(n)&&n>=50&&n<=300)updateComponent(selected.id,{properties:{...selected.properties,lineHeight:n}});}}/>
                  </label>}
                {selectedCustomDefinition?.propertyDefinitions?.find(d=>d.propertyKey==='density')&&
                  <label className="office-ribbon-inline-field"><span className="office-ribbon-field-name">Density</span>
                    <select aria-label="Spacing density" value={String(selected.properties.density??'comfortable')}
                      onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                        density:event.target.value,
                        ...(selectedCustomDefinition?.propertyDefinitions?.some(d=>d.propertyKey==='cardDensity')
                          ?{cardDensity:'default'}:{})}})}>
                      {selectedCustomDefinition?.propertyDefinitions?.find(d=>d.propertyKey==='density')?.choices?.map(choice=>
                        <option key={choice.key} value={choice.key}>{choice.label}</option>)}
                    </select>
                  </label>}
              </div><span>Text & density</span>
            </div>}
          {selected && ribbonTab==='Component Content' && selectedCustomDefinition?.apiName==='une_item_grid'
            && (['imageFieldApiName','titleFieldApiName','descriptionFieldApiName','priceFieldApiName','badgeFieldApiName'] as const)
              .some(key=>Boolean(selected.properties[key]) && !(objects.find(object=>object.apiName===selected.properties.objectApiName)?.fields??[])
                .some(field=>field.apiName===selected.properties[key])) &&
            <div className="office-ribbon-group office-ribbon-mapping-warning" role="alert">
              Some mapped fields are not available on this object. Choose replacement fields; existing mappings were preserved.
            </div>}
          {selected && ribbonTab === 'Component Properties' && <PageBuilderAdvancedStyle
            key={selected.id} properties={selected.properties} componentType={selected.type}
            definition={selectedCustomDefinition} device={page.layoutVariant??'Desktop'}
            excludeKeys={inferredGroupKeys} onChange={properties=>updateComponent(selected.id,{properties})}/>}
          {selected && ribbonTab==='Component Responsive' && <RibbonResponsive
            properties={selected.properties} componentType={selected.type}
            definition={selectedCustomDefinition} device={page.layoutVariant??'Desktop'}
            visible={selected.visible} onVisibleChange={visible=>updateComponent(selected.id,{visible})}
            onChange={properties=>updateComponent(selected.id,{properties})}
            onVisibilityRules={()=>openExpandedEditor('visibility')}/>}
          {selected && ribbonTab === 'Component Action' && selectedCustomDefinition?.apiName==='une_item_grid'
            && <div className="office-ribbon-group"><div className="office-ribbon-stack">
              <label className="office-ribbon-inline-field"><span className="office-ribbon-field-name">Add to cart</span>
                <select aria-label="Choose a Cart component" value={page.components
                  .filter(component=>component.type==='Custom:une_cart')
                  .find(cart=>String(cart.properties.cartTargetKey??'cashier')===String(selected.properties.cartTargetKey??''))?.id??''}
                  onChange={event=>{
                    const target=page.components.find(component=>component.id===event.target.value&&component.type==='Custom:une_cart');
                    const key=target?String(target.properties.cartTargetKey??'cashier'):'';
                    updateComponent(selected.id,{properties:{...selected.properties,
                      cartTargetKey:key,
                      showAddIcon:Boolean(target),
                      separateAddButton:Boolean(target)}});
                  }}>
                  <option value="">No cart connected</option>
                  {page.components.filter(component=>component.type==='Custom:une_cart')
                    .map(cart=><option key={cart.id} value={cart.id}>{cart.label}</option>)}
                </select>
              </label>
              {page.components.filter(component=>component.type==='Custom:une_cart'
                && String(component.properties.cartTargetKey??'cashier')===String(selected.properties.cartTargetKey)).length>1
                && <span className="office-ribbon-stat" role="alert">More than one Cart shares this connection.</span>}
              {Boolean(selected.properties.cartTargetKey) && <span className="office-ribbon-stat">Card Add button sends the selected record to Cart</span>}
            </div><span>Cart connection</span></div>}
          {selected && ribbonTab === 'Component Action' && <PageBuilderActionRibbon key={selected.id}
            actions={selected.properties.actionFlows&&typeof selected.properties.actionFlows==='object'?selected.properties.actionFlows as Record<string,unknown>:{}}
            eventDefinitions={selectedCustomDefinition?.eventDefinitions??[]} flows={flows}
            onChange={actions=>updateComponent(selected.id,{properties:{...selected.properties,actionFlows:actions}})}
            advanced={<>
              <section aria-label="Advanced event action mappings"><strong>Event action bindings, inputs, outputs and destinations</strong>
                <p className="properties-help">Mappings are stored in the existing actionFlows metadata and executed by the shared action runtime.</p></section>
              <MetadataComponentProperties mode="actions-editor" properties={selected.properties} onChange={(properties:Record<string,unknown>)=>updateComponent(selected.id,{properties})}
                eventDefinitions={selectedCustomDefinition?.eventDefinitions??[]} definitions={selectedCustomDefinition?.propertyDefinitions}
                device={page.layoutVariant??'Desktop'} componentVersion={selectedCustomDefinition?.version} pageComponents={page.components} componentCatalog={libraryComponents}
                objects={objects} apps={apps} pages={pages} currentAppId={builderAppApiName||apps[0]?.apiName||'Records'} flows={flows} primaryObjectApiName={page.targetObject}/>
              <section aria-label="Validation and action conditions"><strong>Validation and conditional behaviour</strong>
                <p className="properties-help">Use the shared Page Property Contract editor below for supported conditions and validation metadata. Existing rules are preserved.</p></section>
              <MetadataComponentProperties mode="conditions" properties={selected.properties} onChange={(properties:Record<string,unknown>)=>updateComponent(selected.id,{properties})}
                eventDefinitions={selectedCustomDefinition?.eventDefinitions??[]} definitions={selectedCustomDefinition?.propertyDefinitions}
                device={page.layoutVariant??'Desktop'} componentVersion={selectedCustomDefinition?.version} pageComponents={page.components} componentCatalog={libraryComponents}
                objects={objects} apps={apps} pages={pages} currentAppId={builderAppApiName||apps[0]?.apiName||'Records'} flows={flows} primaryObjectApiName={page.targetObject}/>
            </>}/>}

          {selected && (ribbonTab==='Component Layout'||ribbonTab==='Component Responsive') && selectedCustomDefinition && <div className="office-ribbon-inline-options">
            <PageBuilderRibbonMetadataPager key={selected.id}
              definitions={availableComponentSettings(selectedCustomDefinition.propertyDefinitions??[],
                page.layoutVariant??'Desktop',selectedCustomDefinition.version)
                .filter(definition=>isPresentationProperty(definition)&&presentationSection(definition)==='Layout'
                  && !(definition as {group?:string}).group
                  && (ribbonTab==='Component Responsive'
                    ? false
                    : !/(?:device|breakpoint|mobile|tablet|desktop|phone|responsive|hidden|visible|visibility|borderWidth|borderRadius|radius|margin|padding|gap|opacity|textAlign|lineHeight|density)/i.test(definition.propertyKey) && !/^(?:width|height|minWidth|maxWidth|minHeight|maxHeight)$/.test(definition.propertyKey)))}
              properties={selected.properties} onChange={properties=>updateComponent(selected.id,{properties})}/>
          </div>}
          {selected && ribbonTab==='Component Layout' && page.layoutMode!=='free-canvas' && <div className="office-ribbon-group"><div className="office-ribbon-stack">
            {(['width','height'] as const).map(key=><label key={key} className="office-ribbon-inline-field">{key==='width'?'Width':'Height'} <input aria-label={'Layout '+key} value={String(selected.properties[key]??(key==='width'?'100%':'auto'))}
              onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,[key]:event.target.value}})}/></label>)}
          </div><span>Dimensions</span></div>}
          {selected && ribbonTab==='Component Layout' && selectedCustomDefinition?.propertyDefinitions?.some(d=>d.propertyKey==='layoutContainer') && <div className="office-ribbon-group office-ribbon-layout-nesting">
             <div className="office-ribbon-stack"><label className="office-ribbon-checkbox"><input type="checkbox"
               checked={selected.properties.layoutContainer===true} disabled={childrenOf(page.components,selected.id).length>0}
               onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,layoutContainer:event.target.checked}})}/> Allow child components</label></div>
             <span>Nesting</span>
           </div>}
          {selected && ribbonTab === 'Component Layout' && <>
            <div className="office-ribbon-group office-ribbon-icon-group office-ribbon-layout-arrange" aria-label="Arrange component">
              <div className="office-ribbon-arrange-column">
                <button type="button" className="office-ribbon-icon-button" title={selected.properties.canvasLocked?'Unlock position':'Lock position'}
                  aria-label={selected.properties.canvasLocked?'Unlock position':'Lock position'} disabled={page.layoutMode!=='free-canvas'}
                  onClick={()=>updateComponent(selected.id,{properties:{...selected.properties,canvasLocked:!selected.properties.canvasLocked}})}>
                  {selected.properties.canvasLocked?<Unlock size={16}/>:<Lock size={16}/>} <span>{selected.properties.canvasLocked?'Unlock':'Lock'}</span>
                </button>
                <button type="button" disabled={page.layoutMode!=='free-canvas'||selectionIds.length<2||!selected.position||isCanvasLocked(selected)||Boolean(rawLayoutParentId(selected))||selectionIds.some(id=>{
                  const item=page.components.find(component=>component.id===id);
                  return !item?.position||isCanvasLocked(item)||item.properties.canvasLocked===true||Boolean(rawLayoutParentId(item));
                })} onClick={()=>wrapSelectedInContainer()}><Group size={16}/> Group</button>
                <button type="button" disabled={page.layoutMode!=='free-canvas'||selected.type!=='Container'||isCanvasLocked(selected)||!childrenOf(page.components,selected.id).length} onClick={ungroupSelected}><Ungroup size={16}/> Ungroup</button>
              </div><span>Arrange</span>
            </div>
            {selected.position && <div className="office-ribbon-group office-ribbon-layout-position-physical"><div className="office-ribbon-stack">
              {(['x','y'] as const).map(key=><label key={key} className="office-ribbon-inline-field"><span className="office-ribbon-field-name">{key.toUpperCase()}</span><input aria-label={key.toUpperCase()+' position'} type="number" min={0} max={key==='x'?page.canvasWidth-selected.position!.width:page.canvasHeight-selected.position!.height} disabled={isCanvasLocked(selected)} value={selected.position![key]} onChange={event=>{const n=Number(event.target.value);if(Number.isFinite(n))updateComponent(selected.id,{position:{...selected.position!,[key]:Math.max(0,Math.min(key==='x'?page.canvasWidth-selected.position!.width:page.canvasHeight-selected.position!.height,Math.round(n)))}});}}/></label>)}

            </div><span>Position</span></div>}
            {selected.position && <div className="office-ribbon-group office-ribbon-layout-size-physical"><div className="office-ribbon-stack">
              {(['width','height'] as const).map(key=><label key={key} className="office-ribbon-inline-field"><span className="office-ribbon-field-name">{key==='width'?'Width':'Height'}</span><input aria-label={'Component '+key} type="number" min={1} max={key==='width'?page.canvasWidth-selected.position!.x:page.canvasHeight-selected.position!.y} disabled={isCanvasLocked(selected)} value={selected.position![key]} onChange={event=>{const n=Number(event.target.value);if(Number.isFinite(n))updateComponent(selected.id,{position:{...selected.position!,[key]:Math.max(1,Math.min(key==='width'?page.canvasWidth-selected.position!.x:page.canvasHeight-selected.position!.y,Math.round(n)))}});}}/></label>)}
              <span className="office-ribbon-stat">Canvas pixels</span>
            </div><span>Size</span></div>}
          </>}
          {selected && ribbonTab==='Filters' && <RibbonFilters key={selected.id} draft={ribbonFilterDraft} onChange={setRibbonFilterDraft}
            fields={objects.find(object=>object.apiName===String(resolveMetadataProperties(selected.properties,objects,flows).objectApiName??selected.properties.targetObject??page.targetObject))?.fields??[]}
            onApply={()=>{
              const changed=Object.fromEntries(Object.entries(ribbonFilterDraft).filter(([key])=>key==='filters'||key.endsWith('Filters')||key==='filterLogic'));
              updateComponent(selected.id,{properties:{...selected.properties,...changed}});selectRibbonTab('Component Data');
            }} onCancel={()=>selectRibbonTab('Component Data')}/>}
          {selected && ribbonTab==='Source' && (()=>{
            const definitions=(selectedCustomDefinition?.propertyDefinitions??[]).filter(d=>d.kind==='OBJECT'||d.kind==='OBJECT_FIELD');
            const offset=Math.min(ribbonSourceOffset,Math.max(0,definitions.length-9));
            const shown=definitions.slice(offset,offset+9);
            const batches=Array.from({length:Math.ceil(shown.length/3)},(_,index)=>shown.slice(index*3,index*3+3));
            return <div className="office-ribbon-compact-strip" aria-label="Source and record scope">
              <button type="button" className="office-ribbon-icon-button" title="Previous mappings" aria-label="Previous mappings" disabled={!offset} onClick={()=>setRibbonSourceOffset(Math.max(0,offset-9))}><ChevronLeft size={16}/></button>
              {batches.map((batch,index)=><div className="office-ribbon-mini-group" key={'source-'+index}>
                {batch.map(definition=><label key={definition.propertyKey}>{definition.label}
                  <select aria-label={definition.label} value={String(selected.properties[definition.propertyKey]??'')} onChange={e=>updateComponent(selected.id,{properties:{...selected.properties,[definition.propertyKey]:e.target.value}})}>
                    <option value="">Not selected</option>
                    {(definition.kind==='OBJECT'?objects:objects.find(o=>o.apiName===(selected.properties.objectApiName??page.targetObject))?.fields??[]).map(item=><option key={item.apiName} value={item.apiName}>{item.label}</option>)}
                  </select>
                </label>)}
                <span className="office-ribbon-group-heading">Source {index+1}</span>
              </div>)}
              <button type="button" className="office-ribbon-icon-button" title="Next mappings" aria-label="Next mappings" disabled={offset+9>=definitions.length} onClick={()=>setRibbonSourceOffset(offset+9)}><ChevronRight size={16}/></button>
              <button type="button" onClick={()=>selectRibbonTab('Component Data')}>Done</button>
            </div>;
          })()}
          {selected && ribbonTab==='Visibility Rules' && <RibbonVisibilityRules key={selected.id} draft={ribbonVisibilityDraft} onChange={setRibbonVisibilityDraft}
            fields={fields} allowRecordFields={page.pageType==='Record Page'}
            profiles={profiles.map(item=>({id:item.id,label:item.label}))} recordTypes={targetObject?.recordTypes?.map(item=>({id:item.id,label:item.label}))??[]}
            onApply={()=>{const properties={...selected.properties};if(ribbonVisibilityDraft)properties.visibilityRules=ribbonVisibilityDraft;else delete properties.visibilityRules;updateComponent(selected.id,{properties});selectRibbonTab('Component Responsive');}}
            onCancel={()=>selectRibbonTab('Component Responsive')}/>}
          {ribbonTab === 'Preview' && <>
            <div className="office-ribbon-group office-ribbon-preview-actions"><div className="office-ribbon-stack">
              <button type="button" onClick={()=>setPreviewMode(value=>!value)}><Eye size={17}/> {previewMode?'Exit canvas preview':'Canvas preview'}</button>
              <button type="button" onClick={openExternalPreview}><ExternalLink size={17}/> Open preview window</button>
            </div><span>Canvas Preview</span></div>
            <div className="office-ribbon-group office-ribbon-preview-information"><div className="office-ribbon-stack">
              <span className="office-ribbon-stat">Page name: {page.label}</span>
              <span className="office-ribbon-stat">Page type: {page.pageType}</span>
              <span className="office-ribbon-stat">Layout: {page.layoutVariant??'Desktop'}</span>
            </div><span>Page Information</span></div>
            <div className="office-ribbon-group office-ribbon-preview-test"><div className="office-ribbon-stack">
              <button type="button" disabled={page.status!=='Active'||!currentPageIsAssignedToBuilderApp||!builderAppApiName}
                onClick={()=>{const url=appRoutePath({kind:'app-page',appId:builderAppApiName,pageApiName:page.apiName});const opened=window.open(url,'_blank','noopener,noreferrer');if(!opened)onNotify('Allow popups to test the published page.');}}>
                <ExternalLink size={17}/> Test in active app
              </button>
            </div><span>Test</span></div>
          </>}
          {ribbonTab==='Add Block' && page.pageType==='Record Page' && <div className="office-ribbon-group">
            <div className="office-ribbon-stack"><label className="office-ribbon-inline-field">
              <span className="office-ribbon-field-name">Record field</span>
              <select aria-label="Add record field" value="" onChange={event=>{
                if(event.target.value)addField(event.target.value);
              }}>
                <option value="">Choose a field…</option>
                {fields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
              </select>
            </label></div><span>Add record field</span>
          </div>}
          {['Component Properties','Component Style'].includes(ribbonTab) && <div className="office-ribbon-inspector-host" ref={setRibbonPropertyHost} aria-label="Ribbon property controls" />}

        </div>
        <div className="office-ribbon-group-navigation" aria-label="Ribbon group navigation">
          <button type="button" title="Previous ribbon groups" aria-label="Previous ribbon groups" disabled={!ribbonOverflow.left}
            onClick={()=>ribbonStripRef.current?.scrollBy({left:-Math.max(260,(ribbonStripRef.current?.clientWidth??500)-160),behavior:'smooth'})}><ChevronLeft size={17}/></button>
          <button type="button" title="Next ribbon groups" aria-label="Next ribbon groups" disabled={!ribbonOverflow.right}
            onClick={()=>ribbonStripRef.current?.scrollBy({left:Math.max(260,(ribbonStripRef.current?.clientWidth??500)-160),behavior:'smooth'})}><ChevronRight size={17}/></button>
        </div>
      </section>

      {ribbonTab==='Home' && pageSettingsDialogOpen && <div className="modal-backdrop office-ribbon-modal-backdrop" role="presentation">
        <section className="modal office-ribbon-config-modal office-ribbon-page-settings-modal" role="dialog" aria-modal="true" aria-label="Page settings">
          <div className="modal-header"><h2>Page settings</h2><button type="button" className="icon-button" aria-label="Close page settings" onClick={()=>setPageSettingsDialogOpen(false)}><X size={16}/></button></div>
          <div className="office-ribbon-modal-content"><div className="office-ribbon-inspector-host" ref={setRibbonPropertyHost} aria-label="Page settings editor"/></div>
          <div className="office-ribbon-modal-actions"><button type="button" className="btn btn-brand" onClick={()=>setPageSettingsDialogOpen(false)}>Close</button></div>
        </section>
      </div>}


      <div className={`page-builder-layout canvas-unified-builder reference-builder-layout ${page.layoutMode === 'free-canvas' ? 'modern-canvas-builder' : ''} ${activePanel === null ? 'unified-panel-collapsed' : ''}`}
        style={{ '--component-panel-width': `${componentPanelWidth}px` } as React.CSSProperties}>
        <div className="page-preview-area" ref={pagePreviewAreaRef}>
          <div className="page-stage" key={canvasRefreshKey} onClick={(event) => {
            if ((event.target as HTMLElement).closest('.record-component,.canvas-drop-zone,button,input,select,textarea')) return;
            setSelectedId(''); setSelectionIds([]); setSelectedRegion(null); setRibbonTab('Home'); setPageSettingsOpen(false); setActivePanel(null);
          }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event)}>
            <div
              className={`record-preview ${page.layoutMode === 'free-canvas' ? 'free-canvas-preview' : page.pageType === 'Record Page' ? 'record-page-preview' : page.pageType === 'App Page' ? 'app-page-preview' : 'home-page-preview'} ${device === 'Phone' ? 'phone-preview' : device === 'Tablet' ? 'tablet-preview' : ''}`}
              style={page.layoutMode === 'free-canvas' && fitCanvas ? {
                width: page.canvasWidth * fitScale,
                height: page.canvasHeight * fitScale,
                minHeight: 0,
                overflow: previewMode ? 'hidden' : 'visible'
              } : page.layoutMode === 'template' && page.components.some(c => c.visible && c.properties?.standalonePresentation === true) ? standaloneTemplateCanvasStyle(page.canvasWidth, page.canvasHeight) : undefined}
            >
              {page.layoutMode === 'free-canvas' ? <div
                className={`free-canvas-stage ${canvasSnap && !previewMode ? 'canvas-grid-on' : ''}`}
                style={{
                  width: page.canvasWidth,
                  height: page.canvasHeight,
                  transform: fitCanvas ? `scale(${fitScale})` : undefined,
                  transformOrigin: 'top left'
                }}
              >
                {childrenOf(page.components, null).map((component) => renderPageComponent(component, page.components.findIndex((item) => item.id === component.id)))}
                {!page.components.length && <div className="free-canvas-empty builder-empty-start"><strong>Your page is ready to design</strong><span>Choose a block or drag one from the library.</span><button type="button" className="btn btn-brand" onClick={() => openAddBlocks()}><Plus size={15}/> Add a block</button></div>}
                {!previewMode && <><div ref={canvasGuideXRef} className="canvas-magnet-guide canvas-magnet-guide-x" aria-hidden="true" />
                  <div ref={canvasGuideYRef} className="canvas-magnet-guide canvas-magnet-guide-y" aria-hidden="true" /></>}
              </div> : <>
              {page.pageType === 'Record Page' ? <>
                <div className="record-preview-nav">
                  <div className="record-object-icon">{(targetObject?.label ?? page.targetObject).charAt(0)}</div>
                  <div><strong>{targetObject?.label ?? page.targetObject} preview</strong><small>{page.targetObject} · Recently Viewed</small></div>
                  <label>Preview record <select aria-label="Preview record" value={previewRecordId||String(previewRecord?.Id??'')}
                     onChange={event=>setPreviewRecordId(event.target.value)}>
                     {!previewRecords.length&&<option value="">No accessible records</option>}
                     {previewRecords.map(item=><option key={String(item.Id)} value={String(item.Id)}>
                       {formatRecordValue(item.Name??item.Id)}</option>)}
                   </select></label>
                </div>
                {page.components.some((component) => component.type === 'Highlights Panel' && component.visible) && <div className="record-highlight">{fields.slice(0, 5).map((field) => <div key={field.apiName}><small>{field.label}</small><strong>{previewFieldValue(field.apiName)}</strong></div>)}</div>}
                {page.components.some((component) => component.type === 'Tabs' && component.visible) && <div className="record-tabs">{stringList(page.components.find((component) => component.type === 'Tabs')?.properties.tabs, ['Related', 'Details', 'News']).map((tab, index) => <span className={index === 0 ? 'active' : ''} key={`${tab}-${index}`}>{tab}</span>)}</div>}
              </> : page.pageType === 'App Page' ? (!page.components.some(item=>item.properties?.standalonePresentation===true) && <div className="app-page-shell-header"><div className="record-object-icon"><Grid2X2 size={17} /></div><div><small>Lightning App</small><strong>{page.label}</strong></div></div>) : <div className="home-page-shell-header"><small>HOME</small><strong>{page.label}</strong><span>Your workspace overview</span></div>}
              {page.components.some(item=>item.properties?.standalonePresentation===true)
                ? <BuilderTemplatePreviewLayout page={page} phone={device==='Phone'}
                    header={renderRegion('header')} main={renderRegion('main')} sidebar={renderRegion('sidebar')}/>
                : <div className={`page-template-regions template-${template.id}`}>
                    {template.regions.includes('header') && renderRegion('header')}
                    <div className="page-template-content">
                      {renderRegion('main')}
                      {template.regions.includes('sidebar') && renderRegion('sidebar')}
                    </div>
                  </div>}
              </>}
            </div>
          </div>
        </div>
        {ribbonPropertyHost && createPortal(<aside id="lightning-page-properties" style={ribbonTab !== 'Home' && !ribbonTab.startsWith('Component ') ? { display: 'none' } : undefined}
          className={`properties-panel reference-properties-panel ${pageSettingsOpen || selected ? 'responsive-open' : ''}`}>
          {selectedRegion && !pageSettingsOpen && activePanel !== 'page' ? <div className="properties-section">
            <div className="properties-section-title">Section configuration</div>
            <p className="properties-help">Sections are responsive layout regions. Change the arrangement without deleting any blocks.</p>
            <label className="form-label">Section arrangement<select className="form-control" value={page.template ?? 'main-sidebar'} onChange={event => setPageTemplate(event.target.value as LightningPageTemplate)}>{pageTemplates.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            {selectedRegion !== 'main' && <button type="button" className="btn btn-small" onClick={() => {
              const next = pageTemplates.find(item => item.regions.includes('main') && item.regions.every(region => region !== selectedRegion) && item.regions.every(region => region === 'main' || pageTemplates.find(candidate => candidate.id === (page.template ?? 'main-sidebar'))?.regions.includes(region)) && item.regions.length === (pageTemplates.find(candidate => candidate.id === (page.template ?? 'main-sidebar'))?.regions.length ?? 2) - 1);
              if (!next || !confirmDestructiveAction('Remove', `${selectedRegion} section`, 'Blocks in the removed section will move to Main.')) return;
              setPageTemplate(next.id); setSelectedRegion(null);
            }}><Trash2 size={15}/> Remove section</button>}
            {selectedRegion === 'main' && <p className="properties-help">The Main section is required and cannot be deleted. Change the section arrangement to remove optional regions.</p>}
          </div> : selected && !pageSettingsOpen && activePanel !== 'page' ? <>
            {inspectorTab === 'Position' ? <div className="office-ribbon-layout-responsive" /> : <>
            {inspectorTab === 'Data & Actions' && <details className="builder-advanced-panel"><summary>Technical details</summary>
              <label className="form-label" htmlFor="page-component-type">Component type</label><div className="form-display" id="page-component-type">{selected.type}</div>
            </details>}
            {inspectorTab === 'Visibility' && <MetadataComponentProperties
              mode="actions" properties={selected.properties} onChange={(properties: Record<string,unknown>)=>updateComponent(selected.id,{properties})}
              pageComponents={page.components} componentCatalog={libraryComponents} device={page.layoutVariant??'Desktop'}
              definitions={selectedCustomDefinition?.propertyDefinitions} eventDefinitions={selectedCustomDefinition?.eventDefinitions}
              componentVersion={selectedCustomDefinition?.version} objects={objects} apps={apps} pages={pages}
              currentAppId={builderAppApiName||apps[0]?.apiName||'Records'} primaryObjectApiName={page.targetObject} flows={flows}/>}
            {inspectorTab === 'Data & Actions' && <>
            {selected.parentId && <button type="button" className="btn btn-small" onClick={() => updateComponent(selected.id, { parentId: undefined })}>Move out of section</button>}
            {selectedCustomDefinition && <>
              <div className="properties-section-title">Connect & configure</div>
              <section className="office-ribbon-presentation-group" aria-label="Section nesting">
              <div className="office-ribbon-group-heading">Section nesting</div>
              {true
                && <label className="checkbox-row">
                  <input type="checkbox" checked={isLayoutContainer(selected)}
                    onChange={(event) => {
                      if (!event.target.checked && childrenOf(page.components, selected.id).length) {
                        onNotify('Move all child components out before disabling nesting.');
                        return;
                      }
                      updateComponent(selected.id, { properties: { ...selected.properties, layoutContainer: event.target.checked } });
                    }} />
                  Accept nested components (requires a component that renders children)
                </label>}
              <label className="form-label">Parent container
                <select className="form-control" aria-label="Parent container" value={rawLayoutParentId(selected) ?? ''}
                  onChange={(event) => {
                    const parentId = event.target.value || null;
                    if (!canNest(page.components, selected.id, parentId)) {
                      onNotify('A component cannot be nested inside itself or a descendant.');
                      return;
                    }
                    applyPage({ ...page, components: reparentComponent(page.components, selected.id, parentId) });
                  }}>
                  <option value="">Canvas / page root</option>
                  {page.components.filter((item) => canNest(page.components, selected.id, item.id))
                    .map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                </select>
              </label>
              {isLayoutContainer(selected) && <>
                <p className="properties-help">Drag components onto this container or select them below to edit. Drop a child onto the canvas to move it back to the root.</p>
                <div className="properties-section-title">Child components</div>
                {childrenOf(page.components, selected.id).map((child) => <button className="btn btn-small" type="button" key={child.id}
                  onClick={() => setSelectedId(child.id)}>{child.label}</button>)}
                {!childrenOf(page.components, selected.id).length && <p className="properties-help">No children yet — drop components into this layout.</p>}
              </>}
              </section>
              <MetadataComponentProperties mode="data"
                pageComponents={page.components} componentCatalog={libraryComponents}
                device={page.layoutVariant??'Desktop'}
                componentVersion={findRegisteredComponent(libraryComponents,selected.type.startsWith('Custom:')?selected.type.slice('Custom:'.length):'','page')?.version}
                eventDefinitions={findRegisteredComponent(libraryComponents,selected.type.startsWith('Custom:')?selected.type.slice('Custom:'.length):'','page')?.eventDefinitions}
                definitions={findRegisteredComponent(libraryComponents, selected.type.startsWith('Custom:') ? selected.type.slice('Custom:'.length) : '', 'page')?.propertyDefinitions} properties={selected.properties}
                objects={objects}
                apps={apps}
                pages={pages}
                currentAppId={builderAppApiName || apps[0]?.apiName || 'Records'} primaryObjectApiName={page.targetObject}
                flows={flows}
                onChange={(properties: Record<string, unknown>) => updateComponent(selected.id, { properties })}
              />
            </>}
            {selected.type === 'Highlights Panel' && <>
              <div className="properties-section-title">Highlight actions</div>
              <p className="properties-help">Only actions allowed by record permissions can execute. Visible actions remain governed by the Object's permission grants.</p>
              {(()=>{
                const configured=stringList(selected.properties.actionIds,[]);
                return (targetObject?.actions??[]).filter(action=>action.enabled).map(action=>
                  <label className="checkbox-row property-check" key={action.id}>
                    <input type="checkbox" checked={configured.includes(action.id)}
                      onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                        actionIds:event.target.checked?[...configured,action.id]:configured.filter(id=>id!==action.id)}})}/>
                    {action.label}
                  </label>);
              })()}
              <label className="checkbox-row property-check"><input type="checkbox"
                checked={selected.properties.showEditAction===true}
                onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                  showEditAction:event.target.checked}})}/>Show permitted Edit button</label>
              <label className="checkbox-row property-check"><input type="checkbox"
                checked={selected.properties.showCloneAction===true}
                onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                  showCloneAction:event.target.checked}})}/>Show permitted Clone button</label>
            </>}
            {selected.type === 'Rich Text' && <>
              <div className="properties-section-title">Text</div>
              <RichTextBlockEditor value={String(selected.properties.content??'')}
                onChange={value=>updateComponent(selected.id,{properties:{...selected.properties,content:value}})}/>
            </>}
            {selected.type === 'List View' && <>
              <div className="properties-section-title">List records</div>
              <label className="form-label">Object
                <select className="form-control" value={String(selected.properties.listObjectApiName??'')}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    listObjectApiName:event.target.value,columns:[]}})}>
                  <option value="">Select Object…</option>
                  {objects.map(item=><option key={item.apiName} value={item.apiName}>{item.pluralLabel}</option>)}
                </select>
              </label>
              {(()=>{
                const source=objects.find(item=>item.apiName===selected.properties.listObjectApiName);
                const chosen=stringList(selected.properties.columns,[]);
                return source?.fields.map(field=><label key={field.apiName} className="checkbox-row property-check">
                  <input type="checkbox" checked={chosen.includes(field.apiName)}
                    onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                      columns:event.target.checked?[...chosen,field.apiName]:chosen.filter(name=>name!==field.apiName)}})}/>
                  {field.label}
                </label>);
              })()}
              <label className="form-label">Rows per page
                <input type="number" className="form-control" min={1} max={100}
                  value={typeof selected.properties.pageSize==='number'?selected.properties.pageSize:25}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    pageSize:Math.max(1,Math.min(100,Number(event.target.value)||1))}})}/>
              </label>
            </>}
            {selected.type === 'Path' && <>
              <div className="properties-section-title">Record Path</div>
              <label className="form-label">Picklist stage field
                <select className="form-control" value={String(selected.properties.stageFieldApiName??'')}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    stageFieldApiName:event.target.value}})}>
                  <option value="">Choose field…</option>
                  {fields.filter(field=>field.dataType==='Picklist').map(field=>
                    <option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                </select>
              </label>
            </>}
            {selected.type === 'Screen Flow' && <>
              <div className="properties-section-title">Flow</div>
              <label className="checkbox-row property-check">
                <input type="checkbox" checked={selected.properties.embed!==false}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,embed:event.target.checked}})}/>
                Embed the Flow interview on this page (uncheck for a separate Flow dialog)
              </label>
              <label className="form-label">Active Screen Flow
                <select className="form-control" value={String(selected.properties.flowApiName??'')}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    flowApiName:event.target.value}})}>
                  <option value="">Select Screen Flow…</option>
                  {flows.filter(flow=>flow.flowType==='Screen Flow'&&flow.status==='Active').map(flow=>
                    <option key={flow.apiName} value={flow.apiName}>{flow.label}</option>)}
                </select>
              </label>
              {page.pageType==='Record Page'&&<label className="form-label">Flow input variable for record ID
                <input className="form-control" placeholder="recordId"
                  value={String(selected.properties.inputRecordIdAs??'')}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                    inputRecordIdAs:event.target.value}})}/>
              </label>}
            </>}
            {(selected.type === 'Related List'||selected.type==='Related List Quick Links') && <>
              <div className="properties-section-title">Related Lists</div>
              {componentRelatedListOptions.map((option) => <label className="checkbox-row property-check" key={option.apiName}><input type="checkbox" checked={selectedRelatedLists.includes(option.apiName)} onChange={(event) => {
                updateComponent(selected.id, { properties: { ...selected.properties, relatedLists: event.target.checked ? [...selectedRelatedLists, option.apiName] : selectedRelatedLists.filter((item) => item !== option.apiName) } });
              }} />{option.label}</label>)}
              {!componentRelatedListOptions.length && <div className="palette-note">No related objects have a relationship to this record object.</div>}
              {selected.type==='Related List'&&selectedRelatedLists.map(name=>{
                const relation=objects.flatMap(child=>child.fields
                  .filter(field=>field.relationship?.targetObject===page.targetObject
                    &&(field.relationship.childRelationshipName===name||child.pluralLabel===name))
                  .map(field=>({child,field})))[0];
                if(!relation)return null;
                const configs=(selected.properties.relatedListSettings??{}) as Record<string,Record<string,unknown>>;
                const config=configs[name]??{};
                const setSetting=(key:string,value:unknown)=>{
                  updateComponent(selected.id,{properties:{...selected.properties,
                    relatedListSettings:{...configs,[name]:{...config,[key]:value}}}});
                };
                const eligible=relation.child.fields.filter(field=>field.apiName!==relation.field.apiName);
                const configuredColumns=stringList(config.columns,eligible.slice(0,4).map(field=>field.apiName));
                return <details key={name} className="builder-related-list-config">
                  <summary>{relation.child.pluralLabel} — columns, sort, filters and actions</summary>
                  <div className="properties-section-title">Columns</div>
                  {eligible.map(field=><label className="checkbox-row property-check" key={field.apiName}>
                    <input type="checkbox" checked={configuredColumns.includes(field.apiName)}
                      onChange={event=>setSetting('columns',event.target.checked
                        ?[...configuredColumns,field.apiName]:configuredColumns.filter(value=>value!==field.apiName))}/>
                    {field.label}</label>)}
                  <label className="form-label">Records per page
                    <input type="number" className="form-control" min={1} max={100}
                      value={typeof config.pageSize==='number'?config.pageSize:50}
                      onChange={event=>setSetting('pageSize',Math.max(1,Math.min(100,Number(event.target.value)||1)))}/>
                  </label>
                  <label className="form-label">Sort by
                    <select className="form-control" value={typeof config.sortField==='string'?config.sortField:''}
                      onChange={event=>setSetting('sortField',event.target.value)}>
                      <option value="">Default order</option>
                      {eligible.map(field=><option value={field.apiName} key={field.apiName}>{field.label}</option>)}
                    </select>
                  </label>
                  <label className="form-label">Sort direction
                    <select className="form-control" value={config.sortDirection==='desc'?'desc':'asc'}
                      onChange={event=>setSetting('sortDirection',event.target.value)}>
                      <option value="asc">Ascending</option><option value="desc">Descending</option>
                    </select>
                  </label>
                  <label className="form-label">Filter field
                    <select className="form-control" value={typeof config.filterField==='string'?config.filterField:''}
                      onChange={event=>setSetting('filterField',event.target.value)}>
                      <option value="">No filter</option>
                      {eligible.map(field=><option value={field.apiName} key={field.apiName}>{field.label}</option>)}
                    </select>
                  </label>
                  {!!config.filterField&&<>
                    <label className="form-label">Filter operator
                      <select className="form-control" value={String(config.filterOperator??'Equals')}
                        onChange={event=>setSetting('filterOperator',event.target.value)}>
                        <option value="Equals">Equals</option><option value="Includes">Includes</option><option value="Excludes">Excludes</option>
                      </select>
                    </label>
                    <label className="form-label">Filter value
                      <input className="form-control" value={typeof config.filterValue==='string'?config.filterValue:''}
                        onChange={event=>setSetting('filterValue',event.target.value)}/>
                    </label>
                  </>}
                  <label className="checkbox-row"><input type="checkbox"
                    checked={config.showNewAction!==false}
                    onChange={event=>setSetting('showNewAction',event.target.checked)}/>Show New action</label>
                  <label className="checkbox-row"><input type="checkbox"
                    checked={config.showRowActions===true}
                    onChange={event=>setSetting('showRowActions',event.target.checked)}/>Show permitted row actions</label>
                </details>;
              })}
            </>}
            {selected.type === 'Tabs' && <>
              <div className="properties-section-title">Tabs</div><label className="form-label" htmlFor="page-component-tabs">Tab labels</label>
              <textarea id="page-component-tabs" className="form-control" rows={3} value={stringList(selected.properties.tabs, ['Related', 'Details', 'News']).join('\n')} onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, tabs: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) } })} />
            </>}
            {selected&&rawLayoutParentId(selected)&&page.components.find(item=>item.id===rawLayoutParentId(selected))?.type==='Tabs'&&(()=>{
              const parent=page.components.find(item=>item.id===rawLayoutParentId(selected))!;
              const available=stringList(parent.properties.tabs,['Details']);
              return <label className="form-label">Parent tab
                <select className="form-control"
                  value={typeof selected.properties.tabLabel==='string'?selected.properties.tabLabel:available[0]??''}
                  onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,tabLabel:event.target.value}})}>
                  {available.map(tab=><option key={tab} value={tab}>{tab}</option>)}
                </select>
              </label>;
            })()}
            {selected.type === 'Accordion' && <>
              <div className="properties-section-title">Accordion Content</div>
              <label className="form-label" htmlFor="page-component-accordion-content">Content</label>
              <textarea id="page-component-accordion-content" className="form-control" rows={4}
                value={typeof selected.properties.content === 'string' ? selected.properties.content : ''}
                onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, content: event.target.value } })} />
            </>}
            {selected.type === 'Dashboard' && <>
              <div className="properties-section-title">Dashboard</div>
              <label className="form-label" htmlFor="page-component-dashboard">Published dashboard</label>
              <select id="page-component-dashboard" className="form-control"
                value={typeof selected.properties.dashboardApiName === 'string' ? selected.properties.dashboardApiName : ''}
                onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, dashboardApiName: event.target.value } })}>
                <option value="">Select a published dashboard…</option>
                {dashboards.filter(dashboard => dashboard.status === 'Deployed').map(dashboard =>
                  <option key={dashboard.apiName} value={dashboard.apiName}>{dashboard.label}</option>)}
              </select>
              <p className="properties-help">The live dashboard checks tenant, folder, viewer and record permissions at runtime.</p>
            </>}
            {selected.type === 'Report Chart' && <>
              <div className="properties-section-title">Report</div>
              <label className="form-label" htmlFor="page-component-report">Source report</label>
              <select id="page-component-report" className="form-control"
                value={typeof selected.properties.reportApiName==='string'?selected.properties.reportApiName:''}
                onChange={event=>{
                  const report=reports.find(item=>item.apiName===event.target.value);
                  const source=objects.find(item=>item.apiName===report?.objectApiName);
                  const lookup=report?.objectApiName===page.targetObject?''
                    :source?.fields.find(field=>field.relationship?.targetObject===page.targetObject)?.apiName??'';
                  updateComponent(selected.id,{properties:{...selected.properties,
                    reportApiName:event.target.value,recordFilterFieldApiName:lookup}});
                }}>
                <option value="">Select a report…</option>
                {reports.filter(report=>page.pageType!=='Record Page'
                  ||report.objectApiName===page.targetObject
                  ||objects.find(item=>item.apiName===report.objectApiName)?.fields.some(field=>
                    field.relationship?.targetObject===page.targetObject))
                  .map(report=><option key={report.apiName} value={report.apiName}>{report.label}</option>)}
              </select>
              {page.pageType==='Record Page'&&<>
                <label className="checkbox-row property-check"><input type="checkbox"
                  checked={selected.properties.filterByCurrentRecord!==false}
                  onChange={event=>updateComponent(selected.id,{properties:{
                    ...selected.properties,filterByCurrentRecord:event.target.checked}})}/>
                  Filter report by current record
                </label>
                {(()=>{
                  const report=reports.find(item=>item.apiName===selected.properties.reportApiName);
                  const source=objects.find(item=>item.apiName===report?.objectApiName);
                  const relationFields=source?.fields.filter(field=>
                    field.relationship?.targetObject===page.targetObject)??[];
                  return report&&report.objectApiName!==page.targetObject
                    ?<label className="form-label">Related record lookup field
                       <select className="form-control"
                         value={typeof selected.properties.recordFilterFieldApiName==='string'
                           ?selected.properties.recordFilterFieldApiName:''}
                         onChange={event=>updateComponent(selected.id,{properties:{
                           ...selected.properties,recordFilterFieldApiName:event.target.value}})}>
                         <option value="">Choose relationship…</option>
                         {relationFields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                       </select>
                     </label>:null;
                })()}
              </>}
            </>}
            {selected.type === 'Record Detail' && <>
              <div className="properties-section-title">Displayed Fields</div>
              {fields.map((field) => {
                const displayedFields = (Array.isArray(selected.properties.fields) ? selected.properties.fields : fields.slice(0, 6).map((item) => item.apiName)) as string[];
                return <label className="checkbox-row property-check" key={field.apiName}><input type="checkbox" checked={displayedFields.includes(field.apiName)} onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, fields: event.target.checked ? [...displayedFields, field.apiName] : displayedFields.filter((item) => item !== field.apiName) } })} />{field.label}</label>;
              })}
              {!dynamicFormsEnabled && <div className="dynamic-forms-upgrade">
                <button className="btn" type="button" onClick={() => setDynamicFormsUpgradeOpen((current) => !current)}>Upgrade Now</button>
                {dynamicFormsUpgradeOpen && <>
                  <p className="properties-help">Choose the page layout whose sections and fields should become Dynamic Forms components.</p>
                  <label className="form-label" htmlFor="dynamic-forms-layout">Page Layout
                    <select id="dynamic-forms-layout" className="form-control" value={migrationLayoutId || assignedMigrationLayout?.id || ''} onChange={(event) => setMigrationLayoutId(event.target.value)}>
                      {pageLayouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.label}</option>)}
                    </select>
                  </label>
                  {!pageLayouts.length && <div className="palette-note">No page layouts are available for this object.</div>}
                  <button className="btn btn-brand" type="button" disabled={!selectedMigrationLayout} onClick={() => upgradeRecordDetail(selected)}>Upgrade</button>
                </>}
              </div>}
            </>}
            {selected.type === 'Field Section' && <>
              <div className="properties-section-title">Section Fields</div>
              <label className="form-label" htmlFor="field-section-columns">Columns
                <select id="field-section-columns" className="form-control" value={selected.properties.columns === 1 ? 1 : 2} onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, columns: Number(event.target.value) } })}>
                  <option value={1}>1</option><option value={2}>2</option>
                </select>
              </label>
              {fields.map((field) => {
                const fieldApiNames = stringList(selected.properties.fieldApiNames, []);
                const fieldIndex = fieldApiNames.indexOf(field.apiName);
                return <div className="dynamic-field-property-row" key={field.apiName}>
                  <label className="checkbox-row property-check">
                    <input type="checkbox" checked={fieldIndex >= 0} onChange={(event) => updateComponent(selected.id, { properties: { ...selected.properties, fieldApiNames: event.target.checked ? [...fieldApiNames, field.apiName] : fieldApiNames.filter((item) => item !== field.apiName) } })} />
                    {field.label}
                  </label>
                  {fieldIndex >= 0 && <label className="form-label">Layout behavior for {field.label}
                    <select className="form-control" value={
                      stringList(selected.properties.requiredFieldApiNames,[]).includes(field.apiName)?'Required'
                      :stringList(selected.properties.readOnlyFieldApiNames,[]).includes(field.apiName)?'ReadOnly':'Editable'}
                      onChange={event=>{
                        const mode=event.target.value;
                        const required=stringList(selected.properties.requiredFieldApiNames,[])
                          .filter(name=>name!==field.apiName);
                        const readOnly=stringList(selected.properties.readOnlyFieldApiNames,[])
                          .filter(name=>name!==field.apiName);
                        if(mode==='Required')required.push(field.apiName);
                        if(mode==='ReadOnly')readOnly.push(field.apiName);
                        updateComponent(selected.id,{properties:{...selected.properties,
                          requiredFieldApiNames:required,readOnlyFieldApiNames:readOnly}});
                      }}>
                      <option value="Editable">Editable</option>
                      <option value="Required">Required on this layout</option>
                      <option value="ReadOnly" disabled={field.required}>Read-only on this layout</option>
                    </select>
                  </label>}
                  {fieldIndex >= 0 && <div className="property-position-actions">
                    <button className="icon-button subtle" type="button" aria-label={`Move ${field.label} up`} title="Move up" disabled={fieldIndex === 0} onClick={() => moveSectionField(selected.id, fieldIndex, -1)}><ArrowUp size={13} /></button>
                    <button className="icon-button subtle" type="button" aria-label={`Move ${field.label} down`} title="Move down" disabled={fieldIndex === fieldApiNames.length - 1} onClick={() => moveSectionField(selected.id, fieldIndex, 1)}><ArrowDown size={13} /></button>
                  </div>}
                </div>;
              })}
            </>}
            {selected.type === 'Record Field' && <>
              <div className="properties-section-title">Field</div>
              <label className="form-label" htmlFor="record-field-selection">Record Field
                <select id="record-field-selection" className="form-control" value={typeof selected.properties.fieldApiName === 'string' ? selected.properties.fieldApiName : ''} onChange={(event) => {
                  const field = fields.find((item) => item.apiName === event.target.value);
                  updateComponent(selected.id, { label: field?.label ?? selected.label, properties: { ...selected.properties, fieldApiName: event.target.value } });
                }}>
                  {fields.map((field) => <option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                </select>
              </label>
              <label className="form-label">Layout behavior
                <select className="form-control" value={selected.properties.requiredOnLayout===true?'Required'
                 :selected.properties.readOnlyOnLayout===true?'ReadOnly':'Editable'}
                 onChange={event=>updateComponent(selected.id,{properties:{...selected.properties,
                   requiredOnLayout:event.target.value==='Required',
                   readOnlyOnLayout:event.target.value==='ReadOnly'}})}>
                  <option value="Editable">Editable</option>
                  <option value="Required">Required on this layout</option>
                  <option value="ReadOnly" disabled={fields.find(field=>field.apiName===selected.properties.fieldApiName)?.required===true}>
                    Read-only on this layout
                  </option>
                </select>
              </label>
            </>}
            </>}
            </>}
          </> : <>
            <div className="properties-section-title">Page configuration</div>
            {page.layoutMode==='template'&&<label className="form-label">Section arrangement
              <select className="form-control" value={page.template??'main-sidebar'}
                onChange={event=>setPageTemplate(event.target.value as LightningPageTemplate)}>
                {pageTemplates.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>}
            {(page.layoutVariant??'Desktop')==='Custom'&&<>
              <div className="properties-section-title">Automatic Custom layout activation</div>
              <label className="checkbox-row"><input type="checkbox"
                checked={page.customTargetEnabled===true}
                onChange={event=>applyPage({...page,customTargetEnabled:event.target.checked})}/>
                Use Custom layout automatically for matching viewport widths
              </label>
              <div className="form-grid">
                <label className="form-label">Minimum viewport width (px)
                  <input className="form-control" type="number" min={320} max={10000}
                    value={page.customTargetMinWidth??320}
                    onChange={event=>{
                      const width=Number(event.target.value);
                      if(Number.isInteger(width)&&width>=320&&width<=(page.customTargetMaxWidth??10000))
                        applyPage({...page,customTargetMinWidth:width});
                    }}/>
                </label>
                <label className="form-label">Maximum viewport width (px)
                  <input className="form-control" type="number" min={320} max={10000}
                    value={page.customTargetMaxWidth??10000}
                    onChange={event=>{
                      const width=Number(event.target.value);
                      if(Number.isInteger(width)&&width<=10000&&width>=(page.customTargetMinWidth??320))
                        applyPage({...page,customTargetMaxWidth:width});
                    }}/>
                </label>
              </div>
              <p className="properties-help">Applies only to published, authorised Custom layouts that are assigned to this app or record context.</p>
            </>}
            
            {page.pageType === 'Record Page' && <>
              <label className="form-label">Related object</label><div className="form-display">{targetObject?.label ?? page.targetObject}</div>
              <div className="properties-section-title">Fields and sections</div>
              <p className="properties-help">Use Field Section and Record Field blocks for the active record screen. Existing Page Layout configurations can be imported without overwriting their SQL history.</p>
              {(pageLayouts.length>0) && <details className="builder-advanced-panel"><summary>Import existing field layout</summary>
                <label className="form-label">Existing layout<select className="form-control" aria-label="Legacy field layout to import"
                  value={selectedMigrationLayout?.id??''} onChange={event=>setMigrationLayoutId(event.target.value)}>
                  {pageLayouts.map(layout=><option key={layout.id} value={layout.id}>{layout.label}</option>)}
                </select></label>
                <button type="button" className="btn" onClick={importLegacyRecordLayout}>Import into {page.layoutVariant??'Desktop'} draft</button>
              </details>}
              <div className="properties-section-title">Record buttons and actions</div>
              <p className="properties-help">Choose which actions appear on this published Record Page. OneEngine permissions still determine which actions a user may run.</p>
              {[...new Set(['New','Edit','Clone','Delete',...(targetObject?.actions??[]).filter(action=>action.enabled).map(action=>action.id)])]
                .map(actionId=><div className="metadata-card" key={actionId}>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={recordPageActionIds.includes(actionId)}
                      onChange={event=>updateRecordPageControls({actions:event.target.checked
                        ?[...recordPageActionIds,actionId]:recordPageActionIds.filter(id=>id!==actionId)})}/>
                    {targetObject?.actions?.find(action=>action.id===actionId)?.label??actionId}
                  </label>
                  {recordPageActionIds.includes(actionId)&&<>
                    <label className="form-label">Show action when field
                      <select className="form-control" value={recordPageActionVisibility[actionId]?.fieldApiName??''}
                        onChange={event=>{
                          const value=event.target.value;
                          const next={...recordPageActionVisibility};
                          if(value)next[actionId]={fieldApiName:value,equalsValue:''};
                          else delete next[actionId];
                          updateRecordPageControls({actionVisibility:next});
                        }}>
                        <option value="">Always (if permitted)</option>
                        {fields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                      </select>
                    </label>
                    {recordPageActionVisibility[actionId]&&<>
                      <label className="form-label">Condition
                        <select className="form-control" value={recordPageActionVisibility[actionId].operator??'Equals'}
                         onChange={event=>updateRecordPageControls({actionVisibility:{
                           ...recordPageActionVisibility,[actionId]:{...recordPageActionVisibility[actionId],
                             operator:event.target.value as 'Equals'|'NotEquals'|'Contains'|'IsBlank'|'IsNotBlank'}}})}>
                          <option value="Equals">Equals</option>
                          <option value="NotEquals">Does not equal</option>
                          <option value="Contains">Contains text</option>
                          <option value="IsBlank">Is blank</option>
                          <option value="IsNotBlank">Is not blank</option>
                        </select>
                      </label>
                      {!['IsBlank','IsNotBlank'].includes(recordPageActionVisibility[actionId].operator??'Equals')
                        &&<label className="form-label">Compare with
                          <input className="form-control" maxLength={256}
                           value={recordPageActionVisibility[actionId].equalsValue}
                           onChange={event=>updateRecordPageControls({actionVisibility:{
                             ...recordPageActionVisibility,[actionId]:{...recordPageActionVisibility[actionId],
                               equalsValue:event.target.value}}})}/>
                        </label>}
                    </>}
                  </>}
                </div>)}
              <div className="properties-section-title">Standard button overrides</div>
              <p className="properties-help">Replace a standard button with an existing published
               Object Action. The standard permission and Action permission must both allow it.
               Changes apply only to this device's published layout.</p>
              {(['Edit','Clone','Delete'] as const).map(name=><label key={name} className="form-label">
                {name} button
                <select className="form-control" value={recordPageActionOverrides[name]??''}
                 disabled={!recordPageActionIds.includes(name)}
                 onChange={event=>{
                   const overrides={...recordPageActionOverrides};
                   if(event.target.value)overrides[name]=event.target.value;
                   else delete overrides[name];
                   updateRecordPageControls({actionOverrides:overrides});
                 }}>
                 <option value="">Standard {name} behavior</option>
                 {(targetObject?.actions??[]).filter(action=>action.type==='Custom'&&action.enabled)
                  .map(action=><option key={action.id} value={action.id}>{action.label}</option>)}
                </select>
              </label>)}
              <div className="properties-section-title">Record links</div>
              {recordPageLinks.map(link=><details className="builder-advanced-panel" key={link.id}>
                <summary>{link.label}</summary>
                <label className="form-label">Link label<input className="form-control" maxLength={200}
                  value={link.label} onChange={event=>updateRecordPageControls({customLinks:
                    recordPageLinks.map(item=>item.id===link.id?{...item,label:event.target.value}:item)})}/></label>
                <label className="form-label">Link URL<input className="form-control" maxLength={2048}
                  value={link.url} onChange={event=>updateRecordPageControls({customLinks:
                    recordPageLinks.map(item=>item.id===link.id?{...item,url:event.target.value}:item)})}/></label>
                <label className="checkbox-row"><input type="checkbox" checked={link.openInNewWindow}
                  onChange={event=>updateRecordPageControls({customLinks:
                    recordPageLinks.map(item=>item.id===link.id?{...item,openInNewWindow:event.target.checked}:item)})}/>Open in a new window</label>
                <label className="form-label">Show when field<select className="form-control"
                  value={link.visibleWhenField??''} onChange={event=>updateRecordPageControls({customLinks:
                    recordPageLinks.map(item=>item.id===link.id?{...item,visibleWhenField:event.target.value||undefined,
                      visibleWhenValue:event.target.value?(item.visibleWhenValue??''):undefined}:item)})}>
                  <option value="">Always</option>{fields.map(field=><option key={field.apiName} value={field.apiName}>{field.label}</option>)}
                </select></label>
                {link.visibleWhenField&&<label className="form-label">Equals value<input className="form-control" maxLength={256}
                  value={link.visibleWhenValue??''} onChange={event=>updateRecordPageControls({customLinks:
                    recordPageLinks.map(item=>item.id===link.id?{...item,visibleWhenValue:event.target.value}:item)})}/></label>}
                <button type="button" className="btn btn-small" aria-label={`Remove record link ${link.label}`}
                  onClick={()=>{if(window.confirm(`Remove ${link.label} from this Record Page draft?`))
                    updateRecordPageControls({customLinks:recordPageLinks.filter(item=>item.id!==link.id)});}}>Remove link</button>
              </details>)}
              <label className="form-label">Link label<input className="form-control" maxLength={200}
                value={newRecordLinkLabel} onChange={event=>setNewRecordLinkLabel(event.target.value)}/></label>
              <label className="form-label">Link URL<input className="form-control" maxLength={2048}
                value={newRecordLinkUrl} onChange={event=>setNewRecordLinkUrl(event.target.value)}
                placeholder="https://example.com or /records/..."/></label>
              <button type="button" className="btn" disabled={!newRecordLinkLabel.trim()||!newRecordLinkUrl.trim()}
                onClick={()=>{
                  updateRecordPageControls({customLinks:[...recordPageLinks,{id:crypto.randomUUID(),
                    label:newRecordLinkLabel.trim(),url:newRecordLinkUrl.trim(),openInNewWindow:false}]});
                  setNewRecordLinkLabel('');setNewRecordLinkUrl('');
                }}>Add record link</button>
              <details className="builder-advanced-panel"><summary>Related list columns and actions</summary>
                <p className="properties-help">Each related list uses this device’s published settings. Field-level permissions are still enforced when records are loaded.</p>
                {relatedListOptions.map(list=>{
                  const child=objects.find(item=>item.fields.some(field=>field.relationship?.targetObject===page.targetObject
                    &&(field.relationship?.childRelationshipName===list.apiName||item.pluralLabel===list.apiName)));
                  const settings=recordPageRelatedSettings[list.apiName]??{};
                  return <section className="metadata-card" key={list.apiName}>
                    <strong>{list.label}</strong>
                    {child&&<div><p className="properties-help">Columns</p>
                      {child.fields.filter(field=>!field.relationship||field.relationship.targetObject!==page.targetObject)
                        .map(field=><label className="checkbox-row" key={field.apiName}>
                          <input type="checkbox"
                            checked={(settings.columns??child.fields.slice(0,4).map(item=>item.apiName)).includes(field.apiName)}
                            onChange={event=>{
                              const current=settings.columns??child.fields.slice(0,4).map(item=>item.apiName);
                              updateRecordPageRelatedList(list.apiName,{columns:event.target.checked
                                ?[...current,field.apiName]:current.filter(name=>name!==field.apiName)});
                            }}/>
                          {field.label}
                        </label>)}
                    </div>}
                    <label className="form-label">Records per page<select className="form-control"
                      value={settings.pageSize??25}
                      onChange={event=>updateRecordPageRelatedList(list.apiName,{pageSize:Number(event.target.value) as 10|25|50})}>
                      <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                    </select></label>
                    <label className="checkbox-row"><input type="checkbox" checked={settings.showNewAction!==false}
                      onChange={event=>updateRecordPageRelatedList(list.apiName,{showNewAction:event.target.checked})}/>Show New button</label>
                    <label className="checkbox-row"><input type="checkbox" checked={settings.showRowActions===true}
                      onChange={event=>updateRecordPageRelatedList(list.apiName,{showRowActions:event.target.checked})}/>Show row actions</label>
                  </section>;
                })}
              </details>
            </>}
            {page.pageType === 'Record Page' && <div className="home-page-assignments">
              <div className="properties-section-title">Where this page appears</div>
              <p className="properties-help">Set the apps, profiles, record types, and form factors that use this Record Page. More specific assignments take precedence over broader defaults.</p>
              {(page.activationAssignments ?? []).map((assignment) => <div className="home-page-assignment" key={assignment.id}>
                <span><strong>{assignment.scope === 'Org Default' ? 'Organization default' : apps.find((app) => app.apiName === assignment.appId)?.label ?? assignment.appId}</strong>
                  <small>{assignment.scope}
                    {assignment.profileId ? ` · ${profiles.find((profile) => profile.id === assignment.profileId)?.label ?? assignment.profileId}` : ''}
                    {assignment.recordTypeId ? ` · ${(targetObject?.recordTypes ?? []).find((recordType) => recordType.id === assignment.recordTypeId)?.label ?? assignment.recordTypeId}` : ''}
                    {` · ${assignment.formFactors.join(', ')}`}
                  </small></span>
                <button className="icon-button subtle" aria-label={`Remove ${assignment.scope} activation assignment`} onClick={() => removePageAssignment(assignment.id)}><Trash2 size={14} /></button>
              </div>)}
              <label className="form-label">Assign as<select className="form-control" value={recordScope} onChange={(event) => setRecordScope(event.target.value as PageActivationAssignmentMetadata['scope'])}>
                <option>Org Default</option><option>App Default</option><option>App and Profile</option>
                {(targetObject?.recordTypes ?? []).some((recordType) => recordType.active) && <option>App, Record Type, and Profile</option>}
              </select></label>
              {recordScope !== 'Org Default' && <label className="form-label">App<select className="form-control" value={recordAppId} onChange={(event) => setRecordAppId(event.target.value)}>
                <option value="">Select an app…</option>{apps.map((app) => <option key={app.apiName} value={app.apiName}>{app.label}</option>)}
              </select></label>}
              {(recordScope === 'App and Profile' || recordScope === 'App, Record Type, and Profile') && <label className="form-label">Profile<select className="form-control" value={recordProfileId} onChange={(event) => setRecordProfileId(event.target.value)}>
                <option value="">Select a profile…</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
              </select></label>}
              {recordScope === 'App, Record Type, and Profile' && <label className="form-label">Record Type<select className="form-control" value={recordTypeId} onChange={(event) => setRecordTypeId(event.target.value)}>
                <option value="">Select a record type…</option>{(targetObject?.recordTypes ?? []).filter((recordType) => recordType.active).map((recordType) => <option key={recordType.id} value={recordType.id}>{recordType.label}</option>)}
              </select></label>}
              <div className="form-label">Devices</div>
              <div className="form-options">{(['Desktop', 'Phone', 'Tablet', 'Custom'] as const).map((factor) => <label className="checkbox-row" key={factor}>
                <input type="checkbox" disabled={(factor==='Desktop'||factor==='Phone')&&!page.devices.includes(factor)} checked={recordFormFactors.includes(factor)}
                  onChange={() => setRecordFormFactors((current) => current.includes(factor) ? current.filter((item) => item !== factor) : [...current, factor])} />
                {factor}
              </label>)}</div>
              <button className="btn btn-full" type="button" onClick={addRecordAssignment}>Add Record Page Assignment</button>
            </div>}
            {page.pageType === 'Home Page' && <div className="home-page-assignments">
              <div className="properties-section-title">Where this page appears</div>
              <p className="properties-help">Assign this Home Page to an app, or to an app and profile.</p>
              {(page.activationAssignments ?? []).map((assignment) => <div className="home-page-assignment" key={assignment.id}>
                <span><strong>{apps.find((app) => app.apiName === assignment.appId)?.label ?? assignment.appId}</strong>
                  <small>{assignment.scope}{assignment.profileId ? ` · ${profiles.find((profile) => profile.id === assignment.profileId)?.label ?? assignment.profileId}` : ''} · {assignment.formFactors.join(', ')}</small></span>
                <button className="icon-button subtle" aria-label="Remove Home Page assignment" onClick={() => removePageAssignment(assignment.id)}><Trash2 size={14} /></button>
              </div>)}
              <label className="form-label">App<select className="form-control" value={homeAppId} onChange={(event) => setHomeAppId(event.target.value)}>
                <option value="">Select an app…</option>{apps.map((app) => <option key={app.apiName} value={app.apiName}>{app.label}</option>)}
              </select></label>
              <label className="form-label">Assign as<select className="form-control" value={homeScope} onChange={(event) => setHomeScope(event.target.value as typeof homeScope)}>
                <option>App Default</option><option>App and Profile</option>
              </select></label>
              {homeScope === 'App and Profile' && <label className="form-label">Profile<select className="form-control" value={homeProfileId} onChange={(event) => setHomeProfileId(event.target.value)}>
                <option value="">Select a profile…</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
              </select></label>}
              <div className="form-label">Devices</div>
              <div className="form-options">{(['Desktop', 'Phone', 'Tablet', 'Custom'] as const).map((factor) => <label className="checkbox-row" key={factor}>
                <input type="checkbox" disabled={(factor==='Desktop'||factor==='Phone')&&!page.devices.includes(factor)} checked={homeFormFactors.includes(factor)}
                  onChange={() => setHomeFormFactors((current) => current.includes(factor) ? current.filter((item) => item !== factor) : [...current, factor])} />
                {factor}
              </label>)}</div>
              <button className="btn btn-full" type="button" onClick={addHomeAssignment}>Add Home Page Assignment</button>
            </div>}
            <p className="properties-help">Device, dimensions and orientation are selected when creating a page. Create another page for a different layout size.</p>
            
          </>}
        </aside>, ribbonPropertyHost)}
      </div>
      </>}
      {!editorMode && pendingArchivePageApiName && (() => {
        const toArchive = pages.find(candidate => candidate.apiName === pendingArchivePageApiName);
        return toArchive ? <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-lightning-page-title">
            <div className="modal-header"><h2 id="delete-lightning-page-title">Delete page</h2></div>
            <p className="modal-copy">Archive <strong>{toArchive.label}</strong>?</p>
            <p className="modal-copy">The page will be removed from the live page list. Its SQL metadata,
              layouts and version history are preserved. App-owned and app-home pages may require reassignment or AppExchange management.</p>
            <div className="modal-actions">
              <button className="btn" type="button" disabled={Boolean(archivingPageApiName)}
                onClick={()=>setPendingArchivePageApiName('')}>Cancel</button>
              <button className="btn btn-brand" type="button" disabled={Boolean(archivingPageApiName)}
                onClick={()=>void archiveSavedPage(toArchive)}>
                {archivingPageApiName ? 'Deleting…' : 'Delete page'}
              </button>
            </div>
          </section>
        </div> : null;
      })()}
      {dependenciesOpen && <div className="modal-backdrop" role="presentation"
        onMouseDown={event => { if (event.target === event.currentTarget) setDependenciesOpen(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="page-dependencies-title"
          style={{maxHeight:'85vh',overflowY:'auto'}}>
          <div className="modal-header"><h2 id="page-dependencies-title">Page dependencies</h2>
            <button className="btn btn-small" type="button" onClick={() => setDependenciesOpen(false)}>Close</button></div>
          <p className="modal-copy">References use saved objects, apps, reports, dashboards, components and Flows.</p>
          <table className="records-table" aria-label="Page dependencies"><thead><tr><th>Type</th><th>Reference</th><th>Status</th><th>Source</th></tr></thead><tbody>
            {inspectPageDependencies(page, {apps,pages,objects,reports,dashboards,flows,libraryComponents}).map((entry,idx) =>
              <tr key={entry.kind + ':' + entry.name + ':' + idx}><td>{entry.kind}</td><td>{entry.name}</td>
                <td>{entry.status}</td><td>{entry.componentId
                  ? <button className="btn btn-small" type="button" onClick={() => {setSelectedId(entry.componentId!);setDependenciesOpen(false);}}>{entry.description}</button>
                  : entry.description}</td></tr>)}
          </tbody></table>
        </section>
      </div>}
      {routeDirectoryOpen && <PageRouteDirectory apps={apps} pages={pages} objects={objects}
        initialAppId={builderAppApiName} selectedPageApiName={page.apiName} basePath={import.meta.env.BASE_URL}
        request={request} canManage={canManageRoutes}
        onNotify={onNotify} onClose={() => setRouteDirectoryOpen(false)} />}
      {createPageOpen && <div className="modal-backdrop" role="presentation"
        onMouseDown={event => { if (event.target === event.currentTarget) setCreatePageOpen(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-lightning-page-title">
          <div className="modal-header">
            <h2 id="create-lightning-page-title">Create a page</h2>
            <button className="icon-button dark" onClick={() => setCreatePageOpen(false)} aria-label="Close"><X size={18} /></button>
          </div>
          <p className="modal-copy">Start with the page you need. You can adjust its blocks and appearance later.</p>
          <label className="form-label" htmlFor="new-lightning-page-label">Page name
            <input id="new-lightning-page-label" className="form-control" autoFocus
              value={newPageLabel} onChange={event => setNewPageLabel(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') void createPage(); }}
              placeholder="For example, Inventory Management" />
          </label>
          <label className="form-label" htmlFor="new-lightning-page-layout-mode">Choose a layout
            <select id="new-lightning-page-layout-mode" className="form-control" value={newPageLayoutMode}
              onChange={event => {
                const mode = event.target.value as LightningPageMetadata['layoutMode'];
                setNewPageLayoutMode(mode);
                // Page type and canvas layout are independently configurable.
              }}>
              <option value="template">Ready-made sections</option><option value="free-canvas">Blank canvas</option>
            </select>
          </label>
          <fieldset className="builder-start-choices">
            <legend>What do you want to build?</legend>
            <div role="radiogroup" aria-label="Choose page type" className="builder-choice-grid">
              {pageBuilderStartOptions.filter(choice => recordPageContext ? choice.type === 'Record Page' : choice.type !== 'Record Page').map(choice => <label key={choice.type} className={newPageType === choice.type ? 'builder-choice active' : 'builder-choice'}>
                <input type="radio" name="builder-new-page-type" value={choice.type} checked={newPageType === choice.type}
                  onChange={() => {setNewPageType(choice.type);setNewPageTemplate(choice.type === 'Record Page' ? 'header-main-sidebar' : 'main-sidebar');}}/>
                <strong>{choice.title}</strong><span>{choice.description}</span>
              </label>)}
            </div>
          </fieldset>
          {recordPageContext && <label className="form-label">Record operation
            <select className="form-control" value={newRecordMode} onChange={event=>setNewRecordMode(event.target.value as 'View'|'Edit')}>
              <option value="View">View records</option><option value="Edit">Edit records</option>
            </select>
          </label>}
          <label className="form-label" htmlFor="new-lightning-page-object">Connect to data {newPageType === 'Record Page' ? '(required)' : '(optional)'}
            <select id="new-lightning-page-object" className="form-control" value={newPageTargetObject}
              onChange={event => setNewPageTargetObject(event.target.value)}>
              {!recordPageContext && <option value="">No data object — bind later</option>}
              {objects.filter(object => !recordPageContext || object.apiName === recordPageContext).map(object => <option key={object.apiName} value={object.apiName}>{object.label}</option>)}
            </select>
          </label>
          <label className="form-label" htmlFor="new-lightning-page-app">Application (optional)
            <select id="new-lightning-page-app" className="form-control" value={newPageAppId}
              onChange={event => setNewPageAppId(event.target.value)}>
              <option value="">Assign later</option>
              {apps.map(app => <option key={app.apiName} value={app.apiName}>{app.label}</option>)}
            </select>
          </label>
          <p className="properties-help">
            {newPageType === 'App Page'
              ? "When you Activate this page, it will automatically be added to the chosen application's navigation."
              : 'For Home and Record pages, choosing an application prepares an App Default assignment. You can change it before activation.'}
          </p>
          {newPageLayoutMode === 'template' && <label className="form-label" htmlFor="new-lightning-page-template">
            Starter layout
            <select id="new-lightning-page-template" className="form-control" value={newPageTemplate}
              onChange={event => setNewPageTemplate(event.target.value as LightningPageTemplate)}>
              {pageTemplates.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>}
          <label className="form-label">Design for
            <select className="form-control" aria-label="Target device" value={newPageDeviceChoice} onChange={event => {
              const target = event.target.value as 'Desktop' | 'Tablet' | 'Phone';
              setNewPageDeviceChoice(target);
              setNewPageDevices([target === 'Phone' ? 'Phone' : 'Desktop']);
              const size = target === 'Phone' ? [390,844] : target === 'Tablet' ? [1024,768] : [1440,900];
              setNewPageCanvasWidth(size[0]); setNewPageCanvasHeight(size[1]);
            }}>
              <option value="Desktop">Desktop</option><option value="Tablet">Tablet</option><option value="Phone">Phone</option>
            </select>
          </label>
          <details className="builder-advanced-panel"><summary>Custom dimensions</summary>
          <div className="permission-form-grid">
            <label className="form-label">Canvas width (px)<input className="form-control" type="number" min={320} max={7680} value={newPageCanvasWidth}
              onChange={event => setNewPageCanvasWidth(Math.min(7680, Math.max(320, Number(event.target.value) || 320)))}/></label>
            <label className="form-label">Canvas height (px)<input className="form-control" type="number" min={320} max={7680} value={newPageCanvasHeight}
              onChange={event => setNewPageCanvasHeight(Math.min(7680, Math.max(320, Number(event.target.value) || 320)))}/></label>
          </div>
          <div className="device-picker orientation-picker" role="group" aria-label="Page orientation">
            {(['Portrait','Landscape'] as const).map(value => <button type="button" key={value}
              className={canvasOrientation(newPageCanvasWidth,newPageCanvasHeight) === value ? 'device-choice active' : 'device-choice'}
              aria-pressed={canvasOrientation(newPageCanvasWidth,newPageCanvasHeight) === value}
              onClick={() => { const size = canvasDimensionsForOrientation(newPageCanvasWidth,newPageCanvasHeight,value); setNewPageCanvasWidth(size.width);setNewPageCanvasHeight(size.height); }}>{value}</button>)}
          </div>
          </details>
          {newPageDeviceChoice === 'Tablet' && <p className="properties-help">This tablet-sized page uses the current desktop layout rules.</p>}
          <div className="modal-actions">
            <button className="btn" onClick={() => setCreatePageOpen(false)}>Cancel</button>
            <button className="btn btn-brand"
              disabled={saving || !newPageLabel.trim() || (newPageType === 'Record Page' && !newPageTargetObject)}
              onClick={() => void createPage()}><Plus size={14} />{saving ? 'Creating…' : 'Create draft'}</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
return PageBuilder;
}
