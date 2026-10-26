import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {applyObjectLabelTranslations,requestedLabelLanguage,registerObjectLabelTranslationRoutes}
 from '../../src/system-support/object-label-translation-routes.js';

test('localized object metadata uses exact language then regional fallback',()=>{
 const originals=[{apiName:'Case__c',label:'Case',pluralLabel:'Cases',
  fields:[{apiName:'Name',label:'Name'},{apiName:'Status',label:'Status'}]}];
 const translated=applyObjectLabelTranslations(originals,[
  {object_api:'Case__c',language:'fr',field_api:'',value_text:'Dossier'},
  {object_api:'Case__c',language:'fr',field_api:'Name',value_text:'Nom'},
  {object_api:'Case__c',language:'fr-ca',field_api:'Name',value_text:'Dénomination'},
  {object_api:'Other__c',language:'fr-ca',field_api:'Status',value_text:'Unrelated'}
 ],'fr-ca');
 assert.equal(translated[0].label,'Dossier');
 assert.equal(translated[0].fields[0].label,'Dénomination');
 assert.equal(translated[0].fields[1].label,'Status');
 assert.equal(originals[0].label,'Case','localization must not overwrite canonical SQL labels');
 assert.equal(originals[0].fields[0].label,'Name');
 assert.equal(requestedLabelLanguage('FR-CA,fr;q=0.8'),'fr-ca');
 assert.equal(requestedLabelLanguage('invalid_locale'),'en');
});
test('translation migrations use tenant foreign keys and optimistic revisions',async()=>{
 const source=await readFile(new URL('../../src/system-support/migrations/20270109-object-label-translations.sql',import.meta.url),'utf8');
 assert.match(source,/PRIMARY KEY\(tenant_id,object_api,language,field_api\)/);
 assert.match(source,/FOREIGN KEY\(tenant_id,object_api\)/);
 assert.match(source,/md_object_label_translation_revisions/);
 assert.doesNotMatch(source,/\bjsonb?\b/i);
});

test('translation reads require object access and hide unreadable Field labels',async()=>{
 const handlers=new Map<string,(req:unknown,res:unknown,next:(e:unknown)=>void)=>void>();
 const app={get:(route:string,fn:never)=>{handlers.set('GET '+route,fn)},
  put:(route:string,fn:never)=>{handlers.set('PUT '+route,fn)}} as never;
 const grants:string[]=[];
 const rbac={require:async(_tenant:string,_user:string,resource:string)=>{
  grants.push(resource);
 },allowed:async(_tenant:string,_user:string,resource:string)=>resource!=='Case__c.Secret'} as never;
 const db={query:async(sql:string)=>{
  if(sql.includes('md_object_label_translations'))return {rows:[
   {object_api:'Case__c',field_api:'',language:'fr',value_text:'Dossier'},
   {object_api:'Case__c',field_api:'Name',language:'fr',value_text:'Nom'},
   {object_api:'Case__c',field_api:'Secret',language:'fr',value_text:'Privé'}
  ]};
  return {rows:[{revision:3}]};
 }} as never;
 registerObjectLabelTranslationRoutes(app,db,rbac);
 const handle=handlers.get('GET /api/metadata/objects/:objectApi/translations');
 assert.ok(handle);
 const result=await new Promise<{values:Record<string,string>}>( (resolve,reject)=>{
  handle({actor:{tenant_id:'tenant',user_id:'user'},
    params:{objectApi:'Case__c'},query:{language:'fr'}},
   {setHeader:()=>undefined,json:resolve},reject);
 });
 assert.deepEqual(result.values,{'':'Dossier',Name:'Nom'});
 assert.ok(grants.includes('Case__c'));
});
