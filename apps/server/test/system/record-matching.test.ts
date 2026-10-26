import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RecordMatching,DuplicateMatchError} from '../../src/system-files/record-matching.js';
import {filterReadableDuplicateEvidence} from '../../src/business-rule-engine/DuplicateEvidenceAccess.js';
import {supportsMatchingInput} from '../../../web/src/core/builders/ObjectManager/matchingFieldTypes.js';
const fixture=(action:'Alert'|'Block',visibleRows:{id:string}[]=[])=>{
 const sql:string[]=[];
 const client={query:async(query:string)=>{
  sql.push(query);
  if(query.includes('FROM md_matching_rules'))return {rows:[{api_name:'EmailMatch',match_mode:'All',action}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{rule_api:'EmailMatch',field_api:'Email',case_sensitive:false}]};
  if(query.includes('FROM md_records r'))return {rows:visibleRows};
  return {rows:[]};
 }} as never;
 const rbac={require:async()=>undefined} as never;
 return {engine:new RecordMatching(rbac),client,sql};
};
test('matching evaluates same-tenant email field and blocks duplicate saves',async()=>{
 const f=fixture('Block',[{id:'00000000-0000-4000-8000-000000000003'}]);
 await assert.rejects(()=>f.engine.check(f.client,'tenant','user','Contact',{Email:'hi@example.com'}),
  (error:unknown)=>error instanceof DuplicateMatchError&&error.ruleApi==='EmailMatch');
 assert.ok(f.sql.some(s=>s.includes('lower(v.value_text)=lower(')));
});
test('alert rules return matches and insert tenant-scoped duplicate sets',async()=>{
 const id='00000000-0000-4000-8000-000000000003';
 const f=fixture('Alert',[{id}]);
 const matches=await f.engine.check(f.client,'tenant','user','Contact',{Email:'hi@example.com'});
 assert.deepEqual(matches,[{ruleApi:'EmailMatch',recordId:id}]);
 await f.engine.save(f.client,'tenant','Contact','00000000-0000-4000-8000-000000000004',matches);
 assert.ok(f.sql.some(s=>s.includes('INSERT INTO md_duplicate_record_sets')));
});
test('blank values do not create false duplicate matches',async()=>{
 const f=fixture('Block',[{id:'other'}]);
 assert.deepEqual(await f.engine.check(f.client,'tenant','user','Contact',{Email:' '}),[]);
 assert.ok(!f.sql.some(s=>s.includes('FROM md_records r')));
});


test('normalized matching ignores punctuation within tenant SQL without broad short matches',async()=>{
 const seen:Array<{sql:string;params:unknown[]}>= [];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  seen.push({sql,params});
  if(sql.includes('FROM md_matching_rules'))return {rows:[{api_name:'PhoneMatch',match_mode:'All',action:'Alert'}]};
  if(sql.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'PhoneMatch',field_api:'Phone',case_sensitive:false,match_type:'Normalized'}]};
  if(sql.includes('FROM md_records r'))return {rows:[{id:'00000000-0000-4000-8000-000000000009'}]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 const matches=await engine.check(client,'tenant','user','Contact',{Phone:'+44 (0) 20-5555'});
 assert.deepEqual(matches,[{ruleApi:'PhoneMatch',recordId:'00000000-0000-4000-8000-000000000009'}]);
 const lookup=seen.find(x=>x.sql.includes('FROM md_records r'));
 assert.ok(lookup);assert.match(lookup.sql,/regexp_replace\(lower\(normalize\(v.value_text, NFC\)\)/);
 assert.deepEqual(lookup.params.slice(0,3),['tenant','Contact',null]);
 assert.ok(lookup.params.includes('440205555'));
 seen.length=0;
 assert.deepEqual(await engine.check(client,'tenant','user','Contact',{Phone:' - 0 - '}),[]);
 assert.ok(!seen.some(x=>x.sql.includes('FROM md_records r')));
});

