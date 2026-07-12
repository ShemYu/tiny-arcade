const DIRECTIONS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const ACTIONS = {
  idle: { url: '../../assets/units/blade-rank1-idle.png', frames: 6, fps: 7, repeat: -1 },
  walk: { url: '../../assets/units/blade-rank1-walk.png', frames: 8, fps: 12, repeat: -1 },
  attack: { url: '../../assets/units/blade-rank1-attack.png', frames: 8, fps: 14, repeat: 0 },
  cast: { url: '../../assets/units/blade-rank1-cast.png', frames: 8, fps: 12, repeat: 0 },
  hurt: { url: '../../assets/units/blade-rank1-hurt.png', frames: 4, fps: 12, repeat: 0 },
  death: { url: '../../assets/units/blade-rank1-death.png', frames: 8, fps: 10, repeat: 0 }
};
const ROOT = { x: 360, y: 690 };
const SOURCE_ANCHOR = { x: 48, y: 82 };
const MEASURED_FOOT_Y = 94;

const TRANSITION = [
  ['idle', 1.1],
  ['walk', 1.0],
  ['idle', 0.45],
  ['attack', 8 / 14 + 0.14],
  ['idle', 0.45],
  ['cast', 8 / 12 + 0.14],
  ['idle', 0.45],
  ['hurt', 4 / 12 + 0.14],
  ['idle', 0.45],
  ['death', 1.55]
];

const state = {
  action: 'transition',
  direction: 'SE',
  scale: 1,
  guides: true,
  transitionIndex: 0,
  transitionRemaining: 0,
  frameOverride: null,
  scene: null,
  report: null
};

class BladeAssetLabScene extends Phaser.Scene {
  constructor() {
    super('blade-asset-lab');
  }

  preload() {
    for (const [actionId, action] of Object.entries(ACTIONS)) {
      this.load.spritesheet(`blade-${actionId}`, action.url, {
        frameWidth: 96,
        frameHeight: 96
      });
    }
  }

  create() {
    this.paintBattlefield();
    this.registerAnimations();
    this.paintGuides();

    this.shadow = this.add.ellipse(ROOT.x, ROOT.y + 8, 82, 26, 0x07110f, 0.46).setDepth(20);
    this.referenceGhost = this.add.sprite(ROOT.x, ROOT.y, 'blade-idle', DIRECTIONS.indexOf(state.direction) * ACTIONS.idle.frames);
    this.referenceGhost
      .setOrigin(SOURCE_ANCHOR.x / 96, SOURCE_ANCHOR.y / 96)
      .setAlpha(0.22)
      .setTint(0x79e7d5)
      .setDepth(28);
    this.sprite = this.add.sprite(ROOT.x, ROOT.y, 'blade-idle', DIRECTIONS.indexOf(state.direction) * ACTIONS.idle.frames);
    this.sprite.setOrigin(SOURCE_ANCHOR.x / 96, SOURCE_ANCHOR.y / 96).setDepth(30);
    state.scene = this;
    this.applyScale();
    if (state.action === 'transition') {
      this.restartTransition();
    } else {
      this.play(state.action);
      if (state.frameOverride !== null) this.showStaticFrame(state.frameOverride);
    }
    updateCopy();
    document.documentElement.dataset.ready = 'true';
  }

  update(_time, delta) {
    if (state.action === 'transition') {
      state.transitionRemaining -= delta / 1000;
      if (state.transitionRemaining <= 0) this.advanceTransition();
    }
    this.refreshFrameDiagnostics();
  }

