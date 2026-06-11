/**
 * Dev smoke driver: boots the dashboard in headless system Chrome, verifies the level-1
 * state, seeds to a target level via the dev tools, and screenshots both states.
 * Requires the dev server on :5173. Usage: node scripts/smoke.mjs [targetLevel]
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const target = Number(process.argv[2] ?? 27);
await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 870 } });

const errors = [];
const notFound = [];
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  // resource 404s are judged separately via the response listener below
  if (msg.text().startsWith('Failed to load resource')) return;
  errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
page.on('response', (res) => {
  // missing character art is expected: the aura placeholder is the designed fallback
  if (res.status() === 404 && !res.url().includes('/assets/characters/')) notFound.push(res.url());
});

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.getByText('STATUS WINDOW').waitFor({ timeout: 15_000 });

const level1 = await page.locator('.level-numeral').textContent();
const tier1 = await page.locator('.tier-name').textContent();
console.log(`boot state: LV ${level1} — ${tier1}`);
await page.screenshot({ path: 'screenshots/dashboard-lv1.png', fullPage: true });

// seed to the target level through the dev tools and wait for the re-render
await page.evaluate(async (lvl) => await window.arise.seed(lvl), target);
await page.waitForFunction(
  (lvl) => Number(document.querySelector('.level-numeral')?.textContent) >= lvl,
  target,
  { timeout: 30_000 },
);

const levelN = await page.locator('.level-numeral').textContent();
const tierN = await page.locator('.tier-name').textContent();
const aura = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--aura').trim());
const dataTier = await page.evaluate(() => document.documentElement.dataset.tier);
console.log(`seeded state: LV ${levelN} — ${tierN} · data-tier=${dataTier} · --aura=${aura}`);
await page.screenshot({ path: 'screenshots/dashboard-seeded.png', fullPage: true });

// reset so a human opening the dev server starts clean
await page.evaluate(async () => await window.arise.reset());

await browser.close();
if (errors.length || notFound.length) {
  if (errors.length) console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  if (notFound.length) console.error('UNEXPECTED 404s:\n' + notFound.join('\n'));
  process.exit(1);
}
console.log('smoke OK — screenshots/dashboard-lv1.png, screenshots/dashboard-seeded.png');
