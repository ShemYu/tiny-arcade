/**
 * Data-only game content and validation.
 *
 * Adding a profession, monster, skill, wave, building, or visual should normally
 * require editing this file—not changing scene code.
 */

export const DIRECTION_ROWS = Object.freeze(['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']);
export const ATTACK_TYPES = Object.freeze(['melee', 'projectile', 'none']);
export const SKILL_EFFECT_TYPES = Object.freeze(['areaDamage', 'damageReductionBelowHealth']);

const ID_PATTERN = /^[a-z0-9]+(?:[.:/-][a-z0-9]+)*$/;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPositiveNumber(value, label, { allowZero = false } = {}) {
  const valid = typeof value === 'number' && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
  assert(valid, `${label} must be ${allowZero ? 'a non-negative' : 'a positive'} number.`);
}

export class ContentRegistry {
  constructor(collections) {
    this.collections = new Map();

    for (const [kind, definitions] of Object.entries(collections)) {
      this.registerCollection(kind, definitions);
    }
  }

  registerCollection(kind, definitions) {
    assert(Array.isArray(definitions), `Content collection "${kind}" must be an array.`);
    const entries = new Map();

    for (const definition of definitions) {
      assert(definition && typeof definition === 'object', `${kind} definition must be an object.`);
      assert(typeof definition.id === 'string' && ID_PATTERN.test(definition.id), `${kind} has invalid id "${definition.id}".`);
      assert(!entries.has(definition.id), `Duplicate ${kind} id "${definition.id}".`);
      entries.set(definition.id, definition);
    }

    this.collections.set(kind, entries);
    return this;
  }

  has(kind, id) {
    return this.collections.get(kind)?.has(id) ?? false;
  }

  get(kind, id) {
    const definition = this.collections.get(kind)?.get(id);
    if (!definition) throw new Error(`Unknown ${kind} "${id}".`);
    return definition;
  }

  all(kind) {
    return [...(this.collections.get(kind)?.values() ?? [])];
  }

  validate() {
    this.validateAssets();
    this.validateSkills();
    this.validateCombatants('profession');
    this.validateCombatants('monster');
    this.validateCombatants('building');
    this.validateWaves();
    this.validateTools();

    for (const definitions of this.collections.values()) {
      for (const definition of definitions.values()) deepFreeze(definition);
    }

    return this;
  }

  validateAssets() {
    for (const asset of this.all('asset')) {
      assert(['directional-sprite', 'placeholder'].includes(asset.kind), `Asset "${asset.id}" has unsupported kind.`);
      assert(['ready', 'placeholder'].includes(asset.status), `Asset "${asset.id}" has unsupported status.`);
      assertPositiveNumber(asset.size?.width, `Asset "${asset.id}" width`);
      assertPositiveNumber(asset.size?.height, `Asset "${asset.id}" height`);
      assertPositiveNumber(asset.anchor?.x, `Asset "${asset.id}" anchor.x`, { allowZero: true });
      assertPositiveNumber(asset.anchor?.y, `Asset "${asset.id}" anchor.y`, { allowZero: true });

      if (asset.kind === 'directional-sprite') {
        assert(asset.actions && Object.keys(asset.actions).length > 0, `Directional asset "${asset.id}" requires actions.`);
        for (const [actionId, action] of Object.entries(asset.actions)) {
          assert(typeof action.texture === 'string', `Asset "${asset.id}" action "${actionId}" needs a texture key.`);
          assert(typeof action.url === 'string', `Asset "${asset.id}" action "${actionId}" needs a URL.`);
          assertPositiveNumber(action.frames, `Asset "${asset.id}" action "${actionId}" frames`);
          assertPositiveNumber(action.fps, `Asset "${asset.id}" action "${actionId}" fps`);
        }
      }
    }
  }

  validateSkills() {
    for (const skill of this.all('skill')) {
      assert(typeof skill.name === 'string', `Skill "${skill.id}" requires a name.`);
      assert(['afterAttack', 'incomingDamage'].includes(skill.trigger), `Skill "${skill.id}" has unsupported trigger.`);
      assert(SKILL_EFFECT_TYPES.includes(skill.effect?.type), `Skill "${skill.id}" has unsupported effect.`);
      if (skill.every !== undefined) assertPositiveNumber(skill.every, `Skill "${skill.id}" every`);
    }
  }

