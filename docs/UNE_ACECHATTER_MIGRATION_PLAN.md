# UNE AceChatter — Standalone-Preserving UI Migration Plan

**Status:** Approved scope for planning; **not implemented**.  
**Policies:** [DEVELOPER_POLICY.md](../DEVELOPER_POLICY.md) and [MIGRATION_POLICY.md](../MIGRATION_POLICY.md).  
**AppExchange display name:** **UNE AceChatter**. Proposed new API identity: `UNEAceChatter` (confirm collision-free during implementation).  
**Existing standalone:** `AceChatter`; keep its source, routes, UI, Flows, tenant records and behaviour untouched.

## 1. Scope, baseline and reuse

Create a distinct installable Page Builder app that reuses **the exact existing AceChatter Flows** and communication/contact data; only create metadata-driven UI and generic shared platform capabilities. No new app-specific CRUD, backend workflow, communication store or provider integration.

Existing reusable foundations already in the repository:
- `une_conversation` wraps the shared `OneConversation` component, with metadata-driven field properties. Current registered events expose only `send`; full UI parity is **not verified**.
- `une_search`, `une_lookup`, `une_repeater`, `une_modal`, `une_tabs`, `une_input`, `une_button`, `une_split_pane`, `une_text` and other existing UNE UI components.
- `OneChatter` is an existing independent Page Builder app with Flow binding/metadata patterns. Inspect and reuse shared capabilities, but **do not rename, overwrite or clone** the existing OneChatter app or its tenant-authored pages.
- The standalone `AceChatterRuntime.tsx` plus `communicationInbox.ts` define the parity baseline; preserve the original and avoid importing its implementation into the new app.

## 2. Four Page Builder layouts — required on every app and Object

Every app's pages and every Object's Record Pages must provide **four independently editable, saved and publishable layouts**, shared across the platform:

| Variant shown in Page Builder | Purpose and UNE AceChatter behaviour | Editor / runtime |
| --- | --- | --- |
| **Mobile** | Full-width chat list; selecting a chat opens its full-width thread with Back; composer remains reachable above keyboard | Individually editable layout, phone target |
| **Desktop** | Two-column chat list and thread with independently configurable widths, header, modal New Chat | Individually editable layout, desktop target |
| **Tablet** | Resizable or configurable split-pane/two-panel presentation; adapt for tablet orientation | Individually editable layout, tablet target |
| **Custom** | Tenant-defined arrangement (for example wide wall display, compact service desk or accessibility-first layout) with configurable canvas dimensions and explicit target/selection rule | Individually editable layout, custom target |

Each of the **six named views below must be editable within all four layouts**, not embedded as a single uneditable standalone shell. Users can alter component arrangement, styling, visibility, dimensions, bindings and event properties for one layout without breaking or overwriting another. Reuse the same Flows and data for all four; layout is UI metadata only.

**Current platform gap (must implement generically before release):** SQL `md_app_home_pages` / published app template `form_factor` currently support `desktop`, `tablet`, `phone`; existing Page Builder layout device selection supports Desktop/Tablet/Phone, not a first-class Custom option. Shared Page Builder, Page Runtime, SQL layout selection/activation and App/Object assignment must be extended to support a **fourth independent Custom layout**. Use the displayed label Mobile for existing phone form-factor semantics. Do not claim the four variants already work.

**Initial Page Builder layout identifiers (proposed):**
- `UNEAceChatter_Desktop` — Desktop app layout
- `UNEAceChatter_Mobile` — Mobile app layout
- `UNEAceChatter_Tablet` — Tablet app layout
- `UNEAceChatter_Custom` — Custom app layout

These are four independently editable **page-layout variants of one app**, not four applications. Object Record Pages follow the same four-variant contract using stable object-associated metadata; do not create separate Object schemas or separate Flow graphs.

## 3. Named screens / editable views

| View / section name | Behaviour | Primary UNE components |
| --- | --- | --- |
| **UNE - Chats Workspace** | App header, logout/navigation, refresh, page layout, device switching | `une_split_pane`, `une_text`, `une_button`, `une_stack` |
| **UNE - Chats List** | Display conversations, preview, latest activity, phone grouping, search/filter, selected state | `une_conversation`, `une_search`, `une_repeater` |
| **UNE - Conversation** | Selected message thread, incoming/outgoing bubbles, formatting/status, composer, scrolling/refresh | `une_conversation`, `une_button`, `une_text` |
| **UNE - New Chat** | New chat dialog or mobile full page; contacts/number choices and error states | `une_modal`, `une_tabs`, `une_button` |
| **UNE - Contact Picker** | Search authorised contacts; select original record and phone | `une_search`, `une_repeater`, `une_lookup` |
| **UNE - Phone Number** | Optional name, international number entry, validation and create action | `une_input`, `une_button` |

Build these as editable page regions/components and conditional states; the screen names describe UI work, not six new independent backend applications.

## 4. Bind the existing AceChatter Flows exactly

