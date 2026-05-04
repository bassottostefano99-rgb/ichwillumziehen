import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeConsentStore, isConsentDecided } from '../lib/consent.js';

function makeMemoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('consent.load returns null initially', () => {
  const c = makeConsentStore({ storage: makeMemoryStorage() });
  assert.equal(c.load(), null);
});

test('consent.save round-trip', () => {
  const c = makeConsentStore({ storage: makeMemoryStorage() });
  c.save({ ads: true });
  const loaded = c.load();
  assert.equal(loaded.ads, true);
  assert.equal(loaded.necessary, true);
  assert.ok(loaded.decidedAt > 0);
});

test('isConsentDecided', () => {
  assert.equal(isConsentDecided(null), false);
  assert.equal(isConsentDecided({ ads: false, decidedAt: 1 }), true);
});
