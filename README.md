# Shem's Tiny Arcade

<p align="center">
  <img src="./assets/shem-tiny-arcade-banner.svg" alt="Shem's Tiny Arcade — AI, games, and playable experiments" width="100%">
</p>

> Tiny browser games, playful prototypes, and single-page experiments by Shem.

This repo is a small public arcade shelf: each game lives in its own folder, runs as static HTML, and is meant to be playable from a GitHub Pages subpath.

- Arcade home: `https://shemyu.github.io/single-page-games/`
- Featured game: `https://shemyu.github.io/single-page-games/games/mochi-sky/`
- GitHub profile: `https://github.com/ShemYu`

## Why this repo exists

I like turning tiny ideas into playable things quickly. This repo is for browser-game POCs that are small enough to understand, easy to ship, and fun enough to keep improving.

The vibe: **playable before perfect**.

## Games

| Game | Status | Path | Notes |
| --- | --- | --- | --- |
| **Mochi Sky / 麻糬星野** | POC | `games/mochi-sky/` | Pastel pixel-art side-scroller with jumping, inhaling enemies, star shots, collectibles, checkpoint, and finish gate. |

### Mochi Sky controls

| Input | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` / `W` | Jump |
| Hold `X` | Inhale |
| `C` | Shoot star |
| `R` | Restart |
| `P` | Pause |

Touch controls are included for mobile browsers.

## Repo principles

1. **Single-page first** — every game should be easy to open, inspect, and host.
2. **No backend by default** — static hosting should be enough for a POC.
3. **Playable before perfect** — prioritize feel, feedback, and a working loop over polish.
4. **Tiny worlds, clear folders** — each game owns its own folder under `games/`.

## Structure

```text
single-page-games/
├── index.html                  # Branded arcade landing page
├── 404.html                    # Branded GitHub Pages fallback
├── assets/
│   ├── shem-tiny-arcade-banner.svg
│   ├── shem-tiny-arcade-banner.png
│   └── previews/
│       └── mochi-sky.png
├── games/
│   └── mochi-sky/
│       ├── index.html          # The playable game
│       └── README.md           # Game-specific notes
├── .nojekyll
└── publish-to-github.sh
```

All internal links use relative paths so the site works under the GitHub Pages project subpath:

```text
https://shemyu.github.io/single-page-games/
```

## Local preview

Any static file server works. For example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
http://localhost:8080/games/mochi-sky/
```

## Publish

Install and log in to GitHub CLI first:

```bash
gh auth login
```

Then run:

```bash
chmod +x publish-to-github.sh
./publish-to-github.sh
```

The script will:

1. Create or reuse `ShemYu/single-page-games`.
2. Push the current folder to `main`.
3. Enable GitHub Pages from `main` / root.
4. Set the repo homepage to the GitHub Pages URL.

## Add a new game

1. Create a new folder:

   ```text
   games/<game-slug>/index.html
   ```

2. Add a preview image:

   ```text
   assets/previews/<game-slug>.png
   ```

3. Add a card to the arcade shelf in `index.html`.
4. Add a row to the Games table above.
5. Keep links relative so the page keeps working under `/single-page-games/`.

## Brand direction

This is intentionally not a heavy game-engine repo. It is closer to a public creative lab:

- fast prototypes
- tiny playable systems
- browser-native experiments
- cute, tactile, low-friction demos

Small enough to ship. Fun enough to revisit.
