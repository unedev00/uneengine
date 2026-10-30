# Formula Engine Phase 1E Context and Lifecycle Coverage

Phase 1E adds immutable evaluation snapshots, record lifecycle context,
server-side field-read enforcement, and authenticated page-binding globals.
The context is copied and deeply frozen at the start of an evaluation pass;
dates in snapshots are represented as ISO strings, and cyclic input is
rejected.

| Area | Verified behavior |
|---|---|
| Record lifecycle | Create, update, and clone stages are passed into defaults and validation. `ISNEW()`, `ISCHANGED()`, `PRIORVALUE()`, and `ISCLONE()` distinguish new, changed, unchanged, cleared, and cloned values. Clones retain their source record type. |
| Flow formulas | Record lifecycle functions and record globals are accepted only in Record-Triggered Flows. Current and prior record values are filtered using the executing actor's read access before being exposed to Flow formula evaluation or persisted from before-save execution. |
| Formula globals | Server rule and Flow contexts provide authenticated `$User`, `$Profile`, `$Organization`, and `$RecordType` values, along with current/prior records and `$Permission` snapshots. Unsupported global properties fail rather than resolving silently. |
| Field-level security | Formula reads of current or prior record fields require read permission. Validation/default execution uses explicit field-access snapshots; Flow execution filters record data and checks formula field reads with the executing actor. |
| Custom permissions | Server evaluation resolves `CustomPermission:<API>` through central RBAC using the `read` action. There is no separate custom-permission metadata table. Page bindings reject `$Permission` unless an explicit permission snapshot is supplied. |
| Authenticated page context | `/auth/me` supplies user time zone, locale, currency, profile, and organization identity. Registered property bindings use these globals and one captured `now` per resolution pass. Time-zone-sensitive bindings fail explicitly if authenticated time-zone context is unavailable. |

Focused server coverage is in
`apps/server/test/system/declarative-rules.test.ts`,
`apps/server/test/system/flow-action-runtime.test.ts`,
`apps/server/test/system/formula-phase1a.test.ts`, and
`apps/server/test/system/system.test.ts`. Browser binding coverage is in
`apps/web/test/registeredFieldExpressionRuntime.test.ts`.

The browser `/auth/me` context does not currently include custom-permission
snapshots; page expressions that reference `$Permission` therefore require a
caller-supplied snapshot and otherwise fail explicitly. This coverage
documents implemented MetaDrive behavior and does not claim unverified,
release-specific Salesforce behavior.
