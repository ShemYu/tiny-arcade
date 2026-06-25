(() => {
  'use strict';

  const WORLD = { width: 1680, height: 1240 };
  const CELL = 96;
  const MOVE = {
    speed: 190,
    arriveRadius: 2,
    targetSlowRadius: 56,
    targetMinSpeed: 54
  };
  const BODY = { width: 28, height: 18 };
  const REGISTRATION = {
    defaultX: 48,
    defaultY: 82,
    alphaThreshold: 24,
    coreLeft: 0.25,
    coreRight: 0.75,
    maxScaleCorrection: 0.08
  };
  const DIRECTION_HYSTERESIS = Phaser.Math.DegToRad(5);

  const ACTIONS = {
    idle: {
      texture: 'blade-idle',
      file: '../../assets/units/blade-rank1-idle.png',
      frames: 6,
      fps: 7,
      repeat: -1,
      stabilizePx: 2
    },
    walk: {
      texture: 'blade-walk',
      file: '../../assets/units/blade-rank1-walk.png',
      frames: 8,
      fps: 12,
      repeat: -1,
      stabilizePx: 2
    },
    attack: {
      texture: 'blade-attack',
      file: '../../assets/units/blade-rank1-attack.png',
      frames: 8,
      fps: 14,
      repeat: 0,
      lock: true,
      impactFrame: 4,
      stabilizePx: 1
    },
    cast: {
      texture: 'blade-cast',
      file: '../../assets/units/blade-rank1-cast.png',
      frames: 8,
      fps: 12,
      repeat: 0,
      lock: true,
      impactFrame: 4,
      stabilizePx: 1
    },
    hurt: {
      texture: 'blade-hurt',
      file: '../../assets/units/blade-rank1-hurt.png',
      frames: 4,
      fps: 12,
      repeat: 0,
      lock: true,
      stabilizePx: 1
    },
    death: {
      texture: 'blade-death',
      file: '../../assets/units/blade-rank1-death.png',
      frames: 8,
      fps: 10,
      repeat: 0,
      lock: true,
      hold: true,
      stabilizePx: 0
    }
  };

  const DIRS = [
    { key: 'E', angle: 0, row: 2 },
    { key: 'SE', angle: Math.PI / 4, row: 1 },
    { key: 'S', angle: Math.PI / 2, row: 0 },
    { key: 'SW', angle: Math.PI * 3 / 4, row: 7 },
    { key: 'W', angle: Math.PI, row: 6 },
    { key: 'NW', angle: -Math.PI * 3 / 4, row: 5 },
    { key: 'N', angle: -Math.PI / 2, row: 4 },
    { key: 'NE', angle: -Math.PI / 4, row: 3 }
  ];
  const DIR_ORDER = DIRS.map(direction => direction.key);
  const DIR_BY_KEY = Object.fromEntries(DIRS.map(direction => [direction.key, direction]));

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function directionFromVector(dx, dy, currentDirection = 'S') {
    if (Math.hypot(dx, dy) < 0.01) return currentDirection;
    const angle = Math.atan2(dy, dx);
    const currentAngle = DIR_BY_KEY[currentDirection]?.angle ?? Math.PI / 2;
    const distanceFromCurrent = Math.abs(Phaser.Math.Angle.Wrap(angle - currentAngle));
    if (distanceFromCurrent <= Math.PI / 8 + DIRECTION_HYSTERESIS) return currentDirection;
    const index = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
    return DIR_ORDER[index];
  }

  window.CVProof = {
    WORLD,
    CELL,
    MOVE,
    BODY,
    REGISTRATION,
    ACTIONS,
    DIRS,
    DIR_ORDER,
    DIR_BY_KEY,
    median,
    directionFromVector
  };
})();
