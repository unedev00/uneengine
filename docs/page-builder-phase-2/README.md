# Phase 2: shared component property contract

Implementation scope: the Property Engine foundation from the Phase 1 plan.
Runtime Salesforce parity remains tracked in `../page-builder-phase-1/acceptance-matrix.md`.

## Delivered

- One pure browser/server contract for existing scalar/list types plus nested groups,
  repeated groups and string lists. Definitions carry defaults, validation bounds,
  help text, schema version, component-version eligibility and four-layout eligibility.
- Schema authoring and nested instance controls through the existing Property Engine.
  Schema editing loads lazily. Existing object/field/Flow/media selectors are reused.
- Missing values receive cloned defaults; explicit false, zero, empty text and null
  stay explicit. Unknown legacy/custom properties survive edits and SQL round trips.
  Device/version filtering affects eligible controls/defaults/validation, not stored values.
- Reusable field behaviour, conditional appearance, action/tab condition and interaction
  schema templates. Templates are opt-in. Existing condition, Flow, binding and
  OneEngine RBAC engines remain authoritative for actual behaviour.
- Versioned property/event definitions in an additive relational table, using the existing
  metadata value codec. Draft/save, publish and restore retain the corresponding schema;
  an omitted schema retains it and an explicit empty list clears it.
- Shared shape validation in page saves, registered rendering and builder save feedback.
  Server validation reads published tenant component schemas, never client-supplied schemas.
  Strict instance validation is opt-in with `schemaVersion: 1`; legacy declarations and
  all 46 bundled registrations retain their identities and additional properties.

## Compatibility and boundaries

Apply `20270107-component-property-contract.sql` through the normal migration runner
before serving the updated library API. It creates one table with a composite tenant/API/
version foreign key and `IF NOT EXISTS`; it neither rewrites pages nor deletes schemas.
The existing library source-code JSONB storage predates this change; the new schema
storage is relational and does not expand that legacy JSONB representation.

`pagePropertyContract` is a reserved version-1 envelope for future standard-page
behaviour adapters. Existing Record Field and Field Section behaviour names are kept.
No mass schema-version upgrade, component replacement, layout migration, new CRUD/Flow
engine, or tenant data migration is included. UNE styling and MetaDrive extras stay intact.
`isBindable` remains the existing binding capability declaration; this phase does not
replace the existing Flow outputs/Page State binding executor.

## Validation and release gates

Coverage includes recursive defaults, schema/value bounds, exact nested error paths,
unsafe property keys, unknown versions, all bundled descriptors, nested guided controls,
unique input IDs, device hiding, tenant-scoped schema reads, explicit clearing, and
publish/restore schema copying inside the transaction.

Local production web/server builds, server/metadata tests, component rendering tests,
Acetill/login tests, architecture/source boundaries, SQL route audit and lazy-bundle checks
are recorded in the PR. The container cannot run the tsx CLI IPC socket; equivalent
component tests use `TSX_TSCONFIG_PATH=apps/web/tsconfig.json node --import tsx --test`.

The existing SQL CI smoke now also exercises real schema save/publish/restore, RBAC,
tenant isolation and populated-table DDL replay. Its result is still pending.

Live PostgreSQL migration/idempotency, authenticated browser editing/save/reload,
production rollout and CI checks remain release gates; unit SQL doubles and server-rendered
control tests are not substitutes for those checks. Do not mark the later feature-parity
acceptance rows complete from these schema foundations alone.

## Follow-on Phase 2 runtime integration (PR #1092)

The Page Builder instance editor now offers guided field, action, tab, event and
component selectors for the version-1 behaviour envelope. It retains the same
typed Property Engine and SQL draft/publish/restore contract; no authored JSON,
scripts or new action/workflow interpreter are required.

The published App Page and Record Page adapters consume matching contracts:

- Field rules filter fields or annotate the existing shared Record Edit form as
  required/read-only. Object/Field/Record permissions and server CRUD remain authoritative.
- Conditional colours/backgrounds apply through the shared visual presentation
  with a strict colour allowlist. Record Field/Section formatting uses readable
  record context; missing permission fails closed.
- Tab rules filter visible tabs on app and record pages. Action rules hide or
  disable supported registered-component and record-action controls. Existing
  RBAC/Flow dispatch is preserved.
- Declared component event interactions can update a sibling's registered,
  bindable property within the same active page session. The target's trusted
  schema, type, bounds, device and version are checked. Untrusted event objects,
  protected keys and cross-page targets are rejected.

No app-specific components were added, UNE styling and legacy properties remain
available, and unpublished pages are not silently upgraded. These rules are
presentation-level: they cannot grant records, fields, actions or Flow execution.
This integration does not claim every later-phase Salesforce feature (such as
advanced action layouts or unrestricted workflow routing).

### Certification

Source-level implementation and regression tests are committed in PR #1092.
Final-head web/server builds, Chromium/WebKit UI smoke, SQL and tenant/RBAC CI
must pass before merge. Production deployment and live-tenant acceptance require
separate evidence; merged code does not by itself prove a production rollout.