  validateCombatants(kind) {
    for (const definition of this.all(kind)) {
      assert(typeof definition.name === 'string', `${kind} "${definition.id}" requires a name.`);
      assert(this.has('asset', definition.visualAssetId), `${kind} "${definition.id}" references missing asset "${definition.visualAssetId}".`);
      assertPositiveNumber(definition.stats?.maxHp, `${kind} "${definition.id}" maxHp`);
      assertPositiveNumber(definition.stats?.radius, `${kind} "${definition.id}" radius`);
      assertPositiveNumber(definition.stats?.armor ?? 0, `${kind} "${definition.id}" armor`, { allowZero: true });
      assert(ATTACK_TYPES.includes(definition.attack?.type), `${kind} "${definition.id}" has unsupported attack type.`);
      assertPositiveNumber(definition.attack?.range ?? 0, `${kind} "${definition.id}" attack range`, { allowZero: true });
      assertPositiveNumber(definition.attack?.cooldown ?? 0, `${kind} "${definition.id}" attack cooldown`, { allowZero: true });
      assertPositiveNumber(definition.attack?.damage ?? 0, `${kind} "${definition.id}" attack damage`, { allowZero: true });
      assertPositiveNumber(definition.attack?.impactDelay ?? 0, `${kind} "${definition.id}" attack impact delay`, { allowZero: true });

      if (definition.attack.type === 'projectile') {
        assert(this.has('asset', definition.attack.projectileAssetId), `${kind} "${definition.id}" references missing projectile asset.`);
        assertPositiveNumber(definition.attack.projectileSpeed, `${kind} "${definition.id}" projectile speed`);
      }

      for (const skillId of definition.skillIds ?? []) {
        assert(this.has('skill', skillId), `${kind} "${definition.id}" references missing skill "${skillId}".`);
      }

      if (definition.cost !== undefined) assertPositiveNumber(definition.cost, `${kind} "${definition.id}" cost`, { allowZero: true });
    }
  }

  validateWaves() {
    for (const wave of this.all('wave')) {
      assertPositiveNumber(wave.clearReward, `Wave "${wave.id}" clear reward`, { allowZero: true });
      assert(Array.isArray(wave.groups) && wave.groups.length > 0, `Wave "${wave.id}" requires spawn groups.`);

      for (const group of wave.groups) {
        assert(this.has('monster', group.monsterId), `Wave "${wave.id}" references missing monster "${group.monsterId}".`);
        assert(DIRECTION_ROWS.includes(group.direction), `Wave "${wave.id}" uses invalid direction "${group.direction}".`);
        assertPositiveNumber(group.count, `Wave "${wave.id}" group count`);
        assertPositiveNumber(group.interval, `Wave "${wave.id}" group interval`);
        assertPositiveNumber(group.delay ?? 0, `Wave "${wave.id}" group delay`, { allowZero: true });
      }
    }
  }

  validateTools() {
    for (const tool of this.all('tool')) {
      assert(['profession', 'building'].includes(tool.contentKind), `Tool "${tool.id}" has unsupported content kind.`);
      assert(this.has(tool.contentKind, tool.contentId), `Tool "${tool.id}" references missing ${tool.contentKind} "${tool.contentId}".`);
    }
  }
}

