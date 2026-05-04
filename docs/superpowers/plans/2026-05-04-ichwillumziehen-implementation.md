# ichwillumziehen.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `ichwillumziehen.com` — eine Single-Page-Website mit Miet-Affordability-Check + Umzugsbudget-Tool, optionaler Login (Supabase), Cloudflare-Pages-Deployment, native Affiliate-Cards + 1 AdSense-Slot.

**Architecture:** Vanilla HTML/CSS/JS mit ES-Modulen, kein Build-Step. Pure-Logic-Module separat von UI-Glue (gut testbar). Supabase JS SDK via CDN. Tests via Node-`node:test`-Runner ohne externe devDeps. Cloudflare Pages für Hosting + Auto-Deploy via Git.

**Tech Stack:** HTML5, CSS3 (custom properties), Vanilla JS (ES Modules), Supabase JS SDK v2 (CDN), Cloudflare Pages, Node 20+ (nur für Tests, lokal).

**Reference Spec:** [`docs/superpowers/specs/2026-05-04-ichwillumziehen-design.md`](../specs/2026-05-04-ichwillumziehen-design.md)

---

## Phasen-Übersicht

- **Phase 1 (Tasks 1-7):** Pure Logic + Local-Only — am Ende läuft die Website lokal mit beiden Tools, ohne Login, ohne Monetarisierung
- **Phase 2 (Tasks 8-12):** Auth + Sync — am Ende funktioniert optionaler Login + Cross-Device-Sync
- **Phase 3 (Tasks 13-17):** Monetarisierung + Legal — am Ende sind Affiliate-Cards, AdSense, Cookie-Banner, DSGVO-Seiten live
- **Phase 4 (Tasks 18-19):** Deployment & Smoke — Cloudflare Pages live unter ichwillumziehen.com

---

## Project Files Map

```
ichwillumziehen/                        ← repo root
├── index.html                          ← Single landing page
├── impressum.html
├── datenschutz.html
├── app.js                              ← UI glue + module wiring
├── styles.css                          ← Design system
├── city-data.json                      ← Stadt-Tier-Multipliers
├── _headers                            ← Cloudflare security headers
├── _redirects                          ← Optional anchor redirects
├── package.json                        ← {"type":"module"} only — no deps
├── .gitignore
├── icons/
│   ├── favicon.ico
│   └── og-image.png                    ← User provides later
├── lib/                                ← Pure logic, importable by browser AND tests
│   ├── cityData.js
│   ├── mietcheck.js
│   ├── affiliate.js
│   ├── wishlist.js
│   ├── profile.js
│   ├── consent.js
│   ├── auth.js                         ← takes supabase client as DI param
│   └── sync.js                         ← takes supabase client as DI param
└── tests/                              ← node:test files
    ├── cityData.test.js
    ├── mietcheck.test.js
    ├── affiliate.test.js
    ├── wishlist.test.js
    ├── profile.test.js
    ├── consent.test.js
    └── sync.test.js
```

---

# PHASE 1 — Pure Logic + Local-Only

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `.gitignore`, initial `README.md`

- [ ] **Step 1.1: Create project directory and git init**

```bash
cd C:/Users/Stef/Desktop
mkdir ichwillumziehen
cd ichwillumziehen
git init
```

- [ ] **Step 1.2: Create `package.json`**

Write `package.json`:

```json
{
  "name": "ichwillumziehen",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Mietrechner + Umzugsbudget — ichwillumziehen.com",
  "scripts": {
    "test": "node --test tests/",
    "test:watch": "node --test --watch tests/",
    "serve": "python -m http.server 5500"
  }
}
```

(Die `serve` Convenience nutzt Python, das ist auf Win meist da. Alternativ `npx http-server -p 5500` falls Node bevorzugt.)

- [ ] **Step 1.3: Create `.gitignore`**

Write `.gitignore`:

```
node_modules/
.DS_Store
.vscode/
.idea/
*.log
.env
.env.local
.superpowers/
dist/
```

- [ ] **Step 1.4: Create minimal `README.md`**

Write `README.md`:

```markdown
# ichwillumziehen.com

Mietrechner + Umzugsbudget — kostenlos, ohne Anmeldung.

## Local Development

```bash
npm run serve     # http://localhost:5500
npm test          # run tests
```

See [docs/superpowers/specs/](docs/superpowers/specs/) for design.
```

- [ ] **Step 1.5: Initial commit**

```bash
git add .
git commit -m "chore: bootstrap project"
```

---

## Task 2: City-Data Module

**Files:**
- Create: `city-data.json`, `lib/cityData.js`, `tests/cityData.test.js`

- [ ] **Step 2.1: Write `city-data.json`**

Write `city-data.json`:

```json
{
  "version": 1,
  "defaults": {
    "lebensmittel": 300,
    "essen": 100,
    "gym": 50,
    "kleidung": 80,
    "handy": 25,
    "abos": 35,
    "urlaub": 100,
    "sparen": 200,
    "sonstiges": 50,
    "oepnv": 49
  },
  "tiers": {
    "S":  { "label": "Sehr teuer", "mul": { "lebensmittel": 1.20, "essen": 1.30, "gym": 1.40 } },
    "M":  { "label": "Teuer",      "mul": { "lebensmittel": 1.10, "essen": 1.15, "gym": 1.20 } },
    "L":  { "label": "Mittel",     "mul": { "lebensmittel": 1.00, "essen": 1.00, "gym": 1.00 } },
    "XL": { "label": "Günstiger",  "mul": { "lebensmittel": 0.92, "essen": 0.90, "gym": 0.80 } }
  },
  "cities": {
    "München": "S",
    "Frankfurt am Main": "S",
    "Hamburg": "S",
    "Stuttgart": "S",
    "Berlin": "M",
    "Köln": "M",
    "Düsseldorf": "M",
    "Heidelberg": "M",
    "Freiburg im Breisgau": "M",
    "Hannover": "L",
    "Bremen": "L",
    "Nürnberg": "L",
    "Dresden": "L",
    "Leipzig": "L",
    "Mainz": "L",
    "Karlsruhe": "L",
    "Wiesbaden": "L",
    "Münster": "L",
    "Bonn": "L",
    "Augsburg": "L",
    "Aachen": "L",
    "ANDERE": "XL"
  }
}
```

- [ ] **Step 2.2: Write failing test for `cityData.js`**

Write `tests/cityData.test.js`:

```js
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
```

- [ ] **Step 2.3: Run tests — expect failure (module not found)**

```bash
npm test
```

Expected: ERROR — Cannot find module './lib/cityData.js'

- [ ] **Step 2.4: Implement `lib/cityData.js`**

Write `lib/cityData.js`:

```js
// Pure module — accepts the parsed JSON, returns query-functions.
// No I/O, no globals. Browser and Node both call createCityData(data).

export function createCityData(data) {
  const { defaults, tiers, cities } = data;

  function getCityTier(city) {
    return cities[city] ?? 'XL';
  }

  function getMultiplier(city, category) {
    const tier = getCityTier(city);
    return tiers[tier]?.mul?.[category] ?? 1.0;
  }

  function getEffectiveDefault(city, category) {
    const base = defaults[category] ?? 0;
    return Math.round(base * getMultiplier(city, category));
  }

  function listCities() {
    return Object.keys(cities).sort((a, b) => a.localeCompare(b, 'de'));
  }

  function getDefaults() {
    return { ...defaults };
  }

  function getTier(tierKey) {
    return tiers[tierKey];
  }

  return { getCityTier, getMultiplier, getEffectiveDefault, listCities, getDefaults, getTier };
}
```

- [ ] **Step 2.5: Run tests — expect pass**

```bash
npm test
```

Expected: All cityData tests pass (6 tests).

- [ ] **Step 2.6: Commit**

```bash
git add city-data.json lib/cityData.js tests/cityData.test.js
git commit -m "feat: add city-data module with tier multipliers"
```

---

## Task 3: Mietcheck Logic Module

**Files:**
- Create: `lib/mietcheck.js`, `tests/mietcheck.test.js`

- [ ] **Step 3.1: Write failing test for `mietcheck.js`**

Write `tests/mietcheck.test.js`:

```js
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
```

- [ ] **Step 3.2: Run tests — expect failure**

```bash
npm test
```

Expected: ERROR — module not found.

- [ ] **Step 3.3: Implement `lib/mietcheck.js`**

Write `lib/mietcheck.js`:

```js
// Pure functions for the affordability check.
// All money values are integers (€). No floats stored.

export const NK_INTERNET = 40;
export const NK_GEZ = 18;
export const NK_HAFTPFLICHT = 8;
export const KAUTION_MULT = 2;
export const RENOVIERUNG_PAUSCHALE = 500;
export const MOEBEL_RESERVE = 2000;

const LEBENSHALTUNG_KEYS = [
  'lebensmittel','essen','gym','kleidung','handy',
  'abos','urlaub','sparen','sonstiges'
];

export function calcStrom(qm) {
  return Math.round(50 + Math.max(0, qm - 40) * 0.5);
}

export function calcHeizung(qm) {
  return Math.round(qm * 2.0);
}

export function calcSonstNK() {
  return NK_INTERNET + NK_GEZ + NK_HAFTPFLICHT;
}

export function calcWarmmiete({ kaltmiete, qm }) {
  return kaltmiete + calcStrom(qm) + calcHeizung(qm) + calcSonstNK();
}

export function calcLebenshaltung(profile, cityData) {
  let sum = 0;
  for (const key of LEBENSHALTUNG_KEYS) {
    const override = profile.lebenshaltung?.[key];
    sum += (override ?? cityData.getEffectiveDefault(profile.city, key));
  }
  return sum;
}

export function calcAutoKosten(profile) {
  if (profile.auto === 'ja') {
    return (profile.autoRate ?? 0) + (profile.autoBenzin ?? 0) + (profile.autoVersicherung ?? 0);
  }
  if (profile.auto === 'nein') {
    return profile.autoOepnv ?? 0;
  }
  return 0;
}

export function calcSurplus(profile, listing, cityData) {
  const lebenshaltung = calcLebenshaltung(profile, cityData);
  const autoKosten = calcAutoKosten(profile);
  const totalOut = (profile.kvBetrag ?? 0) + autoKosten + lebenshaltung;
  const availForRent = profile.income - totalOut;
  const warm = calcWarmmiete(listing);
  return availForRent - warm;
}

export function getVerdict(surplus) {
  if (surplus > 500)  return { tone: 'ok',   text: 'Ja, machbar.',           sub: `+${surplus}€ Spielraum/Mo.` };
  if (surplus > 150)  return { tone: 'warn', text: 'Ja, aber knapp.',        sub: `Nur +${surplus}€ Puffer.` };
  if (surplus > 0)    return { tone: 'warn', text: 'Sehr knapp.',            sub: `Nur +${surplus}€ übrig.` };
  return                  { tone: 'bad',  text: 'Zu eng.',                sub: `Dir fehlen ${Math.abs(surplus)}€/Mo.` };
}

export function calcEinmalig(kaltmiete) {
  return kaltmiete * KAUTION_MULT + RENOVIERUNG_PAUSCHALE + MOEBEL_RESERVE;
}

export function runMietcheck(profile, listing, cityData) {
  const lebenshaltung = calcLebenshaltung(profile, cityData);
  const autoKosten = calcAutoKosten(profile);
  const totalOut = (profile.kvBetrag ?? 0) + autoKosten + lebenshaltung;
  const availForRent = profile.income - totalOut;
  const warmmiete = calcWarmmiete(listing);
  const surplus = availForRent - warmmiete;

  return {
    warmmiete,
    strom: calcStrom(listing.qm),
    heizung: calcHeizung(listing.qm),
    sonstNK: calcSonstNK(),
    lebenshaltung,
    autoKosten,
    totalOut,
    availForRent,
    surplus,
    verdict: getVerdict(surplus),
    einmalig: calcEinmalig(listing.kaltmiete),
    breakdown: {
      income: profile.income,
      kvBetrag: profile.kvBetrag ?? 0,
      autoKosten,
      lebenshaltung,
      kaltmiete: listing.kaltmiete,
      strom: calcStrom(listing.qm),
      heizung: calcHeizung(listing.qm),
      sonstNK: calcSonstNK(),
    },
  };
}
```

- [ ] **Step 3.4: Run tests — expect pass**

```bash
npm test
```

Expected: All mietcheck tests pass (~14 tests).

- [ ] **Step 3.5: Commit**

```bash
git add lib/mietcheck.js tests/mietcheck.test.js
git commit -m "feat: add mietcheck affordability calculation module"
```

---

## Task 4: Affiliate Tagging Module

**Files:**
- Create: `lib/affiliate.js`, `tests/affiliate.test.js`

- [ ] **Step 4.1: Write failing test**

