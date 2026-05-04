import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, deleteItem, clearAll, calcTotal, normalizeItem } from '../lib/wishlist.js';

const sampleInput = {
  name: 'Sofa',
  price: '499.99',
  imageUrl: 'https://example.com/sofa.jpg',
  linkUrl: 'https://amazon.de/dp/X',
  note: 'Wohnzimmer',
};

test('normalizeItem converts price to cents and trims strings', () => {
  const item = normalizeItem({ ...sampleInput, name: '  Sofa  ' });
  assert.equal(item.priceCents, 49999);
  assert.equal(item.name, 'Sofa');
  assert.equal(item.imageUrl, 'https://example.com/sofa.jpg');
  assert.match(item.id, /[0-9a-f-]{36}/);
  assert.equal(typeof item.createdAt, 'number');
});

test('normalizeItem handles comma decimal', () => {
  const item = normalizeItem({ ...sampleInput, price: '49,90' });
  assert.equal(item.priceCents, 4990);
});

test('normalizeItem rejects invalid price', () => {
  assert.throws(() => normalizeItem({ ...sampleInput, price: 'abc' }));
  assert.throws(() => normalizeItem({ ...sampleInput, price: '' }));
});

test('normalizeItem rejects missing name', () => {
  assert.throws(() => normalizeItem({ ...sampleInput, name: '' }));
});

test('addItem prepends to list', () => {
  const list = [{ id: 'a', name: 'Old', priceCents: 100, createdAt: 1 }];
  const next = addItem(list, normalizeItem(sampleInput));
  assert.equal(next.length, 2);
  assert.equal(next[0].name, 'Sofa');
  assert.equal(next[1].name, 'Old');
});

test('deleteItem removes by id', () => {
  const list = [{ id: 'a', name: 'A', priceCents: 100 }, { id: 'b', name: 'B', priceCents: 200 }];
  const next = deleteItem(list, 'a');
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 'b');
});

test('clearAll returns empty list', () => {
  const list = [{ id: 'a', name: 'A', priceCents: 100 }];
  assert.deepEqual(clearAll(list), []);
});

test('calcTotal sums priceCents', () => {
  const list = [{ id: 'a', priceCents: 100 }, { id: 'b', priceCents: 250 }, { id: 'c', priceCents: 50 }];
  assert.equal(calcTotal(list), 400);
});

test('calcTotal of empty list is 0', () => {
  assert.equal(calcTotal([]), 0);
});
