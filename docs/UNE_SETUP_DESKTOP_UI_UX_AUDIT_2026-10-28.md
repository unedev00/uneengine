# UNE Setup Desktop UI/UX Audit

**Audit date:** 28 October 2026

**Environment:** Signed-in UNE Solutions workspace

**Desktop viewport:** 1365 × 768 CSS pixels

**Scope:** All 24 Setup sidebar entries except Page Builder, plus the Flow Trigger Explorer view and a sample Object Manager detail page. Page Builder was excluded at the user's request. Creation-form behavior was also checked on page entry versus after an explicit Add/New action.

## Executive summary

The visual system is mostly consistent: light surfaces, dark headings, blue primary actions, and card-based settings pages. Setup Home, App Manager, AppExchange, Company Settings' General and Business Settings sections, and Process Automation Settings are generally easy to scan.

The main desktop usability gaps are:

1. **A navigation action crashes:** `Manage Users (CRUD)` opens a record-list route that fails to render and remains on “Loading object metadata…”.
2. **Dense tables do not adapt to the desktop content width:** Named Credentials has an 11-column table with key status/actions offscreen; Flows and Flow History wrap content into narrow columns and unusually tall rows.
3. **Some primary actions have unclear or absent outcomes:** the Dashboard Builder's active “Create dashboard” call-to-action produced no visible change; tenant and role creation appear as inline editors without a clear, persistent draft/cancel state.
4. **The Setup sidebar and shared security workspace need clearer labeling:** sidebar labels break awkwardly across lines, and several RBAC pages show the same generic introductory text regardless of the selected page.
5. **Some settings lack a recognizable path to completion:** Branding shows “No logo” but no logo-management action; Mobile & Offline asks users to enter object API names and record UUIDs manually.

No system-wide color-contrast failure was confirmed during this visual review. The more consistent readability concern is typography: sampled table headers and cells use **10px** text, and supporting copy is commonly **12px**. The report recommends a full contrast check separately if formal accessibility conformance is required.

## Priority findings