export const ASSETS = [
  {
    id: 'unit.blade.rank1',
    kind: 'directional-sprite',
    status: 'ready',
    size: { width: 96, height: 96 },
    anchor: { x: 48, y: 82 },
    body: { width: 28, height: 18, offsetX: 34, offsetY: 64 },
    fallback: { shape: 'fighter', fill: 0xd8e2df, accent: 0x6c93a5 },
    actions: {
      idle: {
        texture: 'cv02-blade-idle',
        url: '../assets/units/blade-rank1-idle.png',
        frames: 6,
        fps: 7,
        repeat: -1
      },
      walk: {
        texture: 'cv02-blade-walk',
        url: '../assets/units/blade-rank1-walk.png',
        frames: 8,
        fps: 12,
        repeat: -1
      },
      attack: {
        texture: 'cv02-blade-attack',
        url: '../assets/units/blade-rank1-attack.png',
        frames: 8,
        fps: 14,
        repeat: 0
      },
      cast: {
        texture: 'cv02-blade-cast',
        url: '../assets/units/blade-rank1-cast.png',
        frames: 8,
        fps: 12,
        repeat: 0
      },
      hurt: {
        texture: 'cv02-blade-hurt',
        url: '../assets/units/blade-rank1-hurt.png',
        frames: 4,
        fps: 12,
        repeat: 0
      },
      death: {
        texture: 'cv02-blade-death',
        url: '../assets/units/blade-rank1-death.png',
        frames: 8,
        fps: 10,
        repeat: 0
      }
    }
  },
  {
    id: 'monster.sprout',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 52, height: 52 },
    anchor: { x: 26, y: 43 },
    body: { width: 28, height: 18, offsetX: 12, offsetY: 31 },
    placeholder: { shape: 'slime', fill: 0x79bb6c, accent: 0xc4efa9 }
  },
  {
    id: 'monster.moth',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 56, height: 56 },
    anchor: { x: 28, y: 45 },
    body: { width: 30, height: 18, offsetX: 13, offsetY: 33 },
    placeholder: { shape: 'moth', fill: 0xe3c975, accent: 0xfff2ae }
  },
  {
    id: 'monster.golem',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 68, height: 68 },
    anchor: { x: 34, y: 58 },
    body: { width: 38, height: 24, offsetX: 15, offsetY: 42 },
    placeholder: { shape: 'golem', fill: 0x9f9a82, accent: 0xd1c9a8 }
  },
  {
    id: 'building.barricade',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 64, height: 64 },
    anchor: { x: 32, y: 54 },
    body: { width: 48, height: 28, offsetX: 8, offsetY: 34 },
    placeholder: { shape: 'barricade', fill: 0x9c6b4e, accent: 0xd6a26f }
  },
  {
    id: 'building.bolt-tower',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 72, height: 80 },
    anchor: { x: 36, y: 70 },
    body: { width: 46, height: 28, offsetX: 13, offsetY: 48 },
    placeholder: { shape: 'tower', fill: 0x6b7884, accent: 0xbac8cc }
  },
  {
    id: 'core.crystal',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 104, height: 120 },
    anchor: { x: 52, y: 105 },
    body: { width: 62, height: 42, offsetX: 21, offsetY: 72 },
    placeholder: { shape: 'crystal', fill: 0x79e7d5, accent: 0xd6fff1 }
  },
  {
    id: 'projectile.bolt',
    kind: 'placeholder',
    status: 'placeholder',
    size: { width: 16, height: 8 },
    anchor: { x: 8, y: 4 },
    body: { width: 12, height: 6, offsetX: 2, offsetY: 1 },
    placeholder: { shape: 'bolt', fill: 0xffdf82, accent: 0xffffff }
  }
];

export const SKILLS = [
  {
    id: 'blade.cleave',
    name: '橫斬',
    description: '每第三次普攻對目標周圍造成額外傷害。',
    trigger: 'afterAttack',
    every: 3,
    effect: {
      type: 'areaDamage',
      radius: 58,
      multiplier: 0.55
    }
  },
  {
    id: 'blade.guard',
    name: '守勢',
    description: '生命低於 45% 時，受到的傷害降低 22%。',
    trigger: 'incomingDamage',
    effect: {
      type: 'damageReductionBelowHealth',
      threshold: 0.45,
      reduction: 0.22
    }
  }
];

export const PROFESSIONS = [
  {
    id: 'blade',
    name: '劍士',
    role: '近戰守衛',
    description: '高耐久近戰角色；靠近敵人後以劍技攔截，並以橫斬清理小群怪物。',
    cost: 4,
    visualAssetId: 'unit.blade.rank1',
    skillIds: ['blade.cleave', 'blade.guard'],
    stats: {
      maxHp: 175,
      moveSpeed: 74,
      armor: 0.18,
      aggroRange: 250,
      interceptRadius: 150,
      radius: 14
    },
    attack: {
      type: 'melee',
      damage: 18,
      range: 38,
      cooldown: 0.78,
      impactDelay: 0.25
    }
  }
];

