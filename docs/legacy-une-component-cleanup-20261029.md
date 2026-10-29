# Legacy UNE renderer retirement — follow-up to merged PR #131

## Shipped in this PR
- An additive, checksum-tracked, tenant-wide SQL migration registers the **private app renderer** only when its owner is installed and entitled. It never overwrites a tenant-owned renderer key.
- Acetill's **package-seeded** page instances, and untouched first-revision app-owned Lightning page nodes for Ace Assist, OneChatter and UNE AceChatter, are switched by *exact page API, app installation and component mapping*. Instance IDs, tenant property values, Flows, RBAC and page geometry stay unchanged.
- Each replaced instance is recorded in `md_legacy_une_component_replacements` for a targeted rollback and after-deployment validation. A second run makes no additional changes.
- Exact system-owned `une_*` SQL definitions are **disabled, not deleted**, only if no runtime, immutable layout, authored component library, Flow, action, dashboard or installed legacy app-version reference remains. All customer-owned definitions are excluded.
- Three duplicate 7 KB flow-conversation presenter implementations are consolidated into one shared runtime utility; the old import paths remain valid.

## Tenant audit / release gate
Run `apps/server/scripts/audit-legacy-une-references.sql` as an authorised DB administrator before and after applying the migration. Compare legacy live/page/version references and the rows in the replacement audit table. Validate the Acetill till, appointment calendar, OneChatter inbox and UNE AceChatter published and draft layout variants; verify licence / uninstall behaviour and tenant-scoped RBAC. Back up SQL metadata before production deployment. No business records should change.

## Legacy source files retired
Removed 13 unregistered, unimported `One*` source folders: `OneAccordion`, `OneAvatar`, `OneBoard`, `OneDashboardEmbed`, `OneDivider`, `OneFileUpload`, `OneIcon`, `OneOverlay`, `OnePagination`, `OneRecordForm`, `OneSlider`, `OneTimeline`, `OneTree`. All active renderer dependencies are retained. CI and source-layout checks must pass after the removal.

## Not safe to remove yet
**Do not delete all `apps/web/src/one/une_*` legacy renderers or their manifest entries.** Unchanged published page versions, authored component libraries, dashboard/Flow references and old installed Acetill v2/v3 package data can still depend on exact `une_*` runtime keys. Removing code until **every** tenant's remaining reference count is zero would break customer pages. In-place rewriting immutable page versions to force zero references would violate the repository's data-recovery and publishing contract. Retire remaining compatibility files only following tenant verification and an owner-approved cutover/rollback window. SQL cannot be executed or tenant reference counts confirmed through the GitHub connector alone.
