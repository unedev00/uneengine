import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFieldText,resolveRegisteredTextProperties,setAuthenticatedFormulaBindingContext
} from '../src/core/components/RegisteredComponent/fieldExpressionRuntime';
import {evaluateFieldExpression} from '../src/component-libraries/shared/FieldExpression.js';

test('registered components resolve authorised record fields without executing code',()=>{
  const record={Name:'Tea',Price:2.5,Currency:'£'};
  assert.equal(resolveFieldText('@Name',record),'Tea');
  assert.equal(resolveFieldText('@Currency & " " & @Price',record),'£ 2.5');
  assert.equal(resolveFieldText('@Currency  &  " "  &  @Name',record),'£ Tea');
  assert.equal(resolveFieldText('"Hello " & @Name',record),'Hello Tea');
  assert.equal(resolveFieldText('"Hello " & "Dear " & @Name',record),'Hello Dear Tea');
  assert.equal(resolveFieldText('@Price * 2',record),'5');
  assert.equal(resolveFieldText('TEXT(@Price * 2)',record),'5');
  assert.equal(resolveFieldText('IF(@Price > 2, "High", "Low")',record),'High');
  assert.equal(resolveFieldText('IF(TRUE, "ok", 1 / 0)',record),'ok');
  assert.equal(resolveFieldText('IF(FALSE, 1 / 0, "safe")',record),'safe');
  assert.equal(resolveFieldText('IF(@Price >= 2 AND NOT(FALSE), CASE("A","A","yes","no"), "no")',record),'yes');
  assert.equal(resolveFieldText('IFERROR(1 / 0, 7)',record),'7');
  assert.equal(resolveFieldText('CASE(1, 1, "match", 1 / 0)',record),'match');
  assert.equal(resolveFieldText('XOR(TRUE, FALSE)',record),'true');
  assert.equal(resolveFieldText('INCLUDES("Alpha;Beta", "Beta")',record),'true');
  assert.equal(resolveFieldText('INCLUDES("Alpha;Beta", "Al")',record),'false');
  assert.equal(resolveFieldText('FIND("x", "abc")',record),'0');
  assert.equal(resolveFieldText('RIGHT("abc", 0)',record),'');
  assert.equal(resolveFieldText('ROUND(-1.5)',record),'-2');
  assert.equal(resolveFieldText('ROUND(2.5)',record),'3');
  assert.equal(resolveFieldText('ROUNDUP(-1.21, 1)',record),'-1.3');
  assert.equal(resolveFieldText('ROUNDDOWN(-1.29, 1)',record),'-1.2');
  assert.equal(resolveFieldText('"Tea" = "tea"',record),'false');
  assert.equal(resolveFieldText('EXACT("Tea", "tea")',record),'false');
  assert.equal(resolveFieldText('SUBSTITUTE("abab", "a", "x", 2)',record),'abxb');
  assert.equal(resolveFieldText('LPAD("a", 4, "xy")',record),'xyxa');
  assert.equal(resolveFieldText('REPLACE("abcdef", 2, 3, "x")',record),'axef');
  assert.equal(resolveFieldText('DATE(1, 1, 1)',record),'0001-01-01');
  assert.throws(()=>resolveFieldText('DATE(2024, 2, 30)',record),/Invalid DATE value/);
  assert.throws(()=>resolveFieldText('1 / 0',record),/Division by zero/);
  assert.equal(resolveFieldText('ADDMONTHS("2024-01-31", 1)',record),'2024-02-29');
  assert.equal(resolveFieldText('TIMEVALUE("10:30:15")',record),'10:30:15.000');
  assert.equal(resolveFieldText('ISOYEAR("2021-01-01")',record),'2020');
  assert.equal(resolveFieldText('ISOWEEK("2021-01-01")',record),'53');
  const rows=[{Code:'a',Amount:2},{Code:'b',Amount:3}];
  assert.equal(resolveFieldText('COLLECTIONCOUNT(@Rows)',{Rows:rows}),'2');
  assert.equal(resolveFieldText('COLLECTIONSUM(@Rows, "Amount")',{Rows:rows}),'5');
  assert.equal(resolveFieldText('VLOOKUP("b", @Rows, "Code", "Amount")',{Rows:rows}),'3');
  assert.equal(resolveFieldText('DISTANCE(GEOLOCATION(0, 0), GEOLOCATION(0, 1), "km")',record),'111.1950802335329');
  assert.equal(resolveFieldText('contact@example.com',record),'contact@example.com');
  assert.equal(evaluateFieldExpression('AND(TRUE, NOT(FALSE))',record),'true');
  assert.equal(resolveFieldText('@Missing',record),'');
  assert.throws(()=>resolveFieldText('@Name.constructor',record),/Invalid formula token/);
  assert.throws(()=>resolveFieldText('@Name & alert(1)',record),/Unsupported formula function/);
  assert.equal(resolveFieldText('contact@example.com',record),'contact@example.com');
});

test('text-only metadata substitution leaves layouts and original properties unchanged',()=>{
  const input={record:{Name:'Tea'},text:'@Name',title:'@Name',width:'@Name',value:42};
  input.text='"Hello " & @Name';
  const definitions=[{propertyKey:'text',kind:'TEXT'},{propertyKey:'title',kind:'STRING'},{propertyKey:'width',kind:'NUMBER'}];
  const resolved=resolveRegisteredTextProperties(definitions,input);
  assert.equal(resolved.text,'Hello Tea');
  assert.equal(resolved.title,'Tea');
  assert.equal(resolved.width,'@Name');
  assert.equal(input.text,'"Hello " & @Name');
  assert.strictEqual(resolved.record,input.record);
  assert.strictEqual(resolveRegisteredTextProperties(definitions,{text:'"Hello " & @Name'}).text,'"Hello " & @Name');
});

