# Page Builder acceptance matrix

Baseline and PR reconciliation: [Phase 1](README.md). Component definitions and property
sources: [inventory](component-inventory.md).

**Decision legend:** Reuse = keep an existing engine/capability; Extend = add to an existing
contract/component; Add = a missing capability implemented on the shared engines.
Targets below are implementation decisions, not newly registered API names. Phase 1
assigns every gap; all completion boxes below are still open. Pending PR code is not
counted as merged, tested or deployed. Each later item must record its implementation
SHA, tests, merge SHA, deployment and verification evidence separately.

## Gap coverage and acceptance

| ID | Gap / baseline evidence | Decision and implementation owner | Dependency / phase | Required acceptance scenario |
|---|---|---|---|---|
| PB01 | Mock record/chart/related content in PageBuilder preview | Extend shared preview using existing RecordWorkspace/PageRuntime presentation and UNE renderers | #1059; 3 | Same authorised record/layout produces equivalent field, chart and nested content in preview/live; mutations disabled in preview. |
| PB02 | Dynamic Forms lack complete create/edit/clone behaviour | Extend shared record adapter composed with une_form/une_input and existing typed controls | PB03–05, #1073/#1077; 4 | Create, edit, clone and view honour the same configured fields on all devices, without weakening server validation. |
| PB03 | recordEditPageLayout ignores visibilityRules | Extend existing condition evaluator and form context, including unsaved field values | 2 then 4 | Changing a driver field updates dependent fields; hidden layout-required fields follow defined save semantics; schema-required fields remain enforced. |
| PB04 | Layout-only required/read-only rules absent from baseline | Extend existing Field Section/Record Field metadata and RecordFormDialog | Reuse #1077; 4 | Per-device rules persist/publish; read-only fields cannot be edited in the UI; field permission denial remains stronger; object schema unchanged. |
| PB05 | Standard record blocks lack inline controls | Extend shared field renderer; retain complex-type full-editor fallback | #1059; 4 | Numeric, picklist, multi-select, date/time and rich/long text save correctly; lookups/compound fields have an authorised edit route. |
| PB06 | Tabs use labels and special names | Extend une_tabs with stable regions; adapt legacy Tabs and preserve controlledSelection/tabChange | #1059; 3 | Two tab groups work independently; duplicate labels do not cross-wire; nested moves/copy retain selected destination. |
| PB07 | Accordion differs between record/app runtime | Extend une_container with collapsible-region metadata and legacy Accordion adapter | #1059; 3 | Arbitrary nested content renders consistently in both contexts with keyboard-accessible expansion. |
| PB08 | Highlights uses compact fields | Extend une_card + shared record fields + une_button; retain compact-layout fallback | #1059 basic actions; 5 | Choose primary/secondary fields, order, per-field visibility/formatting and actions; denied fields/actions never leak. |
| PB09 | Full conditional Dynamic Actions absent | Extend existing action metadata, une_button and action collections | 2, PB19; 5 | Record/user/device conditions determine configured hide/disable behaviour; server denies forged or revoked actions. |
| PB10 | Related Lists not fully component-configurable | Extend une_table/une_record_list binding using existing related Record API | #1059; 5 | Independent lists configure relation, title, columns, sort, filter, page size and actions; paging/filtering apply to the entire authorised dataset. |
| PB11 | Report Chart lacks current-record filter at call site | Extend existing RuntimeReportChart adapter; reuse une_chart presentation only where contract matches | #1059; 5 | Record A chart excludes record B data; aggregation and pagination respect the filter and permissions. |
| PB12 | Flow launching exists; embedded interview incomplete | Add UNE presentation adapter around existing Screen Flow runtime, not a new Flow engine | #1059 EmbeddedScreenFlow; 5 | Input/output mapping, next/back/finish/errors and optional modal work; only authorised published Flows run. |
| PB13 | Interactions currently Flow/page-state-based | Extend declared events, Flow outputs and stateBindings with guided source/target selection | Existing pageComponentBindings; 2 then 6 | One source updates declared sibling properties; type mismatch is rejected; state stays within page/session; no arbitrary script execution. |
| PB14 | Copy/paste/duplicate misses descendant tree | Extend shared component-tree operations for standard and UNE containers | #1059; 3 | Deep copy/cut/paste remaps internal IDs, keeps external bindings and child order, supports undo, and leaves source intact on duplicate. |
| PB15 | Custom layout lacks automatic viewport targeting | Extend existing SQL layout/version resolver; retain independent four-device layouts | #1059; 3/7 | Published Custom width ranges select correctly at boundaries; fallback is authorised; editing one device changes no other draft. |
| PB16 | Activities/Chatter basic functionality only | Reuse activity/feed services; extend presentation with UNE adapters and une_conversation where semantics match | Existing RecordWorkspace; 5 | Record association, create/update/comment and access revocation work; inbox and record-feed histories are not conflated. No claim of every licensed Salesforce collaboration feature. |
| PB17 | Cross-object Fields palette absent | Extend existing lookup metadata/pickers and record field adapter | 2 then 4 | Authorised related fields can be selected/displayed; null relationships and denied fields fail safely; no cross-tenant traversal. |
| PB18 | Conditional field formatting absent | Add schema-backed formatting rules using existing evaluator and appearance resolver; extend une_input/display fields | 2 then 6 | Rules update style/icons from field values, preserve static styles when unmatched, and remain accessible without colour alone. |
| PB19 | Advanced visibility contexts absent/limited | Extend componentVisibility to user/permission/related-record contexts; reuse #1059 profile/type/record grants | 2 then 6 | App/Home pages support allowed user contexts; missing/denied context fails closed; relationship traversal is bounded and authorised. |
| PB20 | Mixed AND/OR filter logic absent | Extend shared declarative evaluator and guided condition editor | 2 then 6 | 1 AND (2 OR 3) evaluates consistently; malformed references rejected; no eval or executable expressions. |
| PB21 | Individual conditional tabs absent | Extend une_tabs region metadata using PB19–20 | 6 | Hidden tabs cannot retain exposed panels; active tab falls back deterministically; keyboard focus remains valid. |
| PB22 | Performance analysis absent | Add builder analysis on existing page/dependency metadata and measured runtime instrumentation | 7 | Identify concrete expensive components/requests, show measurement context, give actionable guidance; no invented performance score. |
| PB23 | Standard saved List View block absent; UNE lists already exist | Extend une_record_list/une_table with saved-list metadata selection | #1059 basic list; 5 | Choose object and authorised saved view; filters/sort/columns/page size persist; server paging and denied-view errors work. |
| PB24 | Related List Quick Links absent | Extend une_navigation with related-list link metadata | #1059; 5 | Each link targets the correct visible related section; absent or forbidden relations are not exposed. |
| PB25 | Path absent on baseline; PR stage selector is basic | Extend une_progress presentation + picklist/record metadata + shared Record API | #1059; 5 | Stage changes respect record-type values/permissions; configure guidance and key fields per step; failed save preserves current stage. |
| PB26 | Items to Approve standard block absent | Add thin UNE presentation adapter using une_record_list and existing approval service | #1059 StandardApprovals; 5 | Only assigned/authorised approvals appear; actions use existing engine; empty/error/paging states work. |
| PB27 | Standard Rich Text block absent, une_text exists | Extend une_text formatted mode; retain old text modes and standard compatibility adapter | #1059 constrained renderer; 5 | No-code formatting persists and renders consistently; unsafe markup/URLs inert; formatting choices remain metadata-driven. |
| PB28 | Multi-layout/profile/type migration incomplete | Extend #1073 migration and assignment resolver, not a second layout editor | 4/7 | Every legacy assignment resolves equivalently for View/Edit and all devices; repeated migration preserves authored pages and history. |
| PB29 | Legacy editor/SQL consumers remain | Reuse compatibility until PB28 verified, then retire proven-unused consumers | 7 | Consumer inventory empty before removal; old bookmarks resolve; rollback remains available. |
| PB30 | Deactivate/reactivate/archive lifecycle needs correction | Extend existing lifecycle endpoints and builder controls | #1059; 3/7 | Deactivate removes runtime availability without deleting layout versions; reactivate restores published revision; archive remains distinct. |
| PB31 | App/record free-canvas behaviour differs | Extend shared geometry/appearance runtime; retain existing canvas coordinates | #1059 app scaling; 3 | All devices render configured geometry without clipping/unintended scaling; record canvas tested separately from app canvas. |
| PB32 | Property metadata is distributed between descriptors, mixins, standard branches and appearance schema | Extend existing Property Engine contract; preserve all inventory keys and default precedence | 2 | Each supported property has editor, validation, persisted representation and runtime consumer; unsupported/legacy values remain preserved and identified. |
| PB33 | Reported duplicate-name CI failures and integration verification incomplete | Reuse shared API-name rules and test harness; fix actual conflicting test/setup identities | #1067; release gates | SQL validation, page release and authenticated browser checks pass without weakening uniqueness, tenant isolation or assertions. |
| PB34 | Production parity unverified | Reuse existing Oracle release workflow and published page smoke paths | 8 | Released SHA, browser evidence for all four devices, tenant/RBAC denials, data preservation and rollback recorded. |

