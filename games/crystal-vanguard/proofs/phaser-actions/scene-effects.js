((app) => {
  'use strict';

  const { DIR_BY_KEY } = app;
  const ProofScene = app.ProofScene;

  Object.assign(ProofScene.prototype, {
    drawTargetMarker(time) {
      this.targetMarker.clear();
      if (!this.target) return;
      const pulse = 8 + Math.sin(time * 0.012) * 2;
      this.targetMarker.lineStyle(2, 0x9de8d7, 0.88);
      this.targetMarker.strokeCircle(this.target.x, this.target.y, pulse);
      this.targetMarker.lineBetween(this.target.x - 4, this.target.y, this.target.x + 4, this.target.y);
      this.targetMarker.lineBetween(this.target.x, this.target.y - 4, this.target.x, this.target.y + 4);
    },

    drawDebug() {
      this.debugGraphics.clear();
      if (!this.debugEnabled) return;
      const graphics = this.debugGraphics;
      const profile = this.currentFrameProfile();
      const scale = this.player.scaleX;

      graphics.lineStyle(1, 0xffdf70, 1);
      graphics.strokeRect(this.actor.body.x, this.actor.body.y, this.actor.body.width, this.actor.body.height);
      graphics.lineBetween(this.actor.x - 6, this.actor.y, this.actor.x + 6, this.actor.y);
      graphics.lineBetween(this.actor.x, this.actor.y - 6, this.actor.x, this.actor.y + 6);

      if (profile.bbox) {
        const left = this.player.x + (profile.bbox.left - profile.pivotX) * scale;
        const top = this.player.y + (profile.bbox.top - profile.pivotY) * scale;
        const width = (profile.bbox.right - profile.bbox.left) * scale;
        const height = (profile.bbox.bottom - profile.bbox.top) * scale;
        graphics.lineStyle(1, 0x75e6d2, 0.9);
        graphics.strokeRect(left, top, width, height);
      }

      const angle = DIR_BY_KEY[this.currentDir]?.angle ?? Math.PI / 2;
      graphics.lineStyle(2, 0xff8f8f, 0.9);
      graphics.lineBetween(
        this.actor.x,
        this.actor.y,
        this.actor.x + Math.cos(angle) * 34,
        this.actor.y + Math.sin(angle) * 34
      );

      if (this.target) {
        graphics.lineStyle(1, 0xffffff, 0.35);
        graphics.lineBetween(this.actor.x, this.actor.y, this.target.x, this.target.y);
      }
    },

    playSlashFx() {
      const angle = DIR_BY_KEY[this.currentDir]?.angle ?? Math.PI / 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      this.spawnAfterimage(-dx * 8, -dy * 5, 0x9de8d7, 0.28);
      this.tweens.killTweensOf(this.visualOffset);
      this.visualOffset.x = 0;
      this.visualOffset.y = 0;
      this.tweens.add({
        targets: this.visualOffset,
        x: dx * 9,
        y: dy * 6,
        duration: 65,
        yoyo: true,
        ease: 'Sine.easeOut'
      });

      this.spawnSlashArc(angle, 0xfff4c2, 16, 0.78, 34, -1.05, 0.85);
      this.time.delayedCall(35, () => this.spawnSlashArc(angle, 0x9de8d7, 10, 0.48, 43, -0.95, 0.95));
      this.time.delayedCall(75, () => this.spawnAfterimage(-dx * 4, -dy * 3, 0xffffff, 0.18));
      this.cameras.main.shake(90, 0.0025);
    },

    playCastFx() {
      const angle = DIR_BY_KEY[this.currentDir]?.angle ?? Math.PI / 2;
      const x = this.player.x + Math.cos(angle) * 28;
      const y = this.player.y - 32 + Math.sin(angle) * 18;
      const ring = this.add.graphics().setDepth(this.player.depth + 2);
      ring.lineStyle(5, 0x9de8d7, 0.75);
      ring.strokeCircle(x, y, 12);
      ring.lineStyle(2, 0xffffff, 0.9);
      ring.strokeCircle(x, y, 18);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy()
      });
    },

    spawnAfterimage(offsetX, offsetY, tint, alpha) {
      const ghost = this.add.sprite(
        this.player.x + offsetX,
        this.player.y + offsetY,
        this.player.texture.key,
        this.player.frame.name
      );
      ghost.setOrigin(this.player.originX, this.player.originY);
      ghost.setScale(this.player.scaleX, this.player.scaleY);
      ghost.setDepth(this.player.depth - 1);
      ghost.setTint(tint);
      ghost.setAlpha(alpha);
      ghost.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ghost,
        alpha: 0,
        x: ghost.x + offsetX * 0.8,
        y: ghost.y + offsetY * 0.8,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => ghost.destroy()
      });
    },

    spawnSlashArc(angle, color, width, alpha, radius, startOffset, endOffset) {
      const cx = this.player.x + Math.cos(angle) * 23;
      const cy = this.player.y - 28 + Math.sin(angle) * 13;
      const slash = this.add.graphics();
      slash.setDepth(this.player.depth + 2);
      slash.lineStyle(width, color, alpha);
      slash.beginPath();
      slash.arc(cx, cy, radius, angle + startOffset, angle + endOffset, false);
      slash.strokePath();
      slash.lineStyle(Math.max(2, width * 0.35), 0xffffff, alpha * 0.75);
      slash.beginPath();
      slash.arc(cx, cy, radius + 5, angle + startOffset * 0.72, angle + endOffset * 0.72, false);
      slash.strokePath();
      slash.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: slash,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 190,
        ease: 'Quad.easeOut',
        onComplete: () => slash.destroy()
      });
    }
  });
})(window.CVProof);
