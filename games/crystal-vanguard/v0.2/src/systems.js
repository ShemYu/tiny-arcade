import { BATTLEFIELD_LAYOUT, PHASES, WORLD_SIZE } from './core.js';

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

    const home = actor.homePosition ?? { x: actor.x, y: actor.y };
    const leashRadius = actor.stats.leashRadius ?? 250;
    const candidates = monsters.filter((monster) => (
      monster.y >= BATTLEFIELD_LAYOUT.frontlineY - 18
      && Phaser.Math.Distance.Between(home.x, home.y, monster.x, monster.y) <= leashRadius
    ));
    const targetInvalid = !actor.target?.alive || !actor.target.active || !candidates.includes(actor.target);
    if (targetInvalid || actor.retargetTimer <= 0) {
      actor.target = this.findNearest(actor, candidates, actor.stats.aggroRange);
      actor.retargetTimer = 0.32;
    }

    if (!actor.target) {
      this.returnPlayerActorHome(actor, home);
      return;
    }

    this.engage(actor, actor.target, actor.actorKind === 'unit');
  }

  updateMonster(monster, players, core) {
    const targetInvalid = !monster.target?.alive
      || !monster.target.active
      || monster.target.actorKind === 'core'
      || actorDistance(monster, monster.target) > (monster.target.stats.interceptRadius ?? 0) + 90;

    if (targetInvalid || monster.retargetTimer <= 0) {
      monster.target = this.pickMonsterInterceptor(monster, players);
      monster.retargetTimer = 0.28;
    }

    if (monster.target) {
      this.engage(monster, monster.target, true);
      return;
    }

    if (this.followMonsterRoute(monster)) return;

    monster.target = core ?? null;
    if (monster.target) this.engage(monster, monster.target, true);
    else monster.stopMoving();
  }

  returnPlayerActorHome(actor, home) {
    if (actor.actorKind !== 'unit') {
      actor.stopMoving();
      return;
    }

    const dx = home.x - actor.x;
    const dy = home.y - actor.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 6) {
      actor.setPosition(home.x, home.y);
      actor.stopMoving();
      return;
    }

    actor.faceTowards(home.x, home.y);
    actor.setVelocity(
      (dx / distance) * actor.stats.moveSpeed,
      (dy / distance) * actor.stats.moveSpeed
    );
    actor.setLocomotion(true);
  }

  followMonsterRoute(monster) {
    const route = monster.routeWaypoints;
    if (!Array.isArray(route)) return false;

    while (monster.routeIndex < route.length) {
      const waypoint = route[monster.routeIndex];
      const dx = waypoint.x - monster.x;
      const dy = waypoint.y - monster.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= 18) {
        monster.routeIndex += 1;
        continue;
      }

      monster.target = null;
      monster.faceTowards(waypoint.x, waypoint.y);
      monster.setVelocity(
        (dx / distance) * monster.stats.moveSpeed,
        (dy / distance) * monster.stats.moveSpeed
      );
      monster.setLocomotion(true);
      return true;
    }

    return false;
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

  pickMonsterInterceptor(monster, players) {
    const interceptors = players.filter((actor) => {
      if (actor.actorKind === 'core') return false;
      const radius = actor.stats.interceptRadius ?? 0;
      return radius > 0 && actorDistance(monster, actor) <= radius;
    });

    return this.findNearest(monster, interceptors) ?? null;
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
      this.session.notify('中央水晶已碎裂。可重新開始本次 v2.1 測試。', 'bad');
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
    this.grid = { ...BATTLEFIELD_LAYOUT.grid };
    this.centerCell = {
      gx: BATTLEFIELD_LAYOUT.sanctuary.centerColumn,
      gy: BATTLEFIELD_LAYOUT.sanctuary.reserveRow
    };
    this.occupancy = new Map();
    this.gridGraphics = null;
    this.hoverGraphics = null;
    this.unsubscribeState = typeof this.bus?.on === 'function'
      ? this.bus.on('session:changed', ({ state }) => this.updateGridState(state))
      : null;
  }

  createGrid() {
    const graphics = this.scene.add.graphics().setDepth(-1000);
    const { width, height } = WORLD_SIZE;
    const { frontlineY, lanes } = BATTLEFIELD_LAYOUT;

    graphics.fillGradientStyle(0x213d39, 0x183330, 0x102521, 0x081715, 1);
    graphics.fillRect(0, 0, width, height);

    // The enemy side is cooler and narrower; the player's sanctuary grows
    // wider toward the foreground to suggest a shallow RO-style 2.5D camera.
    graphics.fillStyle(0xa7d4c4, 0.035);
    graphics.fillTriangle(104, 90, width - 104, 90, width - 24, frontlineY);
    graphics.fillTriangle(104, 90, width - 24, frontlineY, 24, frontlineY);

    graphics.fillStyle(0x78b999, 0.045);
    graphics.fillEllipse(width / 2, 940, 760, 620);

    for (const lane of Object.values(lanes)) {
      const route = [lane.spawn, ...lane.waypoints, {
        x: BATTLEFIELD_LAYOUT.sanctuary.crystalX,
        y: BATTLEFIELD_LAYOUT.sanctuary.crystalY - 34
      }];
      graphics.lineStyle(92, 0x7f8468, 0.07);
      graphics.beginPath();
      graphics.moveTo(route[0].x, route[0].y);
      for (const point of route.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.strokePath();

      graphics.lineStyle(2, 0xa6b493, 0.07);
      graphics.beginPath();
      graphics.moveTo(route[0].x, route[0].y);
      for (const point of route.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.strokePath();
    }

    graphics.lineStyle(2, 0xa4c6b8, 0.045);
    graphics.strokeEllipse(width / 2, 390, 620, 150);
    graphics.strokeEllipse(width / 2, 660, 690, 190);
    graphics.strokeEllipse(width / 2, 930, 760, 240);

    for (const lane of Object.values(lanes)) {
      graphics.fillStyle(0x081513, 0.72);
      graphics.fillEllipse(lane.spawn.x, lane.spawn.y + 12, 118, 40);
      graphics.fillStyle(0x8fe3d1, 0.1);
      graphics.fillEllipse(lane.spawn.x, lane.spawn.y, 94, 30);
      graphics.lineStyle(2, 0xb7eee1, 0.28);
      graphics.strokeEllipse(lane.spawn.x, lane.spawn.y, 94, 30);
    }

    this.gridGraphics = this.scene.add.graphics().setDepth(-940);

    for (let gy = 0; gy < this.grid.rows; gy += 1) {
      for (let gx = 0; gx < this.grid.cols; gx += 1) {
        const { x, y } = this.cellTopLeft(gx, gy);
        const reserved = this.isReserved(gx, gy);
        const alternate = (gx + gy) % 2 === 0;
        const tileWidth = this.grid.cellWidth;
        const tileHeight = this.grid.cellHeight;

        this.gridGraphics.fillStyle(reserved ? 0x10201f : 0x0a1716, 0.9);
        this.gridGraphics.fillRect(x + 2, y + 7, tileWidth - 4, tileHeight - 7);

        this.gridGraphics.fillStyle(
          reserved ? 0x314e49 : (alternate ? 0x29453a : 0x2c493d),
          reserved ? 0.88 : 0.72
        );
        this.gridGraphics.fillRect(x + 2, y + 2, tileWidth - 4, tileHeight - 9);

        this.gridGraphics.lineStyle(1, reserved ? 0xa7f0dc : 0x7ca897, reserved ? 0.55 : 0.2);
        this.gridGraphics.lineBetween(x + 3, y + 3, x + tileWidth - 3, y + 3);
        this.gridGraphics.lineBetween(x + 3, y + 3, x + 3, y + tileHeight - 8);

        this.gridGraphics.lineStyle(2, reserved ? 0x16302d : 0x102522, 0.65);
        this.gridGraphics.lineBetween(x + 3, y + tileHeight - 7, x + tileWidth - 3, y + tileHeight - 7);
        this.gridGraphics.lineBetween(x + tileWidth - 3, y + 3, x + tileWidth - 3, y + tileHeight - 7);

        this.gridGraphics.lineStyle(1, reserved ? 0x79e7d5 : 0x526f65, reserved ? 0.42 : 0.1);
        this.gridGraphics.strokeRect(x + 2, y + 2, tileWidth - 4, tileHeight - 9);

        if (reserved) {
          this.gridGraphics.lineStyle(1, 0x79e7d5, 0.18);
          this.gridGraphics.lineBetween(x + 10, y + 9, x + tileWidth - 10, y + tileHeight - 14);
          this.gridGraphics.lineBetween(x + tileWidth - 10, y + 9, x + 10, y + tileHeight - 14);
        }
      }
    }

    this.updateGridState(this.session.state);

    graphics.fillStyle(0x07110f, 0.75);
    graphics.fillRect(0, 0, 24, height);
    graphics.fillRect(width - 24, 0, 24, height);
    graphics.fillRect(0, height - 72, width, 72);
    graphics.lineStyle(3, 0x64786d, 0.22);
    graphics.lineBetween(26, 18, 26, height - 74);
    graphics.lineBetween(width - 26, 18, width - 26, height - 74);

    this.hoverGraphics = this.scene.add.graphics().setDepth(50000);
  }

  updateGridState(state) {
    if (!this.gridGraphics) return;
    const planning = state.phase === PHASES.PLANNING;
    this.gridGraphics.setAlpha(planning ? (state.selectedTool ? 1 : 0.16) : 0.06);
  }

  cellTopLeft(gx, gy) {
    return {
      x: this.grid.x + gx * this.grid.cellWidth,
      y: this.grid.y + gy * this.grid.cellHeight
    };
  }

  cellCenter(gx, gy) {
    const topLeft = this.cellTopLeft(gx, gy);
    return {
      x: topLeft.x + this.grid.cellWidth / 2,
      y: topLeft.y + this.grid.cellHeight / 2
    };
  }

  pointToCell(x, y) {
    const gx = Math.floor((x - this.grid.x) / this.grid.cellWidth);
    const gy = Math.floor((y - this.grid.y) / this.grid.cellHeight);

    if (gx < 0 || gy < 0 || gx >= this.grid.cols || gy >= this.grid.rows) return null;
    return { gx, gy };
  }

  key(gx, gy) {
    return `${gx}:${gy}`;
  }

  isReserved(gx, gy) {
    return gy === this.centerCell.gy && Math.abs(gx - this.centerCell.gx) <= 1;
  }

  updateHover(x, y) {
    this.hoverGraphics.clear();
    if (this.session.state.phase !== PHASES.PLANNING) return;

    const cell = this.pointToCell(x, y);
    if (!cell) return;

    const topLeft = this.cellTopLeft(cell.gx, cell.gy);
    const blocked = this.isReserved(cell.gx, cell.gy) || this.occupancy.has(this.key(cell.gx, cell.gy));

    this.hoverGraphics.fillStyle(blocked ? 0xff7d78 : 0x9de8d7, 0.18);
    this.hoverGraphics.fillRect(topLeft.x + 3, topLeft.y + 3, this.grid.cellWidth - 6, this.grid.cellHeight - 6);
    this.hoverGraphics.lineStyle(2, blocked ? 0xff7d78 : 0x9de8d7, 0.8);
    this.hoverGraphics.strokeRect(topLeft.x + 3, topLeft.y + 3, this.grid.cellWidth - 6, this.grid.cellHeight - 6);
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
    actor.homePosition = { ...position };
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
      actor.homePosition = { ...position };
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
    this.unsubscribeState?.();
    this.gridGraphics?.destroy();
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

    this.lanes = BATTLEFIELD_LAYOUT.lanes;
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
          lane: group.lane,
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
    const lane = this.lanes[entry.lane];
    if (!lane) throw new Error(`Unknown battlefield lane "${entry.lane}".`);
    const jitterX = () => Phaser.Math.Between(-16, 16);
    const jitterY = () => Phaser.Math.Between(-8, 8);
    const actor = this.actorFactory.createMonster(
      entry.monsterId,
      lane.spawn.x + jitterX(),
      lane.spawn.y + jitterY(),
      entry.statScale
    );

    actor.laneId = entry.lane;
    actor.routeWaypoints = lane.waypoints.map((waypoint) => ({ ...waypoint }));
    actor.routeIndex = 0;
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