| ID | Priority | Page(s) | Finding | Recommended correction |
|---|---|---|---|---|
| F-01 | P1 | Users & Assignments → Manage Users (CRUD) | The action navigated to `/une/o/User/list?filterName=AllUsers&appId=AceAssist`, where a required record-workspace asset returned 404 and the app threw a `createRecordWorkspaceViews` TypeError. The page stayed on “Loading object metadata…”. | Repair the route/chunk dependency and show an actionable error state with Retry/Back if the workspace cannot load. Add a smoke test for this button's destination. |
| F-02 | P1 | Dashboard Builder | “Create dashboard” looked enabled, but clicking it produced no visible change. The dashboard selector showed no saved dashboards and the builder controls remained disabled, with no explanation. | Make the CTA open the create flow, or disable it and state the prerequisite/permission. Show progress or an error if creation fails. |
| F-03 | P1 | Named Credentials | The table is about 1802px wide at the 1365px desktop viewport. A horizontal scrollbar is required to reach connection, webhook, status, and action columns; the row actions are not persistently visible. | Use a responsive column set, a row-details drawer, or a compact table with sticky identity and action columns. Keep essential status and actions visible without horizontal scrolling. |
| F-04 | P1 | Flows; Flow History | The two-column Flow Builder layout leaves the existing-flow table too little width for its nine columns. Flow names and types wrap, later columns are pushed out of view, and Flow History splits statuses, timestamps, and IDs into narrow cells. Flow History rows measured about 84px high with 10px cell text. | Give the list the full content width (move flow-type choices to a launch dialog/tab), keep essential columns visible, and move long IDs/error details into a row drawer. Set minimum widths for status/date columns, use single-line truncation with accessible full-value access, and tighten row padding. |
| F-05 | P2 | Setup sidebar (all Setup pages) | At the desktop width, labels such as Tenant Management, AppExchange, and Named Devices wrap at awkward word fragments and occupy multiple lines. This makes the navigation harder to scan and increases its vertical density. | Widen the label area or reduce icon/gutter width; prevent mid-word breaking; use a deliberate two-line label only where necessary. Consider a tooltip in collapsed mode. |
| F-06 | P2 | Tenant Management; Roles | New tenant opens a narrow editor beside the tenant list, with the explanatory copy and Create button below the initial viewport. New Role immediately adds a generated “New Role” draft to the list and opens an inline editor; the draft state and discard path are not prominent. | Use a clearly announced modal or drawer with grouped fields, a visible draft state, explicit Cancel/Discard, and a sticky footer containing the primary action. Keep the form wide enough for labels and helper text. |
| F-07 | P2 | Users, Roles, Public Groups, Profiles, Permission Sets, Permission Set Groups, Sharing Settings, Sharing Rules | These pages repeat the same “Build reusable access grants…” introductory text. It is inaccurate for several views, including Users and Sharing Rules. The Sharing Rules page also uses the breadcrumb “Setup / Users”. | Provide page-specific breadcrumb and introductory copy. Keep the shared RBAC navigation, but make the selected view and its purpose unambiguous. |
| F-08 | P2 | Company Settings → Branding | The selected Branding section displays a Company details card and “No logo”, but the observed Edit details form has no logo field or upload/replace action. There is no clear way to configure branding from this section. | Add a dedicated logo/branding control with preview, upload requirements, and save/cancel feedback, or remove/rename the section if branding is managed elsewhere. |
| F-09 | P2 | Company Settings → Mobile & Offline | “Add object” inserts inline text fields for Object API name and newline-separated Record IDs. This is error-prone for users who may not know API names or UUIDs; the empty state only says “0 of 100 records selected”. | Use an object picker and record search/selection UI, show per-object selected counts and validation, and disable Save selections until a valid selection exists. |
| F-10 | P2 | Sharing Rules | The empty state says to select or create a rule, but “New Sharing Rule” is disabled and no reason or prerequisite is shown. | Explain the missing permission/prerequisite beside the disabled action, or enable creation when the empty state invites it. |
| F-11 | P2 | Reports | The route ends in `Opportunities_by_Stage`, but the page shows an empty report list and “Create a report to get started”. The empty state has two New Report buttons. The chooser works, but its long object list groups everything under “Other Reports”. | Route empty/new states to a neutral report index; keep one primary CTA; group report types meaningfully and preserve search. State why Save/Save & Run are unavailable until a report is configured. |
| F-12 | P2 | Object Manager; Permission Sets; Sharing Settings; Flow History | Dense metadata tables use 10px cell/header text. Sharing Settings rows measured about 76px high, with object label/API name combined in one cell; Permission Sets displays a large object-permission matrix. Long tables require substantial scrolling. | Increase table text to a comfortable desktop size (target at least 12–13px), compact repeated metadata into secondary text, reduce row padding, and keep search/header context visible while scrolling. |
| F-13 | P3 | Setup Home | “Object Manager”, “Flows”, and “Permission Sets” appear both in Common setup tools and Quick access. This duplicates the most prominent shortcuts. | Remove one set or make Common setup tools configurable/recent so the two sections have distinct purposes. |
| F-14 | P3 | Company Settings → Contacts; Scheduled Flows | Contacts is selected while the content heading remains “Company details”. Scheduled Flows is selected in navigation but the page H1 is “Automation Explorer”. The content is present, but the labels are less specific than the selected view. | Use section-specific headings (“Contact details”, “Scheduled Flows”) and retain “Automation Explorer” as a broader parent label if needed. |
| F-15 | P3 | AppExchange | The initial loading state showed “Installed apps 0”; after metadata loaded it showed 6. | Keep the count in a loading state until the installed-package query completes so users do not mistake a temporary zero for the final count. |

## Page-by-page audit

