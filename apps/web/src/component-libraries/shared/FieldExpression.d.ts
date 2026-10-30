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
};
export function evaluateFieldExpression(expression:unknown,record:unknown,context?:FormulaBindingContext):unknown;
export function evaluateFieldExpressionDetailed(
 expression:unknown,record:unknown,context?:FormulaBindingContext
):{value:unknown;error?:string};
export class FieldExpressionEvaluationError extends Error {
 constructor(message:string);
}
