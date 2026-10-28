# Flow trigger parity — Phase 4

Status: **trigger validation hardening**
Scope: no-code automatic Flow starts; Apex and Salesforce Data Cloud-triggered flows are excluded.

## Trigger behavior already implemented

| Trigger surface | MetaDrive behavior | Evidence and bounds |
|---|---|---|
| Record-triggered Start | Create, update, create-or-update and delete; before-save or after-save; entry criteria use All/Any/Custom logic | Builder Start settings, `FlowRecordTriggers`, and record-trigger system tests |
| Updated record criteria | Every matching update, or only when an update first makes criteria true; Is Changed and Was Set compare `$Record` with `$Record__Prior` | `updatedRecordBehavior` runtime and entry-condition tests |
| Trigger ordering | Order 1–2000, selected same-object/same-phase dependencies, cycle detection, at most 50 matching Flow executions per record operation | `record-trigger-dependencies.ts`, transactional runtime and limit tests |
| Before-save execution | Read-only/pure data elements plus assignments to `$Record`; delete and side-effecting elements are rejected | Capability registry, `FlowValidator`, and before-save system tests |
| Scheduled-triggered Start | Once, Daily, every-seven-days Weekly and anchored Monthly schedules in IANA local time; entry criteria and bounded record runs | `ScheduledFlowRuntime`, `flow-phase3.test.ts`, and dispatcher tests |
| Record-triggered Scheduled Paths | Durable, versioned delayed work with Date/DateTime source fields and minute/hour/day offsets | `FlowRecordTriggers` and scheduled-path runtime tests |
| Platform Event-triggered Start | Tenant-enabled event definitions, typed event fields, entry criteria and durable per-subscriber delivery | Platform Event validation and subscription runtime tests |
| Authorization and lifecycle | SQL tenant-scoped subscriptions; current Flow/app eligibility and actor permissions are rechecked for dispatch and resume | Trigger runtime, capability registry, and durable-worker contracts |

These are bounded MetaDrive capabilities, not a claim of full Salesforce parity. Data Cloud-triggered Flows are not implemented. Scheduled Flow runs process at most 500 records; occurrence catch-up windows and the dispatcher scan cap are documented in the [execution-context contract](FLOW_EXECUTION_CONTEXT_CONTRACT.md).

## Phase 4 change

Record-Triggered and Schedule-Triggered Start entry criteria now receive the same SQL-backed Object and field existence validation already applied to Flow data actions. A misspelled or deleted field can no longer pass draft validation and then fail when an automatic trigger evaluates it at runtime. Validation remains tenant-scoped and uses the existing metadata validator; no trigger-specific metadata store or runtime was added.

Regression coverage validates both accepted fields and unknown fields for both trigger types in the server builder-contract tests.

## Remaining parity work

- Validate automatic starts against PostgreSQL migrations and fresh/upgraded tenant capability registry state.
- Complete authenticated browser-to-SQL acceptance for create/update/delete, before/after-save, scheduled dispatch, platform-event delivery and Scheduled Paths.
- Compare Salesforce trigger entry-condition operators, formula criteria, bulk/transaction behavior and retry semantics; document deliberate differences rather than implying identical behavior.
- Keep Data Cloud integration as an explicit product/integration decision; a platform event is not a substitute for Salesforce Data Cloud.

## Acceptance evidence

- The validator rejects Record-Triggered and Schedule-Triggered entry conditions referencing fields absent from the selected Object.
- Existing runtime tests continue to cover trigger event filtering, All/Any criteria, transition-only updates, Is Changed/Was Set, dependency order, execution caps, monthly recurrence, DST-aware times and dispatcher keyset paging.
- Visibility or trigger criteria do not grant authorization; Flow execution and data access continue to enforce tenant, app and central RBAC boundaries.
