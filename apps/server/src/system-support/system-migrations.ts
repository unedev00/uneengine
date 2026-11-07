import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import type {SqlPersistence} from '../system-files/sql-persistence.js';

// Legacy, immutable migration ledger identifiers retained solely for safe adoption of
// existing early-development databases. No historical SQL files are required at runtime.
export const retiredMigrationVersions = Object.freeze(`001-metadata-bindings.sql
20261018-address-compound.sql
20261018-named-credentials.sql
20261018-record-history.sql
20261018-system-definitions.sql
20261018-tenant-domains-usage.sql
20261018-tenant-lifecycle.sql
20261018-tenant-settings.sql
20261018-zz-flow-run-cancellation.sql
20261018-zzz-app-route-aliases.sql
20261018-zzzz-notifications.sql
20261018-zzzz-object-page-layouts.sql
20261018-zzzzz-approval-requests.sql
20261018-zzzzzz-oneengine-identity.sql
20261018-zzzzzz-record-ownership.sql
20261018-zzzzzzz-record-collaboration.sql
20261018-zzzzzzzz-password-recovery-settings.sql
20261018-zzzzzzzzz-security-events.sql
20261018-zzzzzzzzzz-field-types.sql
20261018-zzzzzzzzzzz-builder-contracts.sql
20261018-zzzzzzzzzzzz-record-field-list-fixes.sql
20261019-flow-interviews.sql
20261019-formula-clone-context.sql
20261019-global-value-sets.sql
20261019-prepare-field-recycle-column.sql
20261019-record-type-integrity.sql
20261019-rich-text-inline-images.sql
20261019-rollup-summaries.sql
20261020-app-package-lifecycle.sql
20261020-b-app-package-templates.sql
20261020-c-app-package-page-properties.sql
20261020-declarative-rules.sql
20261020-named-credential-key-version.sql
20261020-p1-matching-rules.sql
20261020-rbac-administration.sql
20261020-z-declarative-rule-history.sql
20261021-app-package-home-pages.sql
20261021-component-library-versioning.sql
20261021-durable-jobs.sql
20261021-field-dependencies.sql
20261021-field-recycle-bin.sql
20261021-multipicklist-storage.sql
20261021-relationship-options.sql
20261021-typed-record-values.sql
20261021-user-landing-app.sql
20261021-validate-record-type-fk.sql
20261022-acetill-visual-drafts.sql
20261022-dashboard-snapshots.sql
20261022-dashboard-subscriptions.sql
20261022-flow-http-callout-jobs.sql
20261022-flow-interview-loops.sql
20261022-flow-interview-records.sql
20261022-flow-trigger-record-resources.sql
20261022-password-reset-tokens.sql
20261022-till-pin.sql
20261023-custom-metadata-foundation.sql
20261023-mfa-identity.sql
20261023-object-manager-metadata.sql
20261023-tenant-developer-activation.sql
20261023-tenant-recovery.sql
20261024-field-formulas.sql
20261024-field-global-value-sets.sql
20261024-integration-connection-tests.sql
20261024-mail-tenant-domains.sql
20261024-user-reporting-hierarchy.sql
20261025-durable-flow-waits.sql
20261025-object-metadata-history.sql
20261026-metadata-api-name-casefold-uniqueness.sql
20261026-oauth-authorization-code.sql
20261027-durable-job-history.sql
20261027-encrypted-field-audit.sql
20261027-http-callout-receipts.sql
20261028-custom-setting-required.sql
20261029-mail-admin-sessions.sql
20261029-rollup-filter-criteria.sql
20261030-field-type-migrations.sql
20261030-flow-service-user-setting.sql
20261031-field-type-migration-projections.sql
20261031-flow-trigger-subscriptions.sql
20261101-platform-event-delivery.sql
20261101-universal-business-context.sql
20261102-platform-event-fields.sql
20261103-flow-email-outbox.sql
20261104-email-alert-details.sql
20261105-flow-scheduled-paths.sql
20261105-record-recycle-bin.sql
20261105-scheduled-actions.sql
20261105-setup-menu-permissions.sql
20261106-object-quick-actions.sql
20261106-record-retention.sql
20261107-flow-active-version.sql
20261107-universal-object-actions.sql
20261108-email-quick-actions.sql
20261108-flow-execution-context.sql
20261109-global-quick-actions.sql
20261110-quick-action-email-queue.sql
20261111-enhanced-related-lists.sql
20261111-universal-component-quick-actions.sql
20261112-conditional-custom-links.sql
20261112-flow-capability-registry.sql
20261113-flow-builder-phase1-unlock.sql
20261114-flow-interview-record-bounds.sql
20261114-flow-phase3-before-save.sql
20261114-tenant-media-assets.sql
20261115-flow-execution-idempotency.sql
20261115-flow-provider-outbox.sql
20261115-list-views-record-search.sql
20261116-business-calendar-usage.sql
20261116-flow-orchestration.sql
20261116-mobile-list-view-roles.sql
20261116-relational-flow-execution-results.sql
20261117-metadata-packages.sql
20261117-platform-event-streaming.sql
20261118-autolaunched-custom-errors.sql
20261118-outbound-webhooks.sql
20261119-openapi-external-services.sql
20261120-metadata-package-component-types.sql
20261121-login-password-policy.sql
20261121-offline-briefcase.sql
20261122-identity-session-controls.sql
20261123-security-governance.sql
20261124-connected-apps.sql
20261125-setup-audit-coverage.sql
20261126-inbound-webhook-endpoints.sql
20261126-mcp-connection.sql
20261126-metadata-loader-hard-delete-permissions.sql
20261127-credential-webhooks.sql
20261127-flow-parse-json.sql
20261127-platform-deployment-owner-bootstrap.sql
20261128-approved-oci-platform-owner.sql
20261128-connector-app-metadata.sql
20261128-universal-context-flows.sql
20261128-webhook-verify-token-vault.sql
20261129-oneengine-oci-deployment.sql
20261129-required-connector-fields.sql
20261130-connector-app-classification.sql
20261130-integration-api-logs.sql
20261130-z-communication-delivery-outbox.sql
20261201-communication-logger-identity.sql
20261201-federation-named-credentials.sql
20261202-communication-system-append-only.sql
20261203-available-slots-element.sql
20261203-communication-activity-body-normalization.sql
20261204-communication-subject-normalization.sql
20261205-communication-provider-status-projection.sql
20261205-mail-inbox-ingestion-cursor.sql
20261206-communication-whatsapp-identifiers-and-list.sql
20261207-whatsapp-pending-status.sql
20261215-page-layout-versions.sql
20261216-object-owned-record-pages.sql
20261216-page-custom-form-factors.sql
20261216-page-layout-custom-targets.sql
20261217-app-seed-page-versions.sql
20261217-four-page-device-assignments.sql
20261220-object-manager-layout-controls.sql
20261220-password-recovery-otp-channels.sql
20261221-field-history-selection.sql
20261222-lookup-filter-metadata.sql
20261223-email-action-flow-routing.sql
20261224-inbound-webhook-api-name-uniqueness.sql
20261224-object-custom-tabs.sql
20261225-object-metadata-limits.sql
20261226-list-import-button.sql
20261231-user-reporting-scopes.sql
20270102-user-requested-communication-history-clear.sql
20270103-record-view-preferences.sql
20270104-normalized-matching.sql
20270104-unified-record-page-layouts.sql
20270105-fuzzy-matching.sql
20270106-object-business-processes.sql
20270107-component-property-contract.sql
20270107-protected-custom-settings.sql
20270108-tenant-file-assets.sql
20270109-object-label-translations.sql
20270110-cross-object-matching.sql
20270111-business-process-history.sql
20270112-unicode-matching.sql
20270113-field-exact-index-lifecycle.sql
20270114-object-action-placement.sql
20270115-une-only-component-registrations.sql
20270116-source-object-property-labels.sql
20270117-unify-text-input-components.sql
20270118-object-schema-lifecycle.sql
20270118-retire-une-badge.sql
20270119-field-external-id-lookups.sql
20270119-retire-card-grid-properties.sql
20270120-relationship-target-integrity.sql
20270120-remove-une-sql-property-inventory.sql
20270121-enable-new-une-builder-components.sql
20270122-global-shared-builder-ribbon.sql
20270123-retire-shared-une-ribbon.sql
20270123-ribbon-home-reset-acetill-cart.sql
20270124-retire-legacy-une-app-tenants.sql
20270124-smart-component-library.sql
20270125-retire-uninstalled-app-package-versions.sql
20270125-smart-ribbon-property-corrections.sql
20270126-legacy-ui-component-cutover.sql
20270126-une-ribbon-requirements.sql
20270127-master-detail-sharing.sql
20270127-smart-ribbon-compact-property-placement.sql
20270128-relationship-inverse-name-integrity.sql
20270128-smart-renderer-property-alignment.sql
20270129-master-detail-owner-inheritance.sql
20270129-smart-ribbon-short-section-labels.sql
20270130-smart-cart-ribbon.sql
20270130-smart-icon-library.sql
20270131-smart-calendar-shadow-control.sql
20270201-smart-cart-summary2-ribbon.sql
20270202-canvas-fill-color.sql
20270202-smart-toggle-boolean-binding.sql
20270203-page-layout-ribbon-consolidation.sql
20270204-two-row-design-ribbon-geometry.sql
20270205-three-row-design-shapes.sql
20270206-three-row-ribbon-spacing.sql
20270207-page-builder-ribbon-sources-layout.sql
20270207-smart-cart-column-bindings.sql
20270208-page-builder-layout-ribbon-density.sql
20270209-page-layout-version-archive.sql
20270209-relationship-target-row-lock.sql
20270210-smart-cart-summary-bindings.sql
20270210-tenant-api-casefold.sql
20270211-eight-tab-ribbon-geometry.sql
20270211-mcp-page-metadata-consent.sql
20270211-page-device-inheritance.sql
20270212-grouped-oauth-scope-catalogue.sql
20270212-image-container-background-fill.sql
20270213-compact-page-builder-ribbon-placements.sql
20270213-global-smart-shapes.sql
20270214-automatic-active-record-scope.sql
20270214-smart-cart-data-ribbon-summary-labels.sql
20270215-design-shape-fill-ribbon.sql
20270215-smart-ribbon-data-design-geometry.sql
20270216-data-selected-field-formula-ribbon.sql
20270217-data-ribbon-compact-widths.sql
20270218-data-ribbon-cart-geometry.sql
20270301-universal-page-context-source.sql
20270302-smart-tabs-optional-first-tab.sql
20270303-universal-named-collection-formula.sql
20270304-smart-tabs-custom-selected-value.sql
20270305-retire-smart-tabs-custom-first-tab.sql
20270306-smart-card-button-tabs-orientation.sql
20270306-smart-cart-header-body-color.sql
20270307-smart-cart-selected-row-image-caption.sql
20270308-smart-table-shared-ribbon.sql
20270309-design2-contextual-ribbon.sql
20270309-page-device-layout-page-properties.sql
20270309-smart-textbox-shared-ribbon.sql
20270310-page-creation-layout.sql
20270310-smart-tabs-default-index.sql
20270311-smart-card-grid-selection-image-width.sql
20270312-smart-text-display-card-focused-design2.sql
20271101-in-screen-page-constraint.sql
20271102-in-screen-flow-capability.sql
20271103-kiosk-custom-portrait-layout.sql
20271104-kiosk-smart-global-ribbon.sql
20271104-zz-design2-exact-approved-matrix.sql
20271104-zzz-design2-row-zero-button-matrix-corrections.sql
20271105-data-loader-ribbon-overrides.sql
20271106-design2-functional-control-parity.sql
20271106-design2-row0-xy-position.sql
20271107-design2-alignment-icon-bindings.sql
20271108-design2-four-control-parity.sql
20271109-badge-visibility-layout.sql
20271110-data-ribbon-formula-row-equal-widths.sql
20271111-data-ribbon-approved-compact-three-rows.sql
20271111-design2-design-tab-parity.sql
20271112-design2-image-placement-gap.sql
20271112-restore-compact-data-ribbon.sql
20271112-smart-label-component.sql
20271113-canvas-formula-binding-icons.sql
20271113-kiosk-text-button-ribbon-extensions.sql
20271114-items-source-display-label.sql
20271114-page-builder-retire-layout-ribbon.sql
20271115-smart-image-placement-axis-dimensions.sql
20271116-page-builder-inspector-consolidation.sql
20271117-page-builder-focused-extras-padding.sql
20271118-smart-numpad.sql
20271119-smart-formula-display-runtime.sql
20271201-print-template-page-type.sql`.split('\n'));
const retired = new Set<string>(retiredMigrationVersions);
const baselines = new Set(['0001-initial-schema.sql','0002-current-platform.sql']);
const folder = new URL('./migrations/',import.meta.url);
const checksumFor = (name:string) =>
 createHash('sha256').update(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8')).digest('hex');

/** Apply fresh baseline or adopt a fully migrated pre-squash database, then future migrations. */
export async function applySystemMigrations(db:SqlPersistence) {
 const files=readdirSync(fileURLToPath(folder))
  .filter(name=>/^(?:\d{3,4}|\d{8})-[a-z0-9-]+\.sql$/.test(name)).sort();
 for(let attempt=0;attempt<4;attempt++){
  try {
   await db.transaction(async client=>{
    let appliedNewMigration=false;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:system:migrations']);
    // Unlike deployments of the old chain, a completely empty database can bootstrap
    // from the checked-in core schema before the two baselines are run.
    const core=await client.query<{present:string|null}>(
     "SELECT to_regclass('md_tenants')::text AS present");
    if(!core.rows[0]?.present)
     await client.query(readFileSync(new URL('../system-files/schema.sql',import.meta.url),'utf8'));
    await client.query(`CREATE TABLE IF NOT EXISTS md_system_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const historical=await client.query<{version:string}>('SELECT version FROM md_system_migrations');
    const recorded=new Set(historical.rows.map(row=>row.version));
    const oldRecorded=[...recorded].filter(version=>retired.has(version));
    if(oldRecorded.length){
     const missing=retiredMigrationVersions.filter(version=>!recorded.has(version));
     if(missing.length)throw new Error(
      'Partial legacy SQL migration history ('+missing.length+' versions missing). '+
      'Do not replay the squashed baselines on a partially migrated database; '+
      'restore the old chain or rebuild a disposable test database.');
     // The complete previous chain has already run. Register its exact new checksums
     // without replaying historical DDL/DML against existing tenant data.
     for(const name of files.filter(name=>baselines.has(name))){
      await client.query(
       'INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2) ON CONFLICT(version) DO NOTHING',
       [name,checksumFor(name)]);
     }
     // The complete legacy ledger is replaced atomically by the two new baseline
     // entries. Do not remove even a partially applied chain: the guard above fails.
     await client.query('DELETE FROM md_system_migrations WHERE version = ANY($1::text[])',
      [retiredMigrationVersions]);
    }
    for(const name of files){
     const source=readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8');
     const checksum=createHash('sha256').update(source).digest('hex');
     const existing=await client.query<{checksum:string}>(
      'SELECT checksum FROM md_system_migrations WHERE version=$1',[name]);
     if(existing.rows[0]) {
      if(existing.rows[0].checksum!==checksum)
       throw new Error('SQL system migration changed after application: '+name);
      continue;
     }
     await client.query(source);
     appliedNewMigration=true;
     await client.query('INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2)',[name,checksum]);
    }
    if(appliedNewMigration)await client.query('SELECT md_install_setup_audit()');
   });
   return;
  } catch(error) {
   if((error as {code?:string})?.code!=='40P01'||attempt===3)throw error;
   await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
  }
 }
}