test('registered bindings use authenticated global context and reject unsupported permissions or time zones',()=>{
  const definitions=[{propertyKey:'text',kind:'TEXT'}];
  const properties={record:{Name:'Tea',RecordTypeId:'record-type'},text:
    '@$User.Locale & " " & @$Profile.Name & " " & @$Organization.Name & " " & @Record.Name'};
  setAuthenticatedFormulaBindingContext({
    id:'user',displayName:'Tester',email:'test@example.invalid',timeZone:'Europe/London',
    locale:'en-GB',currencyIsoCode:'GBP',profileId:'profile',profileName:'Developer',
    profileApi:'Developer',tenantId:'tenant',tenantName:'Tenant'
  });
  assert.equal(resolveRegisteredTextProperties(definitions,properties).text,
    'en-GB Developer Tenant Tea');
  assert.equal(resolveRegisteredTextProperties(definitions,{
    record:{RecordTypeId:'record-type'},text:'@$RecordType.Id'
  }).text,'record-type');
  assert.throws(()=>resolveRegisteredTextProperties(definitions,{
    record:{},text:'@$Permission.CanApprove'
  }),/Custom permission snapshot is unavailable/);
  setAuthenticatedFormulaBindingContext(null);
  assert.throws(()=>resolveRegisteredTextProperties(definitions,{text:'TODAY()'}),
    /Authenticated formula time zone is unavailable/);
});

test('registered Formula Bar evaluates numeric collections with authorised records and session values',()=>{
 const defs=[{propertyKey:'text',kind:'TEXT'}];
 const sources={Sale:[{Id:'one',Amount:5},{Id:'two',Amount:7},{Id:'three',Amount:-4}]};
 const live=resolveRegisteredTextProperties(defs,{
  text:'=SUM(COLLECTION("Amounts", "Positive", @Sale.Amount, ">0"))',
  objectApiName:'Sale',formulaCollectionSources:sources
 });
 assert.equal(live.text,'12');
 const saved=resolveRegisteredTextProperties(defs,{
  text:'=IF(SUM(@Amounts) > 10, "High", "Low")',
  namedCollections:{Amounts:{name:'Amounts',items:[5,7]}}
 });
 assert.equal(saved.text,'High');
});


test('registered formula bindings aggregate only complete authorised row sets',()=>{
 const definitions=[{propertyKey:'subtotalValue',kind:'TEXT'}];
 const records=[{Id:'a',LineTotal:6},{Id:'b',LineTotal:10}];
 const input={subtotalValue:'=SUM(@LineTotal)',records,
  recordPagination:{offset:0,total:2}};
 const resolved=resolveRegisteredTextProperties(definitions,input);
 assert.equal(resolved.subtotalValue,'16');
 assert.equal(input.subtotalValue,'=SUM(@LineTotal)');
 const partial=resolveRegisteredTextProperties(definitions,{
  subtotalValue:'=SUM(@LineTotal)',record:records[0],records:records.slice(0,1),
  formulaCollectionSources:{},recordPagination:{offset:0,total:2}
 });
 assert.equal(partial.subtotalValue,'=SUM(@LineTotal)');
 const prefixed=resolveRegisteredTextProperties(definitions,{
  subtotalValue:'="£ " & SUM(@LineTotal)',records,
  recordPagination:{offset:0,total:2}
 });
 assert.equal(prefixed.subtotalValue,'£ 16');
 const prefixedPartial=resolveRegisteredTextProperties(definitions,{
  subtotalValue:'="£ " & SUM(@LineTotal)',record:records[0],
  records:records.slice(0,1),recordPagination:{offset:0,total:2}
 });
 assert.equal(prefixedPartial.subtotalValue,'="£ " & SUM(@LineTotal)');
 const empty=resolveRegisteredTextProperties(definitions,{
  subtotalValue:'="£ " & SUM(@LineTotal)',records:[],
  recordPagination:{offset:0,total:0}
 });
 assert.equal(empty.subtotalValue,'£ 0');
});


test('Page Builder text bindings use the login session, not a User Object row',()=>{
 const login={id:'session-user-id',displayName:'Current Cashier',
  email:'cashier@example.test',timeZone:'Europe/London',locale:'en-GB',
  tenantId:'session-tenant-id',tenantName:'UNE'};
 setAuthenticatedFormulaBindingContext(login);
 try{
  const props={text:'=$session.user.email & " / " & $session.user.id',
   subtitle:'=$session.tenant.id',sessionId:'page-session-id',
   record:{User:{Id:'unrelated-record-id'},Email:'unrelated@example.test'}};
  const result=resolveRegisteredTextProperties([
   {propertyKey:'text',kind:'TEXT'}, {propertyKey:'subtitle',kind:'TEXT'}
  ],props);
  assert.equal(result.text,'cashier@example.test / session-user-id');
  assert.equal(result.subtitle,'session-tenant-id');
  assert.equal(resolveFieldText('=$session.id',{}, {sessionId:'page-session-id'}),'page-session-id');
 }finally{
  setAuthenticatedFormulaBindingContext(null);
 }
 assert.throws(()=>resolveFieldText('=$session.user.id',{}),/Authenticated user is unavailable/);
});
