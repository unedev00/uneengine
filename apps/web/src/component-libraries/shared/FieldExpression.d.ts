export type FormulaBindingContext={timeZone?:string;now?:Date|string};
export function evaluateFieldExpression(expression:unknown,record:unknown,context?:FormulaBindingContext):unknown;
export function evaluateFieldExpressionDetailed(
 expression:unknown,record:unknown,context?:FormulaBindingContext
):{value:unknown;error?:string};
export class FieldExpressionEvaluationError extends Error {
 constructor(message:string);
}
