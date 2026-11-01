import assert from 'node:assert/strict';
import {test} from 'node:test';
import {matchesPlatformEventTarget} from '../src/core/automation/platformEventTarget.js';

test('platform events are routed by configured business target',()=>{
 const config={matchEventTo:'record',matchEventField:'RecordId'};
 assert.equal(matchesPlatformEventTarget(config,{RecordId:'one'},{recordId:'one'}),true);
 assert.equal(matchesPlatformEventTarget(config,{RecordId:'two'},{recordId:'one'}),false);
 assert.equal(matchesPlatformEventTarget(config,{RecordId:'one'},{}),false);
 assert.equal(matchesPlatformEventTarget({matchEventTo:'user',matchEventField:'UserId'},
  {UserId:'other'},{userId:'mine'}),false);
 assert.equal(matchesPlatformEventTarget({matchEventTo:'page-session',matchEventField:'SessionId'},
  {SessionId:'s1'},{pageSessionKey:'s1'}),true);
 assert.equal(matchesPlatformEventTarget({}, {}, {}),true);
 assert.equal(matchesPlatformEventTarget({matchEventTo:'context',matchEventField:'CartId'},
  {CartId:'cart-1'},{contextRecordId:'cart-1'}),true);
 assert.equal(matchesPlatformEventTarget({matchEventTo:'record',matchEventField:'constructor'},
  {constructor:'x'},{recordId:'x'}),false);
});
