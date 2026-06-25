((app) => {
  'use strict';

  const {
    WORLD,
    CELL,
    MOVE,
    BODY,
    REGISTRATION,
    ACTIONS,
    directionFromVector
  } = app;
  const ProofScene = app.ProofScene;

  Object.assign(ProofScene.prototype, {
    configureInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D');
      this.actionKeys = this.input.keyboard.addKeys({
        zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
        one: Phaser.Input.Keyboard.KeyCodes.ONE,
        two: Phaser.Input.Keyboard.KeyCodes.TWO,
        three: Phaser.Input.Keyboard.KeyCodes.THREE,
        four: Phaser.Input.Keyboard.KeyCodes.FOUR,
        five: Phaser.Input.Keyboard.KeyCodes.FIVE,
        six: Phaser.Input.Keyboard.KeyCodes.SIX
      });

      this.input.on('pointerdown', pointer => {
        if (pointer.event && pointer.event.target !== this.game.canvas) return;
        if (pointer.rightButtonDown()) return;
        if (this.lockedAction || this.deathHold) return;
        this.setMoveTarget(pointer.worldX, pointer.worldY);
      });
    },

    configureAnimationEvents() {
      this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, animation => {
        if (!this.lockedAction || !animation.key.startsWith(`${this.lockedAction}-`)) return;
        const completedKey = this.lockedAction;
        const action = ACTIONS[completedKey];
        this.lockedAction = null;

        if (action.hold) {
          this.deathHold = true;
          this.previewAction = null;
          this.actor.body.setVelocity(0, 0);
          this.setActiveButton(completedKey);
        } else {
          this.playAction(this.previewAction || 'idle', { force: true });
        }
        this.refreshStatus(true);
      });
    },

    configureHud() {
      const controls = document.querySelector('#controls');
      const debugToggle = document.querySelector('#debug-toggle');

      controls.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (button) this.playAction(button.dataset.action, { manual: true, force: true });
      });

      debugToggle.addEventListener('click', () => this.toggleDebug());
    },

    playAction(actionKey, options = {}) {
      const action = ACTIONS[actionKey];
      if (!action) return;
      const manual = Boolean(options.manual);
      const force = Boolean(options.force);

      if (!manual && this.lockedAction) return;

      if (manual) {
        this.actionToken += 1;
        this.lockedAction = null;
        this.deathHold = false;
        this.target = null;
        this.actor.body.setVelocity(0, 0);
        this.tweens.killTweensOf(this.visualOffset);
        this.visualOffset.x = 0;
        this.visualOffset.y = 0;
        this.player.clearTint();
      }

      if (action.repeat === -1) {
        if (manual) this.previewAction = actionKey;
        this.playLoop(actionKey, force);
        return;
      }

      this.previewAction = null;
      this.target = null;
      this.actor.body.setVelocity(0, 0);
      this.currentAction = actionKey;
      this.lockedAction = actionKey;
      this.deathHold = false;
      this.actionToken += 1;
      const token = this.actionToken;
      const animKey = `${actionKey}-${this.currentDir}`;

      this.player.anims.play(animKey, false);
      this.activeAnimKey = animKey;
      this.setActiveButton(actionKey);
      this.scheduleActionFx(actionKey, action, token);
      this.refreshStatus(true);
    },

    playLoop(actionKey, force = false) {
      const action = ACTIONS[actionKey];
      const animKey = `${actionKey}-${this.currentDir}`;
      if (!force && this.activeAnimKey === animKey) return;

      const preservePhase =
        !force &&
        this.currentAction === actionKey &&
        this.player.anims.isPlaying &&
        action.repeat === -1;
      const progress = preservePhase ? this.player.anims.getProgress() : 0;

      this.currentAction = actionKey;
      this.player.anims.play(animKey, false);
      if (preservePhase) this.player.anims.setProgress(Math.min(progress, 0.999));
      this.activeAnimKey = animKey;
      this.setActiveButton(actionKey);
    },

    scheduleActionFx(actionKey, action, token) {
      if (actionKey === 'hurt') {
        this.player.setTint(0xffa7a2);
        this.time.delayedCall(110, () => {
          if (token === this.actionToken) this.player.clearTint();
        });
        this.cameras.main.shake(90, 0.0024);
      }

      if (action.impactFrame === undefined) return;
      const delay = Math.max(0, action.impactFrame / action.fps * 1000);
      this.time.delayedCall(delay, () => {
        if (token !== this.actionToken || this.lockedAction !== actionKey) return;
        if (actionKey === 'attack') this.playSlashFx();
        if (actionKey === 'cast') this.playCastFx();
      });
    },

    setMoveTarget(x, y) {
      const marginX = BODY.width / 2 + 2;
      const marginY = BODY.height / 2 + 2;
      this.target = {
        x: Phaser.Math.Clamp(x, marginX, WORLD.width - marginX),
        y: Phaser.Math.Clamp(y, marginY, WORLD.height - marginY)
      };
      this.previewAction = null;
    },

    clearMoveTarget() {
      this.target = null;
      this.targetMarker.clear();
    },

    update(time, delta) {
      this.handleActionKeys();
      const dt = Math.min(delta / 1000, 0.05);

      if (this.lockedAction || this.deathHold) {
        this.actor.body.setVelocity(0, 0);
        this.syncVisual();
        this.drawTargetMarker(time);
        this.drawDebug();
        this.refreshStatus(false, time);
        return;
      }

      const horizontal =
        (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0) -
        (this.cursors.left.isDown || this.keys.A.isDown ? 1 : 0);
      const vertical =
        (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0) -
        (this.cursors.up.isDown || this.keys.W.isDown ? 1 : 0);

      let dx = horizontal;
      let dy = vertical;
      let speed = MOVE.speed;
      const keyboardMoving = dx !== 0 || dy !== 0;

      if (keyboardMoving) {
        this.clearMoveTarget();
        this.previewAction = null;
      } else if (this.target) {
        dx = this.target.x - this.actor.x;
        dy = this.target.y - this.actor.y;
        const distance = Math.hypot(dx, dy);
        const normalizedDistance = Phaser.Math.Clamp(distance / MOVE.targetSlowRadius, 0, 1);
        const easedDistance = Phaser.Math.SmoothStep(normalizedDistance, 0, 1);
        speed = Phaser.Math.Linear(MOVE.targetMinSpeed, MOVE.speed, easedDistance);
        const step = speed * dt;

        if (distance <= Math.max(MOVE.arriveRadius, step)) {
          this.actor.body.reset(this.target.x, this.target.y);
          this.clearMoveTarget();
          dx = 0;
          dy = 0;
          speed = 0;
        }
      }

      const length = Math.hypot(dx, dy);
      if (length > 0.001) {
        const nx = dx / length;
        const ny = dy / length;
        this.currentDir = directionFromVector(nx, ny, this.currentDir);
        this.actor.body.setVelocity(nx * speed, ny * speed);
        this.playAction('walk');
      } else {
        this.actor.body.setVelocity(0, 0);
        this.playAction(this.previewAction || 'idle');
      }

      this.syncVisual();
      this.drawTargetMarker(time);
      this.drawDebug();
      this.refreshStatus(false, time);
    },

    handleActionKeys() {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.zero)) this.toggleDebug();
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.one)) this.playAction('idle', { manual: true, force: true });
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.two)) this.playAction('walk', { manual: true, force: true });
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.three)) this.playAction('attack', { manual: true, force: true });
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.four)) this.playAction('cast', { manual: true, force: true });
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.five)) this.playAction('hurt', { manual: true, force: true });
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.six)) this.playAction('death', { manual: true, force: true });
    },

    syncVisual() {
      const x = Math.round(this.actor.x + this.visualOffset.x);
      const y = Math.round(this.actor.y + this.visualOffset.y);
      this.player.setPosition(x, y);
      this.shadow.setPosition(Math.round(this.actor.x), Math.round(this.actor.y + 2));

      const profile = this.currentFrameProfile();
      const actionProfile = this.assetProfiles[this.currentAction];
      const scale = actionProfile?.scale ?? 1;
      this.player.setOrigin(profile.pivotX / CELL, profile.pivotY / CELL);
      this.player.setScale(scale);

      const depth = Math.floor(this.actor.y);
      this.shadow.setDepth(depth - 2);
      this.player.setDepth(depth);
      this.shadow.setAlpha(this.deathHold ? 0.18 : 0.42);
    },

    currentFrameProfile() {
      const frameIndex = Number(this.player.frame?.name);
      return this.assetProfiles[this.currentAction]?.frames?.[frameIndex] || {
        pivotX: REGISTRATION.defaultX,
        pivotY: REGISTRATION.defaultY,
        bbox: null
      };
    },

    refreshStatus(force = false, time = this.time.now) {
      if (!force && time - this.lastStatusAt < 100) return;
      this.lastStatusAt = time;
      const status = document.querySelector('#status');
      const frame = Number(this.player.frame?.name) || 0;
      const profile = this.currentFrameProfile();
      const targetDistance = this.target
        ? Math.round(Phaser.Math.Distance.Between(this.actor.x, this.actor.y, this.target.x, this.target.y))
        : '-';
      status.textContent =
        `action ${this.currentAction} · dir ${this.currentDir} · frame ${frame} · ` +
        `x ${Math.round(this.actor.x)} y ${Math.round(this.actor.y)} · target ${targetDistance} · ` +
        `pivot ${profile.pivotX.toFixed(1)},${profile.pivotY.toFixed(1)}`;
    },

    toggleDebug() {
      this.debugEnabled = !this.debugEnabled;
      document.querySelector('#debug-toggle').classList.toggle('active', this.debugEnabled);
      if (!this.debugEnabled) this.debugGraphics.clear();
    },

    setActiveButton(actionKey) {
      document.querySelectorAll('[data-action]').forEach(button => {
        button.classList.toggle('active', button.dataset.action === actionKey);
      });
    }
  });
})(window.CVProof);
