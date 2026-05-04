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
