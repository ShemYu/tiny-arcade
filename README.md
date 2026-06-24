# Tiny Arcade

<p align="center">
  <img src="./assets/tiny-arcade-open-source-banner.svg" alt="Tiny Arcade — free browser games, built in the open" width="100%">
</p>

<p align="center">
  <strong>Small games deserve real care — and a door anyone can open.</strong><br>
  Free browser games with no install, no account, and no paywall between you and play.
</p>

<p align="center">
  <a href="https://shemyu.github.io/tiny-arcade/"><strong>▶ Play the arcade</strong></a>
  ·
  <a href="https://github.com/ShemYu/tiny-arcade/issues/new?template=game-wish.yml"><strong>💭 Wish for a game</strong></a>
  ·
  <a href="./CONTRIBUTING.md"><strong>🛠 Contribute</strong></a>
  ·
  <a href="./README.zh-TW.md"><strong>繁體中文</strong></a>
</p>

---

## Why Tiny Arcade exists

I love games, and I still think there is something special about clicking a link and immediately entering a small world.

Trying a game today often starts with a store, an install, an account, or a spending loop. There is nothing wrong with ambitious commercial games, but I want to keep another kind of experience alive too: **one link, one idea, and play first**.

Tiny Arcade is where I build those experiences. The games are intentionally small, but they are not disposable. I care about controls, game feel, art, sound, mobile support, and the tiny details that make a prototype feel like a real game.

This repository is also an open invitation. Play something, point out what feels wrong, suggest the game you wish existed, or help build the next cabinet. A bug fix, a translation, a sound effect, a better animation, a wild mechanic, or a complete game can all move the arcade forward.

## Play something

<table>
  <tr>
    <td width="33%" valign="top">
      <a href="https://shemyu.github.io/tiny-arcade/games/mochi-sky/">
        <img src="./assets/previews/mochi-sky.png" alt="Mochi Sky gameplay preview" width="100%">
      </a>
      <h3>Mochi Sky / 麻糬星野</h3>
      <p>A pastel action platformer about jumping, inhaling bubble enemies, and chasing a rainbow gate.</p>
      <p><a href="https://shemyu.github.io/tiny-arcade/games/mochi-sky/"><strong>Play</strong></a> · <a href="./games/mochi-sky/">Source</a></p>
    </td>
    <td width="33%" valign="top">
      <a href="https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/">
        <img src="./assets/previews/crystal-vanguard.png" alt="Crystal Vanguard gameplay preview" width="100%">
      </a>
      <h3>Crystal Vanguard / 琉璃城：八方守晶</h3>
      <p>A compact tactics and tower-defense game. Recruit, merge, deploy, and protect the crystal from every direction.</p>
      <p><a href="https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/"><strong>Play</strong></a> · <a href="./games/crystal-vanguard/">Source</a></p>
    </td>
    <td width="33%" valign="top">
      <a href="https://shemyu.github.io/tiny-arcade/games/wink-pop-seoul/">
        <img src="./assets/previews/wink-pop-seoul.png" alt="K-Idol Eye Runway gameplay preview" width="100%">
      </a>
      <h3>K-Idol Eye Runway / 韓系偶像電眼伸展台</h3>
      <p>A playful side-scrolling charm game. Aim your gaze, race your rivals, and win the crowd before time runs out.</p>
      <p><a href="https://shemyu.github.io/tiny-arcade/games/wink-pop-seoul/"><strong>Play</strong></a> · <a href="./games/wink-pop-seoul/">Source</a></p>
    </td>
  </tr>
</table>

All current games are playable prototypes. They may still be rough around the edges—which is exactly why feedback is useful.

## The promise

- **Free to play.** The arcade should be easy to enjoy, not another checkout screen.
- **One click away.** No install, account, backend, or build step is required to play.
- **Small, not careless.** A short game can still have personality, polish, and a satisfying loop.
- **Built in the open.** Ideas, experiments, mistakes, and improvements stay visible.
- **Welcoming by design.** Players, artists, developers, writers, translators, and curious beginners all have something useful to add.

## Help shape the arcade

### Playtest it

Found a bug, confusing control, awkward difficulty spike, mobile issue, or detail that simply feels off? [Open an issue](https://github.com/ShemYu/tiny-arcade/issues/new). Screenshots, recordings, and honest reactions are extremely helpful.

### Make a game wish

Have a small game you would love to play, but cannot find anywhere? [Create a Game Wish card](https://github.com/ShemYu/tiny-arcade/issues/new?template=game-wish.yml).

The idea does not need a full design document. A one-sentence fantasy, a strange mechanic, or “this game, but with…” is enough to begin a useful conversation. A wish is an invitation to explore—not a delivery promise.

### Contribute

You do not need to build an entire game. Useful contributions include:

- fixing a bug or improving accessibility;
- polishing controls, animation, UI, audio, or performance;
- adding Traditional Chinese or English copy;
- improving game art and asset tooling;
- proposing a mechanic, level, enemy, or balance change;
- contributing a new self-contained browser game.

Start with the [contribution guide](./CONTRIBUTING.md), or comment on an existing issue before opening a larger pull request.

## Built to stay simple

Each game lives under its own path and can run as static files:

```text
games/<game-slug>/index.html
```

The arcade hub reads its cards, search data, filters, and localized copy from one catalog:

```text
assets/scripts/catalog.js
```

There is no framework, package manager, bundler, backend, login system, or runtime dependency. GitHub Pages is enough to host the whole arcade.

### Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

### Game asset checks

Shared PNG validation lives under `tools/game-assets/`, while each game owns its style rules, prompts, references, and runtime manifest:

```bash
python3 tools/game-assets/validate_game_assets.py games/mochi-sky/asset-manifest.json
```

## Principles I try to protect

1. **Play first.** A visitor should reach something playable within one click.
2. **Make the small thing feel complete.** Scope can be tiny; care should not be.
3. **Prefer understandable technology.** The repository should remain approachable to someone opening it for the first time.
4. **Treat feedback as part of development.** A player noticing something is not noise—it is design information.
5. **Leave room for surprise.** Not every game needs to follow a trend, genre formula, or monetization loop.

## License and attribution

Individual games and generated assets may carry their own attribution or reuse notes inside their folders. Please review those notes before reusing code or artwork outside this repository.

---

<p align="center">
  Built with curiosity, stubborn iteration, and a genuine love of games by <a href="https://github.com/ShemYu">Shem Yu</a> — with room for anyone who wants to help the arcade grow.
</p>
