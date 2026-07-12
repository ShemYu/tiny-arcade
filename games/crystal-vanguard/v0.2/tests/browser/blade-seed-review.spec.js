import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';


const here = path.dirname(fileURLToPath(import.meta.url));
const phaserPath = path.resolve(here, '../../node_modules/phaser/dist/phaser.min.js');
const revisionDir = path.resolve(
  here,
  '../../../art/blade-rank1/revisions/frontier-blade-r1'
);
const seeds = Object.fromEntries([64, 70, 74].map((envelope) => {
  const source = fs.readFileSync(path.join(revisionDir, `candidate/seed-se-${envelope}.png`));
  return [envelope, `data:image/png;base64,${source.toString('base64')}`];
}));
const directionSeeds = Object.fromEntries(['balanced', 'tactical'].map((candidateId) => {
  const source = fs.readFileSync(path.join(
    revisionDir,
    `direction-review/candidate/se-${candidateId}-70.png`
  ));
  return [candidateId, `data:image/png;base64,${source.toString('base64')}`];
}));

function outputPath(testInfo, name) {
  const requested = process.env.CV_SEED_QA_DIR;
  if (!requested) return testInfo.outputPath(name);
  const target = path.resolve(process.cwd(), requested, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

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
  await page.addStyleTag({ content: '.toast-stack { display: none !important; }' });
  return browserErrors;
}

async function installCandidate(page) {
  return page.evaluate(async (imageData) => {
    const game = globalThis.__CRYSTAL_VANGUARD_V02__.game;
    const scene = game.scene.getScene('battle');
    const keys = {};

    for (const [envelope, data] of Object.entries(imageData)) {
      const key = `qa-frontier-se-${envelope}`;
      keys[envelope] = key;
      if (!scene.textures.exists(key)) scene.textures.addBase64(key, data);
    }
    await new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (Object.values(keys).every((key) => scene.textures.exists(key))) {
          resolve();
          return;
        }
        if (performance.now() - started > 3000) {
          reject(new Error('Timed out loading review-only seed textures.'));
          return;
        }
        setTimeout(poll, 16);
      };
      poll();
    });

    const actor = [...scene.combat.actors].find(
      (entry) => entry.visualAssetId === 'unit.blade.rank1'
    );
    if (!actor) throw new Error('Initial Blade actor not found.');
    scene.scene.pause();
    actor.anims.stop();
    actor.setTexture(keys[70]);
    actor.setOrigin(48 / 96, 82 / 96);
    actor.setPosition(360, 910);
    actor.syncDecorations();
    actor.healthBack.setVisible(false);
    actor.healthFill.setVisible(false);

    return {
      actor: { x: actor.x, y: actor.y, originX: actor.originX, originY: actor.originY },
      canvas: {
        width: game.canvas.getBoundingClientRect().width,
        height: game.canvas.getBoundingClientRect().height
      }
    };
  }, seeds);
}

async function addGuides(page) {
  await page.evaluate(() => {
    const scene = globalThis.__CRYSTAL_VANGUARD_V02__.game.scene.getScene('battle');
    const actor = [...scene.combat.actors].find(
      (entry) => entry.visualAssetId === 'unit.blade.rank1'
    );
    const left = actor.x - 48;
    const top = actor.y - 82;
    const graphics = scene.add.graphics().setDepth(10000);
    graphics.lineStyle(2, 0x79e7d5, 0.95).strokeRect(left, top, 96, 96);
    graphics.lineStyle(2, 0x7ee697, 0.95).strokeRect(left + 4, top + 8, 88, 84);
    graphics.lineStyle(3, 0xff746d, 0.95).lineBetween(actor.x - 12, actor.y, actor.x + 12, actor.y);
    graphics.lineBetween(actor.x, actor.y - 12, actor.x, actor.y + 12);
    globalThis.__CV_SEED_GUIDES__ = graphics;
  });
}