| Page / view | Observations and correction required |
|---|---|
| **Setup Home** | Card layout and hierarchy are clear. Remove the repeated Object Manager, Flows, and Permission Sets links between Common setup tools and Quick access (F-13). |
| **Tenant Management** | Search, status filter, counts, and tenant list are clear. The New tenant form opens inline in the right details pane; at 1365 × 768 its later fields, helper text, and primary action extend below the fold. Use a wider, clearly announced form with a sticky action footer (F-06). |
| **Company Settings — General** | Company details are presented in a readable two-column card; Edit details is clearly placed. No major layout correction observed. |
| **Company Settings — Currency & Locale** | Currency, tax, and active-currency sections are separated. Keep the edit controls aligned and make conversion-rate units easy to see; no blocking issue observed. |
| **Company Settings — Branding** | “No logo” is visible but has no corresponding logo-management control in the observed view or Edit details form (F-08). |
| **Company Settings — Business Settings** | Fiscal year, time zone, weekly hours, holidays, and tenant usage are grouped into distinct sections. The page is long; keep the section navigation available while scrolling and consider a compact weekly-hours grid. |
| **Company Settings — Contacts** | Contact/address fields have clear labels, but the content heading remains “Company details” and all values are “Not provided”. Use a Contact details heading and clearer empty-value styling (F-14). |
| **Company Settings — Mobile & Offline** | The briefcase limit is visible, but object/API and UUID entry is manual, and Save selections is present at zero selections. Replace free-text identifiers with pickers and validation (F-09). |
| **Company Settings — Integrations** | Custom domains and the developer-account status are separated. Add domain opens an inline field with Cancel and a disabled Save action, which communicates state better than the tenant form. Keep this pattern consistent and explain verification status near the domain. |
| **Company Settings — Security & Recovery** | MFA, identity links, security governance, audit trail, password policy, recovery, active sessions, and login history form a long vertical page. Add section navigation/anchors and clearly label which changes save independently; visually separate high-impact session/recovery actions. |
| **Company Settings — Developer** | Developer tools use a scannable card grid. Metadata package export/import and installed packages continue below the fold; keep package validation/progress and the relevant actions close to their section. |
| **Object Manager — Objects list** | The label and API name already have separate columns, matching the recommended structured pattern. The 46-row list fits the viewport width, but table text is small and the full list requires vertical scrolling. Consider a sticky table header and a compact density option (F-12). |
| **Object Manager — object detail (sampled Account)** | The detail card is orderly. The left settings rail has about 20 destinations and requires scrolling; group related settings into collapsible sections to reduce navigation length. |
| **App Manager** | Four apps are shown in a clear table with descriptions and Edit/Clone actions. No major desktop layout issue observed. |
| **AppExchange** | Search, category filters, installation badges, licence state, and card actions are easy to distinguish. Preserve the loading state around the Installed apps count (F-15). |
| **Named Credentials** | Search and row content are clear, but the 11-column table exceeds the available width and hides useful columns/actions until horizontal scroll (F-03). |
| **Webhook Endpoints** | Selecting this sidebar item opens the same Named Credentials route and heading/table. Provide a webhook-specific view/filter or merge the duplicate navigation entry so the destination matches the label. |
| **Named Devices** | The signed-in account received “Named Devices requires Read access in your Profile or Permission Set.” The protected content could not be audited; provide an inline permission explanation/request path rather than relying only on a transient toast. |
| **Flows** | Flow-type choices are useful, but they share the page with a dense nine-column existing-flows table. The table wraps flow names and type text and pushes columns out of view. Give the list more width and use a clearer creation launch flow (F-04). |
| **Paused and Waiting Interviews** | Empty states clearly distinguish zero pending interviews from no failed durable jobs. No major layout correction observed. |
| **Scheduled Flows** | The empty state clearly explains that a Schedule-Triggered Flow must be created in Flow Builder. The page also contains Flow Trigger Explorer; clarify the relationship between the broader “Automation Explorer” heading and the selected Scheduled Flows view (F-14). |
| **Flow Trigger Explorer** | Filters and five trigger rows are visible. Keep long flow definitions readable and preserve the object/event/execution-order context; align this table with the improved dense-table pattern (F-12). |
| **Flow History** | Long flow names wrap, “completed” breaks across lines, timestamps split, and IDs consume width. Rows are tall and text is small. Move verbose details to a row inspector and keep status/time readable in the list (F-04, F-12). |
| **Process Automation Settings** | Execution safety and conversation inactivity settings are grouped into clear sections with labeled edit actions. No major desktop layout correction observed. |
| **Reports** | Empty state is clean but redundant; the route suggests a selected report that is not shown. The report-type chooser is a centered modal with Cancel/Start Report, but report types need better grouping (F-11). |
| **Dashboard Builder** | The empty canvas is understandable, but the active Create dashboard action did not respond and the other controls remain disabled. Provide an actual creation path or clear prerequisite/error feedback (F-02). |
| **Users & Assignments** | The user list and assignment panel are distinct. The page uses generic RBAC introductory text, and Manage Users (CRUD) navigates to a route that fails to render (F-01, F-07). |
| **Roles** | Role hierarchy and parent selection are visible. New Role creates an inline draft/list entry without a prominent draft/discard state; improve the create workflow (F-06, F-07). |
| **Public Groups** | The empty state (“No public groups found”) and New Public Group action are clear. The shared RBAC intro is inaccurate (F-07). |
| **Profiles** | The default profile is identifiable, but the shared RBAC intro does not describe profile configuration (F-07). |
| **Permission Sets** | The selected OneEngine set exposes advanced rules and a large object-permission matrix. Increase table readability and keep the selected set/context visible while scrolling (F-07, F-12). |
| **Permission Set Groups** | The empty state and New Permission Set Group action are visible. The shared RBAC intro is inaccurate (F-07). |
| **Sharing Settings** | The 46-object defaults table is aligned but tall; label and API name share a cell and row height is about 76px. Separate or compact the object identifiers and reduce vertical repetition (F-12). |
| **Sharing Rules** | The empty-state copy invites creation while New Sharing Rule is disabled; the breadcrumb says Setup / Users and the intro is generic. Resolve the disabled-action state and use page-specific text (F-07, F-10). |

