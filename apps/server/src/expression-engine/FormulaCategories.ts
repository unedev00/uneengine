/** One Formula Engine with context-aware categories, not duplicate evaluators. */
import {ACTION_FORMULA_FUNCTIONS} from './FormulaActions.js';
import {DATA_FORMULA_FUNCTIONS} from './FormulaData.js';
import {UNIVERSAL_FORMULA_FUNCTIONS} from './FormulaUniversal.js';
export const actionFormulaFunctions=Object.freeze([...ACTION_FORMULA_FUNCTIONS]);
export const dataFormulaFunctions=Object.freeze([...DATA_FORMULA_FUNCTIONS]);
export const universalFormulaFunctions=UNIVERSAL_FORMULA_FUNCTIONS;
export type FormulaCategory='action'|'data'|'universal';
export function formulaCategory(name:string):FormulaCategory{
 const upper=name.toUpperCase();
 if(ACTION_FORMULA_FUNCTIONS.has(upper))return 'action';
 if(DATA_FORMULA_FUNCTIONS.has(upper))return 'data';
 return 'universal';
}
/** Data binding never performs side effects; action triggers can use all 3 groups. */
export function formulaAllowedInContext(name:string,context:'action'|'data'|'universal'):boolean{
 const type=formulaCategory(name);
 return context==='action'||type!=='action'&&(context==='data'||type==='universal');
}
