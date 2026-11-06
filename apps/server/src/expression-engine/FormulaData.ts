/** Read-only data source/record-context functions. The existing
 * Record Engine and FormulaFunctionRegistry enforce permissions and validity. */
export const DATA_FORMULA_FUNCTIONS:ReadonlySet<string>=new Set([
 'TABLE','COLLECTION','COLLECTIONCOUNT','COLLECTIONSUM','VLOOKUP',
 'IMAGE','CURRENCYRATE','ISCHANGED','ISNEW','ISCLONE','PRIORVALUE'
]);
export type FormulaDataScope={
 readonly recordId?:string;
 readonly sourceObjectApiName?:string;
 readonly sessionId?:string;
};
