import { PHASES } from './core.js';

function actorDistance(a, b) {
  return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
}

function effectiveDistance(a, b) {
  return actorDistance(a, b) - a.stats.radius - b.stats.radius;
}

export class CombatSystem {
  constructor(scene, { content, session, bus, assetRuntime }) {
    this.scene = scene;
    this.content = content;
    this.session = session;
    this.bus = bus;
    this.assetRuntime = assetRuntime;
    this.actors = new Set();
    this.projectiles = new Set();

    this.attackResolvers = new Map([
      ['melee', (source, target) => this.resolveMelee(source, target)],
      ['projectile', (source, target) => this.resolveProjectile(source, target)],
      ['none', () => {}]
    ]);

    this.skillResolvers = new Map([
      ['areaDamage', (skill, source, target) => this.resolveAreaDamage(skill, source, target)],
      ['damageReductionBelowHealth', () => {}]
    ]);
  }

  registerActor(actor) {
    this.actors.add(actor);
    return actor;
  }

  unregisterActor(actor) {
    this.actors.delete(actor);
  }

  aliveActors(predicate = () => true) {
    return [...this.actors].filter((actor) => actor.active && actor.alive && predicate(actor));
  }

  countAlive(kind) {
    return this.aliveActors((actor) => actor.actorKind === kind).length;
  }

  update(deltaMilliseconds) {
    const deltaSeconds = Math.min(0.05, deltaMilliseconds / 1000);
    const alive = this.aliveActors();

    for (const actor of alive) actor.tick(deltaSeconds);

    const monsters = alive.filter((actor) => actor.actorKind === 'monster');
    const players = alive.filter((actor) => actor.team === 'player');
    const core = players.find((actor) => actor.actorKind === 'core');

    for (const actor of players) {
      if (actor.actorKind === 'core') continue;
      this.updatePlayerActor(actor, monsters);
    }

    for (const monster of monsters) {
      this.updateMonster(monster, players, core);
    }

    this.updateProjectiles(deltaSeconds);
  }

  updatePlayerActor(actor, monsters) {
    if (actor.attack.type === 'none') {
      actor.stopMoving();
      return;
    }

    const targetInvalid = !actor.target?.alive || !actor.target.active || !monsters.includes(actor.target);
    if (targetInvalid || actor.retargetTimer <= 0) {
      actor.target = this.findNearest(actor, monsters, actor.stats.aggroRange);
      actor.retargetTimer = 0.32;
    }

    if (!actor.target) {
      actor.stopMoving();
      return;
    }

    this.engage(actor, actor.target, actor.actorKind === 'unit');
  }

  updateMonster(monster, players, core) {
    if (!monster.target?.alive || !monster.target.active || monster.retargetTimer <= 0) {
      monster.target = this.pickMonsterTarget(monster, players, core);
      monster.retargetTimer = 0.28;
    }

    if (!monster.target) {
      monster.stopMoving();
      return;
    }

    this.engage(monster, monster.target, true);
  }

  engage(actor, target, canMove) {
    actor.faceTowards(target.x, target.y);
    const inRange = effectiveDistance(actor, target) <= actor.attack.range;

    if (inRange) {
      actor.stopMoving();
      if (actor.attackTimer <= 0 && actor.attack.type !== 'none') {
        this.performAttack(actor, target);
      }
      return;
    }

    if (!canMove || actor.stats.moveSpeed <= 0) {
      actor.stopMoving();
      return;
    }

    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    actor.setVelocity(
      (dx / length) * actor.stats.moveSpeed,
      (dy / length) * actor.stats.moveSpeed
    );
    actor.setLocomotion(true);
  }

