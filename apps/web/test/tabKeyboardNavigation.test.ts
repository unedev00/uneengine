import assert from 'node:assert/strict';
import test from 'node:test';
import {nextAccessibleTabIndex} from '../src/core/pages/PageRuntime/tabKeyboardNavigation';

test('PB21 keyboard navigation wraps only among visible tabs',()=>{
 assert.equal(nextAccessibleTabIndex('ArrowRight',1,2),0);
 assert.equal(nextAccessibleTabIndex('ArrowLeft',0,3),2);
 assert.equal(nextAccessibleTabIndex('Home',2,3),0);
 assert.equal(nextAccessibleTabIndex('End',0,3),2);
 assert.equal(nextAccessibleTabIndex('Enter',1,3),null);
 assert.equal(nextAccessibleTabIndex('ArrowRight',0,0),null);
});
