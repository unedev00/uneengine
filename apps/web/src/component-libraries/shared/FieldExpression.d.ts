export function evaluateFieldExpression(expression:unknown,record:unknown):unknown;
export function evaluateFieldExpressionDetailed(expression:unknown,record:unknown):{value:unknown;error?:string};
export class FieldExpressionEvaluationError extends Error {
 constructor(message:string);
}
