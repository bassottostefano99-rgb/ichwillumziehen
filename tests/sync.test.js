import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfile, mergeWishlist, makeSync } from '../lib/sync.js';

test('mergeProfile: both null → null', () => {
  assert.equal(mergeProfile(null, null), null);
});

test('mergeProfile: only local → local', () => {
  const local = { income: 1000, updatedAt: 100 };
  assert.deepEqual(mergeProfile(local, null), local);
});

test('mergeProfile: only db → db', () => {
  const db = { income: 2000, updatedAt: 200 };
  assert.deepEqual(mergeProfile(null, db), db);
});

test('mergeProfile: LWW → newer wins', () => {
  const local = { income: 1000, updatedAt: 100 };
  const db = { income: 2000, updatedAt: 200 };
  assert.deepEqual(mergeProfile(local, db), db);
  assert.deepEqual(mergeProfile(db, local), db);
});

test('mergeWishlist: union by id', () => {
  const local = [
    { id: 'a', name: 'Local A', priceCents: 100, createdAt: 1 },
    { id: 'b', name: 'Both B', priceCents: 200, createdAt: 2 },
  ];
  const db = [
    { id: 'b', name: 'Both B', priceCents: 200, createdAt: 2 },
    { id: 'c', name: 'DB C', priceCents: 300, createdAt: 3 },
  ];
  const merged = mergeWishlist(local, db);
  assert.equal(merged.length, 3);
  const ids = new Set(merged.map(i => i.id));
  assert.ok(ids.has('a') && ids.has('b') && ids.has('c'));
});

test('mergeWishlist: db version wins on id collision', () => {
  const local = [{ id: 'a', name: 'Local Version', priceCents: 100 }];
  const db = [{ id: 'a', name: 'DB Version', priceCents: 999 }];
  const merged = mergeWishlist(local, db);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, 'DB Version');
});

// Sync round-trip with mock Supabase + storage
test('makeSync.runOnLogin pushes local to db when db empty', async () => {
  const calls = [];
  const supabaseMock = {
    from: (table) => ({
      select: () => {
        const eqResult = {
          maybeSingle: async () => ({ data: null }),
          then: (resolve) => resolve({ data: table === 'wishlist_items' ? [] : null }),
        };
        return { eq: () => eqResult };
      },
      upsert: async (rows) => { calls.push(['upsert', table, rows]); return { error: null }; },
      insert: async (rows) => { calls.push(['insert', table, rows]); return { error: null }; },
    }),
  };

  const localProfile = { income: 2500, kv: 'g', city: 'Berlin', lebenshaltung: { lebensmittel: null }, updatedAt: 999 };
  const localItems = [{ id: 'a', name: 'X', priceCents: 100, createdAt: 1 }];

  const sync = makeSync({
    supabase: supabaseMock,
    profileStore: { load: () => localProfile, save: () => {} },
    wishlistStore: { load: () => localItems, save: () => {} },
  });
  const userId = '00000000-0000-4000-8000-000000000000';
  await sync.runOnLogin(userId);

  // Profile upsert AND items insert should fire
  assert.ok(calls.some(c => c[0] === 'upsert' && c[1] === 'profiles'));
  assert.ok(calls.some(c => c[0] === 'insert' && c[1] === 'wishlist_items'));
});
