import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveStandardListColumns} from '../src/core/pages/PageRuntime/standardListColumns';

test('PB23 saved view columns are used unless block overrides and never expose unknown fields',()=>{
 const allowed=['Name','Status','Amount'];
 assert.deepEqual(resolveStandardListColumns([],['Status','Secret','Name'],allowed,['Name']),
  ['Status','Name']);
 assert.deepEqual(resolveStandardListColumns(['Amount','Secret'],['Status'],allowed,['Name']),
  ['Amount']);
 assert.deepEqual(resolveStandardListColumns([],[],allowed,['Name','Missing']),['Name']);
 assert.deepEqual(resolveStandardListColumns([],['Status','Status','Name'],allowed,[]),
  ['Status','Name']);
});