export const MONSTERS = [
  {
    id: 'sprout',
    name: '苔芽獸',
    description: '基礎近戰怪物。',
    visualAssetId: 'monster.sprout',
    bounty: 1,
    stats: {
      maxHp: 48,
      moveSpeed: 46,
      armor: 0,
      aggroRange: 180,
      radius: 13
    },
    attack: {
      type: 'melee',
      damage: 7,
      range: 30,
      cooldown: 1,
      impactDelay: 0.22
    }
  },
  {
    id: 'moth',
    name: '針翅蟲',
    description: '生命較低，但移動速度很快。',
    visualAssetId: 'monster.moth',
    bounty: 1,
    stats: {
      maxHp: 36,
      moveSpeed: 74,
      armor: 0,
      aggroRange: 165,
      radius: 12
    },
    attack: {
      type: 'melee',
      damage: 6,
      range: 27,
      cooldown: 0.78,
      impactDelay: 0.16
    }
  },
  {
    id: 'golem',
    name: '頁岩巨像',
    description: '高生命與護甲的重型怪物。',
    visualAssetId: 'monster.golem',
    bounty: 3,
    stats: {
      maxHp: 190,
      moveSpeed: 30,
      armor: 0.16,
      aggroRange: 210,
      radius: 20
    },
    attack: {
      type: 'melee',
      damage: 16,
      range: 38,
      cooldown: 1.32,
      impactDelay: 0.3
    }
  }
];

export const BUILDINGS = [
  {
    id: 'barricade',
    name: '木製路障',
    role: '攔截建築',
    description: '沒有攻擊能力，但生命高、攔截半徑大，可替水晶與後排吸收傷害。',
    cost: 3,
    visualAssetId: 'building.barricade',
    skillIds: [],
    stats: {
      maxHp: 260,
      moveSpeed: 0,
      armor: 0.08,
      aggroRange: 0,
      interceptRadius: 175,
      radius: 24
    },
    attack: {
      type: 'none',
      damage: 0,
      range: 0,
      cooldown: 0,
      impactDelay: 0
    }
  },
  {
    id: 'bolt-tower',
    name: '弩箭塔',
    role: '遠程防禦建築',
    description: '固定於原地，對射程內最近的怪物發射追蹤弩箭。',
    cost: 5,
    visualAssetId: 'building.bolt-tower',
    skillIds: [],
    stats: {
      maxHp: 165,
      moveSpeed: 0,
      armor: 0.05,
      aggroRange: 235,
      interceptRadius: 90,
      radius: 23
    },
    attack: {
      type: 'projectile',
      damage: 16,
      range: 215,
      cooldown: 1.08,
      impactDelay: 0.12,
      projectileAssetId: 'projectile.bolt',
      projectileSpeed: 330
    }
  }
];

export const WAVES = [
  {
    id: 'wave-1',
    name: '苔芽試探',
    clearReward: 4,
    groups: [
      { monsterId: 'sprout', direction: 'N', count: 4, interval: 0.85, delay: 0.5 },
      { monsterId: 'sprout', direction: 'S', count: 3, interval: 0.95, delay: 2.0 }
    ]
  },
  {
    id: 'wave-2',
    name: '針翅夾擊',
    clearReward: 5,
    groups: [
      { monsterId: 'moth', direction: 'W', count: 4, interval: 0.66, delay: 0.4 },
      { monsterId: 'sprout', direction: 'E', count: 5, interval: 0.82, delay: 1.6 }
    ]
  },
  {
    id: 'wave-3',
    name: '頁岩壓境',
    clearReward: 7,
    groups: [
      { monsterId: 'sprout', direction: 'NE', count: 5, interval: 0.72, delay: 0.4 },
      { monsterId: 'moth', direction: 'SW', count: 4, interval: 0.62, delay: 1.2 },
      { monsterId: 'golem', direction: 'N', count: 2, interval: 2.6, delay: 2.8 }
    ]
  }
];

export const TOOLS = [
  {
    id: 'unit:blade',
    label: '劍士',
    contentKind: 'profession',
    contentId: 'blade'
  },
  {
    id: 'building:barricade',
    label: '木製路障',
    contentKind: 'building',
    contentId: 'barricade'
  },
  {
    id: 'building:bolt-tower',
    label: '弩箭塔',
    contentKind: 'building',
    contentId: 'bolt-tower'
  }
];

export const CONTENT_DEFINITIONS = Object.freeze({
  asset: ASSETS,
  skill: SKILLS,
  profession: PROFESSIONS,
  monster: MONSTERS,
  building: BUILDINGS,
  wave: WAVES,
  tool: TOOLS
});

export function createContentRegistry(definitions = CONTENT_DEFINITIONS) {
  return new ContentRegistry(definitions).validate();
}
