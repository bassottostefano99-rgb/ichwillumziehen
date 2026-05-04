// Renders og-template.html to og-image.png (1200x630).
// Usage: npm run og:render  (or: node scripts/render-og.js)
// Requires: puppeteer (devDependency)

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATE = join(ROOT, 'og-template.html');
const OUTPUT = join(ROOT, 'og-image.png');

const browser = await puppeteer.launch({ headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`file://${TEMPLATE}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await page.screenshot({ path: OUTPUT, type: 'png', omitBackground: false });
  console.log(`✓ Wrote ${OUTPUT}`);
} finally {
  await browser.close();
}
