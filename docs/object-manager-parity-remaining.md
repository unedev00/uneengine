# Object Manager Parity — Implementation and Certification Ledger

**Status: in progress. Do not claim Salesforce parity or deploy without release evidence.**

## Merged history and ancestry
- #1074 and #1077 have been merged into `main`.
- #1089 was marked merged, but its base was #1077's feature branch **after** #1077 had already merged into `main`. Its changes were therefore **not in `main`**.
- Main-based PR #1090 carries the complete #1089 file delta forward and adds reusable indexed equality matching.
- #1090 remains a draft until final-head checks and review pass. No changes in this PR imply Oracle deployment.

## Existing and carried implementation
- OneEngine Field Security Wizard, permissions-aware Record Pages and dynamic actions, Mobile/Desktop action layouts.
- Tenant SQL protected Custom Settings, labels/translations (mobile opt-in), independent File and Image/PDF Fields, guarded Lookup Cascade, versioned business process history, action overrides.
- Tenant SQL matching rules (same- and cross-object), normalized Unicode and bounded fuzzy matching, user-specific duplicate evidence permissions.
- Object Change History screen with safe **legacy layout-only** restore from SQL revisions; current published pages, Fields, Record Types and data remain unchanged.
- Shared Record Engine, generic CRUD, seeded app lifecycle and metadata-backed Builder/runtime separation remain authoritative.

## New in #1090 — Shared equality indexing
- Opt-in Object/Field metadata in `md_field_exact_indexes` with optimistic revision control, audit history and a limit of 24 enabled fields per Object.
- Fixed shared PostgreSQL projection `md_field_exact_index_entries` stores exact and casefold hashes for enabled fields only; no tenant-specific DDL or per-app CRUD logic.
- Records are indexed on configuration/backfill and updated/deleted through SQL triggers. Disabling cleans entries without altering source records; migrations are versioned and replay-safe.
- Index hash hits **always recheck original values**. Both duplicate matching and generic Record/List View equality filters reuse the projection while shared Record-level, Object-level and Field-level OneEngine rules continue to apply.
- Separate no-code index controls under Object Manager > Search Layouts. Existing weighted full-text search indexing remains independent.
- Positive/negative unit coverage and SQL database smoke for lifecycle, revision conflicts and read permissions. Final-head CI remains authoritative.

## Still pending implementation / exhaustive release validation
1. **External/indirect lookup runtime**: secure no-code mapping onto existing credential/HTTP/Flow integrations, tenant authorization, read/write semantics, dependency and outage handling. Do not advertise until it really works.
2. **Additional index consumers**: shared configurable projection is used for equality duplicate-matching rules. Other filters, reporting and ad-hoc planners still use existing search or generic relational indexes; broader optimizer integration remains.
3. **Business process publishing**: independent draft/published lifecycle and explicit migration of existing records after stage edits; existing history restore must never silently rewrite Record Type restrictions.
4. **Advanced Flow and action composition**: visual cross-Flow dependencies/trigger sequencing, publisher-specific action placements and tested published versions. Flow Builder already has a trigger-order field; do not duplicate the runtime.
5. **Localization / metadata**: desktop-wide automatic display-label projection separate from canonical Builder API names, and comprehensive versioned rollback beyond legacy layouts.
6. **Security**: negative authorization across imports, exports, reporting, background workers and all other APIs; tenant/app entitlement separation, credentials, deleted-field and record lifecycle.
7. **Certification**: final-head SQL/build/unit/Chromium/WebKit, existing tenant upgrades, migration replay and backup/restore, application lazy loading, published runtimes without Builders, all four device variants and Oracle deployment/rollback.

## Mandatory release gates
1. Every active metadata value and user customization persists in tenant SQL.
2. Published and draft metadata remain independent; rollback preserves live data.
3. Shared CRUD/Record/Flow/import/export/report/job engines enforce permissions.
4. Desktop, Mobile, Tablet and Custom layouts stay isolated across versions.
5. Positive and denied paths exist for Object, Field, Record, Page, Action and Flow.
6. App install/licensing and OneEngine checks are separate, with tenant isolation.
7. Migrations and seeders replay without erasing business data; backups restore.
8. Core starts without optional apps; unopened Builders remain unloaded.
9. CI passes against the **final review commit SHA**, with logs linked from PR.
10. The reviewed release is deployed to Oracle and rollback/health verified.

**These gaps and gates must not be described as complete until code and evidence exist.**
