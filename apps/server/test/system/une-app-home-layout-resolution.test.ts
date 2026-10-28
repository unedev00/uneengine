import test from 'node:test';
import assert from 'node:assert/strict';
import {AppRuntime,appHomeFormFactor} from '../../src/system-files/app-runtime.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';

test('shared app home factor preserves independently assigned Tablet without duplicating pages',()=>{
 assert.equal(appHomeFormFactor('Tablet'),'tablet');
 assert.equal(appHomeFormFactor('Desktop'),'desktop');
 assert.equal(appHomeFormFactor('Mobile'),'phone');
 assert.equal(appHomeFormFactor('Phone'),'phone');
 assert.equal(appHomeFormFactor('Custom'),'custom');
});

test('AppRuntime resolves selected tenant app page through the expected form-factor row',async()=>{
 const read:Array<{sql:string;params:unknown[]}>=[],db={
  async query(sql:string,params:unknown[]){
   read.push({sql,params});
   return {rows:[{api_name:params[2]==='tablet'?'UNEAceChatterTablet':params[2]==='custom'?'UNEAceChatterCustom':'UNEAceChatterDesktop'}]};
  }
 } as unknown as SqlPersistence;
 const app=new AppRuntime(db);
 const tablet=await app.homePage('test-tenant','UNEAceChatter',appHomeFormFactor('Tablet'));
 assert.equal(tablet?.apiName,'UNEAceChatterTablet');
 assert.deepEqual(read.at(-1)?.params,['test-tenant','UNEAceChatter','tablet','']);
 assert.match(read.at(-1)?.sql||'',/h.form_factor=\$3/);
 const custom=await app.homePage('test-tenant','UNEAceChatter',appHomeFormFactor('Custom'));
 assert.equal(custom?.apiName,'UNEAceChatterCustom');
 assert.equal(read.at(-1)?.params?.[2],'custom');
 assert.match(read.at(-1)?.sql||'',/\$3='tablet' AND x\.tablet/);
 assert.match(read.at(-1)?.sql||'',/\$3='custom' AND x\.custom/);
});
