import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcStrom,
  calcHeizung,
  calcSonstNK,
  calcWarmmiete,
  calcLebenshaltung,
  calcAutoKosten,
  calcSurplus,
  getVerdict,
  calcEinmalig,
  runMietcheck,
} from '../lib/mietcheck.js';

const cityDataMock = {
  getEffectiveDefault: (_city, cat) => ({
    lebensmittel: 360, essen: 130, gym: 70, kleidung: 80,
    handy: 25, abos: 35, urlaub: 100, sparen: 200, sonstiges: 50,
  })[cat],
};

test('calcStrom: 40m² baseline = 50€', () => {
  assert.equal(calcStrom(40), 50);
});
test('calcStrom: 65m² = 50 + 25*0.5 = 62.5 → rounded', () => {
  assert.equal(calcStrom(65), 63);
});
test('calcStrom: 30m² = 50 (no negative addition)', () => {
  assert.equal(calcStrom(30), 50);
});

test('calcHeizung: 65m² = 130', () => {
  assert.equal(calcHeizung(65), 130);
});

test('calcSonstNK is constant', () => {
  assert.equal(calcSonstNK(), 66);
});

test('calcWarmmiete sums components', () => {
  // kalt 1200, qm 65 → strom 63 + heiz 130 + sonst 66 = 259 → warm 1459
  assert.equal(calcWarmmiete({ kaltmiete: 1200, qm: 65 }), 1459);
});

test('calcLebenshaltung uses overrides when present', () => {
  const profile = { lebenshaltung: { lebensmittel: 200, essen: null, gym: null, kleidung: null, handy: null, abos: null, urlaub: null, sparen: null, sonstiges: null }, city: 'München' };
  // 200 + 130 + 70 + 80 + 25 + 35 + 100 + 200 + 50 = 890
  assert.equal(calcLebenshaltung(profile, cityDataMock), 890);
});

test('calcLebenshaltung uses city defaults when null override', () => {
  const profile = { lebenshaltung: { lebensmittel: null, essen: null, gym: null, kleidung: null, handy: null, abos: null, urlaub: null, sparen: null, sonstiges: null }, city: 'München' };
  // 360 + 130 + 70 + 80 + 25 + 35 + 100 + 200 + 50 = 1050
  assert.equal(calcLebenshaltung(profile, cityDataMock), 1050);
});

test('calcAutoKosten: ja sums rate+benzin+versicherung', () => {
  const profile = { auto: 'ja', autoRate: 200, autoBenzin: 120, autoVersicherung: 80, autoOepnv: 0 };
  assert.equal(calcAutoKosten(profile), 400);
});
test('calcAutoKosten: nein returns autoOepnv', () => {
  const profile = { auto: 'nein', autoRate: 0, autoBenzin: 0, autoVersicherung: 0, autoOepnv: 49 };
  assert.equal(calcAutoKosten(profile), 49);
});

test('getVerdict: surplus > 500 = ok', () => {
  const v = getVerdict(700);
  assert.equal(v.tone, 'ok');
  assert.match(v.text, /machbar/i);
});
test('getVerdict: 150 < surplus <= 500 = warn knapp', () => {
  const v = getVerdict(300);
  assert.equal(v.tone, 'warn');
  assert.match(v.text, /knapp/i);
});
test('getVerdict: 0 < surplus <= 150 = warn sehr knapp', () => {
  const v = getVerdict(50);
  assert.equal(v.tone, 'warn');
});
test('getVerdict: surplus <= 0 = bad', () => {
  const v = getVerdict(-200);
  assert.equal(v.tone, 'bad');
  assert.match(v.text, /eng/i);
});

test('calcEinmalig sums kaution + renovierung + möbel', () => {
  // 1200*2 + 500 + 2000 = 4900
  assert.equal(calcEinmalig(1200), 4900);
});

test('runMietcheck end-to-end: München, 1200€ kalt, 65m², income 2500', () => {
  const profile = {
    income: 2500, kv: 'g', kvBetrag: 0,
    auto: 'nein', autoRate: 0, autoBenzin: 0, autoVersicherung: 0, autoOepnv: 49,
    city: 'München',
    lebenshaltung: { lebensmittel: null, essen: null, gym: null, kleidung: null, handy: null, abos: null, urlaub: null, sparen: null, sonstiges: null },
  };
  const result = runMietcheck(profile, { kaltmiete: 1200, qm: 65 }, cityDataMock);

  // Warmmiete: 1200 + 63 + 130 + 66 = 1459
  // Lebenshaltung: 1050 (München defaults), Auto: 49, KV: 0 → totalOut: 1099
  // Avail: 2500 - 1099 = 1401  → Surplus: 1401 - 1459 = -58
  assert.equal(result.warmmiete, 1459);
  assert.equal(result.lebenshaltung, 1050);
  assert.equal(result.surplus, -58);
  assert.equal(result.verdict.tone, 'bad');
  assert.equal(result.einmalig, 4900);
  assert.ok(result.breakdown);
});