test('fuzzy matches use bounded tenant-scoped SQL without leaking candidate records',async()=>{
 const seen:Array<{sql:string;params:unknown[]}>= [];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  seen.push({sql,params});
  if(sql.includes('FROM md_matching_rules'))return {rows:[{api_name:'NameNear',match_mode:'All',action:'Block'}]};
  if(sql.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'NameNear',field_api:'Name',case_sensitive:false,match_type:'Fuzzy',max_distance:2}]};
  if(sql.includes('FROM md_records r'))return {rows:[{id:'00000000-0000-4000-8000-000000000020'}]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 await assert.rejects(()=>engine.check(client,'tenant','user','Lead__c',{Name:'Acme Corporation'}),
  error=>error instanceof DuplicateMatchError&&error.ruleApi==='NameNear');
 const query=seen.find(item=>item.sql.includes('FROM md_records r'));
 assert.ok(query);
 assert.match(query.sql,/md_fuzzy_unicode_match\(v.value_text,\$5,2\)/);
 assert.match(query.sql,/r.tenant_id=\$1 AND r.object_api=\$2/);
 assert.deepEqual(query.params.slice(0,3),['tenant','Lead__c',null]);
 seen.length=0;
 assert.deepEqual(await engine.check(client,'tenant','user','Lead__c',{Name:'a--'}),[]);
 assert.equal(seen.some(item=>item.sql.includes('FROM md_records r')),false);
});

test('cross-object matching maps source field to target with target object and field RBAC',async()=>{
 const captured:Array<{sql:string;args:unknown[]}>=[],permissions:string[]=[];
 const matched='00000000-0000-4000-8000-000000000022';
 const client={query:async(sql:string,args:unknown[]=[])=>{
  captured.push({sql,args});
  if(sql.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'LeadToContact',match_mode:'All',action:'Alert',target_object_api:'Contact'}]};
  if(sql.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'LeadToContact',field_api:'LeadEmail',target_field_api:'Email',
   case_sensitive:false,match_type:'Exact',max_distance:1}]};
  if(sql.includes('FROM md_records r'))return {rows:[{id:matched}]};
  return {rows:[],rowCount:1};
 }} as never;
 const rbac={require:async(_t:string,_u:string,resource:string,action:string)=>{
  permissions.push(resource+':'+action);
 }} as never;
 const matching=new RecordMatching(rbac);
 const matches=await matching.check(client,'tenant','user','Lead',{LeadEmail:'a@example.com'});
 assert.deepEqual(matches,[{ruleApi:'LeadToContact',recordId:matched,matchedObjectApi:'Contact'}]);
 assert.deepEqual(permissions,['Contact:read','Lead.LeadEmail:read','Contact.Email:read']);
 const q=captured.find(item=>item.sql.includes('FROM md_records r'));
 assert.deepEqual(q?.args.slice(0,3),['tenant','Contact',null]);
 assert.ok(q?.args.includes('Email'));
 assert.match(q?.sql??'',/md_record_access\(\$1,\$6,r\.id,'read'\)/,
  'cross-object candidates require a parameterized actor record-access check');
 assert.deepEqual(q?.args.slice(-3),['Email','a@example.com','user']);
 await matching.save(client,'tenant','Lead','00000000-0000-4000-8000-000000000023',matches);
 assert.ok(captured.some(item=>item.sql.includes('INSERT INTO md_cross_object_duplicate_sets')));
 assert.equal(captured.some(item=>item.sql.includes('INSERT INTO md_duplicate_record_sets')),false);
});

test('cross-object matching fails closed when target field is unreadable',async()=>{
 const sql:string[]=[];
 const client={query:async(query:string)=>{
  sql.push(query);
  if(query.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'EmailCheck',match_mode:'All',action:'Block',target_object_api:'Contact'}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'EmailCheck',field_api:'Email',target_field_api:'Email',
   case_sensitive:false,match_type:'Exact',max_distance:1}]};
  return {rows:[]};
 }} as never;
 const rbac={require:async(_t:string,_u:string,resource:string)=>{
  if(resource==='Contact.Email')throw new Error('Permission denied');
 }} as never;
 await assert.rejects(()=>new RecordMatching(rbac).check(client,'tenant','user','Lead',{
  Email:'hi@example.com'
 }),/Permission denied/);
 assert.ok(!sql.some(q=>q.includes('FROM md_records r')));
});

