/**
 * Gate-flow smoke: starts clean, enters a Gate, logs every set of every exercise via
 * the real UI, clears the gate, walks the tally and the ceremony, and lands back on
 * the dashboard with the leveled-up state. Requires the dev server on :5173.
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 870 } });

const errors = [];
const notFound = [];
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  if (msg.text().startsWith('Failed to load resource')) return;
  errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
page.on('response', (res) => {
  if (res.status() === 404 && !res.url().includes('/assets/characters/')) notFound.push(res.url());
});

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.getByText('STATUS WINDOW').waitFor({ timeout: 15_000 });
await page.evaluate(async () => await window.arise.reset());

// enter the push gate directly (today may not be a gym day)
await page.goto('http://localhost:5173/gate/push', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Crimson Forge' }).waitFor({ timeout: 15_000 });
await page.screenshot({ path: 'screenshots/gate-entry.png', fullPage: true });

const cards = await page.locator('.exercise-card').count();
console.log(`gate open — ${cards} exercises`);

for (let i = 0; i < cards; i++) {
  await page.locator('.exercise-head').nth(i).click();
  await page.locator('.log-btn').waitFor({ timeout: 5000 });
  // log sets until this card flips to done
  for (let guard = 0; guard < 8; guard++) {
    if (await page.locator('.exercise-card').nth(i).locator('.done-mark--on').count()) break;
    await page.locator('.log-btn').click();
    await page.waitForTimeout(120);
  }
  if (i === 0) await page.screenshot({ path: 'screenshots/gate-logging.png', fullPage: true });
  await page.locator('.exercise-head').nth(i).click(); // collapse
}

const progress = await page.locator('.gate-foot .system-text').textContent();
console.log(`progress: ${progress.trim()}`);

await page.getByRole('button', { name: 'CLEAR GATE' }).click();
await page.getByText('GATE CLEARED:').waitFor({ timeout: 10_000 });
const total = await page.locator('.tally-total .tally-xp').textContent();
console.log(`tally total: ${total}`);
await page.screenshot({ path: 'screenshots/gate-tally.png', fullPage: true });

await page.getByRole('button', { name: 'CONTINUE' }).click();

// fresh character + ~600 XP ⇒ multiple levels gained ⇒ ceremony must appear
await page.locator('.ceremony').waitFor({ timeout: 10_000 });
const newLevel = await page.locator('.ceremony-new').textContent();
console.log(`ceremony: ${newLevel}`);
await page.screenshot({ path: 'screenshots/gate-ceremony.png', fullPage: true });
await page.locator('.ceremony').click();

// back on the dashboard with the new level
await page.getByText('STATUS WINDOW').waitFor({ timeout: 10_000 });
const dashLevel = await page.locator('.level-numeral').textContent();
console.log(`dashboard level after gate: ${dashLevel}`);
await page.evaluate(async () => await window.arise.reset());

await browser.close();
if (errors.length || notFound.length) {
  if (errors.length) console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  if (notFound.length) console.error('UNEXPECTED 404s:\n' + notFound.join('\n'));
  process.exit(1);
}
if (Number(dashLevel) <= 1) {
  console.error('expected a level > 1 after clearing the gate');
  process.exit(1);
}
console.log('gate smoke OK');