  findNearest(source, candidates, maxRange = Number.POSITIVE_INFINITY) {
    let best = null;
    let bestDistance = maxRange;

    for (const candidate of candidates) {
      const distance = actorDistance(source, candidate);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best;
  }

  pickMonsterTarget(monster, players, core) {
    const interceptors = players.filter((actor) => {
      if (actor.actorKind === 'core') return false;
      const radius = actor.stats.interceptRadius ?? 0;
      return radius > 0 && actorDistance(monster, actor) <= radius;
    });

    return this.findNearest(monster, interceptors) ?? core ?? null;
  }

  performAttack(source, target) {
    source.attackTimer = Math.max(0.05, source.attack.cooldown);
    const actionDuration = this.assetRuntime.actionDuration(source.visualAssetId, 'attack');
    source.lockAction('attack', Math.min(actionDuration * 0.75, source.attack.cooldown * 0.9 || 0.35));

    const resolver = this.attackResolvers.get(source.attack.type);
    if (!resolver) throw new Error(`No attack resolver registered for "${source.attack.type}".`);

    const resolveImpact = () => {
      if (!source.active || !source.alive || !target.active || !target.alive) return;
      resolver(source, target);
      this.triggerAfterAttackSkills(source, target);
    };

    const impactDelay = Math.max(0, source.attack.impactDelay ?? 0);
    if (impactDelay > 0) {
      this.scene.time.delayedCall(impactDelay * 1000, resolveImpact);
    } else {
      resolveImpact();
    }
  }

  resolveMelee(source, target) {
    this.assetRuntime.spawnImpact(this.scene, target.x, target.y, 'hit');
    this.applyDamage(source, target, source.attack.damage);
  }

  resolveProjectile(source, target) {
    const projectile = this.scene.add.image(
      source.x,
      source.y - 12,
      this.assetRuntime.initialTextureKey(source.attack.projectileAssetId)
    );

    projectile.setDepth(20000);
    projectile.setDataEnabled();

    this.projectiles.add({
      sprite: projectile,
      source,
      target,
      damage: source.attack.damage,
      speed: source.attack.projectileSpeed
    });
  }

  updateProjectiles(deltaSeconds) {
    for (const projectile of [...this.projectiles]) {
      const { sprite, source, target, damage, speed } = projectile;

      if (!sprite.active || !source.active || !target.active || !target.alive) {
        sprite.destroy();
        this.projectiles.delete(projectile);
        continue;
      }

      const dx = target.x - sprite.x;
      const dy = target.y - sprite.y - 8;
      const distance = Math.hypot(dx, dy);

      if (distance <= Math.max(10, speed * deltaSeconds)) {
        this.assetRuntime.spawnImpact(this.scene, target.x, target.y, 'hit');
        this.applyDamage(source, target, damage);
        sprite.destroy();
        this.projectiles.delete(projectile);
        continue;
      }

      sprite.rotation = Math.atan2(dy, dx);
      sprite.x += (dx / distance) * speed * deltaSeconds;
      sprite.y += (dy / distance) * speed * deltaSeconds;
    }
  }

  applyDamage(source, target, rawDamage, { isSkill = false } = {}) {
    if (!target?.alive || rawDamage <= 0) return 0;

    let reduction = Phaser.Math.Clamp(target.stats.armor ?? 0, 0, 0.8);

    for (const skillId of target.skillIds) {
      const skill = this.content.get('skill', skillId);
      if (skill.trigger !== 'incomingDamage') continue;
      if (skill.effect.type === 'damageReductionBelowHealth' && target.hp / target.maxHp <= skill.effect.threshold) {
        reduction = 1 - (1 - reduction) * (1 - skill.effect.reduction);
      }
    }

    const applied = Math.max(1, Math.round(rawDamage * (1 - reduction)));
    target.setHealth(target.hp - applied);
    target.flash(isSkill ? 0x9de8d7 : 0xffd6a1, 70);

    if (target.hp > 0 && target.actorKind !== 'core') {
      const hurtDuration = Math.min(0.22, this.assetRuntime.actionDuration(target.visualAssetId, 'hurt') * 0.45);
      target.lockAction('hurt', hurtDuration);
    }

    if (target.actorKind === 'core') {
      this.session.setCrystalHp(target.hp, target.maxHp);
    }

    if (target.hp <= 0) this.handleDeath(target, source);
    return applied;
  }

  triggerAfterAttackSkills(source, primaryTarget) {
    for (const skillId of source.skillIds) {
      const skill = this.content.get('skill', skillId);
      if (skill.trigger !== 'afterAttack') continue;

      const nextCount = (source.skillCounters.get(skill.id) ?? 0) + 1;
      source.skillCounters.set(skill.id, nextCount);

      if (skill.every && nextCount % skill.every !== 0) continue;
      const resolver = this.skillResolvers.get(skill.effect.type);
      if (!resolver) throw new Error(`No skill resolver registered for "${skill.effect.type}".`);
      resolver(skill, source, primaryTarget);
    }
  }

  resolveAreaDamage(skill, source, primaryTarget) {
    const candidates = this.aliveActors((actor) => (
      actor.team !== source.team
      && actor !== primaryTarget
      && actorDistance(actor, primaryTarget) <= skill.effect.radius
    ));

    this.assetRuntime.spawnImpact(this.scene, primaryTarget.x, primaryTarget.y, 'skill');

    for (const target of candidates) {
      this.applyDamage(
        source,
        target,
        Math.max(1, Math.round(source.attack.damage * skill.effect.multiplier)),
        { isSkill: true }
      );
    }
  }

  handleDeath(target, source) {
    target.die();
    this.bus.emit('actor:died', { actor: target, source });

    if (target.actorKind === 'monster') {
      this.session.addGold(target.definition.bounty ?? 0);
    }

    if (target.actorKind === 'core') {
      this.session.setPhase(PHASES.DEFEAT);
      this.session.notify('中央水晶已碎裂。部署骨架仍可重置後繼續測試。', 'bad');
      return;
    }

    const deathDuration = Math.max(320, this.assetRuntime.actionDuration(target.visualAssetId, 'death') * 1000);
    this.scene.time.delayedCall(deathDuration, () => {
      if (target.active) target.destroy();
      this.unregisterActor(target);
    });
  }

  destroy() {
    for (const projectile of this.projectiles) projectile.sprite.destroy();
    this.projectiles.clear();
    this.actors.clear();
  }
}

export class PlacementSystem {
  constructor(scene, { content, session, bus, actorFactory, combat }) {
    this.scene = scene;
    this.content = content;
    this.session = session;
    this.bus = bus;
    this.actorFactory = actorFactory;
    this.combat = combat;
    this.grid = {
      x: 150,
      y: 50,
      cols: 11,
      rows: 9,
      cell: 60
    };
    this.centerCell = { gx: 5, gy: 4 };
    this.occupancy = new Map();
    this.hoverGraphics = null;
  }

