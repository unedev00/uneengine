/** Read-only functions whose results depend on record or collection metadata. */
export const DATA_FORMULA_FUNCTIONS: ReadonlySet<string> = new Set([
  'COLLECTION','TABLE','COLLECTIONCOUNT','COLLECTIONSUM','VLOOKUP',
  'IMAGE','CURRENCYRATE','ISCHANGED','ISNEW','ISCLONE','PRIORVALUE'
]);
/** Source references are bound by the host; no formula may acquire additional data permissions. */
export type FormulaDataScope = {
  readonly recordId?: string;
  readonly sourceObjectApiName?: string;
  readonly sessionId?: string;
};
