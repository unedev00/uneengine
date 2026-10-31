import assert from 'node:assert/strict';
import test from 'node:test';
import { computeKeyboardInset, KEYBOARD_MIN_INSET } from '../src/core/workspace/Responsive/keyboardInset.ts';

const base = { innerHeight: 844, height: 844, offsetTop: 0, scale: 1 };

test('no keyboard reports zero', () => {
  assert.equal(computeKeyboardInset(base), 0);
});

test('a keyboard-sized visual viewport reduction is reported in CSS px', () => {
  assert.equal(computeKeyboardInset({ ...base, height: 508 }), 336);
});

test('visual viewport scrolled down inside the layout viewport is not double counted', () => {
  assert.equal(computeKeyboardInset({ ...base, height: 508, offsetTop: 100 }), 236);
});

test('browser chrome changes below the threshold are ignored', () => {
  assert.equal(computeKeyboardInset({ ...base, height: 844 - (KEYBOARD_MIN_INSET - 1) }), 0);
  assert.equal(computeKeyboardInset({ ...base, height: 844 - KEYBOARD_MIN_INSET }), KEYBOARD_MIN_INSET);
});

test('pinch zoom is never treated as a keyboard', () => {
  assert.equal(computeKeyboardInset({ ...base, height: 400, scale: 2 }), 0);
});