  createGrid() {
    const graphics = this.scene.add.graphics().setDepth(-1000);

    graphics.fillStyle(0x18342f, 1);
    graphics.fillRect(0, 0, 960, 640);

    for (let gy = 0; gy < this.grid.rows; gy += 1) {
      for (let gx = 0; gx < this.grid.cols; gx += 1) {
        const { x, y } = this.cellTopLeft(gx, gy);
        const reserved = this.isReserved(gx, gy);

        graphics.fillStyle(reserved ? 0x273c3b : ((gx + gy) % 2 === 0 ? 0x1d3832 : 0x203b34), 1);
        graphics.fillRect(x + 1, y + 1, this.grid.cell - 2, this.grid.cell - 2);

        graphics.lineStyle(1, reserved ? 0x79e7d5 : 0x6f8c80, reserved ? 0.48 : 0.2);
        graphics.strokeRect(x + 1, y + 1, this.grid.cell - 2, this.grid.cell - 2);

        if (reserved) {
          graphics.lineStyle(1, 0x79e7d5, 0.18);
          graphics.lineBetween(x + 8, y + 8, x + this.grid.cell - 8, y + this.grid.cell - 8);
          graphics.lineBetween(x + this.grid.cell - 8, y + 8, x + 8, y + this.grid.cell - 8);
        }
      }
    }

    graphics.lineStyle(4, 0x071014, 0.55);
    graphics.strokeRect(8, 8, 944, 624);

    this.hoverGraphics = this.scene.add.graphics().setDepth(50000);
  }

  cellTopLeft(gx, gy) {
    return {
      x: this.grid.x + gx * this.grid.cell,
      y: this.grid.y + gy * this.grid.cell
    };
  }

  cellCenter(gx, gy) {
    const topLeft = this.cellTopLeft(gx, gy);
    return {
      x: topLeft.x + this.grid.cell / 2,
      y: topLeft.y + this.grid.cell / 2
    };
  }

  pointToCell(x, y) {
    const gx = Math.floor((x - this.grid.x) / this.grid.cell);
    const gy = Math.floor((y - this.grid.y) / this.grid.cell);

    if (gx < 0 || gy < 0 || gx >= this.grid.cols || gy >= this.grid.rows) return null;
    return { gx, gy };
  }

  key(gx, gy) {
    return `${gx}:${gy}`;
  }

  isReserved(gx, gy) {
    return Math.abs(gx - this.centerCell.gx) <= 1 && Math.abs(gy - this.centerCell.gy) <= 1;
  }