test('cross-object matching migration preserves old records and tenant keys',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../../src/system-support/migrations/20270110-cross-object-matching.sql',import.meta.url),'utf8');
 assert.match(source,/ADD COLUMN IF NOT EXISTS target_object_api/);
 assert.match(source,/FOREIGN KEY\(tenant_id,matched_record_id,matched_object_api\)/);
 assert.match(source,/FOREIGN KEY\(tenant_id,record_id,object_api\)/);
});

test('no-code matching picker includes Text fields with their SQL length',()=>{
 for(const type of ['Text','Text(80)','Text(255)','Email','Phone','URL','Picklist'])
  assert.equal(supportsMatchingInput(type),true,type);
 for(const type of ['Long Text Area','Rich Text Area','Text (Encrypted)','Formula(Text)','Reference'])
  assert.equal(supportsMatchingInput(type),false,type);
});

test('same-object matching checks record visibility before matching or blocking',async()=>{
 const queries:Array<{sql:string;params:unknown[]}>=[];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  queries.push({sql,params});
  if(sql.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'Restricted',match_mode:'All',action:'Block'}]};
  if(sql.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'Restricted',field_api:'Email',case_sensitive:false,match_type:'Exact',max_distance:1}]};
  // Mock only rows that the record-access predicate could make visible.
  if(sql.includes('FROM md_records r'))return {rows:[]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 assert.deepEqual(await engine.check(client,'tenant','restricted-actor','Contact',
  {Email:'private@example.com'}),[]);
 const lookup=queries.find(item=>item.sql.includes('FROM md_records r'));
 assert.ok(lookup);
 assert.match(lookup.sql,/md_record_access\(\$1,\$6,r\.id,'read'\)/);
 assert.deepEqual(lookup.params.slice(-1),['restricted-actor']);
});

test('duplicate evidence hides cross-object records without target Object and Field grants',async()=>{
 const candidates=[
  {ruleApi:'CrossEmail',recordId:'visible',matchedObjectApi:'Contact'},
  {ruleApi:'CrossPhone',recordId:'hidden',matchedObjectApi:'Account'},
  {ruleApi:'Orphaned',recordId:'obsolete',matchedObjectApi:'Contact'}
 ];
 const fields=[
  {ruleApi:'CrossEmail',fieldApi:'LeadEmail',targetFieldApi:'Email'},
  {ruleApi:'CrossPhone',fieldApi:'LeadPhone',targetFieldApi:'Phone'}
 ];
 const permissions:string[]=[];
 const result=await filterReadableDuplicateEvidence(candidates,fields,'Lead',async(resource)=>{
  permissions.push(resource);
  if(resource==='Account.Phone')throw Error('Permission denied');
 });
 assert.deepEqual(result,[candidates[0]]);
 for(const resource of ['Contact','Lead.LeadEmail','Contact.Email','Account','Lead.LeadPhone','Account.Phone'])
  assert.ok(permissions.includes(resource),resource);
});

test('duplicate evidence denies same-object match when the matching source field is unreadable',async()=>{
 const candidates=[{ruleApi:'Sensitive',recordId:'x',matchedObjectApi:'Contact'}];
 const fields=[{ruleApi:'Sensitive',fieldApi:'Secret',targetFieldApi:null}];
 const visible=await filterReadableDuplicateEvidence(candidates,fields,'Contact',async resource=>{
  if(resource==='Contact.Secret')throw Error('Denied');
 });
 assert.deepEqual(visible,[]);
});

