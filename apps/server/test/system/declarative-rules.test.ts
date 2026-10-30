import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DeclarativeRules,DeclarativeRuleError} from '../../src/system-files/declarative-rules.js';
import {evaluateFlowFormula} from '../../src/system-files/flow-formula-runtime.js';

function fixture(config:{
  defaults?:{field_api:string;expression:string}[];
  rules?:{api_name:string;expression:string;error_message:string;error_field_api:string|null}[];
  deniedFields?:string[];
  customPermissions?:Record<string,boolean>;
}={}) {
  const checks:string[]=[];
  const client={
    query:async(sql:string)=>{
      if(sql.includes('FROM md_field_default_formulas'))return {rows:config.defaults??[]};
      if(sql.includes('FROM md_validation_rules'))return {rows:config.rules??[]};
      if(sql.includes('FROM md_users u'))return {rows:[{id:'u',email:'test@example.invalid',
        display_name:'Tester',time_zone:'UTC',locale:'en-GB',currency_iso_code:'GBP',
        profile_id:'p',profile_name:'Developer',profile_api:'Developer'}]};
      if(sql.includes('FROM md_tenants'))return {rows:[{id:'t',name:'Tenant'}]};
      if(sql.includes('FROM md_object_record_types'))return {rows:[{
        record_type_id:'rt',label:'Business Account',developer_name:'BusinessAccount'
      }]};
      throw Error('Unexpected SQL in test: '+sql);
    }
  };
  const rbac={
    require:async(_tenant:string,_user:string,resource:string,action:string)=>{
      checks.push(resource+':'+action);
      if(config.deniedFields?.includes(resource))throw Error('Permission denied');
    },
    allowed:async(_tenant:string,_user:string,resource:string,action:string)=>{
      checks.push(resource+':'+action);
      if(resource.startsWith('CustomPermission:'))
        return config.customPermissions?.[resource.slice('CustomPermission:'.length)]===true;
      return false;
    }
  };
  return {rules:new DeclarativeRules(rbac as never),client:client as never,checks};
}

test('validation rules run on create and block only when a boolean formula is true',async()=>{
  const ctx=fixture({rules:[{api_name:'RequireName',expression:'ISBLANK($Record.Name)',
    error_message:'Name is required',error_field_api:'Name'}]});
  await assert.rejects(()=>ctx.rules.validate(ctx.client,'t','u','Invoice',
    {Name:''},null),(err:unknown)=>err instanceof DeclarativeRuleError
      &&err.ruleApi==='RequireName'&&err.fieldApi==='Name'
      &&err.message==='Name is required');
  await ctx.rules.validate(ctx.client,'t','u','Invoice',{Name:'Valid'},null);
  assert.ok(ctx.checks.includes('Invoice.Name:read'));
});

test('change conditions resolve old values and actor globals',async()=>{
  const ctx=fixture({rules:[{api_name:'PreventBackwards',expression:
    'AND(ISCHANGED($Record.Total), $Record.Total < PRIORVALUE($Record.Total))',
    error_message:'Total cannot decrease',error_field_api:'Total'}]});
  await assert.rejects(()=>ctx.rules.validate(ctx.client,'t','u','Invoice',
    {Total:5},{Total:10}),DeclarativeRuleError);
  await ctx.rules.validate(ctx.client,'t','u','Invoice',{Total:12},{Total:10});
});

test('record lifecycle functions distinguish create, clone, changed, unchanged, and cleared values',async()=>{
  const create=fixture({rules:[{api_name:'CloneRequired',expression:
    'AND(ISNEW(),ISCLONE(),ISBLANK($Record.Name),ISBLANK(PRIORVALUE($Record.Name)))',
    error_message:'Blocked',error_field_api:null}]});
  await assert.rejects(()=>create.rules.validate(create.client,'t','u','Invoice',{},null,
    {stage:'clone',isClone:true}),DeclarativeRuleError);

  const ctx=fixture();
  for(const [current,prior,expected] of [
    [{Name:'Updated'},{Name:'Before'},true],
    [{Name:'Same'},{Name:'Same'},false],
    [{Name:null},{Name:'Was set'},true]
  ] as const){
    const evaluation=await ctx.rules.context(ctx.client,'t','u','Invoice',current,prior,
      'ISCHANGED($Record.Name)',{stage:'update'});
    assert.equal(evaluateFlowFormula('ISCHANGED($Record.Name)',evaluation.resolve,
      evaluation.evaluation,'validation_rule'),expected);
    assert.equal(Object.isFrozen(evaluation.evaluation),true);
    assert.equal(Object.isFrozen(evaluation.evaluation.currentRecord),true);
  }
});