async function addScaleLineup(page) {
  await page.evaluate(() => {
    const scene = globalThis.__CRYSTAL_VANGUARD_V02__.game.scene.getScene('battle');
    globalThis.__CV_SEED_GUIDES__?.destroy();
    const actor = [...scene.combat.actors].find(
      (entry) => entry.visualAssetId === 'unit.blade.rank1'
    );
    actor.setPosition(360, 910).setTexture('qa-frontier-se-70');
    actor.shadow.setPosition(360, 912);

    for (const [x, envelope] of [[184, 64], [536, 74]]) {
      scene.add.ellipse(x, 912, 30, 10, 0x06100f, 0.38).setDepth(908);
      scene.add.image(x, 910, `qa-frontier-se-${envelope}`)
        .setOrigin(48 / 96, 82 / 96)
        .setDepth(910);
    }
    for (const [x, label] of [[184, '64'], [360, '70'], [536, '74']]) {
      scene.add.text(x, 832, `${label}px`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: label === '70' ? '#ffd46b' : '#d6fff1',
        backgroundColor: '#081011cc',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(10000);
    }
  });
}

async function installDirectionCandidates(page) {
  return page.evaluate(async (imageData) => {
    const game = globalThis.__CRYSTAL_VANGUARD_V02__.game;
    const scene = game.scene.getScene('battle');
    const keys = {};
    for (const [candidateId, data] of Object.entries(imageData)) {
      const key = `qa-frontier-direction-${candidateId}`;
      keys[candidateId] = key;
      if (!scene.textures.exists(key)) scene.textures.addBase64(key, data);
    }
    await new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (Object.values(keys).every((key) => scene.textures.exists(key))) {
          resolve();
          return;
        }
        if (performance.now() - started > 3000) {
          reject(new Error('Timed out loading direction-review textures.'));
          return;
        }
        setTimeout(poll, 16);
      };
      poll();
    });

    const actor = [...scene.combat.actors].find(
      (entry) => entry.visualAssetId === 'unit.blade.rank1'
    );
    if (!actor) throw new Error('Initial Blade actor not found.');
    scene.scene.pause();
    actor.setVisible(false);
    actor.shadow.setVisible(false);
    actor.healthBack.setVisible(false);
    actor.healthFill.setVisible(false);

    for (const [x, candidateId, label] of [
      [272, 'balanced', 'A'],
      [448, 'tactical', 'B']
    ]) {
      scene.add.ellipse(x, 912, 30, 10, 0x06100f, 0.38).setDepth(908);
      scene.add.image(x, 910, keys[candidateId])
        .setOrigin(48 / 96, 82 / 96)
        .setDepth(910);
      scene.add.text(x, 832, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: candidateId === 'balanced' ? '#d6fff1' : '#ffd46b',
        backgroundColor: '#081011dd',
        padding: { x: 7, y: 4 }
      }).setOrigin(0.5).setDepth(10000);
    }
    return {
      canvas: {
        width: game.canvas.getBoundingClientRect().width,
        height: game.canvas.getBoundingClientRect().height
      }
    };
  }, directionSeeds);
}

test('Frontier Blade seed is reviewable in the real mobile battle surface', async ({ page }, testInfo) => {
  const browserErrors = await bootGame(page);
  const installed = await installCandidate(page);
  const width = testInfo.project.name.endsWith('430') ? 430 : 390;
  const expectedVisibleHeight = 70 * installed.canvas.width / 720;

  expect(installed.actor).toEqual({ x: 360, y: 910, originX: 0.5, originY: 82 / 96 });
  expect(Math.abs(installed.canvas.width / installed.canvas.height - 0.5625)).toBeLessThan(0.01);
  expect(expectedVisibleHeight).toBeGreaterThan(30);
  expect(expectedVisibleHeight).toBeLessThan(44);
  const layout = await page.evaluate(() => ({
    documentWidth: document.scrollingElement.scrollWidth,
    documentHeight: document.scrollingElement.scrollHeight,
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight: window.visualViewport?.height ?? window.innerHeight
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);

  await page.screenshot({
    path: outputPath(testInfo, `mobile-${width}.png`),
    fullPage: false
  });
  await addGuides(page);
  await page.screenshot({
    path: outputPath(testInfo, `mobile-guides-${width}.png`),
    fullPage: false
  });
  await addScaleLineup(page);
  await page.screenshot({
    path: outputPath(testInfo, `mobile-scale-lineup-${width}.png`),
    fullPage: false
  });
  await page.goto('./', { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas');
  await page.waitForFunction(() => globalThis.__CRYSTAL_VANGUARD_V02__?.session?.state?.phase === 'planning');
  await page.addStyleTag({ content: '.toast-stack { display: none !important; }' });
  const directionReview = await installDirectionCandidates(page);
  expect(Math.abs(directionReview.canvas.width / directionReview.canvas.height - 0.5625)).toBeLessThan(0.01);
  await page.screenshot({
    path: outputPath(testInfo, `mobile-direction-review-${width}.png`),
    fullPage: false
  });
  expect(browserErrors).toEqual([]);
});