## Existing capabilities and MetaDrive extras to preserve

| ID | Capability / decision | Acceptance during later changes |
|---|---|---|
| KEEP01 | Reuse App/Home/Record page types and assignment precedence | Org/app/profile/type assignments resolve deterministically; competing assignments are inspectable. |
| KEEP02 | Reuse SQL draft/publish/version history and restore | Unsaved/draft changes never leak to live; restore prepares a draft; publish remains explicit. |
| KEEP03 | Reuse four independent layouts | Mobile/Desktop/Tablet/Custom save/publish/restore remain isolated. |
| KEEP04 | Reuse free canvas, templates, layers, selection, undo/redo and page cloning | Existing coordinates/styles preserved; nesting/copy improvements do not change unrelated pages. |
| KEEP05 | Reuse Registry and tenant custom components | Unknown/custom identities remain sandboxed and authorised; no forced UNE rename or dropped properties. |
| KEEP06 | Reuse data/Flow bindings, page state and events | Existing input/output contracts and event names remain valid; inactive/unlicensed app behaviour remains denied. |
| KEEP07 | Reuse real dashboards/reports | Existing dashboard widgets and report definitions unchanged by UNE presentation work. |
| KEEP08 | Reuse UNE/One extras: carts, grids, option groups, calendars, slots, forms, documents, conversations, drawers/modals | Existing application pages continue to work; all properties and styles retained regardless of Salesforce availability. |
| KEEP09 | Reuse permission and lifecycle boundaries | Core loads without optional apps; installation/license/revocation checked; preview and runtime use the same authorised data boundaries. |
| KEEP10 | Reuse assignment engine; extend inspection/conflict guidance | Administrator can explain which page/device revision won without changing assignment precedence silently. |

