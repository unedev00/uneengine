# MetaDrive — Mandatory Standalone-to-UNE UI Migration Policy v1.0

**Status:** Mandatory for ChatGPT, Copilot, coding agents, maintainers and reviewers migrating an existing standalone application into a MetaDrive Page Builder / AppExchange application.

**Authority:** Read and follow [DEVELOPER_POLICY.md](DEVELOPER_POLICY.md) first. This policy adds migration-specific requirements; it does not override the authoritative Developer Policy, central RBAC rules, tenant isolation, SQL source of truth, AppExchange lifecycle or modularity limits. If a requirement genuinely conflicts, stop the conflicting change and obtain an owner decision rather than silently bypassing either policy.

## 1. Purpose and boundary: UI-only migration

Existing standalone applications (for example Acetill and AceChatter) may already be functional and use shared MetaDrive backend Objects, Actions and Flows. The migration **creates a second, Page Builder-managed UI**, not a rewrite or replacement of the standalone application.

- **Keep the existing standalone application, routes, UI and behaviour working.** No automatic replacement, deletion, deactivation or forced cutover.
- **Only migrate the interface:** pages, layouts, navigation, presentation, bindings and UI-event-to-existing-Flow connections.
- **Do not fork, duplicate, rename, reimplement or migrate backend Flows, Actions, Objects, business rules, generic CRUD, integrations or business data** as part of a UI migration.
- Both UIs must operate concurrently against the **same existing Flow definitions, Actions, tenant-scoped records and backend services**, with equivalent inputs, outputs and permission checks.
- Metadata required to publish/install the new UI (Page Builder pages, component registrations, UI-specific navigation and app seeding) is in scope. Changes to business behaviour or backend workflows are **out of scope** and require separate owner approval.

## 2. Distinct UNE application identity

Create a **separate AppExchange application** with a clear `UNE ` prefix in its displayed name so users know which interface is configurable through Page Builder.

| Existing standalone app | New Page Builder / AppExchange app |
| --- | --- |
| Acetill | **UNE Acetill** |
| AceChatter | **UNE AceChatter** |
| Ace Assist | **UNE Ace Assist** |

- Do not relabel or silently repoint the existing standalone app as the UNE app.
- Give the new app its own stable, non-colliding app identity, navigation and UI/page metadata. Keep existing app identities, URLs and customer choices intact.
- Show a clear distinction in AppExchange, installation and administration between **standalone** and **UNE Page Builder** versions.
- Each new UNE UI app follows standard tenant-specific AppExchange discovery, licensing/entitlement, dependency validation, installation, seeding, activation, update and uninstall rules. Do not auto-install it for tenants.
- Uninstalling/deactivating the UNE UI must not remove tenant business records, customisations, shared dependencies or any Flow still used by the standalone app. Likewise the standalone UI's lifecycle must not implicitly remove a Flow used by the UNE UI. Resolve ownership/dependency conflicts before publishing, without cloning the backend.

## 3. One shared backend and Flow runtime

The **existing Flow is the source of truth** for an action regardless of which UI invokes it.

- Map each standalone UI interaction to its **existing published Flow/Action**; reuse its canonical identity and contract through Page Builder event/action bindings.
- Keep Flow arguments, record references, outcomes, errors, status handling and transaction semantics equivalent across both UIs.
- Never use direct app-specific API calls, duplicated client business logic or a second workflow engine merely to make the new UI behave like the old one.
- All invocation paths must preserve central RBAC, effective OneEngine permission-set grants, tenant/record/field permissions, entitlements and app activation checks. UI visibility/disabled state is not a server-authorisation substitute.
- Keep shared Flow versioning, lifecycle, auditing and failure handling intact. Do not silently change the original Flow to suit the new interface.
- If a required interaction cannot be expressed with existing Page Builder bindings or shared Flow runtime capabilities, extend the **shared metadata-driven binding/runtime capability** rather than hardcoding a special case in the UNE app. Any requested change to the underlying business Flow is a separate decision, not UI migration.

## 4. Build the new interface exclusively with UNE components

- Reconstruct every new screen using **Page Builder and the existing registered UNE components** (including composition of smaller components).
- Preserve the standalone app's useful functionality, user journeys and responsive behaviour. Match the intended UI behaviour with metadata, not embedded app-specific implementation.
- Page layouts, navigation, labels, dimensions, style, responsive breakpoints, visibility, validation, data bindings and events must be configurable via Page Builder and its shared metadata facilities.
- **No hardcoded component configuration or app-specific CSS/JavaScript workarounds** in the new app's pages to simulate missing Page Builder capabilities.
- Avoid monolithic screen components that hide independently editable elements from the Builder. Publish pages through the standard lightweight Page Runtime; never load the Builder into normal runtime use.