test('Unicode normalized matching retains non-Latin characters without empty collisions',async()=>{
 const seen:Array<{sql:string;params:unknown[]}>=[];
 const client={query:async(query:string,params:unknown[]=[])=>{
  seen.push({sql:query,params});
  if(query.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'InternationalName',match_mode:'All',action:'Alert'}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'InternationalName',field_api:'Name',case_sensitive:false,match_type:'Normalized'}]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 await engine.check(client,'tenant','user','Contact',{Name:'  АЛЕКСЕЙ — Иванов  '});
 const lookup=seen.find(item=>item.sql.includes('FROM md_records r'));
 assert.ok(lookup,'Unicode names must remain significant');
 assert.ok(lookup.params.includes('алексейиванов'));
 assert.match(lookup.sql,/\[:alnum:\]/);
 seen.length=0;
 assert.deepEqual(await engine.check(client,'tenant','user','Contact',{Name:'- — ！'}),[]);
 assert.ok(!seen.some(item=>item.sql.includes('FROM md_records r')));
});
test('Unicode fuzzy matching keeps script and enforces the minimum length',async()=>{
 const seen:Array<{sql:string;params:unknown[]}>=[];
 const client={query:async(query:string,params:unknown[]=[])=>{
  seen.push({sql:query,params});
  if(query.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'InternationalNear',match_mode:'All',action:'Alert'}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'InternationalNear',field_api:'Name',case_sensitive:false,
   match_type:'Fuzzy',max_distance:1}]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 await engine.check(client,'tenant','user','Contact',{Name:'Михаил'});
 assert.match(seen.find(item=>item.sql.includes('FROM md_records r'))?.sql??'',/md_fuzzy_unicode_match/);
 seen.length=0;
 assert.deepEqual(await engine.check(client,'tenant','user','Contact',{Name:'猫'}),[]);
 assert.ok(!seen.some(item=>item.sql.includes('FROM md_records r')));
});


test('configured equality index filters candidates while preserving Record access and full-value check',async()=>{
 const seen:Array<{query:string;args:unknown[]}>=[],actor='actor-id';
 const client={query:async(query:string,args:unknown[]=[])=>{
  seen.push({query,args});
  if(query.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'IndexedEmail',match_mode:'All',action:'Alert'}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'IndexedEmail',field_api:'Email',case_sensitive:false,
   match_type:'Exact',max_distance:1}]};
  if(query.includes('FROM md_field_exact_indexes'))return {rows:[{
   object_api:'Contact',field_api:'Email'}]};
  return {rows:[]};
 }} as never;
 const engine=new RecordMatching({require:async()=>undefined} as never);
 await engine.check(client,'tenant',actor,'Contact',{Email:'Hi@Example.com'});
 const lookup=seen.find(x=>x.query.includes('FROM md_records r'));
 assert.ok(lookup);
 assert.match(lookup.query,/md_field_exact_index_entries ix/);
 assert.match(lookup.query,/ix.folded_hash=\s*md5\(lower\(\$5\)\)/);
 assert.match(lookup.query,/lower\(v.value_text\)=lower\(\$5\)/,
  'A digest match must be rechecked against the original stored value');
 assert.match(lookup.query,/md_record_access\(\$1,\$6,r.id,'read'\)/);
 assert.equal(lookup.args.at(-1),actor);
});

test('unconfigured field index retains ordinary duplicate matching',async()=>{
 const seen:string[]=[];
 const client={query:async(query:string)=>{
  seen.push(query);
  if(query.includes('FROM md_matching_rules'))return {rows:[{
   api_name:'NormalEmail',match_mode:'All',action:'Alert'}]};
  if(query.includes('FROM md_matching_rule_fields'))return {rows:[{
   rule_api:'NormalEmail',field_api:'Email',case_sensitive:false}]};
  return {rows:[]};
 }} as never;
 await new RecordMatching({require:async()=>undefined} as never).check(
  client,'tenant','actor','Contact',{Email:'hello@example.com'});
 const lookup=seen.find(x=>x.includes('FROM md_records r'));
 assert.ok(lookup);
 assert.doesNotMatch(lookup,/md_field_exact_index_entries ix/);
});
