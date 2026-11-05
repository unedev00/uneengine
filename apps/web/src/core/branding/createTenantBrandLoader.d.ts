export type TenantBrandResponse={name?:unknown;logo?:unknown};
export function createTenantBrandLoader(args:{
  getToken:()=>string|undefined;
  request:()=>Promise<TenantBrandResponse>;
  setBrand:(brand:TenantBrandResponse)=>void;
  clearBrand:()=>void;
  retryDelayMs?:number;
}):{ensure:()=>Promise<void>;refresh:()=>Promise<void>};
