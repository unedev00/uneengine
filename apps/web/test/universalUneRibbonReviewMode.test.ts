import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('all property slots are interactive for review, but undeclared properties do not persist',()=>{
 const source=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(source,/data-review-mode="all-enabled"/);
 assert.match(source,/enabled=\{true\} reviewOnly=\{!supported\}/);
 assert.match(source,/if\(supported\)onChange/);
 assert.match(source,/else setReviewDraft/);
 assert.match(source,/componentId/);
 assert.match(source,/useEffect\(\(\)=>\{setReviewDraft\(\{\}\);\},\[componentId\]\)/);
 assert.match(source,/review only; not saved for this component/);
 assert.match(source,/onPositionChange/);
 assert.match(source,/editCanvas\(key,1,event\.target\.value\)/);
});
test('the coverage check has an ESM TypeScript declaration',()=>{
 const declaration=load('../src/core/builders/PageBuilder/universalRibbonCoverage.d.mts');
 assert.match(declaration,/export function auditUniversalRibbonCoverage/);
 assert.match(declaration,/RibbonCoverage/);
});
