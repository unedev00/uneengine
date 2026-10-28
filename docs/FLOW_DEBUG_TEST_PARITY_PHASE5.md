# Flow debug and test parity — Phase 5

Status: **debug resource evaluation and test assertion hardening**
Scope: no-code Flow debugging and repeatable Flow tests; Apex excluded.

## Debug contract

The shared SQL Flow runtime's debug endpoint runs the currently active version in a bounded, read-only simulator. It records per-element duration/status/variable snapshots; Create/Update/Delete, Action, HTTP, Subflow, event publication, waits, screens and approval stages are simulated, paused or reported as failures without committing their side effects. Debug snapshots redact credential-like keys and cap nesting, fields, array items and string lengths.

Before this phase, the simulator initialized user-supplied values but did not resolve declared Constant, Choice, Formula or Text Template resources. Those resources are now evaluated lazily through the shared formula runtime semantics. Formula evaluation receives the same tenant user's timezone, currency rates and `$User` data loaded by the shared resource loader. Circular formula references, missing expressions, invalid types, unsupported resource kinds and non-scalar template references fail the debug step explicitly.

## Repeatable Flow Tests

Flow Tests save manual inputs or Record-Triggered event/current/prior-record fixtures, expected terminal status and expected output resources. Tests execute the most recently saved active Flow through the same safe debugger. They do not execute external side effects.

Expected JSON values are now compared recursively: object key order is irrelevant, array order is significant, and scalar values remain type-sensitive. Previously, JSON-string comparison incorrectly failed equivalent object values when their key insertion order differed.

## Limits and differences to preserve

- Debug is a simulation, not production execution. Simulated writes, messages, external calls, subflows, waits, screens and approvals must not be presented as committed runtime behavior.
- Trace and output snapshots redact credential-like names and bound/truncate values. Avoid tests that expect secrets or values beyond the documented snapshot limits.
- Saved Flow Tests currently assert status and named output values; they do not provide Salesforce's full rollback/debug-mode choices, path coverage, or element-level assertions.
- Tenant, Flow execute permission, active version, tenant app entitlement and current data-field permissions remain enforced by the shared server paths.
- This feature adds no second executor, persistence store or app-specific behavior.

## Acceptance evidence

- Debug tests resolve Constant/Choice, Formula and Text Template resources, preserve tenant user formula context, fail closed for circular formulas, and keep side effects simulated.
- Flow Test output assertions ignore object key ordering while preserving array order, exact scalar types and full object keys.
- Server system-file type-check and focused formula/debug and browser metadata tests pass.