## Sources and limits

Repository evidence is linked in the inventory and Phase 1 architecture map. Salesforce
reference scope is Lightning App Builder, not Experience Builder or every separately
licensed industry component. Relevant official references:

- [Dynamic Forms](https://help.salesforce.com/s/articleView?id=platform.dynamic_forms_overview.htm&language=en_US)
- [Visibility rules](https://help.salesforce.com/s/articleView?id=platform.lightning_page_components_visibility.htm&language=en_US&type=5)
- [Cross-object fields](https://help.salesforce.com/s/articleView?id=platform.dynamic_forms_spanning_fields.htm&language=en_US)
- [Dynamic Highlights](https://help.salesforce.com/s/articleView?id=platform.dynamic_highlights_panel.htm&language=en_US&type=5)
- [Dynamic Actions](https://help.salesforce.com/s/articleView?id=sf.lightning_app_builder_create_dynamic_action.htm&language=en_US)
- [Dynamic Related Lists](https://trailhead.salesforce.com/content/learn/projects/upgrade-to-dynamic-related-lists/get-started-with-dynamic-related-lists)
- [Dynamic Interactions](https://help.salesforce.com/s/articleView?id=sf.dynamic_interactions_overview.htm&language=en_US&type=5)

These are functional references, not instructions to remove MetaDrive features or copy
Salesforce implementation restrictions. Broader licensed features require their own
acceptance scope; no claim of universal Salesforce product parity is made.