  paintBattlefield() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x18382f, 1).fillRect(0, 0, 720, 1280);

    for (let y = 0; y < 1280; y += 48) {
      graphics.fillStyle(y % 96 ? 0x1c4034 : 0x204638, 0.72).fillRect(0, y, 720, 48);
    }

    graphics.fillStyle(0x555744, 1);
    graphics.fillPoints([
      new Phaser.Geom.Point(222, 0),
      new Phaser.Geom.Point(498, 0),
      new Phaser.Geom.Point(454, 1280),
      new Phaser.Geom.Point(266, 1280)
    ], true);
    graphics.lineStyle(4, 0x8d8d68, 0.38);
    for (let y = 30; y < 1280; y += 58) graphics.lineBetween(244, y, 476, y + 16);

    graphics.lineStyle(2, 0x79e7d5, 0.18);
    graphics.lineBetween(116, 0, 286, 1280);
    graphics.lineBetween(604, 0, 434, 1280);

    graphics.fillStyle(0x86ead9, 0.18).fillCircle(360, 1135, 126);
    graphics.fillStyle(0x86ead9, 0.9);
    graphics.fillPoints([
      new Phaser.Geom.Point(360, 1040),
      new Phaser.Geom.Point(408, 1106),
      new Phaser.Geom.Point(386, 1190),
      new Phaser.Geom.Point(360, 1218),
      new Phaser.Geom.Point(334, 1190),
      new Phaser.Geom.Point(312, 1106)
    ], true);
    graphics.fillStyle(0x655b82, 1).fillRect(310, 1210, 100, 24);

    const ingress = [170, 360, 550];
    for (const x of ingress) {
      graphics.fillStyle(0xf2cd68, 0.17).fillCircle(x, 80, 48);
      graphics.lineStyle(3, 0xf2cd68, 0.55).strokeCircle(x, 80, 29);
    }
  }

  paintGuides() {
    this.guides = this.add.graphics().setDepth(40);
  }

  registerAnimations() {
    for (const [actionId, action] of Object.entries(ACTIONS)) {
      for (let row = 0; row < DIRECTIONS.length; row += 1) {
        const key = this.animationKey(actionId, DIRECTIONS[row]);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(`blade-${actionId}`, {
            start: row * action.frames,
            end: row * action.frames + action.frames - 1
          }),
          frameRate: action.fps,
          repeat: action.repeat,
          skipMissedFrames: false
        });
      }
    }
  }

  animationKey(action, direction) {
    return `lab:${action}:${direction}`;
  }

  play(action) {
    this.currentAction = action;
    this.sprite.play(this.animationKey(action, state.direction), true);
    this.lastDiagnosticKey = null;
    updateCopy(action);
  }

  applyScale() {
    const correction = state.scale === 1 ? 0 : (MEASURED_FOOT_Y - SOURCE_ANCHOR.y) * state.scale;
    this.sprite.setScale(state.scale);
    this.sprite.setPosition(ROOT.x, ROOT.y - correction);
    this.referenceGhost
      .setFrame(DIRECTIONS.indexOf(state.direction) * ACTIONS.idle.frames)
      .setScale(state.scale)
      .setPosition(ROOT.x, ROOT.y - correction)
      .setVisible(state.guides);
    this.shadow.setScale(Math.max(0.72, state.scale));
    this.guides.setVisible(state.guides);
    this.lastDiagnosticKey = null;
    this.refreshFrameDiagnostics();
  }

  restartTransition() {
    state.frameOverride = null;
    state.transitionIndex = -1;
    state.transitionRemaining = 0;
    this.advanceTransition();
  }

  advanceTransition() {
    state.transitionIndex = (state.transitionIndex + 1) % TRANSITION.length;
    const [action, duration] = TRANSITION[state.transitionIndex];
    state.transitionRemaining = duration;
    this.play(action);
  }

  showStaticFrame(column) {
    const action = state.action === 'transition' ? this.currentAction : state.action;
    if (!(action in ACTIONS)) return;
    const clamped = Phaser.Math.Clamp(column, 0, ACTIONS[action].frames - 1);
    const row = DIRECTIONS.indexOf(state.direction);
    this.sprite.anims.stop();
    this.sprite.setTexture(`blade-${action}`, row * ACTIONS[action].frames + clamped);
    this.currentAction = action;
    state.frameOverride = clamped;
    this.lastDiagnosticKey = null;
    this.refreshFrameDiagnostics();
  }

  refreshFrameDiagnostics() {
    if (!state.report || !this.sprite?.frame || !this.currentAction) return;
    const action = state.report.actions[this.currentAction];
    if (!action) return;
    const frameName = Number(this.sprite.frame.name);
    const row = DIRECTIONS.indexOf(state.direction);
    const column = Phaser.Math.Clamp(frameName - row * ACTIONS[this.currentAction].frames, 0, ACTIONS[this.currentAction].frames - 1);
    const key = `${this.currentAction}:${state.direction}:${column}:${state.scale}:${state.guides}`;
    if (key === this.lastDiagnosticKey) return;
    this.lastDiagnosticKey = key;

    const metric = action.frames.find((frame) => frame.direction === state.direction && frame.column === column);
    const idleMetric = state.report.actions.idle.frames.find(
      (frame) => frame.direction === state.direction && frame.column === 0
    );
    if (!metric || !idleMetric) return;

    const scale = state.scale;
    const cellLeft = this.sprite.x - SOURCE_ANCHOR.x * scale;
    const cellTop = this.sprite.y - SOURCE_ANCHOR.y * scale;
    const cellSize = 96 * scale;
    const bodyPadding = state.report.contract.body_padding_px ?? 4;
    const bodyTopPadding = state.report.contract.body_top_padding_px ?? bodyPadding;
    const equipmentPadding = state.report.contract.equipment_padding_px ?? 2;
    const guides = this.guides;
    guides.clear();

    guides.fillStyle(0xff746d, 0.12).fillRect(cellLeft, cellTop, cellSize, equipmentPadding * scale);
    guides.fillRect(cellLeft, cellTop + cellSize - equipmentPadding * scale, cellSize, equipmentPadding * scale);
    guides.fillStyle(0xffd46b, 0.11).fillRect(
      cellLeft,
      cellTop + equipmentPadding * scale,
      cellSize,
      Math.max(1, (bodyTopPadding - equipmentPadding) * scale)
    );
    guides.fillRect(
      cellLeft,
      cellTop + cellSize - bodyPadding * scale,
      cellSize,
      Math.max(1, (bodyPadding - equipmentPadding) * scale)
    );
    guides.lineStyle(2, 0x79e7d5, 0.8).strokeRect(cellLeft, cellTop, cellSize, cellSize);
    guides.lineStyle(2, 0x7ee697, 0.9).strokeRect(
      cellLeft + bodyPadding * scale,
      cellTop + bodyTopPadding * scale,
      cellSize - bodyPadding * 2 * scale,
      cellSize - (bodyTopPadding + bodyPadding) * scale
    );

    if (metric.bbox) {
      guides.lineStyle(2, 0x79e7d5, 0.95).strokeRect(
        cellLeft + metric.bbox[0] * scale,
        cellTop + metric.bbox[1] * scale,
        (metric.bbox[2] - metric.bbox[0]) * scale,
        (metric.bbox[3] - metric.bbox[1]) * scale
      );
    }
    if (metric.core_bbox) {
      guides.lineStyle(2, 0xffd46b, 0.95).strokeRect(
        cellLeft + metric.core_bbox[0] * scale,
        cellTop + metric.core_bbox[1] * scale,
        (metric.core_bbox[2] - metric.core_bbox[0]) * scale,
        (metric.core_bbox[3] - metric.core_bbox[1]) * scale
      );
    }

    const measuredFootY = this.sprite.y + (metric.measured_root_px[1] - SOURCE_ANCHOR.y) * scale;
    guides.lineStyle(3, 0xff746d, 0.95).lineBetween(ROOT.x - 92, ROOT.y, ROOT.x + 92, ROOT.y);
    guides.lineStyle(2, 0xeb74ff, 0.95).lineBetween(ROOT.x - 72, measuredFootY, ROOT.x + 72, measuredFootY);
    guides.lineStyle(3, 0xff746d, 0.85).lineBetween(ROOT.x + 78, ROOT.y, ROOT.x + 78, measuredFootY);
    guides.lineBetween(ROOT.x + 72, ROOT.y, ROOT.x + 84, ROOT.y);
    guides.lineBetween(ROOT.x + 72, measuredFootY, ROOT.x + 84, measuredFootY);

    const topPadding = metric.core_bbox?.[1] ?? 0;
    const bottomPadding = metric.core_bbox ? 96 - metric.core_bbox[3] : 0;
    const deltaRatio = (metric.core_height_px - idleMetric.core_height_px) / Math.max(1, idleMetric.core_height_px);
    const detachedTop = metric.connected_components.slice(1).some(
      (component) => component.pixel_count >= 8 && component.bbox[1] < bodyTopPadding
    );
    const collision = topPadding < bodyTopPadding || bottomPadding < bodyPadding || detachedTop;
    const badge = document.querySelector('#edge-badge');
    const metricCopy = document.querySelector('#metric-copy');
    badge.classList.toggle('collision', collision);
    badge.textContent = detachedTop
      ? 'DETACHED HEAD ISLAND'
      : collision
        ? 'EDGE COLLISION'
        : 'LEGACY SOURCE REJECTED';
    metricCopy.textContent = [
      `${this.currentAction.toUpperCase()} f${column + 1}`,
      `H ${metric.core_height_px}px (${deltaRatio >= 0 ? '+' : ''}${(deltaRatio * 100).toFixed(1)}%)`,
      `top ${topPadding}px / bottom ${bottomPadding}px`,
      `root dY ${metric.root_delta_px[1]}px`
    ].join(' · ');
  }
}

