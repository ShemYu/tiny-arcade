((app) => {
  'use strict';

  const { WORLD, CELL, BODY, REGISTRATION, ACTIONS, DIRS } = app;

  class ProofScene extends Phaser.Scene {
    constructor() {
      super('proof');
      this.target = null;
      this.currentDir = 'S';
      this.currentAction = 'idle';
      this.activeAnimKey = '';
      this.lockedAction = null;
      this.deathHold = false;
      this.previewAction = null;
      this.actionToken = 0;
      this.debugEnabled = false;
      this.lastStatusAt = 0;
      this.visualOffset = { x: 0, y: 0 };
      this.assetProfiles = {};
      this.assetWarnings = [];
      this.assetReport = [];
    }

    preload() {
      for (const action of Object.values(ACTIONS)) {
        this.load.spritesheet(action.texture, action.file, {
          frameWidth: CELL,
          frameHeight: CELL
        });
      }
    }

    create() {
      this.createMap();
      this.createAnimations();
      this.createActor();
      this.createSceneObjects();
      this.assetProfiles = this.analyzeAssets();
      this.configureInput();
      this.configureAnimationEvents();
      this.configureHud();

      this.playAction('idle', { force: true });
      this.syncVisual();
      this.refreshAssetStatus();
      this.refreshStatus(true);
    }

    createActor() {
      if (!this.textures.exists('__actor-body')) {
        const bodyGraphic = this.make.graphics({ add: false });
        bodyGraphic.fillStyle(0xffffff, 1);
        bodyGraphic.fillRect(0, 0, BODY.width, BODY.height);
        bodyGraphic.generateTexture('__actor-body', BODY.width, BODY.height);
        bodyGraphic.destroy();
      }

      this.actor = this.physics.add.image(
        WORLD.width / 2,
        WORLD.height / 2,
        '__actor-body'
      );
      this.actor.setVisible(false);
      this.actor.setCollideWorldBounds(true);
      this.actor.body.setSize(BODY.width, BODY.height, true);

      this.player = this.add.sprite(this.actor.x, this.actor.y, ACTIONS.idle.texture, 0);
      this.player.setOrigin(REGISTRATION.defaultX / CELL, REGISTRATION.defaultY / CELL);

      this.shadow = this.add.ellipse(this.actor.x, this.actor.y + 2, 38, 16, 0x06100f, 0.42);
      this.shadow.setStrokeStyle(1, 0x8bb7a7, 0.12);

      this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
      this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
      this.cameras.main.roundPixels = true;
      this.cameras.main.startFollow(this.actor, true, 0.14, 0.14);
      this.cameras.main.setDeadzone(84, 62);
      this.cameras.main.setZoom(1);
    }

    createSceneObjects() {
      this.crystal = this.add.polygon(
        WORLD.width / 2,
        WORLD.height / 2 + 110,
        [0, -48, 34, -18, 24, 36, 0, 52, -24, 36, -34, -18],
        0x79e7d5
      );
      this.crystal.setStrokeStyle(3, 0xd6fff1, 0.9);
      this.crystal.setDepth(Math.floor(this.crystal.y));

      this.targetMarker = this.add.graphics().setDepth(99999);
      this.debugGraphics = this.add.graphics().setDepth(100000);
    }

    createAnimations() {
      for (const [actionKey, action] of Object.entries(ACTIONS)) {
        for (const direction of DIRS) {
          this.anims.create({
            key: `${actionKey}-${direction.key}`,
            frames: this.anims.generateFrameNumbers(action.texture, {
              start: direction.row * action.frames,
              end: direction.row * action.frames + action.frames - 1
            }),
            frameRate: action.fps,
            repeat: action.repeat,
            skipMissedFrames: true
          });
        }
      }
    }

    createMap() {
      this.add.rectangle(
        WORLD.width / 2,
        WORLD.height / 2,
        WORLD.width,
        WORLD.height,
        0x18342f
      ).setDepth(-2000);

      const graphics = this.add.graphics().setDepth(-1900);
      for (let y = 0; y < WORLD.height; y += 32) {
        for (let x = 0; x < WORLD.width; x += 32) {
          const noise = (x / 32 * 17 + y / 32 * 31) % 7;
          graphics.fillStyle(noise < 2 ? 0x1d3832 : noise < 5 ? 0x203b34 : 0x244038, 1);
          graphics.fillRect(x, y, 32, 32);
        }
      }

      graphics.lineStyle(1, 0x8aa68a, 0.22);
      for (let x = 0; x <= WORLD.width; x += 60) graphics.lineBetween(x, 0, x, WORLD.height);
      for (let y = 0; y <= WORLD.height; y += 60) graphics.lineBetween(0, y, WORLD.width, y);

      graphics.lineStyle(4, 0x071014, 0.55);
      graphics.strokeRect(8, 8, WORLD.width - 16, WORLD.height - 16);
    }
  }

  app.ProofScene = ProofScene;
})(window.CVProof);
