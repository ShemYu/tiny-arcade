import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';


const here = path.dirname(fileURLToPath(import.meta.url));
const phaserPath = path.resolve(here, '../../node_modules/phaser/dist/phaser.min.js');
test('Blade asset lab is reviewable at real phone scale', async ({ page }, testInfo) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(String(error.stack ?? error)));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.route('https://cdn.jsdelivr.net/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: fs.readFileSync(phaserPath)
    });
  });

  await page.goto('./asset-lab/?action=attack&direction=NW&scale=1', { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-qa-status', 'needs_rework');
  await expect(page.locator('#qa-badge strong')).toHaveText(/\d+ BLOCKERS/);
  await expect(page.locator('#qa-badge span')).toHaveText('manual: rejected');

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas').getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.scrollingElement.scrollWidth,
        height: document.scrollingElement.scrollHeight
      },
      canvas: { width: canvas.width, height: canvas.height },
      controls: [...document.querySelectorAll('button, select')].map((element) => {
        const bounds = element.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, label: element.textContent.trim() };
      })
    };
  });

  expect(layout.document.width).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.document.height).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(Math.abs(layout.canvas.width / layout.canvas.height - 0.5625)).toBeLessThan(0.01);
  for (const control of layout.controls) {
    expect(control.width, `${control.label} width`).toBeGreaterThanOrEqual(44);
    expect(control.height, `${control.label} height`).toBeGreaterThanOrEqual(44);
  }

  await expect(page.locator('#review-title')).toContainText('NW');
  await page.screenshot({ path: testInfo.outputPath('current-source.png'), fullPage: false });
  await page.locator('#scale-control').selectOption('0.82');
  await expect(page.locator('#review-detail')).toContainText('0.82x');
  await page.locator('[data-action="transition"]').click();
  await expect(page.locator('#review-title')).toContainText('TRANSITION SEQUENCE');

  await page.screenshot({ path: testInfo.outputPath('shared-scale-candidate.png'), fullPage: false });

  await page.goto('./asset-lab/?action=hurt&direction=SE&scale=1&frame=4', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#metric-copy')).toContainText('HURT f4');
  await expect(page.locator('#edge-badge')).toHaveText('DETACHED HEAD ISLAND');
  await page.screenshot({ path: testInfo.outputPath('hurt-se-frame4.png'), fullPage: false });
  expect(browserErrors).toEqual([]);
});
