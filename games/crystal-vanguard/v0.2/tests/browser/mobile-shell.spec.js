import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const phaserPath = path.resolve(here, '../../node_modules/phaser/dist/phaser.min.js');

async function bootGame(page) {
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

  await page.goto('./', { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas');
  await page.waitForFunction(() => globalThis.__CRYSTAL_VANGUARD_V02__?.session?.state?.phase === 'planning');
  return browserErrors;
}

async function layoutSnapshot(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        right: bounds.right,
        bottom: bounds.bottom
      };
    };

    return {
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        visualHeight: window.visualViewport?.height ?? window.innerHeight
      },
      document: {
        width: document.scrollingElement.scrollWidth,
        height: document.scrollingElement.scrollHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      game: rect('#game'),
      stage: rect('.game-stage'),
      phase: rect('#phase-badge'),
      wave: rect('#wave-progress'),
      start: rect('#start-wave'),
      touchAction: getComputedStyle(document.querySelector('#game canvas')).touchAction,
      controls: [...document.querySelectorAll(
        '.tool-button, .ghost-button, .primary-button, .danger-button, .mobile-tab, .mobile-sheet-toggle, .mobile-sheet-close, .mobile-reset-button'
      )]
        .filter((element) => {
          const style = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
        })
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            id: element.id || element.dataset.tool || element.dataset.mobilePanelTarget || element.textContent.trim(),
            width: bounds.width,
            height: bounds.height
          };
        })
    };
  });
}

async function clickWorld(page, worldX, worldY) {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('Canvas has no layout box.');
  await page.mouse.click(
    box.x + (worldX / 720) * box.width,
    box.y + (worldY / 1280) * box.height
  );
}

test('mobile-first shell preserves the complete planning-to-battle path', async ({ page }, testInfo) => {
  const browserErrors = await bootGame(page);
  const snapshot = await layoutSnapshot(page);
  const isPhone = testInfo.project.name.startsWith('iphone');
  const isPortraitPhone = isPhone && snapshot.viewport.height > snapshot.viewport.width;

  expect(snapshot.document.width).toBeLessThanOrEqual(snapshot.viewport.width + 1);
  expect(Math.abs(snapshot.game.width / snapshot.game.height - 0.5625)).toBeLessThan(0.01);
  expect(snapshot.touchAction).toBe('none');
  expect(snapshot.phase.x).toBeGreaterThanOrEqual(snapshot.stage.x);
  expect(snapshot.phase.y).toBeGreaterThanOrEqual(snapshot.stage.y);
  expect(snapshot.wave.right).toBeLessThanOrEqual(snapshot.stage.right);
  expect(snapshot.wave.bottom).toBeLessThanOrEqual(snapshot.stage.bottom);

  if (isPhone) {
    expect(snapshot.document.height).toBeLessThanOrEqual(snapshot.viewport.visualHeight + 1);
    expect(snapshot.document.scrollX).toBe(0);
    expect(snapshot.document.scrollY).toBe(0);
    expect(snapshot.start.bottom).toBeLessThanOrEqual(snapshot.viewport.visualHeight);
    expect(snapshot.start.y).toBeGreaterThanOrEqual(0);

    for (const control of snapshot.controls) {
      expect(control.width, `${control.id} width`).toBeGreaterThanOrEqual(44);
      expect(control.height, `${control.id} height`).toBeGreaterThanOrEqual(44);
    }
  }

  await page.screenshot({ path: testInfo.outputPath('planning.png'), fullPage: false });

  if (isPortraitPhone) {
    await expect(page.locator('html')).toHaveAttribute('data-mobile-sheet', 'closed');
    await page.locator('#mobile-sheet-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-mobile-sheet', 'open');
    await page.screenshot({ path: testInfo.outputPath('sheet-open.png'), fullPage: false });
  }

  if (isPhone) {
    await page.locator('[data-mobile-panel-target="status"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-mobile-panel', 'status');
    await expect(page.locator('.status-card')).toBeVisible();
    await page.locator('[data-mobile-panel-target="deploy"]').click();
    await expect(page.locator('.deploy-card')).toBeVisible();
  }

  await page.locator('[data-tool="building:barricade"]').click();
  if (isPortraitPhone) {
    await expect(page.locator('html')).toHaveAttribute('data-mobile-sheet', 'closed');
    await expect(page.locator('#mobile-sheet-toggle strong')).toHaveText('木製路障 3G');

    const beforeBlockedTap = await page.evaluate(() => globalThis.__CRYSTAL_VANGUARD_V02__.session.snapshot());
    await page.locator('#mobile-sheet-toggle').click();
    await clickWorld(page, 184, 910);
    const afterBlockedTap = await page.evaluate(() => globalThis.__CRYSTAL_VANGUARD_V02__.session.snapshot());
    expect(afterBlockedTap.gold).toBe(beforeBlockedTap.gold);
    expect(afterBlockedTap.counts.buildings).toBe(beforeBlockedTap.counts.buildings);
    await page.locator('#mobile-sheet-close').click();
  }
  await clickWorld(page, 184, 910);
  await page.waitForFunction(() => globalThis.__CRYSTAL_VANGUARD_V02__.session.state.counts.buildings === 1);
  await page.locator('#start-wave').click();
  await page.waitForFunction(() => globalThis.__CRYSTAL_VANGUARD_V02__.session.state.phase === 'battle');

  const scheduledLanes = await page.evaluate(() => (
    globalThis.__CRYSTAL_VANGUARD_V02__.game.scene.getScene('battle').waveDirector.schedule.map((entry) => entry.lane)
  ));
  expect(scheduledLanes.every((lane) => ['LEFT', 'CENTER', 'RIGHT'].includes(lane))).toBe(true);

  const battleSnapshot = await layoutSnapshot(page);
  if (isPhone) {
    expect(battleSnapshot.document.height).toBeLessThanOrEqual(battleSnapshot.viewport.visualHeight + 1);
    expect(battleSnapshot.document.scrollY).toBe(0);
    await expect(page.locator('html')).toHaveAttribute('data-mobile-panel', 'status');
    await expect(page.locator('#start-wave strong')).toHaveText('查看即時戰況');
  }

  expect(browserErrors).toEqual([]);
});
