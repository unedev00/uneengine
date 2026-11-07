import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageStateChoices} from '../src/core/builders/PageBuilder/pageStateChoices';
import {formulaDollarSuggestions} from '../src/core/builders/PageBuilder/formulaDollarSuggestions';
import {splitSmartFormula} from '../src/core/builders/PageBuilder/SmartFormulaField';
import {evaluateFieldExpressionDetailed,evaluateCollectionFormula} from '../src/component-libraries/shared/FieldExpression.js';
import {resolveRegisteredTextProperties} from '../src/core/components/RegisteredComponent/fieldExpressionRuntime';
import {resolveActionFormulaValue} from '../src/core/pages/PageRuntime/formulaAction';

const files=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const components=[{
 id:'cart',properties:{
  actionFlows:{
   click:{actionType:'PageState',stateKey:'selectedProduct'},
   change:{actionType:'Formula',formula:'@state.cartTotal := $state.cartTotal + 1'},
   start:{actionType:'Flow',outputs:{approved:'flowStatus'}}
  },
  stateBindings:{textSource:'currentCategory'}
 }
},{
 id:'label',properties:{stateBindings:{textSource:'selectedProduct'}}
}];

test('$ autocomplete lists page-declared keys and nested authenticated session fields',()=>{
 const choices=pageStateChoices(components);
 const keys=choices.filter(entry=>entry.source==='PageState').map(entry=>entry.key);
 assert.deepEqual(keys,['cartTotal','currentCategory','flowStatus','selectedProduct']);
 const all=formulaDollarSuggestions(choices).map(entry=>entry.reference);
 assert.deepEqual(all,['$session.id','$session.cartId','$session.user.id','$session.user.email','$session.user.name','$session.user.locale','$session.user.timeZone','$session.user.currencyIsoCode','$session.tenant.id','$session.tenant.name','$session.tenant.logo','$state.cartTotal','$state.currentCategory','$state.flowStatus','$state.selectedProduct']);
 assert.deepEqual(formulaDollarSuggestions(choices,'state.').map(x=>x.reference),all.slice(11));
 assert.deepEqual(formulaDollarSuggestions(choices,'tenant').map(x=>x.reference),['$session.tenant.id','$session.tenant.name','$session.tenant.logo']);
 assert.deepEqual(formulaDollarSuggestions(choices,'sess').map(x=>x.reference),all.slice(0,11));
 assert.deepEqual(formulaDollarSuggestions(choices,'session.user.').map(x=>x.reference),all.slice(2,8));
 assert.deepEqual(formulaDollarSuggestions(choices,'state.selected').map(x=>x.reference),['$state.selectedProduct']);
 assert.deepEqual(formulaDollarSuggestions(choices,'unknown'),[]);
 assert.ok(!all.includes('$User.Email'),'only declared page state and session ID are available');
});

test('one shared formula parser resolves $state fields and $session, without leaking objects',()=>{
 const ctx={pageState:{total:7,selection:'Tea',privateRecord:{Name:'Not scalar'}},sessionId:'page-session-123'};
 assert.equal(evaluateFieldExpressionDetailed('$state.total',{},ctx).value,'7');
 assert.equal(evaluateFieldExpressionDetailed('=$state.total * 3',{},ctx).value,'21');
 assert.equal(evaluateFieldExpressionDetailed('=$state.selection & " / " & $session',{},ctx).value,'Tea / page-session-123');
 assert.equal(evaluateFieldExpressionDetailed('$session',{},ctx).value,'page-session-123');
 assert.equal(evaluateFieldExpressionDetailed('$state.missing',{},ctx).value,'');
 assert.equal(evaluateFieldExpressionDetailed('$session',{},{}).value,'');
 assert.match(evaluateFieldExpressionDetailed('$state.privateRecord',{},ctx).error??'',/finite scalar/);
 assert.match(evaluateFieldExpressionDetailed('$state.__proto__',{},ctx).error??'',/Invalid Page State reference/);
 assert.match(evaluateFieldExpressionDetailed('$session.anything',{},ctx).error??'',/Unsupported session reference/);
 assert.equal(evaluateFieldExpressionDetailed('@Name',{Name:'Coffee'},ctx).value,'Coffee');
 assert.equal(evaluateFieldExpressionDetailed('$session.id',{},ctx).value,'page-session-123');
});