  updateHover(x, y) {
    this.hoverGraphics.clear();
    if (this.session.state.phase !== PHASES.PLANNING) return;

    const cell = this.pointToCell(x, y);
    if (!cell) return;

    const topLeft = this.cellTopLeft(cell.gx, cell.gy);
    const blocked = this.isReserved(cell.gx, cell.gy) || this.occupancy.has(this.key(cell.gx, cell.gy));

    this.hoverGraphics.fillStyle(blocked ? 0xff7d78 : 0x9de8d7, 0.18);
    this.hoverGraphics.fillRect(topLeft.x + 2, topLeft.y + 2, this.grid.cell - 4, this.grid.cell - 4);
    this.hoverGraphics.lineStyle(2, blocked ? 0xff7d78 : 0x9de8d7, 0.8);
    this.hoverGraphics.strokeRect(topLeft.x + 2, topLeft.y + 2, this.grid.cell - 4, this.grid.cell - 4);
  }

  placeSelectedTool(worldX, worldY) {
    const toolId = this.session.state.selectedTool;
    if (!toolId) {
      this.session.notify('請先從右側選擇角色或建築。');
      return null;
    }

    return this.placeTool(toolId, worldX, worldY, { charge: true });
  }

  placeTool(toolId, worldX, worldY, { charge = true } = {}) {
    if (this.session.state.phase !== PHASES.PLANNING) return null;

    const cell = this.pointToCell(worldX, worldY);
    if (!cell) {
      this.session.notify('該位置不在部署網格內。', 'bad');
      return null;
    }

    if (this.isReserved(cell.gx, cell.gy)) {
      this.session.notify('亮色交叉區是水晶核心保留區，不能部署。', 'bad');
      return null;
    }

    const key = this.key(cell.gx, cell.gy);
    if (this.occupancy.has(key)) {
      this.session.notify('這個格子已被占用。', 'bad');
      return null;
    }

    const tool = this.content.get('tool', toolId);
    const definition = this.content.get(tool.contentKind, tool.contentId);
    const cost = definition.cost ?? 0;

    if (charge && !this.session.spendGold(cost)) {
      this.session.notify(`金幣不足，需要 ${cost}G。`, 'bad');
      return null;
    }

    const position = this.cellCenter(cell.gx, cell.gy);
    const actor = tool.contentKind === 'profession'
      ? this.actorFactory.createProfession(tool.contentId, position.x, position.y)
      : this.actorFactory.createBuilding(tool.contentId, position.x, position.y);

    actor.homeCell = { ...cell };
    actor.placementToolId = toolId;
    this.occupancy.set(key, actor);
    this.combat.registerActor(actor);

    this.session.notify(`${definition.name} 已部署。`, 'good');
    this.publishCounts();
    return actor;
  }

  placeInitial(toolId, gx, gy) {
    const position = this.cellCenter(gx, gy);
    return this.placeTool(toolId, position.x, position.y, { charge: false });
  }

  removeAt(worldX, worldY) {
    if (this.session.state.phase !== PHASES.PLANNING) return false;

    const cell = this.pointToCell(worldX, worldY);
    if (!cell) return false;

    const key = this.key(cell.gx, cell.gy);
    const actor = this.occupancy.get(key);
    if (!actor || actor.actorKind === 'core') return false;

    this.occupancy.delete(key);
    this.combat.unregisterActor(actor);
    const refund = Math.floor((actor.cost ?? 0) / 2);
    if (refund > 0) this.session.addGold(refund);
    actor.destroy();

    this.session.notify(`${actor.displayName} 已回收，返還 ${refund}G。`);
    this.publishCounts();
    return true;
  }

  handleActorDeath(actor) {
    if (!actor.homeCell) return;
    const key = this.key(actor.homeCell.gx, actor.homeCell.gy);
    if (this.occupancy.get(key) === actor) this.occupancy.delete(key);
    this.publishCounts();
  }

  restoreSurvivors() {
    for (const actor of this.occupancy.values()) {
      if (!actor.alive || !actor.active) continue;
      const position = this.cellCenter(actor.homeCell.gx, actor.homeCell.gy);
      actor.setPosition(position.x, position.y);
      actor.setVelocity(0, 0);
      actor.target = null;

      const healRatio = actor.actorKind === 'unit' ? 0.35 : 0.22;
      actor.setHealth(Math.min(actor.maxHp, actor.hp + actor.maxHp * healRatio));
      actor.playAction('idle', true);
    }
  }

