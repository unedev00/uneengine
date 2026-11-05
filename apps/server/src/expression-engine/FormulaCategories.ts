/**
 * Context-oriented formula taxonomy. No independent parser or evaluator is
 * created: all three categories use the existing FormulaTokenizer/Parser.
 */
export const actionFormulaFunctions=Object.freeze([
 'ACTIONS','FLOW','SCREEN','CREATERECORD','UPDATERECORD','DELETERECORD',
 'EMAIL','WHATSAPP','SMS','PRINT','CREATEPDF','WAIT','AS'
] as const);
export const dataFormulaFunctions=Object.freeze([
 'TABLE','COLLECTION','COLLECTIONCOUNT','COLLECTIONSUM','VLOOKUP'
] as const);
const actions=new Set<string>(actionFormulaFunctions);
const data=new Set<string>(dataFormulaFunctions);
export type FormulaCategory='action'|'data'|'universal';
export function formulaCategory(name:string):FormulaCategory {
 const upper=name.toUpperCase();
 return actions.has(upper)?'action':data.has(upper)?'data':'universal';
}
/** Actions are forbidden in component bindings, record formulas and filters. */
export function formulaAllowedInContext(name:string,context:'action'|'data'|'universal'):boolean {
 const category=formulaCategory(name);
 return context==='action'||category!=='action'&&(context==='data'||category==='universal');
}
