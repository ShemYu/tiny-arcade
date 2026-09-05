/* Lumen Loop — deterministic simulation. No DOM, timers, audio, or dependencies. */
(function (root) {
  'use strict';
  const DURATION = 60, STEP = 1 / 120, LOOKAHEAD = 4.5;
  function random(seed) {
    let n = seed >>> 0;
    return () => {
      n += 0x6D2B79F5;
      let t = Math.imul(n ^ n >>> 15, n | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function create(seed = 1) {
    const s = { seed: seed >>> 0, status: 'ready', time: 0, angle: 0,
      lane: 0, target: 0, hp: 3, score: 0, chain: 0, maxChain: 0,
      collected: 0, missed: 0, switches: 0, invincible: 0, bonus: 0,
      rows: [], events: [], next: 2.2, count: 0, safe: 0, run: 0,
      rng: random(seed) };
    fill(s);
    return s;
  }
  function fill(s) {
    const lesson = [0, 0, 1, 1, 0, 1];
    while (s.next < s.angle + LOOKAHEAD) {
      const id = s.count++;
      if (id < lesson.length) s.safe = lesson[id];
      else if (--s.run <= 0) {
        s.safe = 1 - s.safe;
        s.run = 1 + Math.floor(s.rng() * 3);
      }
      s.rows.push({ id, angle: s.next, safe: s.safe, danger: id >= 2,
        judged: false, collected: false, hit: false });
      // Even the smallest gap is longer than a complete lane change at top speed.
      s.next += id < 6 ? 0.8 : 0.70 + s.rng() * 0.18;
    }
  }
  function start(s) { if (s.status === 'ready') s.status = 'playing'; }
  function switchLane(s) {
    if (s.status !== 'playing') return false;
    s.target = 1 - s.target;
    s.switches++;
    return true;
  }
  function pause(s) { if (s.status === 'playing') s.status = 'paused'; }
  function resume(s) { if (s.status === 'paused') s.status = 'playing'; }
  function multiplier(s) { return Math.min(5, 1 + Math.floor(s.chain / 8)); }
  function tick(s, dt) {
    const oldAngle = s.angle;
    s.time = Math.min(DURATION, s.time + dt);
    s.angle += (1.15 + 0.85 * s.time / DURATION) * dt;
    s.lane += Math.sign(s.target - s.lane) * Math.min(Math.abs(s.target - s.lane), dt / 0.16);
    s.invincible = Math.max(0, s.invincible - dt);
    for (const row of s.rows) {
      const distance = row.angle - s.angle;
      // A finite angular window prevents last-frame lane switching through a gate.
      if (row.danger && !row.hit && !row.judged && Math.abs(distance) < 0.105 &&
          Math.abs(s.lane - (1 - row.safe)) < 0.38 && s.invincible === 0) {
        row.hit = true;
        s.hp--;
        s.chain = 0;
        s.invincible = 1.2;
        s.events.push({ type: 'hit', angle: row.angle, lane: s.lane });
        if (!s.hp) {
          s.status = 'lost';
          s.events.push({ type: 'end' });
          return;
        }
      }
      if (!row.judged && oldAngle <= row.angle && s.angle >= row.angle) {
        row.judged = true;
        if (!row.hit && Math.abs(s.lane - row.safe) < 0.34) {
          row.collected = true;
          s.collected++;
          s.chain++;
          s.maxChain = Math.max(s.maxChain, s.chain);
          const points = 10 * multiplier(s);
          s.score += points;
          s.events.push({ type: 'collect', angle: row.angle, lane: row.safe, points });
        } else {
          s.missed++;
          s.chain = 0;
        }
      }
    }
    s.rows = s.rows.filter(row => row.angle > s.angle - 0.35);
    fill(s);
    if (s.time >= DURATION) {
      s.bonus = s.hp * 100;
      s.score += s.bonus;
      s.status = 'won';
      s.events.push({ type: 'end' });
    }
  }
  function step(s, dt) {
    if (s.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Long browser stalls must not fast-forward into unseen obstacles.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 1e-9 && s.status === 'playing') {
      const slice = Math.min(STEP, remaining);
      tick(s, slice);
      remaining -= slice;
    }
  }
  const api = { DURATION, STEP, LOOKAHEAD, create, start, switchLane, pause, resume, multiplier, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LumenLoop = api;
})(globalThis);
