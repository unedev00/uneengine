import {apiRequest,getAccessToken} from '../authentication/Client/authClient';
import {setTenantBrand,clearTenantBrand} from '../../component-libraries/shared/TenantBrand.js';

/** Loads the signed-in tenant's name and logo once per sign-in for $tenant.* formulas.
 * A new access token (another sign-in) reloads it; a failure leaves the values blank. */
let loadedFor:string|undefined;
let pending:Promise<void>|null=null;
export function ensureTenantBrand():Promise<void>{
  const token=getAccessToken()??'';
  if(loadedFor===token&&pending)return pending;
  loadedFor=token;
  pending=apiRequest<{name?:unknown;logo?:unknown}>('/tenant/brand')
    .then(brand=>{if(loadedFor===token)setTenantBrand(brand);})
    .catch(()=>{if(loadedFor===token)clearTenantBrand();});
  return pending;
}
