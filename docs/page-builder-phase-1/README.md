# Page Builder Phase 1: component map and implementation ownership

Status: **Phase 1 source audit and plan complete. Phases 2–8 remain implementation work.**

Baseline: `b3c1b78cbcb1bccaf97d381887b08eebb68bc2cd`, 26 October 2026.
This PR changes documentation only. It does not merge other PRs, modify runtime metadata,
change tenant pages, run database migrations or certify production functionality.

## Deliverables

- [Component inventory](component-inventory.md): all 44 indexed One/UNE descriptors,
  two bundled Core registrations, standard/special page types, exact property-schema
  sources, declared property keys/types/events, renderer dependencies and reuse decisions.
- [Acceptance matrix](acceptance-matrix.md): every gap from the comparison has a
  reuse/extend/add path, shared-engine owner, dependency, acceptance scenario and later phase.
- The reconciliation table below separates merged baseline code from unmerged work.

## Binding design decisions

1. Retain all 36 `une_*`, eight One and existing standard/tenant component identities.
   New ordinary placements should prefer UNE presentation where an equivalent is ready.
   Similar names or appearances do not justify renaming saved types or dropping properties.
2. Keep the existing Registry, RegisteredComponent, Property Engine, Record API,
   Flow engine and central RBAC. A UNE wrapper must not implement a second CRUD,
   permission, workflow, report or approval engine.
3. All user-configurable appearance, fields, options, events, conditions and bindings
   remain metadata-driven and editable without source code. Component-specific properties
   and MetaDrive extras are retained even when Salesforce has no equivalent.
4. Extend schemas additively. Preserve false, zero, empty text, unknown legacy keys,
   responsive overrides, event payload contracts and published layout revisions.
   Resolve shared defaults before component defaults before explicit instance values;
   preserve existing precedence where it differs until a versioned adapter is verified.
5. Keep Mobile, Desktop, Tablet and Custom independently editable, saved and published.
   Responsive styling within a layout must not silently copy edits to another layout.
6. Existing standard blocks require explicit compatibility adapters. Do not replace
   `Chatter` with an inbox or a report with a raw chart simply because they look similar.
   Compose existing UNE primitives with existing authorised services where appropriate.
7. Source descriptors and packaging files are build inputs, not a new runtime source
   of truth. Active tenant metadata stays in relational SQL. No new runtime JSON store.
8. Visibility and page-level read-only rules are presentation controls. Server-side
   tenant, object, field, record, action and Flow grants remain authoritative, including
   revocation and explicit deny. Preserve the user's disabled-button behaviour where configured.

## Architecture and source ownership

| Responsibility | Existing owner to reuse | Phase 1 finding / later work |
|---|---|---|
| Catalogue and appearance mixin | `scripts/component-catalog.mjs`, `apps/web/src/one/manifest.json`, `one/une/shared/appearance-properties.json` | 44 descriptors; UNE mixin fills absent keys. Do not add another catalog. |
| SQL registration and authorisation | `apps/server/src/app-seeders/une-components.ts`, `bundled-components.ts`; `core/components/Registry/bundledRegistryClient.ts` | Descriptor presence does not establish tenant installation/access. Preserve explicit SQL registration. |
| Property controls | `core/builders/ComponentProperties/CustomComponentPropertyEditor.tsx`, `StructuredListPropertyEditor.tsx` | Typed controls and unknown-value preservation exist. Complex new conditions need schema-backed controls, not ad hoc text JSON. |
| Property semantics | `core/components/Properties/componentSettingDefinitions.ts`, `core/metadata/Definitions/metadataAppearanceSchema.ts` | Extend types/validation and reconcile appearance sources. Do not claim declarations alone prove runtime consumption. |
| UNE appearance/runtime | `one/une/shared/UneFrame.jsx`, shared primitive modules and per-component wrappers | Keep UNE style and all extra component properties. Audit explicit aliases such as textColor/color and radius/borderRadius before adapting. |
| Standard page blocks | `core/components/Catalog/catalog.ts`, `core/builders/PageBuilder/pageBuilderView.tsx` | Built-in properties currently use dedicated inspector/runtime branches; unify through adapters incrementally. |
| App/record runtime | `core/pages/PageRuntime/pageRuntimeViews.tsx`, `core/records/RecordWorkspace/recordWorkspaceViews.tsx` | Reuse services; remove inconsistent rendering in Phase 3, not by rewriting business engines. |
| Form lifecycle | `core/records/RecordWorkspace/recordEditPageLayout.ts`, `core/records/RecordFormDialog/recordFormDialogView.tsx` | Form visibility is a distinct remaining gap from field required/read-only controls. |
| Events and data | `core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx`, `core/pages/PageRuntime/pageComponentBindings.ts` | Existing Flow outputs/page state already support interactions. Extend this path. |
| Versions and assignments | `apps/server/src/system-files/page-layout-version-runtime.ts`, `page-runtime.ts` | SQL draft/publish/history and assignment precedence exist; preserve throughout migration. |

