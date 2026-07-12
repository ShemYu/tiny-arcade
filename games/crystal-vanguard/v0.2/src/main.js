import { EventBus, GameSession, setAppContext, WORLD_SIZE } from './core.js';
import { createContentRegistry } from './content.js';
import { BootScene, BattleScene } from './scenes.js';
import { HudController } from './ui.js';

function boot() {
  if (!globalThis.Phaser) {
    throw new Error('Phaser failed to load from the configured CDN.');
  }

  const bus = new EventBus();
  const content = createContentRegistry();
  const session = new GameSession(bus);

  const context = {
    bus,
    content,
    session,
    assetRuntime: null
  };

  setAppContext(context);
  new HudController(context);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WORLD_SIZE.width,
    height: WORLD_SIZE.height,
    backgroundColor: '#13201f',
    pixelArt: true,
    roundPixels: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, BattleScene]
  });

  globalThis.__CRYSTAL_VANGUARD_V02__ = Object.freeze({
    game,
    content,
    session,
    version: '2.1.0-dev'
  });
}

try {
  boot();
} catch (error) {
  console.error(error);
  const target = document.querySelector('#game');
  if (target) {
    target.innerHTML = `<pre style="padding:16px;color:#ffd0cc;white-space:pre-wrap">${String(error?.stack ?? error)}</pre>`;
  }
}