## 4A. Four editable page layouts for every app and Object

**Platform-wide requirement, including every migrated UNE app:** Every application page and every Object's Record Page must have **four separately selectable and editable layout variants**: **Mobile, Desktop, Tablet and Custom**. A single responsive layout with hidden device styles is not a substitute for the four Page Builder choices.

- In Page Builder, users must be able to **open, design, save, draft, preview, publish, activate and later modify each variant independently**. Changes to one variant must not unintentionally overwrite the others.
- **Mobile** is the phone-focused layout (existing internal `Phone` terminology may be mapped to the displayed `Mobile` label); **Desktop** and **Tablet** are their corresponding device layouts. **Custom** is a separately managed layout for a tenant's special width, form factor or workflow, with editable canvas dimensions and explicit activation/selection criteria; do not guess that all users want Custom.
- The four variants should reuse the same app identity, Objects, Flows, Actions, security, bindings, Property Engine and registered UNE components. Do not duplicate backend records, business rules, Flow definitions or app installations to implement them.
- Store layout variants, their association with an app/page or Object, their activation targets and independent version history as tenant-scoped **SQL metadata**. Seed or initialise the four choices idempotently without overwriting published pages, existing device layouts or tenant modifications. A common starting template is permitted, but each variant must remain independently editable.
- At runtime, choose the **published and authorised** layout for the effective device or explicitly selected Custom target, with a documented safe fallback while a variant is unpublished. Do not silently display a private Draft or bypass Object/Page RBAC.
- **Shared-engine prerequisite:** the current repository supports Desktop/Tablet/Phone responsiveness but does **not** yet implement a first-class `Custom` page assignment or all four independent variants. Extend the existing Page Builder, Page Runtime, app-home and Record Page assignment/resolution, SQL metadata and publishing mechanisms **generically**, rather than adding UNE AceChatter-only branching. Treat the four-layout requirement as a release gate, not as a claim of current implementation.
- For each migrated screen, record and validate its four layout mappings; test Desktop, Tablet, Mobile and a user-defined Custom activation, including navigation, Flow events, data bindings, responsive dimensions, tenant customisation retention and rollback.

## 5. Extend MetaDrive's existing Component Property Engine first

For each UI gap:

1. Inspect the **current UNE component catalog, Registry, Renderer and Property Engine**; reuse a component and its available property definitions when possible.
2. If an existing component can represent the behaviour but a property is missing, extend that component's **shared, metadata-driven property definitions and Property Engine support**.
3. Expose the new property in Page Builder with suitable input control, default, validation, device behaviour, binding and event semantics, as applicable.
4. Make the extension generic and reusable across unrelated MetaDrive applications, not hardcoded for Acetill, AceChatter or any one screen.
5. Preserve compatibility with existing published pages, component versions and customer-set properties.

**Prohibited:** hardcoded page style values or event handlers as substitutes for editable properties; standalone-only configuration forks; duplicate property engines or renderers; bypassing the Registry.

Internal component code may implement generic rendering behaviour, but each independently editable aspect must be exposed through the shared property system rather than fixed for one application.

## 6. New components: register in the UNE family

Only if composition or property extension cannot reasonably satisfy the need:

- Create a **genuinely reusable** new component in the `UNE_*` component family; register it through the **one shared Component Registry** so it can be used in Page Builder and supported runtimes.
- Preserve the repository's existing canonical API-name convention: current UNE catalog entries use `une_*` identifiers (for example `une_calendar`) and user-facing `UNE …` labels. Treat this as the `UNE_*` namespace; **do not rename existing registered components** merely to change case or punctuation.
- Use the **same MetaDrive Property Engine and Renderer**; add declared property and event metadata rather than bespoke app-specific component configuration.
- Make layout, style, dimensions, responsiveness, visibility, validation, bindings and events configurable where relevant. Keep components granular enough for Page Builder editing.
- Verify registration, Builder property editing, persisted metadata, runtime rendering, Flow/event wiring and reuse across applications.

### Component directory structure is mandatory

Preserve the existing **per-component folder tree**, currently rooted at `apps/web/src/component-libraries/` (rather than recreating the historical `custom-components/` tree). Keep the JavaScript/JSX, CSS and component descriptor within the component's folder.

```text
apps/web/src/component-libraries/
  une_calendar/
    UneCalendar.jsx
    UneCalendar.css
    component.json
  une_<new_component>/
    Une<NewComponent>.jsx
    Une<NewComponent>.css
    component.json
```