function activePlaybackAction(fallback = null) {
  if (fallback) return fallback;
  if (state.action !== 'transition') return state.action;
  return TRANSITION[Math.max(0, state.transitionIndex)]?.[0] ?? 'idle';
}

function updateCopy(playbackAction = null) {
  const current = activePlaybackAction(playbackAction);
  const title = document.querySelector('#review-title');
  const detail = document.querySelector('#review-detail');
  const size = document.querySelector('#size-chip');
  if (!title || !detail || !size) return;

  title.textContent = `${state.direction} · ${state.action === 'transition' ? 'TRANSITION SEQUENCE' : current.toUpperCase()}`;
  detail.textContent = state.scale === 1
    ? 'Red = contract root; purple = measured feet (+12px).'
    : `Shared ${state.scale.toFixed(2)}x scale; feet translated to the contract root.`;
  const canvasWidth = Math.round(state.scene?.game.canvas.getBoundingClientRect().width || Math.min(window.innerWidth, 520));
  const bodyCss = 87 * state.scale * canvasWidth / 720;
  size.textContent = `${canvasWidth}px field · ~${bodyCss.toFixed(0)}px body`;
}

function selectAction(action) {
  state.action = action;
  state.frameOverride = null;
  for (const button of document.querySelectorAll('[data-action]')) {
    button.classList.toggle('active', button.dataset.action === action);
  }
  if (!state.scene) return;
  if (action === 'transition') state.scene.restartTransition();
  else state.scene.play(action);
  updateCopy();
}

