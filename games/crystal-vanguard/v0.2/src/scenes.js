import { BATTLEFIELD_LAYOUT, getAppContext, PHASES, WORLD_SIZE } from './core.js';
import { AssetRuntime, ActorFactory } from './runtime.js';
import { CombatSystem, PlacementSystem, WaveDirector } from './systems.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const context = getAppContext();
    context.assetRuntime = new AssetRuntime(this, context.content, context.bus);
    context.assetRuntime.preload();

    this.load.on('progress', (progress) => {
      context.bus.emit('boot:progress', { progress });
    });
  }

  create() {
    const context = getAppContext();
    context.assetRuntime.finalize();
    context.bus.emit('boot:ready');
    this.scene.start('battle');
  }
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
    this.unsubscribers = [];
    this.lastCountRefreshAt = 0;
  }

  create() {
    const context = getAppContext();
    this.context = context;
    this.session = context.session;
    this.bus = context.bus;
    this.content = context.content;
    this.assetRuntime = context.assetRuntime;

    this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.roundPixels = true;

    this.actorFactory = new ActorFactory(this, this.content, this.assetRuntime);
    this.combat = new CombatSystem(this, context);
    this.placement = new PlacementSystem(this, {
      ...context,
      actorFactory: this.actorFactory,
      combat: this.combat
    });
    this.waveDirector = new WaveDirector(this, {
      ...context,
      actorFactory: this.actorFactory,
      combat: this.combat
    });

    this.placement.createGrid();
    this.createDecorations();
    this.createCoreAndInitialDeployment();
    this.configureInput();
    this.configureCommands();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownScene());

    this.session.setPhase(PHASES.PLANNING);
    this.session.notify('上方三路即將來敵；點「部署」配置守衛。', 'good');
    this.publishCounts();
  }

  createDecorations() {
    const graphics = this.add.graphics().setDepth(-900);
    const { crystalX, crystalY } = BATTLEFIELD_LAYOUT.sanctuary;

    graphics.fillStyle(0x061210, 0.46);
    graphics.fillEllipse(crystalX, crystalY + 28, 220, 70);
    graphics.fillStyle(0x506965, 0.82);
    graphics.fillEllipse(crystalX, crystalY + 14, 176, 50);
    graphics.fillStyle(0x243d39, 1);
    graphics.fillEllipse(crystalX, crystalY + 5, 154, 40);
    graphics.lineStyle(2, 0xa2d9c8, 0.3);
    graphics.strokeEllipse(crystalX, crystalY + 5, 154, 40);

    graphics.lineStyle(2, 0x79e7d5, 0.12);
    graphics.strokeEllipse(crystalX, crystalY, 250, 118);
    graphics.strokeEllipse(crystalX, crystalY, 390, 190);

    graphics.lineStyle(2, 0xd6fff1, 0.08);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      graphics.lineBetween(
        crystalX + Math.cos(angle) * 120,
        crystalY + Math.sin(angle) * 56,
        crystalX + Math.cos(angle) * 300,
        crystalY + Math.sin(angle) * 142
      );
    }
  }

  createCoreAndInitialDeployment() {
    const { crystalX, crystalY } = BATTLEFIELD_LAYOUT.sanctuary;
    this.crystal = this.actorFactory.createCrystal(crystalX, crystalY, 700);
    this.combat.registerActor(this.crystal);
    this.session.setCrystalHp(this.crystal.hp, this.crystal.maxHp);

    this.placement.placeInitial('unit:blade', 3, 2);
  }

  configureInput() {
    const canvas = this.game.canvas;
    canvas.addEventListener('contextmenu', this.preventContextMenu = (event) => event.preventDefault());

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
  }

  configureCommands() {
    this.unsubscribers.push(
      this.bus.on('command:select-tool', ({ toolId }) => {
        this.session.setSelectedTool(toolId);
      }),
      this.bus.on('command:cancel-tool', () => {
        this.session.setSelectedTool(null);
      }),
      this.bus.on('command:start-wave', () => {
        this.startWave();
      }),
      this.bus.on('command:reset', () => {
        this.restartGame();
      }),
      this.bus.on('actor:died', ({ actor }) => {
        this.placement.handleActorDeath(actor);
        if (actor.actorKind === 'core') this.waveDirector.stop();
      }),
      this.bus.on('wave:cleared', () => {
        this.placement.restoreSurvivors();

        if (this.crystal.alive) {
          const heal = Math.round(this.crystal.maxHp * 0.04);
          this.crystal.setHealth(Math.min(this.crystal.maxHp, this.crystal.hp + heal));
          this.session.setCrystalHp(this.crystal.hp, this.crystal.maxHp);
        }

        this.publishCounts();
      })
    );
  }

  handlePointerMove(pointer) {
    const world = pointer.positionToCamera(this.cameras.main);
    this.placement.updateHover(world.x, world.y);
  }

  handlePointerDown(pointer) {
    if (this.session.state.phase !== PHASES.PLANNING) return;
    const world = pointer.positionToCamera(this.cameras.main);

    if (pointer.button === 2) {
      this.placement.removeAt(world.x, world.y);
      return;
    }

    this.placement.placeSelectedTool(world.x, world.y);
  }

  startWave() {
    if (this.session.state.phase !== PHASES.PLANNING) return;

    const defenders = this.combat.countAlive('unit') + this.combat.countAlive('building');
    if (defenders === 0) {
      this.session.notify('至少需要一名角色或一座防禦建築。', 'bad');
      return;
    }

    this.session.setSelectedTool(null);
    this.session.setPhase(PHASES.BATTLE);
    this.waveDirector.start(this.session.state.round);
  }

  restartGame() {
    this.waveDirector.stop();
    this.session.reset();
    this.scene.restart();
  }

  update(time, delta) {
    if (!this.combat || this.session.state.phase === PHASES.DEFEAT) return;

    if (this.session.state.phase === PHASES.BATTLE) {
      this.combat.update(delta);
      this.waveDirector.update(delta);
    } else {
      for (const actor of this.combat.aliveActors()) {
        actor.tick(Math.min(0.05, delta / 1000));
        actor.stopMoving();
      }
    }

    if (time - this.lastCountRefreshAt >= 220) {
      this.publishCounts();
      this.lastCountRefreshAt = time;
    }
  }

  publishCounts() {
    this.session.setCounts({
      units: this.combat.countAlive('unit'),
      buildings: this.combat.countAlive('building'),
      enemies: this.combat.countAlive('monster')
    });
  }

  shutdownScene() {
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();

    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.game.canvas.removeEventListener('contextmenu', this.preventContextMenu);

    this.waveDirector?.stop();
    this.placement?.destroy();
    this.combat?.destroy();
  }
}
