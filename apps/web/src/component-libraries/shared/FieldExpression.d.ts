export const componentReaderKey:unique symbol;
export type FormulaBindingContext={
  flowReferences?:readonly string[];
  readComponent?:(name:string,key:string)=>string|number|boolean;
  timeZone?:string;
  now?:Date|string;
  /** Already-authorised page-local scalar state values. */
  pageState?:Readonly<Record<string,unknown>>;
  /** Tenant brand for $tenant.name / $tenant.logo; defaults to the signed-in tenant. */
  tenant?:{readonly name:string;readonly logo:string};
  /** Active Page Runtime session identifier. */
  sessionId?:string;
  locale?:string;
  currencyIsoCode?:string|null;
  user?:Record<string,unknown>;
  profile?:Record<string,unknown>;
  organization?:Record<string,unknown>;
  recordType?:Record<string,unknown>;
  permissions?:Readonly<Record<string,boolean>>;
  collectionSources?:Readonly<Record<string,ReadonlyArray<Record<string,unknown>>>>;
  /** Bounded, permission-checked rows available for aggregate expressions such as SUM(@Price * @Quantity). */
  collectionRows?:ReadonlyArray<Record<string,unknown>>;
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
export function evaluateParsedExpression(
 expression:import('../../../../server/src/expression-engine/FormulaParser.js').Expression,
 record:Readonly<Record<string,unknown>>,context:FormulaBindingContext
):unknown;