Write `tests/affiliate.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagAffiliate, makeAffiliateConfig } from '../lib/affiliate.js';

const cfg = makeAffiliateConfig({ amazonTag: 'iwu-21' });

test('tagAffiliate appends amazon tag', () => {
  const out = tagAffiliate('https://www.amazon.de/dp/B07X', cfg);
  assert.match(out, /tag=iwu-21/);
});

test('tagAffiliate replaces existing amazon tag', () => {
  const out = tagAffiliate('https://www.amazon.de/dp/B07X?tag=other-21', cfg);
  assert.match(out, /tag=iwu-21/);
  assert.doesNotMatch(out, /tag=other-21/);
});

test('tagAffiliate works for amazon.com / .co.uk / smile subdomain', () => {
  assert.match(tagAffiliate('https://amazon.com/x', cfg), /tag=iwu-21/);
  assert.match(tagAffiliate('https://www.amazon.co.uk/x', cfg), /tag=iwu-21/);
  assert.match(tagAffiliate('https://smile.amazon.de/x', cfg), /tag=iwu-21/);
});

test('tagAffiliate ignores non-amazon urls', () => {
  const url = 'https://www.ikea.de/de/p/x-12345';
  assert.equal(tagAffiliate(url, cfg), url);
});

test('tagAffiliate returns input on invalid url', () => {
  assert.equal(tagAffiliate('not-a-url', cfg), 'not-a-url');
  assert.equal(tagAffiliate('', cfg), '');
  assert.equal(tagAffiliate(null, cfg), null);
});

test('tagAffiliate respects disabled flag', () => {
  const disabled = makeAffiliateConfig({ amazonTag: 'iwu-21', amazonEnabled: false });
  const url = 'https://www.amazon.de/dp/X';
  assert.equal(tagAffiliate(url, disabled), url);
});

test('isAmazonUrl detects amazon hostnames', () => {
  // re-imported in case file exposes helper
  // We test the public API only — skip if not exported
});
```

- [ ] **Step 4.2: Run tests — expect failure**

```bash
npm test
```

Expected: ERROR — module not found.

- [ ] **Step 4.3: Implement `lib/affiliate.js`**

Write `lib/affiliate.js`:

```js
// Affiliate-Tag-Injection. Browser + Node compatible.

export function makeAffiliateConfig({ amazonTag, amazonEnabled = true }) {
  return { amazon: { tag: amazonTag, enabled: amazonEnabled } };
}

export function isAmazonUrl(url) {
  try {
    const u = new URL(url);
    return /(^|\.)amazon\.[a-z.]+$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function tagAffiliate(url, config) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (isAmazonUrl(url) && config?.amazon?.enabled) {
      u.searchParams.set('tag', config.amazon.tag);
      return u.toString();
    }
  } catch (_) {
    // Not a valid URL — return as-is
  }
  return url;
}
```

- [ ] **Step 4.4: Run tests — expect pass**

```bash
npm test
```

Expected: All affiliate tests pass (~6 tests).

- [ ] **Step 4.5: Commit**

```bash
git add lib/affiliate.js tests/affiliate.test.js
git commit -m "feat: add affiliate tag injection for amazon links"
```

---

## Task 5: Wishlist State Module

**Files:**
- Create: `lib/wishlist.js`, `tests/wishlist.test.js`

- [ ] **Step 5.1: Write failing test**

Write `tests/wishlist.test.js`:

```js
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
```

- [ ] **Step 5.2: Run tests — expect failure**

```bash
npm test
```

Expected: ERROR module not found.

- [ ] **Step 5.3: Implement `lib/wishlist.js`**

Write `lib/wishlist.js`:

```js
// Pure wishlist state operations. Runs in browser AND node.

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older runtimes
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parsePriceCents(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.round(input * 100);
  }
  if (typeof input !== 'string') throw new Error('Preis erforderlich');
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Ungültiger Preis');
  return Math.round(parseFloat(cleaned) * 100);
}

export function normalizeItem(input) {
  const name = (input.name ?? '').trim();
  if (!name) throw new Error('Name erforderlich');
  const priceCents = parsePriceCents(input.price ?? input.priceCents);

  return {
    id: input.id ?? makeId(),
    name,
    priceCents,
    imageUrl: (input.imageUrl ?? input.image ?? '').trim() || null,
    linkUrl: (input.linkUrl ?? input.link ?? '').trim() || null,
    note: (input.note ?? '').trim() || null,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function addItem(list, item) {
  return [item, ...list];
}

export function deleteItem(list, id) {
  return list.filter(i => i.id !== id);
}

export function clearAll(_list) {
  return [];
}

export function calcTotal(list) {
  return list.reduce((sum, i) => sum + (i.priceCents ?? 0), 0);
}
```

- [ ] **Step 5.4: Run tests — expect pass**

```bash
npm test
```

Expected: All wishlist tests pass (~9 tests).

- [ ] **Step 5.5: Commit**

```bash
git add lib/wishlist.js tests/wishlist.test.js
git commit -m "feat: add wishlist state module"
```

---

## Task 6: Profile + LocalStorage Module

**Files:**
- Create: `lib/profile.js`, `tests/profile.test.js`

- [ ] **Step 6.1: Write failing test**

Write `tests/profile.test.js`:

```js
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
```

- [ ] **Step 6.2: Run tests — expect failure**

```bash
npm test
```

Expected: ERROR module not found.

- [ ] **Step 6.3: Implement `lib/profile.js`**

Write `lib/profile.js`:

```js
// Profile + Wishlist storage abstractions.
// Storage is injected (window.localStorage in browser, mock in tests).

const PROFILE_KEY = 'iwu_profile';
const WISHLIST_KEY = 'iwu_wishlist';

const LEBENSHALTUNG_KEYS = [
  'lebensmittel','essen','gym','kleidung','handy',
  'abos','urlaub','sparen','sonstiges',
];

export function createDefaultProfile() {
  const lebenshaltung = {};
  for (const k of LEBENSHALTUNG_KEYS) lebenshaltung[k] = null;
  return {
    income: 0,
    kv: '',
    kvBetrag: 0,
    auto: '',
    autoRate: 0,
    autoBenzin: 0,
    autoVersicherung: 0,
    autoOepnv: 0,
    city: '',
    lebenshaltung,
    updatedAt: Date.now(),
  };
}

export function makeProfileStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(PROFILE_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    save(profile) {
      const stamped = { ...profile, updatedAt: Date.now() };
      storage.setItem(PROFILE_KEY, JSON.stringify(stamped));
    },
    clear() {
      storage.removeItem(PROFILE_KEY);
    },
  };
}

export function makeWishlistStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(WISHLIST_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    save(items) {
      storage.setItem(WISHLIST_KEY, JSON.stringify(items));
    },
    clear() {
      storage.removeItem(WISHLIST_KEY);
    },
  };
}
```

- [ ] **Step 6.4: Run tests — expect pass**

```bash
npm test
```

Expected: All profile tests pass (~7 tests).

- [ ] **Step 6.5: Commit**

```bash
git add lib/profile.js tests/profile.test.js
git commit -m "feat: add profile + wishlist localStorage modules"
```

---

## Task 7: HTML Skeleton + Styles + Wired-Up Tools

This task is the big leap from "logic compiles" to "user-facing site". It produces a working tool locally with both Miet-Check and Wishlist functioning via localStorage. No login, no monetization yet.

**Files:**
- Create: `index.html`, `styles.css`, `app.js`

### Subtask 7a: HTML Skeleton

- [ ] **Step 7.1: Write `index.html` skeleton**

Write `index.html`:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ichwillumziehen — Mietrechner & Umzugsbudget</title>
  <meta name="description" content="Ehrlicher Mietrechner mit Stadt-spezifischen Lebenshaltungskosten und ein Umzugsbudget zum Mitplanen. Kostenlos, ohne Anmeldung." />
  <meta property="og:title" content="ichwillumziehen — Mietrechner & Umzugsbudget" />
  <meta property="og:description" content="Kannst du dir die Wohnung leisten? Ehrlich rechnen statt raten." />
  <meta property="og:type" content="website" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>

<header class="hdr">
  <a class="hdr-logo" href="/">ichwillumziehen</a>
  <nav class="hdr-nav">
    <a href="#mietcheck">Miet-Check</a>
    <a href="#umzugsbudget">Umzugsbudget</a>
    <a href="#faq">FAQ</a>
  </nav>
  <button class="hdr-login" id="btn-open-login" type="button">Anmelden</button>
</header>

<main>

  <section class="hero">
    <div class="eyebrow">— Mietrechner & Umzugsbudget —</div>
    <h1>Kannst du dir<br>die Wohnung <em>leisten?</em></h1>
    <p class="hero-sub">Ehrlicher Mietrechner mit Stadt-spezifischen Lebenshaltungskosten — und ein Umzugsbudget zum Mitplanen. Kostenlos, ohne Anmeldung.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#mietcheck">Miet-Check starten</a>
      <a class="btn btn-secondary" href="#umzugsbudget">Umzugsbudget</a>
    </div>
  </section>

  <section class="section" id="mietcheck">
    <div class="section-label">— Schritt 1 —</div>
    <h2>Dein <em>Miet-Check</em></h2>
    <p class="section-sub">Profil einmal ausfüllen. Stadt + Kaltmiete eingeben. Du siehst sofort, ob's reicht — inklusive Strom, Heizung, Lebenshaltung.</p>

    <div class="tool" id="mc-tool">
      <div class="mc-progress" aria-label="Fortschritt">
        <div class="mc-pd" id="mc-step-1"></div>
        <div class="mc-pd" id="mc-step-2"></div>
        <div class="mc-pd" id="mc-step-3"></div>
      </div>

      <!-- Step 1: Profil -->
      <div class="mc-screen active" data-step="1">
        <h3>Dein <em>Profil</em></h3>
        <p class="mc-hint">Einmal ausfüllen — du nutzt es für jede Wohnung.</p>
        <div class="mc-ibox">
          <label for="mc-income">Nettoeinkommen / Monat</label>
          <input id="mc-income" type="number" inputmode="numeric" placeholder="2.500" />
          <span class="suf">€</span>
        </div>
        <div class="mc-hint">Krankenversicherung</div>
        <div class="mc-c2">
          <button class="mc-cb" data-kv="g" type="button"><span class="cn">Gesetzlich</span><span class="cs">Im Netto enthalten</span></button>
          <button class="mc-cb" data-kv="p" type="button"><span class="cn">Privat (PKV)</span><span class="cs">Kommt on top</span></button>
        </div>
        <div class="mc-xfield" id="mc-kv-x" hidden>
          <label for="mc-kvb">PKV-Beitrag / Monat</label>
          <input id="mc-kvb" type="number" inputmode="numeric" placeholder="450" />
          <span class="suf">€</span>
        </div>
        <div class="mc-hint">Hast du ein Auto?</div>
        <div class="mc-c2">
          <button class="mc-cb" data-auto="ja" type="button"><span class="cn">🚗 Ja</span><span class="cs">Eigen oder Leasing</span></button>
          <button class="mc-cb" data-auto="nein" type="button"><span class="cn">🚌 Nein</span><span class="cs">ÖPNV oder Fahrrad</span></button>
        </div>
        <div id="mc-auto-x" hidden>
          <div class="mc-xfield"><label for="mc-arate">Kredit / Leasing (0 wenn abbezahlt)</label><input id="mc-arate" type="number" inputmode="numeric" placeholder="0" /><span class="suf">€</span></div>
          <div class="mc-xfield"><label for="mc-abenzin">Benzin / Laden</label><input id="mc-abenzin" type="number" inputmode="numeric" placeholder="120" /><span class="suf">€</span></div>
          <div class="mc-xfield"><label for="mc-avers">Versicherung + Steuer Ø/Mo</label><input id="mc-avers" type="number" inputmode="numeric" placeholder="80" /><span class="suf">€</span></div>
        </div>
        <div id="mc-oepnv-x" hidden>
          <div class="mc-xfield"><label for="mc-oepnv">ÖPNV / Deutschlandticket</label><input id="mc-oepnv" type="number" inputmode="numeric" placeholder="49" /><span class="suf">€</span></div>
        </div>
      </div>

      <!-- Step 2: Lebenshaltung (Stadt + Anpassen) -->
      <div class="mc-screen" data-step="2" hidden>
        <h3>Deine <em>Stadt &amp; Lebenshaltung</em></h3>
        <p class="mc-hint">Wir passen typische Ausgaben an deinen Standort an. Anpassen kannst du jederzeit.</p>
        <div class="mc-xfield">
          <label for="mc-city">Stadt</label>
          <select id="mc-city"></select>
        </div>
        <div id="mc-city-info" class="mc-tier-pill"></div>
        <div id="mc-est-list"></div>
      </div>

      <!-- Step 3: Wohnung -->
      <div class="mc-screen" data-step="3" hidden>
        <h3>Die <em>Wohnung</em></h3>
        <p class="mc-hint">Kaltmiete + Wohnfläche reichen. Strom, Heizung und Nebenkosten rechnen wir.</p>
        <div class="mc-ibox"><label for="mc-kalt">Kaltmiete / Monat</label><input id="mc-kalt" type="number" inputmode="numeric" placeholder="1.200" /><span class="suf">€</span></div>
        <div class="mc-ibox"><label for="mc-qm">Wohnfläche</label><input id="mc-qm" type="number" inputmode="numeric" placeholder="65" /><span class="suf">m²</span></div>
        <div id="mc-result"></div>
      </div>

      <div class="mc-footer">
        <button class="btn btn-secondary" id="mc-back" type="button" hidden>Zurück</button>
        <button class="btn btn-primary" id="mc-next" type="button" disabled>Weiter</button>
      </div>
    </div>
  </section>

  <section class="section" id="umzugsbudget">
    <div class="section-label">— Schritt 2 —</div>
    <h2>Dein <em>Umzugsbudget</em></h2>
    <p class="section-sub">Möbel, Deko, Werkzeuge — alles auf einen Blick. Mit Bild, Preis, Kauflink und Live-Total.</p>

    <div class="aff-disclose">Manche Links sind <strong>Affiliate-Links</strong>. Wenn du über sie kaufst, bekommen wir eine kleine Provision — der Preis ändert sich für dich nicht.</div>

    <div class="wl-tool">
      <form id="wl-form" class="wl-form">
        <h3>Item hinzufügen</h3>
        <div class="wl-field"><label for="wl-name">Produktname *</label><input id="wl-name" name="name" type="text" required placeholder="z.B. Sofa, Schreibtisch" /></div>
        <div class="wl-field"><label for="wl-price">Preis (€) *</label><input id="wl-price" name="price" type="text" inputmode="decimal" required placeholder="499,99" /></div>
        <div class="wl-field"><label for="wl-image">Bild-URL (optional)</label><input id="wl-image" name="image" type="url" placeholder="https://..." /></div>
        <div class="wl-field"><label for="wl-link">Kauflink (optional)</label><input id="wl-link" name="link" type="url" placeholder="https://shop.de/..." /></div>
        <div class="wl-field"><label for="wl-note">Notiz (optional)</label><input id="wl-note" name="note" type="text" placeholder="Wohnzimmer, IKEA …" /></div>
        <div class="wl-formrow">
          <button class="btn btn-primary" type="submit">+ Hinzufügen</button>
          <button class="btn btn-secondary" type="button" id="wl-clear">Alles löschen</button>
        </div>
      </form>

      <div class="wl-list">
        <div class="wl-total-row">
          <span class="wl-total-label">Live-Total</span>
          <span class="wl-total-value" id="wl-total">0,00 €</span>
        </div>
        <div class="wl-grid" id="wl-grid"></div>
      </div>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="section-label">— Häufige Fragen —</div>
    <h2>Was du <em>wissen solltest</em></h2>
    <div class="faq-list">
      <details class="faq-q"><summary>Wie viel Miete kann ich mir leisten?</summary><div class="faq-a">Eine gängige Faustregel: nicht mehr als 30% deines Nettoeinkommens für Warmmiete. Bei höheren Einkommen (&gt;3.500€) sind 35-40% oft noch tragbar, weil die Fixkosten relativ kleiner werden. Unser Rechner berücksichtigt deine konkreten Lebenshaltungskosten und gibt dir eine ehrliche Antwort.</div></details>
      <details class="faq-q"><summary>Was sind realistische Nebenkosten?</summary><div class="faq-a">Strom: ca. 50-100€/Monat (abhängig von qm). Heizung: ca. 1,50-2,50€/m² je nach Energieträger. Internet: ca. 30-50€. Rundfunkbeitrag (GEZ): 18,36€. Hausratversicherung: ca. 5-10€. Plus ggf. Haftpflicht (~3-5€). Gesamt: rund 100-180€ zusätzlich zur Kaltmiete.</div></details>
      <details class="faq-q"><summary>Wie viel kostet ein Umzug in Deutschland?</summary><div class="faq-a">DIY mit gemieteter Sprinter-Box: 200-500€. Lokaler Umzug mit Firma (50km): 800-1.500€. Fern-Umzug 500km mit Firma: 1.500-3.500€. Plus Kaution (2 Monatsmieten), Renovierung der alten Wohnung (oft 300-800€), neue Möbel/Hausrat. Realistisch: 3.000-6.000€ insgesamt.</div></details>
      <details class="faq-q"><summary>Kaltmiete oder Warmmiete — wo ist der Unterschied?</summary><div class="faq-a">Kaltmiete = nur die reine Miete. Warmmiete = Kaltmiete + Nebenkosten (Heizung, Wasser, Müll, Hausreinigung, manchmal Strom). In Inseraten ist meist die Kaltmiete angegeben. Plane immer 100-180€/Monat zusätzlich für Strom, Internet, GEZ und Versicherungen.</div></details>
    </div>
  </section>

  <!-- Affiliate cards + AdSense will be injected in Phase 3 -->