| UI trigger | Existing Flow API | Input binding | Output / page state |
| --- | --- | --- | --- |
| Initial list and refresh | `AceChatterLoadConversations` | `searchTerm` | `conversations` → `chatterConversations` |
| Search, inbox refresh | `AceChatterLoadCommunications` | `searchTerm` | `communications` → `chatterCommunications` |
| Open or refresh selected thread | `AceChatterLoadCommunications` | selected phone as `searchTerm` | `communications` → `chatterThreadCommunications` |
| Contacts tab opening / contact search | `AceChatterLoadContacts` | `searchTerm` | `contacts` → `chatterContacts`; `sourceObjectApi` → `chatterContactObject` |
| Select contact or enter phone | `AceChatterCreateConversation` | `chatName`, `phoneNumber`, `sourceObjectApi`, `sourceRecordId` | Conversation creation/reuse, then refresh/reselect |
| Resolve existing or new recipient | `AceChatterFindConversationByPhone` | `phoneNumber` | `conversations` → authorised conversation ID |
| Send text | `AceChatterSendMessage` | `conversationId`, `message` | Flow acknowledgement only, not provider delivery |

The existing `AceChatterLoadMessages` is **not** the standalone's authoritative WhatsApp thread source; prefer `Communication` through `AceChatterLoadCommunications`. `AceChatterReceiveWebhook` remains integration-side only and is never called by a UI control.

**Dependency:** AceChatter Flows are currently attached to the standalone `AceChatter` app. Respect the existing installation/entitlement and central RBAC checks for Flow execution; explicitly declare the UNE app's dependency and do not bypass it or duplicate Flows. Never enable a Draft/unconfigured WhatsApp send Flow or claim a message was delivered without provider acknowledgement.

## 5. Source fields, bindings, grouping and filters

- **Data:** `ChatConversation` (saved conversations and recipient references), `Communication` (both inbound and outbound message history), `Contact` or tenant-selected contact object **only through** `AceChatterLoadContacts` output, and `ChatMessage` only as existing legacy compatibility where applicable.
- **Message field mapping:** `Communication.Channel` (WhatsApp), `Direction`, `Sender`, `Recipient`, `Body`, `ReceivedAt`, `SentAt`, `Status`, `ExternalMessageId`, plus any authorised media fields actually declared by the tenant.
- **Inbox identity:** normalised customer phone number, taking Sender on inbound and Recipient on outbound. Exclude delivery/status callback logs and non-message communications from the inbox; merge saved `ChatConversation` rows with incoming-only conversations, dedupe provider message IDs and sort chronologically.
- **Display label:** use an authorised matching Contact's display name when available and fall back to the phone number. WhatsApp profile name is not a stable grouping key; profile changes must not create duplicate threads.
- **Search/filter:** conversation/contact name and phone search; server-authorised `Channel = WhatsApp` restriction; optional All/Unread/Mine only when actual permitted status/assignment fields back the filters. No browser-side unrestricted Object API access.
- **Live state:** selected phone/conversation, transient draft, contact search, page-specific filters, synchronous Flow output collections, loading/error/success state. Refresh only while visible, with configurable interval and bounded record collections.
- **Date presentation:** expose `dd-MMM-yy hh:mm AM/PM` display via shared date-format properties without changing the SQL timestamp values.
- **Record permissions:** Flow Get Records and Page Runtime must enforce tenant, app entitlement, Object, Field and Record RBAC; the OneEngine permission set is an assignable permission set, not a bypass.

## 6. Shared Property Engine/component gap analysis

| Area | Existing foundation | Generic enhancement before 100% parity |
| --- | --- | --- |
| Conversation actions | `une_conversation` / `OneConversation` | Expose typed `start`, `select`, `create`, `resolve`, `send` and refresh actions and Flow output/record-list bindings through Property Engine |
| Inbox merging | Shared `ConversationThread` presenter | Configurable stable phone grouping, incoming/outgoing participant mapping, latest preview, contact-name precedence, empty saved chats and no duplicate/status events |
| New Chat | `une_modal`, `une_tabs`, `une_input` | Metadata-controlled modal/tab/visibility and state handoff, contact record provenance and international phone validation |
| Contacts | `une_search`, `une_lookup`, `une_repeater` | Flow collection/selection event emits both selected ID and configured record fields; dynamic empty/loading/error states |
| Live thread | Page Runtime, `une_conversation` | Flow-output refresh on visibility, auto-scroll/new-messages indication, delivery/status rendering and safe failure displays |
| Four layouts | Page Builder/Runtime three-device foundation | Independently editable/published/assigned Mobile, Desktop, Tablet, Custom variants; Custom selection and size definition |
| Formatting | Shared style/date properties | Editable timestamp display format, density, row spacing, avatar/name/preview presentation, responsive keyboard-height behaviour |

**New components:** None authorised at planning stage. Extend existing shared properties/renderers first. If a capability cannot be expressed by composition/extension, create a genuinely generic `une_*` registered component under the established `apps/web/src/one/<component>/` tree, including its own JSX, CSS and `component.json`, and bind it through the same Property Engine.