test('global state references flow through component text bindings and Action formulas',()=>{
 const next=resolveRegisteredTextProperties([
  {propertyKey:'caption',kind:'TEXT'},{propertyKey:'description',kind:'TEXT'}
 ],{caption:'$state.item',description:'=$session',
    pageState:{item:'Latte'},sessionId:'page-19'});
 assert.equal(next.caption,'Latte');
 assert.equal(next.description,'page-19');
 assert.equal(resolveActionFormulaValue('$session',{}, {item:'Latte'},'page-19'),'page-19');
 assert.equal(resolveActionFormulaValue('=$state.item & "!"',{}, {item:'Latte'},'page-19'),'Latte!');
 const collection=evaluateCollectionFormula('COLLECTION("Example", $state.item)',{},{
  state:{item:'Latte'},session:{id:'page-19'}
 });
 assert.equal(collection.error,undefined);
 assert.equal(collection.value?.items[0],'Latte');
});

test('shared Formula Bar keeps @ fields and TABLE column suggestions separate from $ references',()=>{
 const editor=files('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 const ribbon=files('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const actions=files('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 const page=files('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx');
 assert.match(editor,/formulaDollarSuggestions\(stateOptions,matches\.query,flowReferences\)/);
 assert.match(editor,/prefix:'\$'/);
 assert.match(editor,/tableArg\?\[\]:dollarMentions/);
 assert.match(ribbon,/stateOptions=\{stateOptions\}/);
 assert.match(actions,/stateOptions=\{stateOptions\}/);
 assert.match(page,/stateOptions=\{pageStateChoices\(page\.components\)\}/);
 assert.deepEqual(splitSmartFormula('=@Name & $state.item & $session')
  .filter(part=>part.kind==='field').map(part=>part.value),
  ['@Name','$state.item','$session']);
 assert.deepEqual(splitSmartFormula('=$session.user.email & $session.tenant.name')
  .filter(part=>part.kind==='field').map(part=>part.value),
  ['$session.user.email','$session.tenant.name']);
});


test('tenant brand loader retries failed requests and refreshes formulas when company settings are saved',()=>{
  const loader=files('../src/core/branding/tenantBrandLoader.ts');
  const settings=files('../src/core/settings/SettingsWorkspace/settingsWorkspaceViews.tsx');
  const brand=files('../src/component-libraries/shared/TenantBrand.js');
  const runtime=files('../src/component-libraries/smart/shared/SmartRuntime.jsx');
  assert.match(loader,/export const ensureTenantBrand=.*loadTenantBrand\(false\)/);
  assert.match(loader,/export const refreshTenantBrand=.*loadTenantBrand\(true\)/);
  assert.match(loader,/if\(!force&&loaded\)return Promise\.resolve\(\)/);
  assert.match(loader,/if\(!force&&pending\)return pending/);
  assert.match(loader,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
  assert.match(loader,/if\(attempt===2\)\{\s*loaded=false/);
  assert.match(loader,/requestGeneration===generation&&loadedFor===token/);
  assert.match(settings,/import \{refreshTenantBrand\} from '\.\.\/\.\.\/branding\/tenantBrandLoader'/);
  assert.match(settings,/await apiRequest<\{profile:CompanyProfile\}>\('\/tenant\/company-profile',\{method:'PUT'/);
  assert.match(settings,/setCompany\(saved\.profile\)[\s\S]*?void refreshTenantBrand\(\)/);
  assert.match(brand,/for\(const listener of \[\.\.\.state\.listeners\]\)listener\(\)/);
  assert.match(runtime,/React\.useSyncExternalStore\(subscribeTenantBrand,getTenantBrand,getTenantBrand\)/);
});


test('session hierarchy reads only authenticated scalar identity, never record fields',()=>{
 const identity={sessionId:'page-123',
  user:{Id:'user-42',Email:'signed-in@example.test',Name:'Cashier',Locale:'en-GB',TimeZone:'Europe/London'},
  organization:{Id:'tenant-42',Name:'UNE Tenant'},
  tenant:{name:'Trading Company',logo:'https://example.test/logo.png'}};
 const fakeRecord={session:{user:{id:'forged-user',email:'forged@example.test'}},User:{Id:'record-user'}};
 for(const [source,expected] of [
  ['$session.id','page-123'],['$session.cartId',''],['$session.user.id','user-42'],
  ['$session.user.email','signed-in@example.test'],['$session.user.name','Cashier'],
  ['$session.tenant.id','tenant-42'],['$session.tenant.name','Trading Company'],
  ['$session.tenant.logo','https://example.test/logo.png']
 ]){
  assert.equal(evaluateFieldExpressionDetailed(source,fakeRecord,identity).value,expected);
 }
 for(const name of ['$session.user.password','$session.tenant.secret',
  '$session.user.__proto__','$session.user.id.extra','$session.anything']){
  assert.match(evaluateFieldExpressionDetailed(name,fakeRecord,identity).error??'',/Unsupported session reference/);
 }
 assert.match(evaluateFieldExpressionDetailed('$session.user.email',fakeRecord,{sessionId:'page-123'}).error??'',/Authenticated user is unavailable/);
});
