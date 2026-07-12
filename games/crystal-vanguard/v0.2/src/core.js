/**
 * Small application primitives shared by Phaser scenes and the DOM HUD.
 * The v0.2 backbone intentionally avoids a framework-wide dependency container.
 */

export const PHASES = Object.freeze({
  PLANNING: 'planning',
  BATTLE: 'battle',
  DEFEAT: 'defeat'
});

export const WORLD_SIZE = Object.freeze({
  width: 720,
  height: 1280
});

export const BATTLEFIELD_LAYOUT = Object.freeze({
  frontlineY: 650,
  grid: Object.freeze({
    x: 52,
    y: 690,
    cols: 7,
    rows: 5,
    cellWidth: 88,
    cellHeight: 88
  }),
  sanctuary: Object.freeze({
    crystalX: 360,
    crystalY: 1150,
    centerColumn: 3,
    reserveRow: 4
  }),
  lanes: Object.freeze({
    LEFT: Object.freeze({
      spawn: Object.freeze({ x: 184, y: 96 }),
      waypoints: Object.freeze([
        Object.freeze({ x: 184, y: 520 }),
        Object.freeze({ x: 184, y: 700 }),
        Object.freeze({ x: 272, y: 970 }),
        Object.freeze({ x: 330, y: 1100 })
      ])
    }),
    CENTER: Object.freeze({
      spawn: Object.freeze({ x: 360, y: 96 }),
      waypoints: Object.freeze([
        Object.freeze({ x: 360, y: 520 }),
        Object.freeze({ x: 360, y: 704 }),
        Object.freeze({ x: 360, y: 930 }),
        Object.freeze({ x: 360, y: 1080 })
      ])
    }),
    RIGHT: Object.freeze({
      spawn: Object.freeze({ x: 536, y: 96 }),
      waypoints: Object.freeze([
        Object.freeze({ x: 536, y: 520 }),
        Object.freeze({ x: 536, y: 700 }),
        Object.freeze({ x: 448, y: 970 }),
        Object.freeze({ x: 390, y: 1100 })
      ])
    })
  })
});

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Listener for "${eventName}" must be a function.`);
    }

    const handlers = this.listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.listeners.delete(eventName);
    };
  }

  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  emit(eventName, payload) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;

    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  clear() {
    this.listeners.clear();
  }
}

function cloneState(state) {
  return {
    ...state,
    crystal: { ...state.crystal },
    counts: { ...state.counts },
    wave: { ...state.wave }
  };
}

export class GameSession {
  constructor(bus, initialState = {}) {
    if (!(bus instanceof EventBus)) {
      throw new TypeError('GameSession requires an EventBus.');
    }

    this.bus = bus;
    this.initialState = {
      round: 1,
      gold: 12,
      phase: PHASES.PLANNING,
      selectedTool: null,
      crystal: { hp: 700, maxHp: 700 },
      counts: { units: 0, buildings: 0, enemies: 0 },
      wave: { spawned: 0, total: 0 },
      ...initialState
    };

    this.reset({ silent: true });
  }

  reset({ silent = false } = {}) {
    this.state = cloneState(this.initialState);
    if (!silent) this.publish('reset');
  }

  snapshot() {
    return cloneState(this.state);
  }

  publish(reason = 'update') {
    this.bus.emit('session:changed', {
      reason,
      state: this.snapshot()
    });
  }

  setPhase(phase) {
    if (!Object.values(PHASES).includes(phase)) {
      throw new Error(`Unknown phase "${phase}".`);
    }
    if (this.state.phase === phase) return;
    this.state.phase = phase;
    if (phase !== PHASES.PLANNING) this.state.selectedTool = null;
    this.publish('phase');
  }

  setSelectedTool(toolId) {
    if (this.state.phase !== PHASES.PLANNING) return false;
    this.state.selectedTool = toolId;
    this.publish('selected-tool');
    return true;
  }

  spendGold(amount) {
    const normalized = Math.max(0, Math.floor(amount));
    if (this.state.gold < normalized) return false;
    this.state.gold -= normalized;
    this.publish('gold-spent');
    return true;
  }

  addGold(amount) {
    this.state.gold += Math.max(0, Math.floor(amount));
    this.publish('gold-added');
  }

  setRound(round) {
    this.state.round = Math.max(1, Math.floor(round));
    this.publish('round');
  }

  setCrystalHp(hp, maxHp = this.state.crystal.maxHp) {
    const normalizedMax = Math.max(1, Math.floor(maxHp));
    this.state.crystal.maxHp = normalizedMax;
    this.state.crystal.hp = Math.max(0, Math.min(normalizedMax, Math.round(hp)));
    this.publish('crystal');
  }

  setCounts(partialCounts) {
    const next = {
      ...this.state.counts,
      ...partialCounts
    };

    const changed = Object.keys(next).some((key) => next[key] !== this.state.counts[key]);
    if (!changed) return;

    this.state.counts = next;
    this.publish('counts');
  }

  setWaveProgress(spawned, total) {
    const next = {
      spawned: Math.max(0, Math.floor(spawned)),
      total: Math.max(0, Math.floor(total))
    };

    if (next.spawned === this.state.wave.spawned && next.total === this.state.wave.total) return;
    this.state.wave = next;
    this.publish('wave-progress');
  }

  notify(message, tone = 'info') {
    this.bus.emit('ui:toast', { message, tone });
    this.bus.emit('ui:log', { message, tone, at: Date.now() });
  }
}

let appContext = null;

export function setAppContext(context) {
  if (!context?.bus || !context?.session || !context?.content) {
    throw new Error('App context requires bus, session, and content.');
  }
  appContext = context;
}

export function getAppContext() {
  if (!appContext) {
    throw new Error('App context has not been initialized.');
  }
  return appContext;
}
