import {componentAppearance} from './componentAppearance.js';
import {evaluateFieldExpression} from './FieldExpression.js';
export function css(p) { return componentAppearance(p, 'display'); }
export const text = (v) =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
export function useOneDisplay(p) {
  const kind = p.kind || "Text",
    root = css(p);
  const valueKey=["textSource","text","value","label"].find(key=>p[key]!==undefined)??"label";
  const source=p[valueKey]??"";
  const record=p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
    Array.isArray(p.records)&&p.records.length?p.records[0]:{};
  const allowed=typeof p.fieldAllowed==="function"?p.fieldAllowed(valueKey,record):
    !p.dataFieldFilters||typeof p.dataFieldFilters!=="object"||
    !Object.prototype.hasOwnProperty.call(p.dataFieldFilters,valueKey);
  const textContent=allowed&&typeof source==="string"
    ?evaluateFieldExpression(source,record,{pageState:p.pageState,
      sessionId:p.sessionId,rootObjectApiName:p.objectApiName,
      collectionSources:p.formulaCollectionSources,namedCollections:p.namedCollections,
      readComponent:p.readComponent}):allowed?source:"";
  return { kind, root, textContent };
}
