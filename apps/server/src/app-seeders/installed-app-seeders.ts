import type {PoolClient} from 'pg';

/** Shared AppExchange install hook. Each application owns its independent seeder.
 * This module is lazy-imported only during an actual tenant installation,
 * never during Core boot or by an uninstalled frontend.
 */
const installers:Readonly<Record<string,(client:PoolClient,tenantId:string)=>Promise<void>>>={
  Acetill:async(client,tenantId)=>{
    const {seedAcetillEditablePage}=await import('./acetill-editable-page.js');
    await seedAcetillEditablePage(client,tenantId);
    const {seedAcetillDefaultLocation}=await import('./core-location-srn.js');
    await seedAcetillDefaultLocation(client,tenantId);
    const {seedAcetillTillFields}=await import('./acetill-till-fields.js');
    await seedAcetillTillFields(client,tenantId);
    const {seedAcetillLockFlowForTenant}=await import('./acetill-lock-flow.js');
    await seedAcetillLockFlowForTenant(client,tenantId);
    const {seedAcetillCartFlows}=await import('./acetill-cart-flows.js');
    await seedAcetillCartFlows(client,tenantId);
    const {seedAcetillReturnLookup}=await import('./acetill-return-flows.js');
    await seedAcetillReturnLookup(client,tenantId);
    const {seedAcetillCreateSalesReturn}=await import('./acetill-return-flows.js');
    await seedAcetillCreateSalesReturn(client,tenantId);
    const {seedAcetillCashierPolicy}=await import('./acetill-cashier-policy.js');
    await seedAcetillCashierPolicy(client,tenantId);
    const {seedAcetillScanFlow}=await import('./acetill-scan-flow.js');
    await seedAcetillScanFlow(client,tenantId);
    const {requireAcetillPaymentAttestation}=await import('./acetill-payment-attestation.js');
    await requireAcetillPaymentAttestation(client,tenantId);
  },
  AceChatter:async(client,tenantId)=>{
    const {seedAceChatterFlowsForTenant}=await import('./acechatter-flow.js');
    await seedAceChatterFlowsForTenant(client,tenantId);
  },
  OneChatter:async(client,tenantId)=>{
    const {seedOneChatterInstalledPage}=await import('./onechatter-page.js');
    await seedOneChatterInstalledPage(client,tenantId);
  },
  UNEAceChatter:async(client,tenantId)=>{
    const {seedUneAceChatterInstalledPages}=await import('./une-acechatter-pages.js');
    await seedUneAceChatterInstalledPages(client,tenantId);
  }
};

/** Run within the installer's existing SQL transaction and licence checks. */
export async function seedInstalledAppMetadata(
 client:PoolClient,tenantId:string,appApiName:string
):Promise<void>{
 const seeder=installers[appApiName];
 if(seeder)await seeder(client,tenantId);
 // AppExchange has already checked the tenant's licence and installation.
 const {isConnectorApp,installConnectorApp}=await import('./connector-apps.js');
 if(isConnectorApp(appApiName))await installConnectorApp(client,tenantId,appApiName);
}
