import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createCityData } from '../lib/cityData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, '..', 'city-data.json'), 'utf-8'));
const cd = createCityData(data);

test('getCityTier returns correct tier for known city', () => {
  assert.equal(cd.getCityTier('München'), 'S');
  assert.equal(cd.getCityTier('Berlin'), 'M');
  assert.equal(cd.getCityTier('Leipzig'), 'L');
  assert.equal(cd.getCityTier('ANDERE'), 'XL');
});

test('getCityTier falls back to XL for unknown city', () => {
  assert.equal(cd.getCityTier('Atlantis'), 'XL');
});

test('getMultiplier returns correct multiplier per category', () => {
  assert.equal(cd.getMultiplier('München', 'lebensmittel'), 1.20);
  assert.equal(cd.getMultiplier('Leipzig', 'essen'), 1.00);
  assert.equal(cd.getMultiplier('München', 'handy'), 1.00, 'no multiplier for handy → 1.0');
});

test('getEffectiveDefault uses multiplier when no override', () => {
  assert.equal(cd.getEffectiveDefault('München', 'lebensmittel'), 360);
  assert.equal(cd.getEffectiveDefault('Leipzig', 'essen'), 100);
  assert.equal(cd.getEffectiveDefault('Berlin', 'urlaub'), 100, 'no multiplier → unchanged default');
});

test('listCities returns all cities sorted', () => {
  const cities = cd.listCities();
  assert.ok(cities.includes('München'));
  assert.ok(cities.includes('ANDERE'));
  assert.ok(cities.length >= 20);
});

test('getDefaults returns the default object', () => {
  const d = cd.getDefaults();
  assert.equal(d.lebensmittel, 300);
  assert.equal(d.oepnv, 49);
});