## 7. Implementation order

1. Record standalone AceChatter UI/Flow/data baseline and verify current OneChatter and UNE component behaviours.
2. Extend the universal four-variant App/Object page layout capability (including Custom) through metadata, Builder, SQL, resolution and publishing; preserve existing pages.
3. Implement only necessary reusable Property Engine, conversation presenter, event/state/refresh and UI component enhancements.
4. Create new `UNE AceChatter` AppExchange package and independent, idempotent tenant seeder. No forced installation; no changed original app.
5. Build and publish the four editable app layouts, each containing the six views/sections and references to the *existing* AceChatter Flows.
6. Verify parity on desktop, tablet, mobile and tenant-configured Custom, including contact selection, phone grouping, inbound/outbound message history, real send/ack semantics, search/filters and authorisation.
7. Run SQL, app lifecycle, seeder idempotency, flow-dependency, RBAC, mobile viewport, screenshot/browser and CI tests. Keep original app available as fallback.

## 8. Acceptance checklist

- [ ] Standalone AceChatter remains untouched and works with original flows and data.
- [ ] Distinct UNE AceChatter AppExchange identity, installation, licence, RBAC and navigation work.
- [ ] Each app and Object Record Page supports **Mobile, Desktop, Tablet and Custom** as four independently editable/publishable page layouts; each variant can be opened, changed and reassigned without overwriting another.
- [ ] UNE AceChatter's six views work through Page Builder on all four variants.
- [ ] Every UI action uses the already-existing Flow API; no duplicate Flow or direct send implementation.
- [ ] Contact name/phone grouping survives profile-name changes and correctly excludes integration/status log records.
- [ ] Contact selection carries authorised object ID and record ID into the existing Create Conversation Flow.
- [ ] Search, filtering, Flow output collection/page-state binding and visible-only refresh work.
- [ ] Confirm responsive presentation, timestamps, mobile keyboard and unread scroll behaviour.
- [ ] Do not show a success/delivered state without an actual WhatsApp send/provider result.
- [ ] App deactivation/uninstall preserves business records and shared Flow dependencies.
- [ ] Record evidence of parity, shared component reuse, migration rollback and green CI before claiming release-ready.

**No implementation changes are made by this plan.** It is an actionable, repository-tracked plan to guide the subsequent approved migration.

## First implementation slice — reusable UNE property extensions

The initial implementation deliberately stops before creating any UNE AceChatter pages, AppExchange registrations or Flow copies. Shared `une_conversation`, `une_search`, `une_lookup`, `une_repeater`, `une_modal`, `une_tabs` and `une_input` now declare versioned, opt-in editable properties and event APIs. The generic conversation presenter maps authorised saved-conversation and communication Flow collections by configurable field roles; inbox filters, selected record states, contact provenance and modal/tab visibility are expressed through Page Builder properties/event bindings. These changes are a **component foundation**, not proof of 100% screen parity.

**Still pending for migration:** Page Builder UI and four device/custom layouts; tenant AppExchange package; Flow-output polling and thread keyboard/autoscroll parity; date/presentation parity, verification of Flow activations and provider callouts, and actual browser/RBAC/tenant acceptance. Existing AceChatter and OneChatter identities, Flows and customer records are not migrated.

## Implementation slice: separate SQL-managed UNE AceChatter pages

New app catalog identity: `UNEAceChatter`, display name **UNE AceChatter**, with a declared AppExchange dependency on the tenant-installed original AceChatter (source of the existing Flows). New **Page Builder-owned metadata pages**: `UNEAceChatterDesktop`, `UNEAceChatterTablet`, `UNEAceChatterMobile`, and `UNEAceChatterCustom`. The installation seeder is lazy, versioned with the package, and preserves any previously created/modified page metadata.

Editable UNE regions include **UNE - Chats Workspace**, **UNE - Chats List and Conversation**, **UNE - Search Messages**, **UNE - New Chat**, **UNE - Contact Picker** and **UNE - Phone Number**. Children are nested via Page Builder `layoutParentId` metadata; the UI never imports the standalone AceChatter screen. Each page maps authorised Flow outputs into page-local state and binds the same original LoadConversations, LoadCommunications, LoadContacts, CreateConversation, FindConversationByPhone and SendMessage Flow names.

**Custom variant compatibility:** the fourth page is individually editable and accessible through AppExchange navigation, but MetaDrive's current shared form-factor resolver recognises only desktop, tablet, phone. The Custom page cannot yet become an automatic fourth form-factor selection. General four-variant app/Object layout publishing and routing still requires a shared Builder/Runtime/SQL extension. This implementation must **not** be reported as completing that broader policy requirement or full AceChatter parity.

**Outstanding functional parity checks:** live Flow refresh, contact source field variations, provider send status/acknowledgements, client-side search vs server Flow search, mobile keyboard/autoscroll and truly independent editable chat list/message row components. The UI is ready for iterative visual/page testing only after the installed AppExchange package has passed tenant and security validation.