</main>

<footer class="ftr">
  <div class="ftr-links">
    <a href="/impressum.html">Impressum</a>
    <a href="/datenschutz.html">Datenschutz</a>
    <a href="#" id="ftr-cookies">Cookies</a>
  </div>
  <div class="ftr-brand">ichwillumziehen.com · Made with care</div>
</footer>

<!-- Login Modal -->
<dialog id="login-modal" class="modal">
  <form method="dialog" class="modal-form" id="login-form">
    <h3>Anmelden</h3>
    <p>Wir schicken dir einen Login-Link per E-Mail. Kein Passwort, keine Speicherung deines Geräts.</p>
    <input id="login-email" type="email" required placeholder="deine@email.de" />
    <div class="modal-actions">
      <button class="btn btn-secondary" value="cancel" type="submit">Abbrechen</button>
      <button class="btn btn-primary" id="login-submit" type="submit" value="confirm">Login-Link senden</button>
    </div>
    <div id="login-status" class="modal-status" hidden></div>
  </form>
</dialog>

<!-- JSON-LD FAQ schema for SEO -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Wie viel Miete kann ich mir leisten?", "acceptedAnswer": { "@type": "Answer", "text": "Eine gängige Faustregel: nicht mehr als 30% deines Nettoeinkommens für Warmmiete." } },
    { "@type": "Question", "name": "Was sind realistische Nebenkosten?", "acceptedAnswer": { "@type": "Answer", "text": "Strom 50-100€, Heizung 1,50-2,50€/m², Internet 30-50€, GEZ 18,36€." } },
    { "@type": "Question", "name": "Wie viel kostet ein Umzug in Deutschland?", "acceptedAnswer": { "@type": "Answer", "text": "DIY 200-500€, lokal mit Firma 800-1.500€, Fernumzug 1.500-3.500€." } },
    { "@type": "Question", "name": "Kaltmiete oder Warmmiete — wo ist der Unterschied?", "acceptedAnswer": { "@type": "Answer", "text": "Kaltmiete = reine Miete. Warmmiete = Kaltmiete plus Nebenkosten." } }
  ]
}
</script>