function wireControls() {
  for (const button of document.querySelectorAll('[data-action]')) {
    button.addEventListener('click', () => selectAction(button.dataset.action));
  }

  document.querySelector('#direction-control').addEventListener('change', (event) => {
    state.direction = event.target.value;
    if (state.action === 'transition') state.scene?.restartTransition();
    else state.scene?.play(state.action);
    updateCopy();
  });

  document.querySelector('#scale-control').addEventListener('change', (event) => {
    state.scale = Number(event.target.value);
    state.scene?.applyScale();
    updateCopy();
  });

  document.querySelector('#guide-toggle').addEventListener('click', (event) => {
    state.guides = !state.guides;
    event.currentTarget.classList.toggle('active', state.guides);
    event.currentTarget.setAttribute('aria-pressed', String(state.guides));
    state.scene?.applyScale();
  });

  window.addEventListener('resize', () => updateCopy(), { passive: true });
}

async function loadReport() {
  const badge = document.querySelector('#qa-badge');
  try {
    const response = await fetch('../../art/blade-rank1/qa/report.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.report = await response.json();
    badge.innerHTML = `<strong>${state.report.summary.hard_failure_count} BLOCKERS</strong><span>manual: ${state.report.manual_review.status}</span>`;
    document.documentElement.dataset.qaStatus = state.report.computed_qa_status;
  } catch (error) {
    badge.innerHTML = '<strong>NO REPORT</strong><span>run qa:assets:report</span>';
    console.error(error);
  }
}

function applyQueryPreset() {
  const params = new URLSearchParams(location.search);
  const direction = params.get('direction');
  const action = params.get('action');
  const scale = Number(params.get('scale'));
  const frame = Number(params.get('frame'));
  if (DIRECTIONS.includes(direction)) {
    state.direction = direction;
    document.querySelector('#direction-control').value = direction;
  }
  if (action === 'transition' || action in ACTIONS) selectAction(action);
  if (Number.isInteger(frame) && frame >= 1) state.frameOverride = frame - 1;
  if ([1, 0.84, 0.82, 0.72].includes(scale)) {
    state.scale = scale;
    document.querySelector('#scale-control').value = String(scale);
  }
}

async function boot() {
  if (!globalThis.Phaser) throw new Error('Phaser failed to load.');
  wireControls();
  applyQueryPreset();
  await loadReport();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 720,
    height: 1280,
    transparent: false,
    backgroundColor: '#18382f',
    pixelArt: true,
    roundPixels: true,
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BladeAssetLabScene]
  });

  globalThis.__BLADE_ASSET_LAB__ = { game, state };
}

boot().catch((error) => {
  console.error(error);
  document.documentElement.dataset.ready = 'error';
  document.querySelector('#game').innerHTML = `<pre>${String(error?.stack ?? error)}</pre>`;
});
