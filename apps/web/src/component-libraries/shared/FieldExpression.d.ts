export type FormulaBindingContext={
  timeZone?:string;
  now?:Date|string;
  locale?:string;
  currencyIsoCode?:string|null;
  user?:Record<string,unknown>;
  profile?:Record<string,unknown>;
  organization?:Record<string,unknown>;
  recordType?:Record<string,unknown>;
  permissions?:Readonly<Record<string,boolean>>;
  collectionSources?:Readonly<Record<string,ReadonlyArray<Record<string,unknown>>>>;
  collectionSourceFields?:Readonly<Record<string,ReadonlyArray<string>>>;
  namedCollections?:Readonly<Record<string,{name:string;items:unknown[]}>>;
  rootObjectApiName?:string;
  namedCollectionSelections?:Readonly<Record<string,Record<string,unknown>>>;
};
export function evaluateFieldExpression(expression:unknown,record:unknown,context?:FormulaBindingContext):unknown;
export function evaluateFieldExpressionDetailed(
 expression:unknown,record:unknown,context?:FormulaBindingContext
):{value:unknown;error?:string};
export class FieldExpressionEvaluationError extends Error {
 constructor(message:string);
}

export type FormulaNamedCollection={name:string;items:unknown[]};
export function evaluateCollectionFormula(
 formula:unknown,
 sources?:Readonly<Record<string,ReadonlyArray<Record<string,unknown>>>>,
 context?:Readonly<Record<string,unknown>>
):{value:FormulaNamedCollection|null;error?:string};
