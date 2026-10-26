import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePhoneColumns} from '../src/core/records/ResponsiveDataList/phoneColumns.mjs';

const columns=['Name','Email','Status','Amount','Internal'].map(apiName=>({apiName,label:apiName}));
test('phone list falls back to exactly four fields and hides extras',()=>{
 const roles=resolvePhoneColumns(columns);
 assert.deepEqual(Object.values(roles).map(x=>x?.apiName),['Name','Email','Status','Amount']);
});
test('phone field mapping is metadata-driven and preserves desktop field order',()=>{
 const roles=resolvePhoneColumns(columns,{Email:'title',Amount:'badge',Name:'hidden'});
 assert.equal(roles.title?.apiName,'Email');
 assert.equal(roles.subtitle?.apiName,'Status');
 assert.equal(roles.badge?.apiName,'Amount');
 assert.equal(roles.trailing?.apiName,'Internal');
 assert.equal(columns[0].apiName,'Name');
});
test('duplicate role inputs and malformed data have a safe fallback',()=>{
 const roles=resolvePhoneColumns(columns,{Name:'title',Email:'title',Status:'hidden'});
 assert.equal(roles.title?.apiName,'Name');
 assert.equal(roles.subtitle?.apiName,'Email');
 assert.equal(roles.badge?.apiName,'Amount');
 assert.equal(roles.trailing?.apiName,'Internal');
 assert.equal(resolvePhoneColumns(null).title,null);
});