## Interaction checks and data changes

Opened forms/flows to inspect their presentation: New tenant, Company details edit, Mobile & Offline Add object, Add domain, New Report chooser, and New Role. The tenant, company, domain, and report flows were canceled; the temporary Mobile & Offline object row was removed before saving. The Dashboard Builder CTA was clicked and gave no visible result. Manage Users (CRUD) was clicked and exposed the render failure described above.

The create-form entry behavior was checked separately: navigating into Tenant Management and Roles showed their detail/empty states, not an open create form. Their forms appeared only after selecting **New tenant** or **New Role**, respectively. The New Role action temporarily added a generated draft to the current editor/list; navigating away returned to the original role list, and no generated test role remained.

**No Save, Save Changes, Create, or other commit action was pressed. No test settings were intentionally saved.** The New Role editor was opened as a draft and left unsaved.

## Follow-up against the fix branch

This report records the live deployment as audited. On the clean source branch, the dashboard action, Named Credentials/Flow table layout, RBAC descriptions, branding upload, offline record picker, sharing-rule explanation, report empty state, table typography, sidebar labels, and Setup Home shortcut duplication were already addressed. Tenant creation and New Role were updated to open focused dialogs; the remaining Mail and Ace Assist fixes are recorded in the [consolidated desktop audit](./UNE_FULL_DESKTOP_UI_UX_AUDIT_2026-10-28.md).

The Account New and Manage Users route failures could not be reproduced against the current source without the application API. They remain unverified rather than being reported as resolved.

## Audit limits

This was a desktop UI/UX audit at one viewport. Page Builder was excluded as requested. Named Devices was not accessible to the signed-in user. Object Manager's individual settings tabs were not exhaustively reviewed for all objects, and the audit did not cover mobile/tablet layouts, every report/dashboard configuration, or formal keyboard/screen-reader/color-contrast conformance.