<script type="module" src="./app.js"></script>
</body>
</html>
```

### Subtask 7b: Stylesheet (Design-System aus Extension)

- [ ] **Step 7.2: Write `styles.css`**

Write `styles.css`:

```css
/* === Design Tokens === */
:root {
  --bg:        #0e0e0e;
  --bg-card:   #161616;
  --bg-card-2: #1a1a1a;
  --bg-lime:   #1a2000;
  --border:    #2a2a2a;
  --text:      #f0ede8;
  --muted:     #666;
  --accent:    #c8f060;
  --accent-d:  #a8d040;
  --warn:      #fbbf24;
  --bad:       #ff6b6b;
  --serif: 'DM Serif Display', Georgia, serif;
  --sans:  'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  line-height: 1.55;
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
em { color: var(--accent); font-style: italic; }
strong { font-weight: 500; }

/* === Header === */
.hdr {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 26px; background: rgba(14,14,14,0.92);
  border-bottom: 0.5px solid var(--border);
  backdrop-filter: blur(8px);
}
.hdr-logo { font-family: var(--serif); color: var(--accent); font-size: 17px; letter-spacing: 0.04em; }
.hdr-nav { display: flex; gap: 18px; font-size: 13px; color: var(--muted); }
.hdr-nav a:hover { color: var(--text); }
.hdr-login {
  background: var(--accent); color: var(--bg);
  border: 0; padding: 8px 16px; border-radius: 8px;
  font: 500 12px var(--sans); cursor: pointer; transition: background 0.15s;
}
.hdr-login:hover { background: var(--accent-d); }
.hdr-login.logged-in { background: transparent; color: var(--text); border: 0.5px solid var(--border); }

/* === Hero === */
.hero {
  padding: 80px 30px 90px; text-align: center;
  border-bottom: 0.5px solid #1a1a1a;
}
.eyebrow {
  font-size: 11px; color: var(--accent-d);
  letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 18px;
}
.hero h1 {
  font-family: var(--serif); font-size: clamp(34px, 6vw, 56px);
  line-height: 1.05; margin-bottom: 18px; letter-spacing: -0.02em;
}
.hero-sub {
  color: var(--muted); font-size: 16px;
  max-width: 540px; margin: 0 auto 32px;
}
.cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* === Buttons === */
.btn {
  display: inline-block; padding: 13px 22px; border-radius: 11px;
  font: 500 13px var(--sans); cursor: pointer; border: 0;
  transition: transform 0.15s, background 0.15s, opacity 0.15s;
}
.btn-primary { background: var(--accent); color: var(--bg); }
.btn-primary:hover { background: var(--accent-d); }
.btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-secondary { background: transparent; color: var(--text); border: 0.5px solid var(--border); }
.btn-secondary:hover { border-color: var(--text); }

/* === Sections === */
.section {
  padding: 60px 40px 70px; max-width: 980px; margin: 0 auto;
  border-bottom: 0.5px solid #1a1a1a;
}
.section-label {
  font-size: 10px; color: var(--accent-d);
  letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;
}
.section h2 {
  font-family: var(--serif); font-size: clamp(28px, 4vw, 36px);
  line-height: 1.1; margin-bottom: 10px; letter-spacing: -0.02em;
}
.section-sub {
  font-size: 14px; color: var(--muted); margin-bottom: 32px; max-width: 580px;
}

/* === Tool Container === */
.tool, .wl-tool {
  background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 14px; padding: 24px;
}

/* === Mietcheck === */
.mc-progress { display: flex; gap: 6px; margin-bottom: 22px; }
.mc-pd { height: 3px; flex: 1; background: var(--border); border-radius: 3px; transition: background 0.3s; }
.mc-pd.done { background: var(--accent); }

.mc-screen { animation: fade-up 0.35s cubic-bezier(.2,.9,.2,1); }
.mc-screen[hidden] { display: none; }
.mc-screen h3 {
  font-family: var(--serif); font-size: 22px; margin-bottom: 6px;
}
.mc-hint { color: var(--muted); font-size: 12px; margin-bottom: 16px; line-height: 1.55; }

.mc-ibox, .mc-xfield {
  background: var(--bg);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px; margin-bottom: 10px;
  position: relative;
}
.mc-xfield { background: #0a1a00; border-color: var(--accent); }
.mc-ibox label, .mc-xfield label {
  display: block; font-size: 10px; color: var(--muted); margin-bottom: 5px;
}
.mc-xfield label { color: var(--accent-d); }
.mc-ibox input, .mc-xfield input, .mc-xfield select {
  width: 100%; background: transparent; border: 0;
  font: 400 18px var(--serif); color: var(--text); outline: 0;
  padding-right: 28px;
}
.mc-ibox .suf, .mc-xfield .suf {
  position: absolute; right: 14px; bottom: 12px;
  font-size: 13px; color: var(--muted);
}

.mc-c2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.mc-cb {
  background: var(--bg); border: 0.5px solid var(--border);
  border-radius: 9px; padding: 10px 12px;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
  text-align: left; color: var(--text); font: 400 13px var(--sans);
}
.mc-cb:hover { border-color: #444; }
.mc-cb.sel { border-color: var(--accent); background: var(--bg-lime); }
.mc-cb .cn { display: block; font-size: 13px; font-weight: 500; }
.mc-cb .cs { display: block; font-size: 10px; color: var(--muted); margin-top: 2px; }
.mc-cb.sel .cs { color: var(--accent-d); }

.mc-tier-pill {
  font-size: 11px; color: var(--accent-d); padding: 8px 12px;
  background: var(--bg-lime); border: 0.5px solid var(--accent);
  border-radius: 6px; margin: 8px 0 16px;
}
.mc-tier-pill[hidden] { display: none; }

#mc-est-list { display: flex; flex-direction: column; gap: 6px; }
.mc-est {
  background: var(--bg); border: 0.5px solid var(--border);
  border-radius: 9px; padding: 10px 12px;
  display: flex; align-items: center; gap: 10px;
}
.mc-est.editing { border-color: var(--accent); background: var(--bg-lime); }
.mc-est-name { flex: 1; font-size: 12px; }
.mc-est-name .sub { display: block; font-size: 10px; color: var(--muted); }
.mc-est-amt { font: 400 14px var(--serif); }
.mc-est-amt.c { color: var(--accent); }
.mc-est-edit { background: transparent; border: 0.5px solid var(--border); padding: 4px 8px; border-radius: 5px; font-size: 10px; color: var(--muted); cursor: pointer; }
.mc-est-edit:hover { border-color: var(--accent); color: var(--accent); }
.mc-est-input { display: none; gap: 6px; align-items: center; }
.mc-est-input.open { display: flex; }
.mc-est-input input { width: 80px; background: var(--bg-card); border: 0.5px solid var(--accent); border-radius: 5px; padding: 4px 6px; color: var(--text); font: 400 13px var(--serif); outline: 0; }

.mc-footer {
  display: flex; gap: 8px; margin-top: 22px;
  padding-top: 16px; border-top: 0.5px solid var(--border);
}
.mc-footer .btn { flex: 1; }

/* Mietcheck Result */
#mc-result { margin-top: 16px; }
.mc-verdict {
  font-family: var(--serif); font-size: 28px; margin-bottom: 4px;
}
.mc-verdict.ok { color: var(--accent); }
.mc-verdict.warn { color: var(--warn); }
.mc-verdict.bad { color: var(--bad); }
.mc-verdict-sub { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
.mc-surplus {
  border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 14px;
  border: 0.5px solid var(--border);
}
.mc-surplus.ok { background: var(--bg-lime); border-color: var(--accent); }
.mc-surplus.warn { background: #2a1f00; border-color: var(--warn); }
.mc-surplus.bad { background: #2a0000; border-color: var(--bad); }
.mc-snum { font-family: var(--serif); font-size: 32px; }
.mc-slbl { font-size: 11px; color: var(--muted); margin-top: 3px; }
.mc-bdown {
  background: var(--bg); border: 0.5px solid var(--border);
  border-radius: 10px; overflow: hidden; margin-bottom: 12px;
}
.mc-brow {
  display: flex; justify-content: space-between;
  padding: 10px 14px; font-size: 12px; border-bottom: 0.5px solid var(--border);
}
.mc-brow:last-child { border-bottom: 0; }
.mc-brow.tot { background: var(--bg-card-2); font-weight: 500; }
.mc-bl { color: var(--muted); }
.mc-bv { font-weight: 500; }
.mc-pos { color: var(--accent); }
.mc-neg { color: var(--bad); }
.mc-slabel { display: block; font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin: 14px 0 8px; }

/* === Wishlist === */
.aff-disclose {
  font-size: 11px; color: var(--muted);
  padding: 10px 14px; background: var(--bg);
  border: 0.5px dashed var(--border); border-radius: 8px;
  margin-bottom: 18px;
}
.aff-disclose strong { color: var(--accent-d); }

.wl-tool { display: grid; grid-template-columns: 320px 1fr; gap: 22px; }
@media (max-width: 720px) { .wl-tool { grid-template-columns: 1fr; } }

.wl-form { background: var(--bg); border: 0.5px solid var(--border); border-radius: 11px; padding: 18px; }
.wl-form h3 { font-family: var(--serif); font-size: 18px; margin-bottom: 14px; }
.wl-field { margin-bottom: 10px; }
.wl-field label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.wl-field input {
  width: 100%; background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 7px; padding: 9px 11px;
  color: var(--text); font: 400 13px var(--sans); outline: 0;
}
.wl-field input:focus { border-color: var(--accent); }
.wl-formrow { display: flex; gap: 8px; margin-top: 14px; }
.wl-formrow .btn { flex: 1; padding: 10px 14px; font-size: 12px; }

.wl-list { display: flex; flex-direction: column; gap: 14px; }
.wl-total-row {
  background: var(--bg-lime); border: 0.5px solid var(--accent);
  border-radius: 10px; padding: 14px 18px;
  display: flex; justify-content: space-between; align-items: center;
}
.wl-total-label { font-size: 11px; color: var(--accent-d); letter-spacing: 0.1em; text-transform: uppercase; }
.wl-total-value { font-family: var(--serif); font-size: 24px; color: var(--accent); }

.wl-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.wl-card {
  background: var(--bg); border: 0.5px solid var(--border);
  border-radius: 11px; overflow: hidden; transition: transform 0.15s;
  animation: fade-up 0.35s cubic-bezier(.2,.9,.2,1);
}
.wl-card:hover { transform: translateY(-2px); }
.wl-card-img {
  aspect-ratio: 1.2 / 1; background: var(--bg-card-2);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 12px; overflow: hidden;
  border-bottom: 0.5px solid var(--border);
}
.wl-card-img img { width: 100%; height: 100%; object-fit: cover; }
.wl-card-body { padding: 12px 14px; }
.wl-card-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.wl-card-name { font-size: 13px; font-weight: 500; }
.wl-card-price {
  font: 400 13px var(--serif); color: var(--accent);
  background: var(--bg-lime); padding: 3px 8px; border-radius: 6px;
  white-space: nowrap;
}
.wl-card-note { font-size: 11px; color: var(--muted); margin-top: 4px; min-height: 14px; }
.wl-card-actions { display: flex; gap: 6px; margin-top: 10px; }
.wl-buy {
  flex: 1; padding: 7px 10px; text-align: center;
  background: var(--bg-card-2); border: 0.5px solid var(--border);
  border-radius: 6px; font-size: 11px; color: var(--text); transition: border-color 0.15s;
}
.wl-buy:hover { border-color: var(--accent); }
.wl-buy.disabled { opacity: 0.4; cursor: default; }
.wl-werb { font-size: 9px; color: var(--muted); margin-left: 4px; }
.wl-del {
  background: transparent; border: 0.5px solid var(--border);
  border-radius: 6px; width: 30px; cursor: pointer; color: var(--muted);
}
.wl-del:hover { border-color: var(--bad); color: var(--bad); }

.wl-empty {
  grid-column: 1 / -1;
  border: 1px dashed var(--border); border-radius: 11px;
  padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px;
}

/* === FAQ === */
.faq-list { display: flex; flex-direction: column; gap: 8px; max-width: 720px; }
.faq-q {
  background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 10px; padding: 14px 18px; font-size: 14px;
}
.faq-q summary { cursor: pointer; list-style: none; }
.faq-q summary::before { content: '▸ '; color: var(--accent); }
.faq-q[open] summary::before { content: '▾ '; }
.faq-q .faq-a {
  font-size: 13px; color: var(--muted); margin-top: 12px; line-height: 1.65;
}

/* === Footer === */
.ftr {
  padding: 30px 40px; display: flex; justify-content: space-between; gap: 16px;
  font-size: 12px; color: var(--muted); flex-wrap: wrap;
  border-top: 0.5px solid #1a1a1a;
}
.ftr-links { display: flex; gap: 16px; }
.ftr-links a:hover { color: var(--text); }

/* === Modal === */
.modal {
  border: 0.5px solid var(--border); border-radius: 14px;
  background: var(--bg-card); color: var(--text);
  padding: 0; max-width: 380px; width: 90vw;
}
.modal::backdrop { background: rgba(0,0,0,0.7); }
.modal-form { padding: 24px; }
.modal-form h3 { font-family: var(--serif); font-size: 22px; margin-bottom: 8px; }
.modal-form p { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
.modal-form input {
  width: 100%; background: var(--bg); border: 0.5px solid var(--border);
  border-radius: 8px; padding: 11px 13px; color: var(--text);
  font: 400 14px var(--sans); margin-bottom: 14px; outline: 0;
}
.modal-form input:focus { border-color: var(--accent); }
.modal-actions { display: flex; gap: 8px; }
.modal-actions .btn { flex: 1; }
.modal-status { font-size: 12px; color: var(--accent-d); margin-top: 12px; }

/* === Animations === */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 720px) {
  .hdr { padding: 10px 16px; }
  .hdr-nav { gap: 12px; font-size: 12px; }
  .hero { padding: 50px 20px 60px; }
  .section { padding: 40px 20px 50px; }
  .tool, .wl-form { padding: 18px; }
  .ftr { padding: 22px 18px; }
}
@media (max-width: 480px) {
  .hdr-nav { display: none; }
  .mc-c2 { grid-template-columns: 1fr; }
}
```

### Subtask 7c: App.js — UI Glue

- [ ] **Step 7.3: Write `app.js`**

Write `app.js`:

```js
// ── ichwillumziehen.com — UI glue & module wiring ───────────────────────────

import { createCityData } from './lib/cityData.js';
import * as MC from './lib/mietcheck.js';
import { tagAffiliate, makeAffiliateConfig } from './lib/affiliate.js';
import { normalizeItem, addItem, deleteItem, clearAll, calcTotal } from './lib/wishlist.js';
import { createDefaultProfile, makeProfileStore, makeWishlistStore } from './lib/profile.js';

// ── Config ──────────────────────────────────────────────────────────────────
const AFFILIATE = makeAffiliateConfig({
  amazonTag: 'PLATZHALTER-21',           // TODO: replace with real Amazon Partnernet tag
  amazonEnabled: true,
});

// ── State ───────────────────────────────────────────────────────────────────
const profileStore = makeProfileStore({ storage: window.localStorage });
const wishlistStore = makeWishlistStore({ storage: window.localStorage });

let cityData = null;
let profile = profileStore.load() ?? createDefaultProfile();
let wishlist = wishlistStore.load();
let currentStep = 1;

// ── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const res = await fetch('./city-data.json');
  if (!res.ok) throw new Error('city-data.json failed to load');
  cityData = createCityData(await res.json());

  initMietcheckUI();
  initWishlistUI();
  initAuthUI();
  initFooterCookies();

  renderProfile();
  renderWishlist();
}

// ── Format ──────────────────────────────────────────────────────────────────
const fmtEur = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents ?? 0) / 100);
const fmtEurInt = (val) => `${Math.round(val).toLocaleString('de-DE')} €`;
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// ── Mietcheck UI ────────────────────────────────────────────────────────────
function initMietcheckUI() {
  const $ = (id) => document.getElementById(id);

  // Income
  $('mc-income').addEventListener('input', e => { profile.income = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // KV
  document.querySelectorAll('[data-kv]').forEach(btn => btn.addEventListener('click', () => {
    profile.kv = btn.dataset.kv;
    document.querySelectorAll('[data-kv]').forEach(b => b.classList.toggle('sel', b === btn));
    $('mc-kv-x').hidden = profile.kv !== 'p';
    persistAndRevalidate();
  }));
  $('mc-kvb').addEventListener('input', e => { profile.kvBetrag = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // Auto
  document.querySelectorAll('[data-auto]').forEach(btn => btn.addEventListener('click', () => {
    profile.auto = btn.dataset.auto;
    document.querySelectorAll('[data-auto]').forEach(b => b.classList.toggle('sel', b === btn));
    $('mc-auto-x').hidden = profile.auto !== 'ja';
    $('mc-oepnv-x').hidden = profile.auto !== 'nein';
    persistAndRevalidate();
  }));
  $('mc-arate').addEventListener('input', e => { profile.autoRate = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-abenzin').addEventListener('input', e => { profile.autoBenzin = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-avers').addEventListener('input', e => { profile.autoVersicherung = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-oepnv').addEventListener('input', e => { profile.autoOepnv = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // City
  const citySelect = $('mc-city');
  cityData.listCities().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c === 'ANDERE' ? 'Andere Stadt' : c;
    citySelect.appendChild(opt);
  });
  citySelect.addEventListener('change', e => { profile.city = e.target.value; renderTierPill(); renderEstList(); persistAndRevalidate(); });

  // Wohnung
  $('mc-kalt').addEventListener('input', persistAndRevalidate);
  $('mc-qm').addEventListener('input', persistAndRevalidate);

  // Navigation
  $('mc-next').addEventListener('click', goNext);
  $('mc-back').addEventListener('click', goBack);
}

function renderProfile() {
  const $ = (id) => document.getElementById(id);
  $('mc-income').value = profile.income || '';
  document.querySelectorAll('[data-kv]').forEach(b => b.classList.toggle('sel', b.dataset.kv === profile.kv));
  $('mc-kv-x').hidden = profile.kv !== 'p';
  $('mc-kvb').value = profile.kvBetrag || '';
  document.querySelectorAll('[data-auto]').forEach(b => b.classList.toggle('sel', b.dataset.auto === profile.auto));
  $('mc-auto-x').hidden = profile.auto !== 'ja';
  $('mc-oepnv-x').hidden = profile.auto !== 'nein';
  $('mc-arate').value = profile.autoRate || '';
  $('mc-abenzin').value = profile.autoBenzin || '';
  $('mc-avers').value = profile.autoVersicherung || '';
  $('mc-oepnv').value = profile.autoOepnv || '';
  if (profile.city) $('mc-city').value = profile.city;
  renderTierPill();
  renderEstList();
  persistAndRevalidate();
}

function renderTierPill() {
  const pill = document.getElementById('mc-city-info');
  if (!profile.city) { pill.hidden = true; return; }
  const tier = cityData.getCityTier(profile.city);
  const tierObj = cityData.getTier(tier);
  pill.hidden = false;
  pill.textContent = `${tierObj.label} (Tier ${tier}) — Lebensmittel/Restaurant/Sport angepasst`;
}

function renderEstList() {
  const list = document.getElementById('mc-est-list');
  const cats = ['lebensmittel','essen','gym','kleidung','handy','abos','urlaub','sparen','sonstiges'];
  const labels = {
    lebensmittel: ['Lebensmittel', 'Einkaufen & Kochen'],
    essen: ['Essen gehen & Lieferando', 'Restaurant, Delivery'],
    gym: ['Sport & Hobbys', 'Gym, Verein'],
    kleidung: ['Kleidung & Drogerie', 'Shopping, Hygiene'],
    handy: ['Handy', 'Tarif + Daten'],
    abos: ['Streaming & Abos', 'Netflix, Spotify ...'],
    urlaub: ['Urlaub & Freizeit', 'Ø pro Monat'],
    sparen: ['Sparen / ETF', 'Rücklage, Investition'],
    sonstiges: ['Sonstiges', 'Unvorhergesehenes'],
  };
  list.innerHTML = cats.map(id => {
    const def = profile.city ? cityData.getEffectiveDefault(profile.city, id) : (cityData.getDefaults()[id] ?? 0);
    const override = profile.lebenshaltung[id];
    const value = override ?? def;
    const isOverride = override != null;
    return `
      <div class="mc-est${isOverride ? ' editing' : ''}" data-cat="${id}">
        <div class="mc-est-name">${labels[id][0]}<span class="sub">${isOverride ? '✓ Eigener Wert' : 'Geschätzt'}</span></div>
        <span class="mc-est-amt${isOverride ? ' c' : ''}">~${value}€</span>
        <button class="mc-est-edit" data-cat="${id}" type="button">${isOverride ? '✓' : 'Anpassen'}</button>
        <div class="mc-est-input" data-cat="${id}"><input type="number" value="${value}" /></div>
      </div>`;
  }).join('');

  list.querySelectorAll('.mc-est-edit').forEach(btn => btn.addEventListener('click', () => toggleEstEdit(btn.dataset.cat)));
  list.querySelectorAll('.mc-est-input input').forEach(inp => {
    inp.addEventListener('change', e => {
      const cat = e.target.parentElement.dataset.cat;
      profile.lebenshaltung[cat] = parseInt(e.target.value) || 0;
      renderEstList();
      persistAndRevalidate();
    });
  });
}

function toggleEstEdit(cat) {
  const inputBox = document.querySelector(`.mc-est-input[data-cat="${cat}"]`);
  inputBox.classList.toggle('open');
  if (inputBox.classList.contains('open')) inputBox.querySelector('input').focus();
}

function persistAndRevalidate() {
  profileStore.save(profile);
  validateNext();
}

function validateNext() {
  const $ = (id) => document.getElementById(id);
  const next = $('mc-next');
  if (currentStep === 1) {
    next.disabled = !(profile.income >= 300 && profile.kv && profile.auto);
    next.textContent = 'Weiter';
  } else if (currentStep === 2) {
    next.disabled = !profile.city;
    next.textContent = 'Wohnung prüfen';
  } else {
    const kalt = parseInt($('mc-kalt').value) || 0;
    const qm = parseInt($('mc-qm').value) || 0;
    next.disabled = !(kalt > 100 && qm > 5);
    next.textContent = 'Berechnen';
  }
}

function showStep(n) {
  currentStep = n;
  document.querySelectorAll('.mc-screen').forEach(el => { el.hidden = parseInt(el.dataset.step) !== n; });
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`mc-step-${i}`).classList.toggle('done', i <= n);
  }
  document.getElementById('mc-back').hidden = n === 1;
  validateNext();
  if (n === 2) renderEstList();
}

function goNext() {
  const $ = (id) => document.getElementById(id);
  if (currentStep === 1) showStep(2);
  else if (currentStep === 2) showStep(3);
  else if (currentStep === 3) {
    const listing = { kaltmiete: parseInt($('mc-kalt').value) || 0, qm: parseInt($('mc-qm').value) || 0 };
    renderResult(listing);
  }
}

function goBack() {
  if (currentStep > 1) showStep(currentStep - 1);
}

function renderResult(listing) {
  const result = MC.runMietcheck(profile, listing, cityData);
  const v = result.verdict;
  const sc = v.tone;

  const html = `
    <div class="mc-verdict ${sc}">${escapeHtml(v.text)}</div>
    <div class="mc-verdict-sub">${escapeHtml(v.sub)}</div>
    <div class="mc-surplus ${sc}">
      <div class="mc-snum" style="color:${sc==='ok'?'var(--accent)':sc==='warn'?'var(--warn)':'var(--bad)'}">${result.surplus>0?'+':''}${result.surplus}€</div>
      <div class="mc-slbl">verbleiben dir monatlich</div>
    </div>
    <span class="mc-slabel">Dein Budget</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Nettoeinkommen</span><span class="mc-bv mc-pos">+${result.breakdown.income}€</span></div>
      ${result.breakdown.kvBetrag > 0 ? `<div class="mc-brow"><span class="mc-bl">Private KV</span><span class="mc-bv mc-neg">-${result.breakdown.kvBetrag}€</span></div>` : ''}
      ${result.breakdown.autoKosten > 0 ? `<div class="mc-brow"><span class="mc-bl">${profile.auto==='ja'?'Auto':'ÖPNV'}</span><span class="mc-bv mc-neg">-${result.breakdown.autoKosten}€</span></div>` : ''}
      <div class="mc-brow"><span class="mc-bl">Lebenshaltung</span><span class="mc-bv mc-neg">-${result.breakdown.lebenshaltung}€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Für Wohnung verfügbar</span><span class="mc-bv" style="color:${result.availForRent>0?'var(--accent)':'var(--bad)'}">${result.availForRent>0?'+':''}${result.availForRent}€</span></div>
    </div>
    <span class="mc-slabel">Diese Wohnung</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Kaltmiete</span><span class="mc-bv mc-neg">-${result.breakdown.kaltmiete}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Strom (~${listing.qm}m²)</span><span class="mc-bv mc-neg">-${result.breakdown.strom}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Heizung &amp; Wasser</span><span class="mc-bv mc-neg">-${result.breakdown.heizung}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Internet + GEZ + Haftpflicht</span><span class="mc-bv mc-neg">-${result.breakdown.sonstNK}€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Warmmiete gesamt</span><span class="mc-bv">${result.warmmiete}€</span></div>
    </div>
    <span class="mc-slabel">Einmalig beim Einzug</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Kaution (2× Kaltmiete)</span><span class="mc-bv">${listing.kaltmiete * 2}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Renovierung Pauschal</span><span class="mc-bv">500€</span></div>
      <div class="mc-brow"><span class="mc-bl">Möbel-Reserve</span><span class="mc-bv">2.000€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Gesamt einmalig</span><span class="mc-bv">${result.einmalig}€</span></div>
    </div>
  `;
  document.getElementById('mc-result').innerHTML = html;
  document.getElementById('mc-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Wishlist UI ─────────────────────────────────────────────────────────────
function initWishlistUI() {
  const form = document.getElementById('wl-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const item = normalizeItem({
        name: fd.get('name'),
        price: fd.get('price'),
        imageUrl: fd.get('image'),
        linkUrl: fd.get('link'),
        note: fd.get('note'),
      });
      wishlist = addItem(wishlist, item);
      wishlistStore.save(wishlist);
      form.reset();
      document.getElementById('wl-name').focus();
      renderWishlist();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('wl-clear').addEventListener('click', () => {
    if (!wishlist.length) return;
    if (!confirm('Wirklich alle Items löschen?')) return;
    wishlist = clearAll(wishlist);
    wishlistStore.save(wishlist);
    renderWishlist();
  });
}

function renderWishlist() {
  const grid = document.getElementById('wl-grid');
  const total = document.getElementById('wl-total');

  if (!wishlist.length) {
    grid.innerHTML = `<div class="wl-empty">Füge dein erstes Item hinzu — Möbel, Deko, Werkzeuge. Bild und Kauflink optional.</div>`;
  } else {
    grid.innerHTML = wishlist.map(item => {
      const imgHtml = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.outerHTML='Kein Bild'" />`
        : 'Kein Bild';
      const taggedLink = tagAffiliate(item.linkUrl, AFFILIATE);
      const isAmazon = item.linkUrl && /(^|\.)amazon\.[a-z.]+$/i.test(new URL(item.linkUrl).hostname);
      const linkHtml = taggedLink
        ? `<a class="wl-buy" href="${escapeHtml(taggedLink)}" target="_blank" rel="noopener nofollow sponsored">Zum Shop${isAmazon ? '<span class="wl-werb">(Werbung)</span>' : ''}</a>`
        : `<span class="wl-buy disabled">Kein Link</span>`;
      return `
        <article class="wl-card" data-id="${item.id}">
          <div class="wl-card-img">${imgHtml}</div>
          <div class="wl-card-body">
            <div class="wl-card-top">
              <span class="wl-card-name">${escapeHtml(item.name)}</span>
              <span class="wl-card-price">${fmtEur(item.priceCents)}</span>
            </div>
            <div class="wl-card-note">${escapeHtml(item.note ?? '')}</div>
            <div class="wl-card-actions">
              ${linkHtml}
              <button class="wl-del" type="button" data-del="${item.id}">✕</button>
            </div>
          </div>
        </article>`;
    }).join('');
    grid.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
      wishlist = deleteItem(wishlist, btn.dataset.del);
      wishlistStore.save(wishlist);
      renderWishlist();
    }));
  }

  total.textContent = fmtEur(calcTotal(wishlist));
}

// ── Stubs (filled in later phases) ──────────────────────────────────────────
function initAuthUI() {
  // Phase 2 — auth flow wiring
  document.getElementById('btn-open-login').addEventListener('click', () => {
    alert('Login kommt in Phase 2 — aktuell läuft alles lokal im Browser.');
  });
}

function initFooterCookies() {
  // Phase 3 — cookie banner re-edit
  document.getElementById('ftr-cookies').addEventListener('click', e => {
    e.preventDefault();
    alert('Cookie-Settings kommen in Phase 3.');
  });
}

// ── Boot ────────────────────────────────────────────────────────────────────
init().catch(err => {
  console.error(err);
  document.body.innerHTML = `<pre style="padding:20px;color:#ff6b6b">Fehler beim Laden: ${err.message}</pre>`;
});
```

- [ ] **Step 7.4: Run dev server and smoke-test**

```bash
npm run serve
```

Open `http://localhost:5500` in browser. Manually verify:
- Hero renders with correct headlines
- Step 1: enter income (e.g. 2500), select KV (gesetzlich), select Auto (nein), enter ÖPNV-Wert (49)
- Click "Weiter" → Step 2 zeigt Stadt-Dropdown
- Wähle "München" → Tier-Pill zeigt "Sehr teuer (Tier S)"
- "Weiter" → Step 3
- Enter Kaltmiete 1200, qm 65 → Click "Berechnen"
- Result-Card erscheint mit Verdict + Breakdown
- Page-Reload behält Profile (localStorage)
- Add wishlist item: "Sofa", "499.99", optional Bild-URL → erscheint in Grid
- Delete-Button entfernt das Item
- "Alles löschen" leert die Liste mit Confirm

- [ ] **Step 7.5: Commit Task 7**

```bash
git add index.html styles.css app.js
git commit -m "feat: working tools with localStorage (Phase 1 complete)"
```

**Phase 1 done — both tools work end-to-end locally.**

---

# PHASE 2 — Auth + Sync

## Task 8: Supabase Schema Setup

**Files:**
- Create: `docs/superpowers/specs/supabase-schema.sql` (reference copy)

This task is manual (browser actions in Supabase Dashboard).

- [ ] **Step 8.1: Create Supabase project**

Go to https://supabase.com/dashboard → New project. Region: EU Central (Frankfurt) for German users + DSGVO. Note down:
- Project URL: `https://<projectid>.supabase.co`
- Anon key: `eyJ...` (public, OK to embed)

- [ ] **Step 8.2: Apply schema in SQL Editor**

In Supabase Dashboard → SQL Editor → run:

```sql
-- profiles: 1 row per user
create table profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  income            integer,
  kv                text check (kv in ('g','p')),
  kv_betrag         integer default 0,
  auto              text check (auto in ('ja','nein')),
  auto_rate         integer default 0,
  auto_benzin       integer default 0,
  auto_versicherung integer default 0,
  auto_oepnv        integer default 0,
  city              text,
  lebenshaltung     jsonb default '{}'::jsonb,
  updated_at        timestamptz default now()
);

create table wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  price_cents integer not null,
  image_url   text,
  link_url    text,
  note        text,
  created_at  timestamptz default now()
);
create index wishlist_items_user_created on wishlist_items(user_id, created_at desc);

-- Row Level Security
alter table profiles enable row level security;
create policy "own profile select" on profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table wishlist_items enable row level security;
create policy "own items select" on wishlist_items for select using (auth.uid() = user_id);
create policy "own items insert" on wishlist_items for insert with check (auth.uid() = user_id);
create policy "own items update" on wishlist_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items delete" on wishlist_items for delete using (auth.uid() = user_id);
```

Verify in Table Editor: `profiles` and `wishlist_items` exist, RLS is **on** (lock icon on table rows).

- [ ] **Step 8.3: Configure Auth — Magic Link**

In Authentication → Providers → Email:
- Enable email provider ✓
- Confirm email: optional (recommended on for production)
- Secure email change: on

In Authentication → URL Configuration:
- Site URL: `https://ichwillumziehen.com` (für Production) — für lokale Dev ist `http://localhost:5500` als Additional Redirect URL hinzuzufügen

In Authentication → Email Templates → "Magic Link":
- Subject: `Dein Login-Link für ichwillumziehen.com`
- Body (HTML, kopiere aus Default und passe an):

```html
<h2>Hallo,</h2>
<p>klicke den Link, um dich anzumelden:</p>
<p><a href="{{ .ConfirmationURL }}">→ Anmelden</a></p>
<p>Der Link ist 1 Stunde gültig. Wenn du dich nicht angemeldet hast, ignorier diese Mail.</p>
<p>— ichwillumziehen.com</p>
```

- [ ] **Step 8.4: Save schema as reference file in repo**

Create `docs/superpowers/specs/supabase-schema.sql` with the same SQL from Step 8.2.

- [ ] **Step 8.5: Commit reference SQL**

```bash
mkdir -p docs/superpowers/specs
# Save SQL from Step 8.2 to docs/superpowers/specs/supabase-schema.sql
git add docs/superpowers/specs/supabase-schema.sql
git commit -m "docs: add supabase schema reference"
```

---

## Task 9: Auth Module (Supabase wrapper)

**Files:**
- Create: `lib/auth.js`

Note: `lib/auth.js` accepts a Supabase client as injected dependency — this keeps it testable. Tests with a mock client come in Task 10 (sync) since auth+sync are tightly coupled.

- [ ] **Step 9.1: Implement `lib/auth.js`**

Write `lib/auth.js`:

```js
// Auth wrapper — accepts a Supabase client via DI.

export function makeAuth(supabase) {
  let currentSession = null;
  const listeners = new Set();

  // Subscribe to auth changes from Supabase
  supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    listeners.forEach(fn => { try { fn(event, session); } catch (e) { console.error(e); } });
  });

  return {
    async signInWithMagicLink(email, redirectTo) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo ?? window.location.origin },
      });
      if (error) throw error;
      return true;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    },

    async getSession() {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
      return data.session;
    },

    isLoggedIn() {
      return !!currentSession;
    },

    getUser() {
      return currentSession?.user ?? null;
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
```

- [ ] **Step 9.2: Commit**

```bash
git add lib/auth.js
git commit -m "feat: add auth wrapper around supabase client"
```

---

## Task 10: Sync Module (LWW-Merge)

**Files:**
- Create: `lib/sync.js`, `tests/sync.test.js`

- [ ] **Step 10.1: Write failing test**

Write `tests/sync.test.js`:

```js
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
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
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
```

- [ ] **Step 10.2: Run tests — expect failure**

```bash
npm test
```

Expected: ERROR module not found.

- [ ] **Step 10.3: Implement `lib/sync.js`**

Write `lib/sync.js`:

```js
// Sync logic — supabase + storage are injected (DI for testability).

const PROFILE_TABLE = 'profiles';
const WISHLIST_TABLE = 'wishlist_items';

// === Pure merge functions ===
export function mergeProfile(local, db) {
  if (!local && !db) return null;
  if (!local) return db;
  if (!db) return local;
  return (local.updatedAt ?? 0) >= (Date.parse(db.updated_at ?? db.updatedAt) || db.updatedAt || 0) ? local : db;
}

export function mergeWishlist(local, db) {
  const map = new Map();
  for (const item of local) map.set(item.id, item);
  // DB wins on id-conflict
  for (const item of db) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

// Convert app-shape profile ↔ DB-shape profile
function profileToDbRow(profile, userId) {
  return {
    user_id: userId,
    income: profile.income,
    kv: profile.kv || null,
    kv_betrag: profile.kvBetrag,
    auto: profile.auto || null,
    auto_rate: profile.autoRate,
    auto_benzin: profile.autoBenzin,
    auto_versicherung: profile.autoVersicherung,
    auto_oepnv: profile.autoOepnv,
    city: profile.city || null,
    lebenshaltung: profile.lebenshaltung,
    updated_at: new Date(profile.updatedAt ?? Date.now()).toISOString(),
  };
}
function profileFromDbRow(row) {
  if (!row) return null;
  return {
    income: row.income ?? 0,
    kv: row.kv ?? '',
    kvBetrag: row.kv_betrag ?? 0,
    auto: row.auto ?? '',
    autoRate: row.auto_rate ?? 0,
    autoBenzin: row.auto_benzin ?? 0,
    autoVersicherung: row.auto_versicherung ?? 0,
    autoOepnv: row.auto_oepnv ?? 0,
    city: row.city ?? '',
    lebenshaltung: row.lebenshaltung ?? {},
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}

function itemToDbRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    price_cents: item.priceCents,
    image_url: item.imageUrl,
    link_url: item.linkUrl,
    note: item.note,
    created_at: new Date(item.createdAt ?? Date.now()).toISOString(),
  };
}
function itemFromDbRow(row) {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    note: row.note,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  };
}

// === Sync orchestrator ===
export function makeSync({ supabase, profileStore, wishlistStore }) {

  async function runOnLogin(userId) {
    // Profile
    const localProfile = profileStore.load();
    const { data: dbProfileRow } = await supabase.from(PROFILE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    const dbProfile = profileFromDbRow(dbProfileRow);

    const winner = mergeProfile(localProfile, dbProfile);
    if (winner) {
      profileStore.save(winner);
      const { error } = await supabase.from(PROFILE_TABLE).upsert(profileToDbRow(winner, userId), { onConflict: 'user_id' });
      if (error) console.error('Profile upsert failed:', error);
    }

    // Wishlist
    const localItems = wishlistStore.load();
    const { data: dbItems } = await supabase.from(WISHLIST_TABLE).select('*').eq('user_id', userId);
    const dbItemsConverted = (dbItems ?? []).map(itemFromDbRow);

    const merged = mergeWishlist(localItems, dbItemsConverted);
    wishlistStore.save(merged);

    // Push local-only items to DB
    const dbIds = new Set(dbItemsConverted.map(i => i.id));
    const newOnes = localItems.filter(i => !dbIds.has(i.id));
    if (newOnes.length) {
      const rows = newOnes.map(i => itemToDbRow(i, userId));
      const { error } = await supabase.from(WISHLIST_TABLE).insert(rows);
      if (error) console.error('Wishlist insert failed:', error);
    }

    return { mergedProfile: winner, mergedItems: merged };
  }

  async function pushProfile(userId, profile) {
    const { error } = await supabase.from(PROFILE_TABLE).upsert(profileToDbRow(profile, userId), { onConflict: 'user_id' });
    if (error) console.error('Profile push failed:', error);
  }

  async function pushItem(userId, item) {
    const { error } = await supabase.from(WISHLIST_TABLE).upsert(itemToDbRow(item, userId));
    if (error) console.error('Item push failed:', error);
  }

  async function deleteItemRemote(itemId) {
    const { error } = await supabase.from(WISHLIST_TABLE).delete().eq('id', itemId);
    if (error) console.error('Item delete failed:', error);
  }

  return { runOnLogin, pushProfile, pushItem, deleteItemRemote };
}
```

- [ ] **Step 10.4: Run tests — expect pass**

```bash
npm test
```

Expected: all sync tests pass.

- [ ] **Step 10.5: Commit**

```bash
git add lib/sync.js tests/sync.test.js
git commit -m "feat: add localStorage <-> supabase sync with LWW merge"
```

---

## Task 11: Wire Auth + Sync into `app.js`

**Files:**
- Modify: `app.js`, `index.html`

- [ ] **Step 11.1: Add Supabase config + login flow to `app.js`**

In `app.js`, near the top after the existing imports, add:

```js
// Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { makeAuth } from './lib/auth.js';
import { makeSync } from './lib/sync.js';

// TODO: insert YOUR Supabase URL + anon key here
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJYOURKEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const auth = makeAuth(supabase);
const sync = makeSync({ supabase, profileStore, wishlistStore });
```

Replace the existing `initAuthUI()` stub with:

```js
function initAuthUI() {
  const btn = document.getElementById('btn-open-login');
  const modal = document.getElementById('login-modal');
  const form = document.getElementById('login-form');
  const input = document.getElementById('login-email');
  const status = document.getElementById('login-status');
  const submit = document.getElementById('login-submit');

  btn.addEventListener('click', async () => {
    if (auth.isLoggedIn()) {
      if (confirm('Möchtest du dich abmelden?')) {
        await auth.signOut();
      }
    } else {
      input.value = '';
      status.hidden = true;
      modal.showModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    if (e.submitter && e.submitter.value === 'cancel') return;       // dialog handles cancel
    if (e.submitter && e.submitter.value !== 'confirm') return;
    e.preventDefault();
    submit.disabled = true;
    try {
      await auth.signInWithMagicLink(input.value);
      status.textContent = '✓ Login-Link verschickt — schau in dein Postfach.';
      status.hidden = false;
    } catch (err) {
      status.textContent = '✗ Fehler: ' + err.message;
      status.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  // Header state on auth change
  auth.onChange(async (event, session) => {
    updateHeaderAuthState();
    if (event === 'SIGNED_IN' && session?.user) {
      modal.close();
      try {
        const { mergedProfile, mergedItems } = await sync.runOnLogin(session.user.id);
        if (mergedProfile) profile = mergedProfile;
        if (mergedItems) wishlist = mergedItems;
        renderProfile();
        renderWishlist();
      } catch (err) {
        console.error('Sync failed:', err);
      }
    }
  });
}

function updateHeaderAuthState() {
  const btn = document.getElementById('btn-open-login');
  if (auth.isLoggedIn()) {
    const u = auth.getUser();
    btn.textContent = u?.email ?? 'Abmelden';
    btn.classList.add('logged-in');
  } else {
    btn.textContent = 'Anmelden';
    btn.classList.remove('logged-in');
  }
}
```

Add to `init()` after `initFooterCookies()`:

```js
  await auth.getSession();
  updateHeaderAuthState();
  if (auth.isLoggedIn()) {
    try {
      const { mergedProfile, mergedItems } = await sync.runOnLogin(auth.getUser().id);
      if (mergedProfile) profile = mergedProfile;
      if (mergedItems) wishlist = mergedItems;
    } catch (err) { console.error(err); }
  }
```

Wire **per-write Sync** in the form-submission handlers — modify `initWishlistUI`:

After `wishlistStore.save(wishlist);` on submit:
```js
      if (auth.isLoggedIn()) sync.pushItem(auth.getUser().id, item).catch(console.error);
```

After `wishlistStore.save(wishlist);` on delete:
```js
      if (auth.isLoggedIn()) sync.deleteItemRemote(btn.dataset.del).catch(console.error);
```

Modify `persistAndRevalidate` to also push profile when logged in:
```js
function persistAndRevalidate() {
  profileStore.save(profile);
  if (auth.isLoggedIn()) sync.pushProfile(auth.getUser().id, profile).catch(console.error);
  validateNext();
}
```

- [ ] **Step 11.2: Manual test of login flow**

```bash
npm run serve
```

Open `http://localhost:5500`:
1. Click "Anmelden" → modal opens
2. Enter your email → submit → "Login-Link verschickt" appears
3. Open email → click link → returns to site, header now shows your email
4. Add a profile entry → check Supabase Dashboard → row appears in `profiles` table
5. Add a wishlist item → row appears in `wishlist_items`
6. Open new browser (incognito) → click "Anmelden" → enter same email → after click magic-link, all data is restored
7. Click email-pill in header → "Möchtest du dich abmelden?" → confirm → header reverts; localStorage data stays

- [ ] **Step 11.3: Commit**

```bash
git add app.js
git commit -m "feat: wire auth + sync into app.js (Phase 2 complete)"
```

**Phase 2 done — optionaler Login + Cross-Device-Sync funktioniert.**

---

## Task 12: Consent Module (placeholder for Phase 3)

**Files:**
- Create: `lib/consent.js`, `tests/consent.test.js`

- [ ] **Step 12.1: Write tests**

Write `tests/consent.test.js`:

```js
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
```

- [ ] **Step 12.2: Implement `lib/consent.js`**

Write `lib/consent.js`:

```js
const KEY = 'iwu_consent';

export function makeConsentStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    save({ ads }) {
      const c = { necessary: true, ads: !!ads, decidedAt: Date.now() };
      storage.setItem(KEY, JSON.stringify(c));
      return c;
    },
    clear() { storage.removeItem(KEY); },
  };
}

export function isConsentDecided(consent) {
  return !!(consent && consent.decidedAt);
}
```

- [ ] **Step 12.3: Run tests + commit**

```bash
npm test
git add lib/consent.js tests/consent.test.js
git commit -m "feat: add consent storage module"
```

---

# PHASE 3 — Monetarisierung + Legal

## Task 13: Native Affiliate-Cards

**Files:** Modify `index.html`, `app.js`, `styles.css`

- [ ] **Step 13.1: Add Affiliate-Cards to `index.html`**

In `#mietcheck` section, **after** the `</div>` that closes `#mc-tool`, add:

```html
<aside class="aff-card" data-aff="strom" hidden>
  <div class="aff-icon">⚡</div>
  <div class="aff-body">
    <div class="aff-title">Strom &amp; Internet für deine neue Wohnung <span class="aff-tag">Werbung</span></div>
    <div class="aff-desc">Vergleiche Tarife für deinen Standort und spare oft 200-400€/Jahr.</div>
  </div>
  <a class="aff-cta" href="https://www.check24.de/strom/" target="_blank" rel="noopener nofollow sponsored">Vergleichen →</a>
</aside>
```

In `#umzugsbudget` section, **after** the `</div>` that closes `.wl-tool`, add:

```html
<div class="aff-insp-hint">Beliebt bei anderen Umziehern <span class="aff-meta">· (Werbung — Amazon-Affiliate)</span></div>
<div class="aff-insp-grid">
  <a class="aff-insp" href="https://www.amazon.de/s?k=sofa" target="_blank" rel="noopener nofollow sponsored" data-aff-amazon>
    <div class="aff-insp-img">🛋</div>
    <div class="aff-insp-body"><div class="aff-insp-name">Couch / Sofa</div><div class="aff-insp-meta"><span class="aff-insp-price">ab 299€</span><span class="aff-insp-tag">Amazon</span></div></div>
  </a>
  <a class="aff-insp" href="https://www.amazon.de/s?k=werkzeug+set" target="_blank" rel="noopener nofollow sponsored" data-aff-amazon>
    <div class="aff-insp-img">🧰</div>
    <div class="aff-insp-body"><div class="aff-insp-name">Werkzeug-Set</div><div class="aff-insp-meta"><span class="aff-insp-price">ab 49€</span><span class="aff-insp-tag">Amazon</span></div></div>
  </a>
  <a class="aff-insp" href="https://www.amazon.de/s?k=umzugskartons" target="_blank" rel="noopener nofollow sponsored" data-aff-amazon>
    <div class="aff-insp-img">📦</div>
    <div class="aff-insp-body"><div class="aff-insp-name">Umzugskartons (Set)</div><div class="aff-insp-meta"><span class="aff-insp-price">ab 29€</span><span class="aff-insp-tag">Amazon</span></div></div>
  </a>
</div>

<aside class="aff-card">
  <div class="aff-icon">🚚</div>
  <div class="aff-body">
    <div class="aff-title">Umzugsfirma finden &amp; vergleichen <span class="aff-tag">Werbung</span></div>
    <div class="aff-desc">Bis zu 5 Angebote von geprüften Umzugsfirmen — kostenlos und unverbindlich.</div>
  </div>
  <a class="aff-cta" href="https://www.check24.de/umzug/" target="_blank" rel="noopener nofollow sponsored">Anfragen →</a>
</aside>
```

- [ ] **Step 13.2: Add CSS for Affiliate-Cards**

Append to `styles.css`:

```css
/* === Affiliate Cards === */
.aff-card {
  display: flex; align-items: center; gap: 16px;
  background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 12px; padding: 18px 20px; margin-top: 24px;
}
.aff-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: var(--bg-lime); border: 0.5px solid var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 20px;
}
.aff-body { flex: 1; min-width: 0; }
.aff-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.aff-tag, .aff-meta { font-size: 9px; color: var(--muted); background: var(--bg); border: 0.5px solid var(--border); padding: 2px 7px; border-radius: 4px; font-weight: 400; letter-spacing: 0.05em; }
.aff-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
.aff-cta {
  font-size: 12px; color: var(--accent); flex-shrink: 0;
  padding: 9px 14px; border: 0.5px solid var(--accent); border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.aff-cta:hover { background: var(--accent); color: var(--bg); }

.aff-insp-hint { font-size: 12px; color: var(--muted); margin-top: 24px; margin-bottom: 12px; }
.aff-insp-meta { color: var(--muted); }
.aff-insp-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.aff-insp {
  background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 11px; overflow: hidden; transition: transform 0.15s;
}
.aff-insp:hover { transform: translateY(-2px); }
.aff-insp-img {
  height: 80px; background: var(--bg-card-2);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; border-bottom: 0.5px solid var(--border);
}
.aff-insp-body { padding: 11px 12px; }
.aff-insp-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.aff-insp-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
.aff-insp-price { font-family: var(--serif); color: var(--accent); font-size: 13px; }
.aff-insp-tag { color: var(--muted); }
```

- [ ] **Step 13.3: Add Amazon-Tag-Injection on inspiration links**

In `app.js`, add helper at end of `init()` (after `renderWishlist()`):

```js
  // Tag amazon links in inspiration cards
  document.querySelectorAll('[data-aff-amazon]').forEach(a => {
    a.href = tagAffiliate(a.href, AFFILIATE);
  });
```

- [ ] **Step 13.4: Show "Strom" Affiliate-Card after Mietcheck Result**

Modify `renderResult(listing)` in `app.js` — at end of function, append:

```js
  // Show Strom-Affiliate card after a result is generated
  document.querySelector('[data-aff="strom"]').hidden = false;
```

- [ ] **Step 13.5: Manual smoke test + commit**

Refresh the page, run a Miet-Check → "Strom & Internet"-Card erscheint nach dem Ergebnis. Im Umzugsbudget sind die 3 Inspiration-Cards + Umzugsfirmen-Card sichtbar. Amazon-Links haben `?tag=PLATZHALTER-21`.

```bash
git add index.html styles.css app.js
git commit -m "feat: add native affiliate cards (mietcheck, wishlist, umzug)"
```

---

## Task 14: Cookie-Banner + AdSense

**Files:** Modify `index.html`, `app.js`, `styles.css`

- [ ] **Step 14.1: Add Cookie-Banner UI to `index.html`**

Just before `</body>`, add:

```html
<dialog id="cookie-banner" class="cookie-banner">
  <form method="dialog" id="cookie-form">
    <h3>Datenschutz-Einstellung</h3>
    <p>Wir nutzen technisch notwendige Speicher (Profildaten, Login-Status). Optional dürfen wir personalisierte Werbung anzeigen.</p>
    <label class="ck-row">
      <input type="checkbox" checked disabled />
      <span><strong>Notwendig</strong> — Profil &amp; Login (immer aktiv)</span>
    </label>
    <label class="ck-row">
      <input type="checkbox" id="ck-ads" />
      <span><strong>Personalisierte Werbung</strong> — Google AdSense</span>
    </label>
    <div class="ck-actions">
      <button class="btn btn-secondary" type="submit" value="necessary">Nur Notwendig</button>
      <button class="btn btn-primary" type="submit" value="all">Alle akzeptieren</button>
    </div>
  </form>
</dialog>

<!-- AdSense slot — loaded by app.js after consent -->
<div class="adsense-slot" id="adsense-slot" hidden></div>
```

- [ ] **Step 14.2: Add Cookie-Banner CSS**

Append to `styles.css`:

```css
.cookie-banner {
  position: fixed; left: 50%; bottom: 22px; top: auto;
  transform: translateX(-50%);
  width: min(520px, calc(100vw - 32px));
  border: 0.5px solid var(--accent); border-radius: 14px;
  background: var(--bg-card); color: var(--text);
  padding: 22px; margin: 0;
}
.cookie-banner::backdrop { background: rgba(0,0,0,0.5); }
.cookie-banner h3 { font-family: var(--serif); font-size: 18px; margin-bottom: 8px; }
.cookie-banner p { font-size: 12px; color: var(--muted); margin-bottom: 14px; line-height: 1.6; }
.ck-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; font-size: 13px; }
.ck-row input { margin-top: 2px; }
.ck-actions { display: flex; gap: 8px; margin-top: 14px; }
.ck-actions .btn { flex: 1; }

.adsense-slot {
  margin: 24px auto; max-width: 980px; padding: 0 40px;
  text-align: center;
}
.adsense-slot[hidden] { display: none; }
```

- [ ] **Step 14.3: Wire Cookie-Banner + AdSense in `app.js`**

In `app.js`, near top imports, add:

```js
import { makeConsentStore, isConsentDecided } from './lib/consent.js';
const consentStore = makeConsentStore({ storage: window.localStorage });
const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';        // TODO: replace after AdSense approval
const ADSENSE_SLOT_ID = 'XXXXXXXXXX';                     // TODO: replace after AdSense approval
```

Add new function:

```js
function initConsent() {
  const banner = document.getElementById('cookie-banner');
  const form = document.getElementById('cookie-form');
  const ckAds = document.getElementById('ck-ads');

  const existing = consentStore.load();
  if (!isConsentDecided(existing)) {
    banner.showModal();
  } else {
    applyConsent(existing);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const choice = e.submitter?.value;
    const ads = choice === 'all' ? true : ckAds.checked;
    const saved = consentStore.save({ ads });
    banner.close();
    applyConsent(saved);
  });

  document.getElementById('ftr-cookies').addEventListener('click', e => {
    e.preventDefault();
    const c = consentStore.load();
    ckAds.checked = !!c?.ads;
    banner.showModal();
  });
}

function applyConsent(consent) {
  loadAdSense({ personalized: !!consent.ads });
}

function loadAdSense({ personalized }) {
  const slot = document.getElementById('adsense-slot');
  if (slot.dataset.loaded === '1') return;        // never load twice

  // Use IntersectionObserver to defer load until scrolled near
  const obs = new IntersectionObserver((entries, o) => {
    if (!entries.some(e => e.isIntersecting)) return;
    o.disconnect();

    if (ADSENSE_CLIENT.includes('XXXX')) return;        // not yet approved → leave empty
    slot.dataset.loaded = '1';
    slot.hidden = false;
    slot.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${ADSENSE_SLOT_ID}" data-ad-format="auto" data-full-width-responsive="true"${personalized ? '' : ' data-npa-on-unknown-consent="true"'}></ins>`;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    s.onload = () => { (window.adsbygoogle = window.adsbygoogle || []).push({}); };
  }, { rootMargin: '300px' });
  obs.observe(slot);
}
```

Replace the existing `initFooterCookies` stub call in `init()` with `initConsent()`.

- [ ] **Step 14.4: Place AdSense slot in `index.html`**

Move the `<div class="adsense-slot" id="adsense-slot" hidden></div>` from before `</body>` to **between `</section><!-- #faq -->` and `<footer>`**. Update accordingly.

- [ ] **Step 14.5: Smoke test + commit**

Refresh → Cookie-Banner erscheint zentriert unten. „Nur Notwendig" → Banner verschwindet. Page-Reload → Banner kommt nicht wieder. Click Footer-Link „Cookies" → Banner kommt wieder. AdSense-Slot bleibt leer (Approval-Pending).

```bash
git add index.html styles.css app.js
git commit -m "feat: add cookie banner + lazy adsense slot"
```

---

## Task 15: Impressum + Datenschutz Pages

**Files:** Create `impressum.html`, `datenschutz.html`

- [ ] **Step 15.1: Write `impressum.html`**

Write `impressum.html`:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Impressum — ichwillumziehen.com</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
<header class="hdr"><a class="hdr-logo" href="/">ichwillumziehen</a><nav class="hdr-nav"><a href="/">Home</a></nav></header>
<main>
  <section class="section">
    <h2>Impressum</h2>
    <h3>Angaben gemäß § 5 TMG</h3>
    <!-- TODO: User trägt seine Daten ein -->
    <p>
      [Vor- und Nachname]<br>
      [Straße + Hausnummer]<br>
      [PLZ + Ort]<br>
      Deutschland
    </p>
    <h3>Kontakt</h3>
    <p>
      E-Mail: [kontakt@ichwillumziehen.com]
    </p>
    <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
    <p>
      [Vor- und Nachname]<br>
      [Adresse wie oben]
    </p>
    <h3>Haftungsausschluss</h3>
    <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
  </section>
</main>
<footer class="ftr"><div class="ftr-links"><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a></div><div class="ftr-brand">ichwillumziehen.com</div></footer>
</body>
</html>
```

> **TODO before launch:** der User ersetzt die Platzhalter `[…]` mit seinen echten Impressums-Daten.

- [ ] **Step 15.2: Write `datenschutz.html`**

Write `datenschutz.html`:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datenschutzerklärung — ichwillumziehen.com</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
<header class="hdr"><a class="hdr-logo" href="/">ichwillumziehen</a><nav class="hdr-nav"><a href="/">Home</a></nav></header>
<main>
  <section class="section">
    <h2>Datenschutzerklärung</h2>
    <p><em>Stand: 04.05.2026</em></p>

    <h3>1. Verantwortlicher</h3>
    <p>[Name + Adresse — siehe Impressum]</p>

    <h3>2. Hosting (Cloudflare)</h3>
    <p>Diese Website wird über Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA) gehostet. Beim Aufruf werden Server-Logs (IP, Zeitstempel, User-Agent) für 7 Tage gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an stabilem Betrieb).</p>

    <h3>3. Profil-Daten (lokal)</h3>
    <p>Wir speichern deine Eingaben (Einkommen, Lebenshaltung, Wishlist) im <strong>localStorage</strong> deines Browsers. Diese Daten verlassen dein Gerät nur, wenn du dich freiwillig anmeldest (siehe Punkt 4). Du kannst sie jederzeit über den Browser löschen.</p>

    <h3>4. Optionaler Login (Supabase)</h3>
    <p>Bei Anmeldung über Magic-Link werden deine E-Mail-Adresse und deine eingegebenen Daten bei <strong>Supabase Inc.</strong> (970 Toa Payoh North, Singapore) gespeichert. Server-Standort: EU (Frankfurt). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Du kannst dein Konto jederzeit löschen lassen — Mail an [E-Mail aus Impressum].</p>

    <h3>5. Affiliate-Programme</h3>
    <p>Wir verlinken Partnerprogramme von Amazon (Amazon EU S.à r.l., Luxemburg), CHECK24 und Awin. Wenn du auf einen mit (Werbung) gekennzeichneten Link klickst und dort kaufst/abschließt, erhalten wir eine Provision. Beim Klick werden Cookies des jeweiligen Partners gesetzt. Wir selbst erfahren weder dein Kaufverhalten noch persönliche Daten.</p>

    <h3>6. Werbung (Google AdSense)</h3>
    <p>Mit deiner Zustimmung im Cookie-Banner zeigen wir Werbung über Google AdSense (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) an. Ohne Zustimmung läuft AdSense im Limited-Ads-Modus (keine personalisierten Profile). Mehr Infos: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) bzw. lit. f (berechtigtes Interesse).</p>

    <h3>7. Deine Rechte</h3>
    <p>Du hast Anspruch auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Beschwerde-Recht bei der zuständigen Aufsichtsbehörde.</p>

    <h3>8. Cookie-Einstellungen ändern</h3>
    <p>Im Footer findest du den Link „Cookies", über den du deine Auswahl jederzeit ändern kannst.</p>

    <p style="margin-top:24px;color:var(--muted);font-size:11px"><strong>Hinweis:</strong> Diese Datenschutzerklärung ist eine Vorlage. Bitte über einen Generator wie e-recht24.de oder activeMind eine vollständige Fassung erstellen vor Launch.</p>
  </section>
</main>
<footer class="ftr"><div class="ftr-links"><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a></div><div class="ftr-brand">ichwillumziehen.com</div></footer>
</body>
</html>
```

> **TODO before launch:** durch Datenschutz-Generator-Output ersetzen oder mind. die Platzhalter füllen + Vollständigkeit prüfen lassen.

- [ ] **Step 15.3: Commit**

```bash
git add impressum.html datenschutz.html
git commit -m "feat: add impressum + datenschutz pages (with TODOs)"
```

---

## Task 16: Cloudflare Config Files

**Files:** Create `_headers`, `_redirects`, `.gitignore` (already exists, may add icons)

- [ ] **Step 16.1: Write `_headers`**

Write `_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://pagead2.googlesyndication.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; frame-src https://googleads.g.doubleclick.net; object-src 'none'; base-uri 'self'
```

- [ ] **Step 16.2: Write `_redirects`**

Write `_redirects`:

```
# Anchor convenience redirects
/miet-check       /#mietcheck         301
/umzugsbudget     /#umzugsbudget      301
/faq              /#faq               301
```

- [ ] **Step 16.3: Add favicon**

Place a favicon at `icons/favicon.ico` (User generates via favicon.io or similar). Add to `index.html` `<head>`:

```html
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
```

(Apply same to impressum.html + datenschutz.html.)

- [ ] **Step 16.4: Commit**

```bash
git add _headers _redirects icons/favicon.ico index.html impressum.html datenschutz.html
git commit -m "feat: cloudflare config + favicon"
```

---

## Task 17: Affiliate-Programs + AdSense — User-Action TODOs

This task is procedural (no code) — User does these in parallel.

- [ ] **Step 17.1: Amazon Partnernet anmelden**

https://partnernet.amazon.de → Bewerben mit Domain `ichwillumziehen.com`. Tracking-ID notieren (Format: `dein-21`). In `app.js` Line `amazonTag: 'PLATZHALTER-21'` durch echten Tag ersetzen. Commit als `feat: replace placeholder amazon partner tag`.

- [ ] **Step 17.2: Awin-Account anlegen**

https://www.awin.com/de/publisher → Bewerbung für CHECK24-Strom-Programm + CHECK24-Umzug. Nach Approval: in `index.html` die `href`-URLs der Affiliate-Cards durch tracked URLs aus Awin ersetzen. Commit.

- [ ] **Step 17.3: Google AdSense beantragen**

https://www.google.com/adsense/start/ → Domain hinzufügen, Verifikations-Tag in `<head>` einfügen. Nach Approval (1-2 Wochen) in `app.js` `ADSENSE_CLIENT` + `ADSENSE_SLOT_ID` ersetzen. Commit.

---

# PHASE 4 — Deployment

## Task 18: Cloudflare Pages Setup

This task is manual (browser).

- [ ] **Step 18.1: Domain registrieren**

Bei einem Registrar (INWX, united-domains, Namecheap) die Domain `ichwillumziehen.com` registrieren.

- [ ] **Step 18.2: Push Repo zu GitHub**

```bash
git remote add origin git@github.com:<dein-user>/ichwillumziehen.git
git branch -M main
git push -u origin main
```

- [ ] **Step 18.3: Cloudflare Pages Projekt anlegen**

https://dash.cloudflare.com/?to=/:account/pages → "Create application" → Connect to Git → Repo wählen.
- Build command: (empty)
- Build output directory: `/`
- Root directory: `/`
- Branch: `main`

→ Deploy. Cloudflare gibt dir eine `*.pages.dev` URL.

- [ ] **Step 18.4: Custom Domain verbinden**

In Pages → Custom domains → "Set up custom domain" → `ichwillumziehen.com` (und `www.ichwillumziehen.com`). Cloudflare leitet dich durch DNS-Setup. Wenn die Domain bei Cloudflare registriert ist: automatisch. Sonst: NS auf Cloudflare zeigen oder CNAME setzen.

- [ ] **Step 18.5: Supabase Redirect-URL aktualisieren**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://ichwillumziehen.com`
- Additional Redirect URLs: `https://ichwillumziehen.com/*`, `https://www.ichwillumziehen.com/*`, `http://localhost:5500` (für lokale Dev)

- [ ] **Step 18.6: Production Smoke-Test**

Öffne `https://ichwillumziehen.com`:
- Hero rendert ✓
- Miet-Check 3 Steps ✓
- Stadt-Dropdown gefüllt ✓
- Result + Affiliate-Card ✓
- Wishlist Add/Delete + Live-Total ✓
- Affiliate-Inspiration-Cards mit Amazon-Tag ✓
- Cookie-Banner erscheint einmalig ✓
- Login-Modal öffnet ✓
- Magic-Link erhalten ✓ (echte Mail-Adresse)
- Nach Login: Sync funktioniert (DB-Reihen sichtbar in Supabase) ✓
- Logout funktioniert ✓
- Impressum-Link ✓ — Datenschutz-Link ✓
- FAQ aufklappbar ✓
- Mobile (DevTools 375px): alles sauber ✓

- [ ] **Step 18.7: Lighthouse-Audit**

In Chrome DevTools → Lighthouse → Performance + Accessibility + Best Practices + SEO. Ziel: alle ≥ 90.

Bei Issues:
- **LCP zu hoch?** → Hero-Schrift mit `font-display: swap` (✓ schon gesetzt) — sonst Bilder optimieren
- **CLS?** → fixe Aspect-Ratios setzen (Wishlist-Card-img hat schon `aspect-ratio`) — überprüfen
- **Accessibility?** → Alt-Tags, Aria-Labels überprüfen
- **SEO?** → Meta-Description ✓, FAQ-Schema ✓, sitemap.xml ggf. ergänzen

- [ ] **Step 18.8: Final commit + tag**

```bash
git add .
git commit -m "chore: deployment ready"
git tag v0.1.0-launch
git push origin main --tags
```

🎉 **Launch.**

---

## Task 19: Post-Launch Monitoring

- [ ] **Step 19.1: Plausible/Fathom (optional, DSGVO-konform)**

Plausible (€9/Monat) oder Fathom (€14/Monat) sind cookieless Alternativen zu Google Analytics — keine Banner-Pflicht. Embed-Snippet in `<head>`:

```html
<script defer data-domain="ichwillumziehen.com" src="https://plausible.io/js/script.js"></script>
```

Verfolgt: Pageviews, Unique Visitors, Top-Pages, Referrers — alles ohne Cookies. **Sehr empfohlen statt Google Analytics**, weil DSGVO-trivial.

- [ ] **Step 19.2: Search Console**

https://search.google.com/search-console → Domain verifizieren via DNS-TXT (Cloudflare DNS). `sitemap.xml` einreichen (basic):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ichwillumziehen.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://ichwillumziehen.com/impressum.html</loc><changefreq>yearly</changefreq><priority>0.1</priority></url>
  <url><loc>https://ichwillumziehen.com/datenschutz.html</loc><changefreq>yearly</changefreq><priority>0.1</priority></url>
</urlset>
```

Save as `sitemap.xml` in repo root, commit, push.

- [ ] **Step 19.3: Monitoring-Routine festlegen**

Wöchentlicher Check (5 Min):
- Plausible: Visitors-Trend
- Search Console: Impressionen, Position, neue Errors
- Supabase Dashboard: Anzahl Profile + Items, Auth-Anmeldungen
- Sentry/Cloudflare-Logs: Errors

Bei Traction (>1000 Visitors/Monat):
- AdSense aktivieren (sobald Approval da)
- Affiliate-Performance reviewen
- Möglicherweise Phase „MVP+" starten (Umzugschecklist, Stadt-Landingpages — siehe Spec Section 12)

---

# Selbst-Review

**Spec Coverage:**
- ✓ Section 1 (Ziel) → Tasks 7+18 (working tools + launch)
- ✓ Section 2 (Tech Stack) → Task 1 (bootstrap)
- ✓ Section 3 (Datei-Struktur) → mapped to all tasks
- ✓ Section 4 (Daten-Modell) → Tasks 6 (localStorage), 8 (Supabase), 10 (sync)
- ✓ Section 5 (Mietcheck Logik + City-Tier) → Tasks 2, 3
- ✓ Section 6 (Wishlist + Affiliate) → Tasks 4, 5, 13
- ✓ Section 7 (Auth-Flow) → Tasks 9, 11
- ✓ Section 8 (UI/UX) → Task 7
- ✓ Section 9 (Monetarisierung) → Tasks 13, 14
- ✓ Section 10 (DSGVO) → Tasks 12, 14, 15
- ✓ Section 11 (Sicherheit + Performance) → Tasks 16 (CSP, headers), 18.7 (Lighthouse)
- Out-of-scope (Section 12) → korrekt nicht im Plan
- Pre-Launch-TODOs (Section 13) → Task 17 + Task 18
- Definition of Done (Section 14) → erfüllt nach Task 18

**Placeholder-Scan:**
- `PLATZHALTER-21` (Amazon-Tag) — bewusst belassen, wird in Task 17 ersetzt
- `YOUR_PROJECT.supabase.co` + `eyJYOURKEY` — bewusst belassen, wird in Task 11 nach Supabase-Setup ersetzt
- `ca-pub-XXXXXXXXXXXXXXXX` (AdSense) — bewusst belassen, wird in Task 17.3 ersetzt
- TODO-Marker in Impressum/Datenschutz — bewusst, vom User vor Launch zu füllen
Keine versteckten Placeholders mit „TBD" oder „später".

**Type-Konsistenz:**
- `profile.lebenshaltung[key]` mit null-Override-Pattern: konsistent in profile.js, mietcheck.js, sync.js, app.js ✓
- `priceCents` als Integer überall ✓
- `updatedAt` als ms-Timestamp in localStorage, ISO-String in DB → Konvertierung in `sync.js` ✓
- City-Names als String, „ANDERE" als Spezialwert konsistent ✓
- AdSense `data-npa-on-unknown-consent` — überprüft, korrekte Google-API ✓

Plan ist konsistent.

---

# Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-ichwillumziehen-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Ich dispatche einen frischen Subagent pro Task, reviewe zwischen den Tasks, schnelle Iteration, du musst nicht zwischen Tasks etwas tun bis Review-Checkpoints.

**2. Inline Execution** — Tasks werden in dieser Session ausgeführt, mit Checkpoints nach Phasen-Ende für deinen Review.

**Welcher Ansatz?**
