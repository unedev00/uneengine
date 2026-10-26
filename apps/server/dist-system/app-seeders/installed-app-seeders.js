/** Shared AppExchange install hook. Each application owns its independent seeder.
 * This module is lazy-imported only during an actual tenant installation,
 * never during Core boot or by an uninstalled frontend.
 */
const installers = {
    Acetill: async (client, tenantId) => {
        const { seedAcetillEditablePage } = await import('./acetill-editable-page.js');
        await seedAcetillEditablePage(client, tenantId);
        const { seedAcetillDefaultLocation } = await import('./core-location-srn.js');
        await seedAcetillDefaultLocation(client, tenantId);
        const { seedAcetillTillFields } = await import('./acetill-till-fields.js');
        await seedAcetillTillFields(client, tenantId);
    },
    AceChatter: async (client, tenantId) => {
        const { seedAceChatterFlowsForTenant } = await import('./acechatter-flow.js');
        await seedAceChatterFlowsForTenant(client, tenantId);
    }
};
/** Run within the installer's existing SQL transaction and licence checks. */
export async function seedInstalledAppMetadata(client, tenantId, appApiName) {
    const seeder = installers[appApiName];
    if (seeder)
        await seeder(client, tenantId);
    // AppExchange has already checked the tenant's licence and installation.
    const { isConnectorApp, installConnectorApp } = await import('./connector-apps.js');
    if (isConnectorApp(appApiName))
        await installConnectorApp(client, tenantId, appApiName);
}