test('validation formula globals use authenticated actor and explicit permission snapshots',async()=>{
  const ctx=fixture({customPermissions:{CanApprove:true}});
  const expression='AND($User.Locale = "en-GB",$User.CurrencyIsoCode = "GBP",'+
    '$Profile.Name = "Developer",$Organization.Name = "Tenant",'+
    '$RecordType.DeveloperName = "BusinessAccount",$Permission.CanApprove)';
  const evaluation=await ctx.rules.context(ctx.client,'t','u','Invoice',
    {RecordTypeId:'rt'},null,expression,{stage:'create',recordTypeId:'rt'});
  assert.equal(evaluateFlowFormula(expression,evaluation.resolve,evaluation.evaluation,
    'validation_rule'),true);
  assert.ok(ctx.checks.includes('CustomPermission:CanApprove:read'));
  assert.ok(ctx.checks.includes('RecordType:Invoice.rt:read'));
});

test('validation current and prior field reads are guarded before formula evaluation',async()=>{
  const ctx=fixture({deniedFields:['Invoice.Secret']});
  await assert.rejects(()=>ctx.rules.context(ctx.client,'t','u','Invoice',
    {Secret:'confidential'},{Secret:'previous secret'},
    'ISCHANGED($Record.Secret)',{stage:'update'}),(error:unknown)=>
      error instanceof Error&&error.message==='Permission denied'
        &&!error.message.includes('confidential')&&!error.message.includes('previous secret'));
});

test('formula defaults resolve dependencies and retain explicit values',async()=>{
  const ctx=fixture({defaults:[
    {field_api:'Net',expression:'$Record.Subtotal + 2'},
    {field_api:'Subtotal',expression:'4'}
  ]});
  const result=await ctx.rules.defaults(ctx.client,'t','u','Invoice',{});
  assert.deepEqual(result,{Subtotal:4,Net:6});
  const provided=await ctx.rules.defaults(ctx.client,'t','u','Invoice',{Subtotal:9});
  assert.deepEqual(provided,{Subtotal:9,Net:11});
});

test('clone state is available to formula defaults from an immutable lifecycle snapshot',async()=>{
  const ctx=fixture({defaults:[{field_api:'WasCloned',expression:'ISCLONE()'}]});
  const result=await ctx.rules.defaults(ctx.client,'t','u','Invoice',{}, {},
    {stage:'clone',isClone:true});
  assert.deepEqual(result,{WasCloned:true});
});

test('formula defaults detect cycles rather than writing arbitrary values',async()=>{
  const ctx=fixture({defaults:[
    {field_api:'First',expression:'$Record.Second + 1'},
    {field_api:'Second',expression:'$Record.First + 1'}
  ]});
  await assert.rejects(()=>ctx.rules.defaults(ctx.client,'t','u','Invoice',{}),
    /Cyclic formula default/);
});

test('validation rejects non-boolean formulas and unsupported globals',async()=>{
  const wrong=fixture({rules:[{api_name:'Invalid',expression:'2+2',
    error_message:'Invalid',error_field_api:null}]});
  await assert.rejects(()=>wrong.rules.validate(wrong.client,'t','u','Invoice',{},null),
    /must return Checkbox/);
  const unsupported=fixture({rules:[{api_name:'Invalid',expression:'$System.Secret = 1',
    error_message:'Invalid',error_field_api:null}]});
  await assert.rejects(()=>unsupported.rules.validate(unsupported.client,'t','u','Invoice',{},null),
    /Unsupported rule global/);
});
