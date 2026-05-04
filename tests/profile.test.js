import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProfile, makeProfileStore } from '../lib/profile.js';

// In-memory localStorage mock for node tests
function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

test('createDefaultProfile returns shape with sensible defaults', () => {
  const p = createDefaultProfile();
  assert.equal(p.income, 0);
  assert.equal(p.kv, '');
  assert.equal(p.auto, '');
  assert.equal(p.city, '');
  assert.equal(typeof p.lebenshaltung, 'object');
  assert.equal(p.lebenshaltung.lebensmittel, null);
  assert.equal(p.lebenshaltung.essen, null);
  assert.ok(typeof p.updatedAt === 'number');
});

test('profileStore: load returns null when empty', () => {
  const store = makeProfileStore({ storage: makeMemoryStorage() });
  assert.equal(store.load(), null);
});

test('profileStore: save then load round-trip', () => {
  const storage = makeMemoryStorage();
  const store = makeProfileStore({ storage });
  const profile = createDefaultProfile();
  profile.income = 2500;
  profile.city = 'Berlin';

  store.save(profile);
  const loaded = store.load();
  assert.equal(loaded.income, 2500);
  assert.equal(loaded.city, 'Berlin');
});

test('profileStore: save updates updatedAt timestamp', async () => {
  const store = makeProfileStore({ storage: makeMemoryStorage() });
  const profile = createDefaultProfile();
  profile.income = 1000;
  const before = Date.now();
  store.save(profile);
  const loaded = store.load();
  assert.ok(loaded.updatedAt >= before);
});

test('profileStore: clear removes profile', () => {
  const store = makeProfileStore({ storage: makeMemoryStorage() });
  store.save(createDefaultProfile());
  assert.notEqual(store.load(), null);
  store.clear();
  assert.equal(store.load(), null);
});

test('wishlistStore: save then load round-trip', async () => {
  const { makeWishlistStore } = await import('../lib/profile.js');
  const store = makeWishlistStore({ storage: makeMemoryStorage() });
  store.save([{ id: 'a', name: 'X', priceCents: 100, createdAt: 1 }]);
  const loaded = store.load();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, 'X');
});

test('wishlistStore: load returns empty array when empty', async () => {
  const { makeWishlistStore } = await import('../lib/profile.js');
  const store = makeWishlistStore({ storage: makeMemoryStorage() });
  assert.deepEqual(store.load(), []);
});
