import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formatChatTimestamp} from '../../../acechatter/src/chatTimestamp.js';

test('AceChatter renders received and sent ISO timestamps with requested UK display format',()=>{
 assert.equal(formatChatTimestamp('2026-10-25T08:17:44.000Z','Europe/London'),'25-Oct-26 08:17 AM');
 assert.equal(formatChatTimestamp('2026-10-25T13:05:00.000Z','Europe/London'),'25-Oct-26 01:05 PM');
 assert.equal(formatChatTimestamp('2026-10-25T00:05:00.000Z','UTC'),'25-Oct-26 12:05 AM');
 assert.equal(formatChatTimestamp(null,'UTC'),'');
 assert.equal(formatChatTimestamp('not a timestamp','UTC'),'not a timestamp');
});

test('AceChatter converts to the viewer timezone instead of printing raw UTC',()=>{
 assert.equal(formatChatTimestamp('2026-10-24T23:15:00.000Z','Europe/London'),'25-Oct-26 12:15 AM');
 assert.equal(formatChatTimestamp('2026-10-25T09:17:00.000Z','America/New_York'),'25-Oct-26 05:17 AM');
});