The example is illustrative; match the active repository's established folder/API-name casing and file extensions. Update the existing component catalog/manifest and registration pipeline as required; do not create a parallel registry or flatten the directory structure. Shared styles or utilities belong in the established shared location when genuinely reusable. Keep new files within the authoritative Developer Policy's modular file limits.

## 7. Metadata, tenant safety and AppExchange packaging

- Persist active app/page/component/property/navigation metadata through the existing **SQL-backed metadata lifecycle**, obeying `DEVELOPER_POLICY.md`; descriptor files are component source/catalog inputs, not a replacement for active tenant SQL metadata.
- Use **versioned, idempotent, tenant-aware, upgrade-safe** UNE app seeders and metadata publishing. Preserve existing tenant customisations and published standalone pages.
- Use shared Page Runtime, Object APIs, central RBAC and Action/Flow invocation. Avoid an independent UNE-specific runtime or app-specific Core logic.
- Respect tenant isolation, licensing, installation, activation, lazy loading and secure tenant-aware caching.
- Neither UI may bypass shared security constraints to achieve behavioural parity.
- Preserve business data and existing Flow history. Maintain rollback to the unchanged standalone experience.

## 8. Required migration sequence for each application

1. **Inventory:** inspect the standalone UI's screens, navigation, interaction contracts, existing Flow/Action IDs, used Objects and permissions. Record the baseline before changing anything.
2. **Reuse analysis:** map each visual/UI requirement to an existing UNE component and property. Identify only genuine shared-engine/property/component gaps.
3. **Foundation first:** extend the Property Engine or register reusable `UNE_*` components when required; verify them independently before building screens.
4. **Build four independently editable layouts per app/page and Object Record Page:** Mobile, Desktop, Tablet and Custom through Page Builder metadata and UNE components only; bind UI events to the **original Flows**.
5. **Package separately:** add the `UNE <AppName>` AppExchange catalog identity, UI/page/navigation metadata, controlled lifecycle and idempotent seeding. Leave standalone installation unchanged.
6. **Validate side by side:** test the original and UNE UI against the same flows and records, including security, install/uninstall and tenant boundaries.
7. **Publish without forced replacement:** retain the standalone UI as an available fallback until a separately approved cutover, if any.

## 9. Mandatory acceptance checks (release gate)

A migration is **not complete** until evidence demonstrates all of the following:

- [ ] Original standalone UI, routes, tenant records and functionality remain unchanged and operational.
- [ ] Separate, recognisable `UNE <AppName>` AppExchange entry installs, activates and uninstalls independently.
- [ ] Every migrated screen is editable through Page Builder with UNE components, not a hardcoded standalone UI embedded in a Builder page.
- [ ] All required independently editable component properties, data bindings and events are configurable using the one Property Engine.
- [ ] Newly needed components follow the existing per-component folder pattern, shared registry, catalog and `UNE_*` identity convention.
- [ ] **Both UIs invoke the same existing Flow definitions**; no duplicated Flow, CRUD engine or backend business logic has been introduced.
- [ ] Output records, errors, side effects, validation and user-facing behaviour match for representative and edge-case workflows.
- [ ] Central RBAC, effective OneEngine grants, entitlements, app activation, field/record access and tenant isolation are enforced on both paths.
- [ ] Uninstall/deactivation of either UI does **not** disable a shared Flow or destroy business data required by the other.
- [ ] Idempotent tenant seeders, SQL metadata, versioning/publishing, customer customisation preservation and rollback are verified.
- [ ] Every app and Object Record Page exposes independently editable, published/assignable **Mobile, Desktop, Tablet and Custom** layouts, with verified variant selection, non-destructive editing, shared Flow bindings and Custom targeting.
- [ ] Responsive UI, lazy loading, performance, component catalog/build checks, relevant tests and CI pass.

## 10. Enforcement

Every developer/agent must read `DEVELOPER_POLICY.md`, `AGENTS.md` and this `MIGRATION_POLICY.md` **before** starting standalone-to-UNE migrations. PR descriptions must state the standalone baseline, UI-to-component/property mapping, reused Flow IDs/contracts, any shared-engine extension and the actual validation evidence. Do not claim migration complete without tests. Fix deviations before release; escalate only real owner decisions.

**Non-negotiable:** **PRESERVE STANDALONE · MIGRATE ONLY UI · UNE PAGE BUILDER · SHARED PROPERTY ENGINE · ONE COMPONENT REGISTRY · SAME BACKEND FLOWS · NO HARDCODING**
