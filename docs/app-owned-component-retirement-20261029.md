# App-owned component extraction (stage 1)

New app pages refer to code-owned renderer identities rather than shared `une_*` SQL definitions:

- acetill: `acetill_input`, `acetill_search`, `acetill_item_grid`, `acetill_button`
- aceassist: `aceassist_input`, `aceassist_calendar`
- onechatter: `onechatter_input`, `onechatter_conversation`
- uneacechatter: `uneacechatter_input`, `uneacechatter_conversation`, `uneacechatter_modal`, `uneacechatter_tabs`, `uneacechatter_stack`, `uneacechatter_lookup`, `uneacechatter_button`, `uneacechatter_search`

Acetill v4 uses its own private components, including its existing `acetill_cart`. Each app seeder registers only its renderer identities on explicit licensed install. Each application component now has an app-owned renderer and stylesheet, with no public component property definitions, and is hidden from the shared component library. Shared low-level `One*` and `une/shared` primitives remain reusable runtime utilities. The old `une_*` top-level sources remain only for existing tenant-compatible page instances.

Legacy runtime assets and existing tenant-saved pages remain readable. **No tenant's authored page nodes, versions, component definitions, properties, or business records are deleted.** Before a final destructive retirement: inspect all live tenant references (page node versions, published and draft pages, dashboard/flow component instances), migrate per-app stored references with a tenant-safe versioned process and preserve rollback, then remove unused legacy assets. No live tenant SQL was accessible while preparing this stage.

The application identity aliases do not convert already published pages in place. Acetill v3 stays immutable; v4 is available for publication/installation. Backend Objects, Flows, permission checks and the shared runtime are unchanged.