  publishCounts() {
    this.session.setCounts({
      units: this.combat.countAlive('unit'),
      buildings: this.combat.countAlive('building'),
      enemies: this.combat.countAlive('monster')
    });
  }

  destroy() {
    this.hoverGraphics?.destroy();
    this.occupancy.clear();
  }
}

export class WaveDirector {
  constructor(scene, { content, session, bus, actorFactory, combat }) {
    this.scene = scene;
    this.content = content;
    this.session = session;
    this.bus = bus;
    this.actorFactory = actorFactory;
    this.combat = combat;
    this.active = false;
    this.elapsed = 0;
    this.schedule = [];
    this.spawned = 0;
    this.clearDelay = 0;

    this.spawnPoints = {
      N: { x: 480, y: 22 },
      NE: { x: 924, y: 40 },
      E: { x: 930, y: 320 },
      SE: { x: 920, y: 602 },
      S: { x: 480, y: 610 },
      SW: { x: 40, y: 602 },
      W: { x: 30, y: 320 },
      NW: { x: 40, y: 40 }
    };
  }

  start(round) {
    if (this.active) return false;

    const waves = this.content.all('wave');
    const waveIndex = Math.min(round - 1, waves.length - 1);
    const definition = waves[waveIndex];
    const overflow = Math.max(0, round - waves.length);
    const statScale = 1 + overflow * 0.16;

    this.schedule = this.expandSchedule(definition, overflow, statScale);
    this.elapsed = 0;
    this.spawned = 0;
    this.clearDelay = 0;
    this.active = true;
    this.currentDefinition = definition;
    this.session.setWaveProgress(0, this.schedule.length);
    this.session.notify(`第 ${round} 波：${definition.name}`);

    return true;
  }

  expandSchedule(definition, overflow, statScale) {
    const schedule = [];

    for (const group of definition.groups) {
      const bonusCount = overflow > 0 && group.monsterId !== 'golem'
        ? Math.floor(overflow / 2)
        : 0;

      for (let index = 0; index < group.count + bonusCount; index += 1) {
        schedule.push({
          at: group.delay + index * group.interval,
          monsterId: group.monsterId,
          direction: group.direction,
          statScale
        });
      }
    }

    return schedule.sort((a, b) => a.at - b.at);
  }

  update(deltaMilliseconds) {
    if (!this.active) return;

    this.elapsed += deltaMilliseconds / 1000;

    while (this.spawned < this.schedule.length && this.schedule[this.spawned].at <= this.elapsed) {
      this.spawn(this.schedule[this.spawned]);
      this.spawned += 1;
      this.session.setWaveProgress(this.spawned, this.schedule.length);
    }

    const allSpawned = this.spawned >= this.schedule.length;
    const aliveMonsters = this.combat.countAlive('monster');

    if (allSpawned && aliveMonsters === 0) {
      this.clearDelay += deltaMilliseconds / 1000;
      if (this.clearDelay >= 0.7) this.finish();
    } else {
      this.clearDelay = 0;
    }
  }

  spawn(entry) {
    const point = this.spawnPoints[entry.direction];
    const jitter = () => Phaser.Math.Between(-18, 18);
    const actor = this.actorFactory.createMonster(
      entry.monsterId,
      point.x + jitter(),
      point.y + jitter(),
      entry.statScale
    );

    this.combat.registerActor(actor);
    this.bus.emit('wave:spawned', { actor, entry });
  }

  finish() {
    if (!this.active) return;

    this.active = false;
    const reward = this.currentDefinition.clearReward + Math.floor(this.session.state.round / 2);
    const clearedRound = this.session.state.round;

    this.session.addGold(reward);
    this.session.setRound(clearedRound + 1);
    this.session.setWaveProgress(0, 0);
    this.session.setPhase(PHASES.PLANNING);
    this.session.notify(`第 ${clearedRound} 波守住了，獲得 ${reward}G。`, 'good');
    this.bus.emit('wave:cleared', { round: clearedRound, reward });
  }

  stop() {
    this.active = false;
    this.schedule = [];
    this.spawned = 0;
    this.session.setWaveProgress(0, 0);
  }
}
