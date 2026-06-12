/**
 * Phase 3 smoke: drives the System layer through the real UI — daily quests render,
 * the bodyweight quest auto-claims from its logged event (+10), the Mandatory Quest
 * confirms on tap (+30, on shift days), and the profile route shows stats + records.
 * Requires the dev server on :5173. Usage: node scripts/smoke-system.mjs
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

const totalXp = () => page.evaluate(async () => (await window.arise.state()).totalXp);

/** Poll the real derived state until XP reaches `min` (waitForFunction can't await async fns). */
async function waitForXp(min, label) {
  for (let i = 0; i < 60; i++) {
    const xp = await totalXp();
    if (xp >= min) return xp;
    await page.waitForTimeout(250);
  }
  throw new Error(`${label}: XP never reached ${min} (still ${await totalXp()})`);
}

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.getByText('STATUS WINDOW').waitFor({ timeout: 15_000 });

// seed real history so quests/records/profile have something to show
await page.evaluate(async () => await window.arise.seed(5));
await page.getByText('DAILY QUESTS').waitFor({ timeout: 15_000 });
const questCount = await page.locator('.quest-row').count();
console.log(`daily quests rendered: ${questCount}`);
if (questCount < 1 || questCount > 3) throw new Error(`expected 1–3 quests, got ${questCount}`);

// bodyweight quest: log → event → watcher auto-claims → +10 quest XP lands
if (await page.locator('.quest-bw .log-btn').count()) {
  const before = await totalXp();
  await page.locator('.quest-bw .log-btn').click();
  await waitForXp(before + 10, 'bodyweight auto-claim');
  console.log(`bodyweight logged + quest auto-claimed: +${(await totalXp()) - before} XP`);
  if ((await page.locator('.quest-mark--done').count()) === 0) {
    throw new Error('no quest row shows as done after auto-claim');
  }
}

// Mandatory Quest confirm (shift days only — roster-dependent)
const trialBtn = page.locator('.cta', { hasText: 'TRIAL ENDURED' });
if (await trialBtn.count()) {
  const before = await totalXp();
  await trialBtn.click();
  await waitForXp(before + 30, 'shift confirm');
  console.log('shift confirmed: +30 XP, panel locked');
}

await page.screenshot({ path: 'screenshots/dashboard-system.png', fullPage: true });

// profile route: stats, records with sparklines
await page.getByText('[PROFILE]').click();
await page.getByText('SYSTEM RECORDS').waitFor({ timeout: 15_000 });
const recordRows = await page.locator('.record-row').count();
const sparklines = await page.locator('.sparkline').count();
console.log(`profile: ${recordRows} record rows, ${sparklines} sparklines`);
if (recordRows === 0) throw new Error('profile shows no records after seeding');
await page.screenshot({ path: 'screenshots/profile.png', fullPage: true });

// settings route: auth panel (local-only message without a backend) + a real import
await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
await page.getByText('IMPORTED SOUL').waitFor({ timeout: 15_000 });
const authText = await page.locator('.settings .system-window').first().textContent();
console.log(`auth panel: ${authText.includes('NO BACKEND') ? 'local-only message' : 'backend configured'}`);

const importBefore = await totalXp();
const exportJson = JSON.stringify({
  'sl2.day': 'push',
  'sl2.log.bench': JSON.stringify([
    { date: '2026-01-05', weightKg: 50, reps: [8, 8] },
    { date: '2026-01-12', weightKg: 52.5, reps: [6, 6] },
  ]),
});
await page.locator('.field--area').fill(exportJson);
await page.locator('.cta', { hasText: 'ABSORB HISTORY' }).click();
await page.getByText('RECORDS ABSORBED').waitFor({ timeout: 15_000 });
const importAfter = await waitForXp(importBefore + 1, 'import XP');
console.log(`shift+lift import absorbed: +${importAfter - importBefore} XP retroactive`);
await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });

await page.evaluate(async () => await window.arise.reset());

await browser.close();
if (errors.length || notFound.length) {
  if (errors.length) console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  if (notFound.length) console.error('UNEXPECTED 404s:\n' + notFound.join('\n'));
  process.exit(1);
}
console.log('system smoke OK — screenshots/dashboard-system.png, screenshots/profile.png');
