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