Web paths in this table are relative to `apps/web/src/` unless fully qualified.
See also [existing component specification](../component-engine-spec.md) and
[source organisation](../COMPONENT_LIBRARIES.md). Older prose must not override current
source evidence; for example the source inventory now includes the 36 UNE entries.

## Reconcile overlapping PRs before later implementation

Snapshot from GitHub reads on 26 October 2026. Status is not deployment evidence.
Re-read heads and checks when implementation starts; these branches are being edited.

| PR | Observed state | Relevant ownership | Integration decision |
|---|---|---|---|
| [#1059](https://github.com/onesolutions-ahuja/metadrive/pull/1059) | Open/unmerged; inspected head `18aa392600d99b93b6dc7233e0b226b84dcdbacb` | Preview, nested tree/copy, inline fields, related-list controls, Screen Flow, Rich Text/List/Approvals/Path blocks, Custom targeting, profile/type/record-permission visibility | Reuse these implementations after branch reconciliation and tests. Adapt their standard blocks to UNE contracts; do not reimplement their services. Pending does not mean absent code. |
| [#1073](https://github.com/onesolutions-ahuja/metadrive/pull/1073) | Merged, included in baseline | Record View/Edit consolidation, default-layout SQL migration, device import, actions/links | Keep its saved metadata and compatibility paths. Complete multi-layout profile/type migration before retiring remaining consumers. |
| [#1074](https://github.com/onesolutions-ahuja/metadrive/pull/1074) | Merged, baseline merge commit | Matching modes and record-type picklist correction; broader remaining Object Manager matrix | Reuse shared record-type enforcement. Do not describe this PR as implementing all Object Manager or Page Builder parity. |
| [#1077](https://github.com/onesolutions-ahuja/metadrive/pull/1077) | Open/unmerged at inspection; file diff inspected | Page-specific required/read-only settings, generic form integration; Flow Trigger Explorer | Reuse `requiredFieldApiNames`, `readOnlyFieldApiNames`, `requiredOnLayout`, `readOnlyOnLayout`. It does not yet solve conditional edit visibility. Trigger Explorer remains Object Manager-owned. |
| [#1067](https://github.com/onesolutions-ahuja/metadrive/pull/1067) | Merged, included in baseline | Shared metadata API-name generation/duplicate validation | Reuse identity rules. Resolve reported `API Name already exists` validation/setup failures without bypassing uniqueness. |

### High-conflict files and integration order

1. Refresh main and compare current #1059/#1077 files; preserve intervening work.
2. Reconcile `pageBuilderView.tsx` changes together: #1059's preview/tree/block changes
   and #1077's field settings must both survive.
3. Reconcile `recordWorkspaceViews.tsx`, `recordEditPageLayout.ts`,
   `recordFormDialogView.tsx` and metadata types as one field contract. Inline-edit
   fallback, layout-only rules and visibility must agree.
4. Preserve #1073's migration and all four layout revisions when incorporating
   #1059's Custom targeting changes in the SQL page engines.
5. Review browser assertions against the final composition; neither delete failing
   tests nor weaken identity/security checks to make the combined branch pass.
6. Re-run final-head tests after integration. Do not bulk-cherry-pick unrelated
   Object Manager changes or merge these PRs as part of this documentation PR.

## Compatibility and release conditions for subsequent phases

- Capture authorised legacy standard/One/UNE and tenant-defined page fixtures before
  conversion. Preserve API identity, properties, events, child ordering, assignments,
  history, rollback and active published revisions.
- Use additive SQL migration with idempotency and tenant boundaries. Verify multiple
  legacy layouts per profile/record type, authored pages and mixed device assignments.
- Keep free canvas, nested layout, themes, responsive overrides, item grids, carts,
  calendars, slots, documents and conversation tools; no Salesforce-driven removals.
- Preview uses runtime presentation with a read-only/no-mutation context. Permission
  checks apply to preview data; a preview click must never execute a business mutation.
- Test Core without optional apps, installed/uninstalled/licensed app states, permission
  denial/revocation, device variants, existing page compatibility and lazy loading.
- Do not remove the legacy editor/SQL compatibility path until every consumer and
  migration fixture has an accepted replacement and rollback plan.

## Phase boundary and completion evidence

Phase 1 completes mapping and decisions, not feature implementation. No new components
or property schemas are installed by this PR. Later-phase statuses remain explicit in
[the acceptance matrix](acceptance-matrix.md).

Documentation verification: indexed descriptor coverage, unique API names, referenced
JSX/CSS existence, relative Markdown targets and `git diff --check`. Full application,
SQL/browser CI and Oracle verification are not claimed by this source audit. They are
required for implementation releases. CI and merge of this PR remain separately tracked.

Tenant-specific runtime inventory and actual property-consumption/browser verification
remain migration/release acceptance checks; the static catalogue cannot prove those.
