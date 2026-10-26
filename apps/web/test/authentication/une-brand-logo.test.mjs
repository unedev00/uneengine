import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { shouldLoadAnimatedBrand } from '../../src/core/branding/uneBrandConnection.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all UNE platform entry points reuse one responsive logo component', () => {
  const component = read('../../src/core/branding/UneBrandLogo.tsx');
  const login = read('../../src/core/authentication/Login/loginView.tsx');
  const marketing = read('../../src/core/public/MarketingSite/MarketingSite.tsx');
  const shell = read('../../src/core/workspace/SetupShell/setupShellPresentation.tsx');
  assert.match(component, /une-solutions-logo\.webp/);
  assert.match(component, /une-solutions-animated\.webp/);
  assert.match(component, /alt=\{decorative \? '' : 'UNE Solutions'\}/);
  assert.match(login, /<UneBrandLogo className="auth-brand-logo"/);
  assert.match(login, /<UneBrandLogo className="auth-product-powered-logo"/);
  assert.match(marketing, /<UneBrandLogo className="une-marketing-logo"/);
  assert.match(marketing, /<UneBrandLogo className="une-mini-mark"/);
  assert.match(marketing, /<UneBrandLogo className="une-integration-logo"/);
  assert.match(shell, /<UneBrandLogo className="brand-logo"/);
});

test('brand animation defers original asset and keeps the normal logo on a poor link', () => {
  const component = read('../../src/core/branding/UneBrandLogo.tsx');
  const styles = read('../../src/core/branding/uneBrandLogo.css');
  assert.match(component, /let animationPreload: Promise<boolean> \| undefined/);
  assert.match(component, /img\.fetchPriority = 'low'/);
  assert.match(component, /shouldLoadAnimatedBrand\(media\.matches, connection\)/);
  assert.match(component, /connection\?\.addEventListener\?\.\('change', update\)/);
  assert.match(component, /une-brand-logo-image--animated/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /une-brand-logo--interim/);
  assert.equal(shouldLoadAnimatedBrand(false, { effectiveType: '4g', downlink: 5, rtt: 50 }), true);
  assert.equal(shouldLoadAnimatedBrand(false, undefined), true, 'unsupported NetworkInformation API should progressively load after fallback');
  assert.equal(shouldLoadAnimatedBrand(true, { effectiveType: '4g' }), false);
  assert.equal(shouldLoadAnimatedBrand(false, { saveData: true, effectiveType: '4g' }), false);
  for (const effectiveType of ['slow-2g', '2g', '3g']) {
    assert.equal(shouldLoadAnimatedBrand(false, { effectiveType }), false, effectiveType);
  }
  assert.equal(shouldLoadAnimatedBrand(false, { downlink: 0.5 }), false);
  assert.equal(shouldLoadAnimatedBrand(false, { rtt: 700 }), false);
});
