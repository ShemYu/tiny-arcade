# Crystal Vanguard II / 琉璃城 II

**First Light — 星霧遺跡** is a complete first chapter: recruit, deploy, merge,
and defend a floating crystal sanctuary through eight waves and a final boss.

[Play](https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/v2/?lang=zh)

This is an independent, code-only vertical slice. The original game, `v0.2/`,
and the earlier `feat/crystal-vanguard-v2-1` branch are not replaced.

## The small game

Four scouts start deployed, with 18 gold available. Contracts cost 6 gold;
choose Blade, Ranger, Mage, or Guard. Eight heroes may be deployed, with eight
reserve slots. Three identical class/rank heroes merge into one, up to three
stars. The selected hero survives the merge; reserve copies are consumed first.

Blade cleaves groups, Ranger fires long-range arrows, Mage launches splash
fireballs, and Guard draws nearby enemies while reducing nearby allies' damage
by 25%. Fallen heroes recover between waves. Crystal repair costs 8 gold for
25 health. A once-per-wave Crystal Nova damages and slows nearby enemies.

Slimes, goblins, wisps, golems and the Ruin Warden arrive on eight forecast roads.
The Warden enrages at half health. Survive wave eight to win; zero crystal health
ends the expedition. Score is based on defeated enemies, merges, and remaining
crystal health. The best score and preferences stay locally when storage works.

## Controls

Mouse/touch: recruit a hero, then tap a stone tile. Tap a deployed hero or roster
portrait to select it. Reposition and merge between waves; the central altar is
not deployable. The magnifier toggles zoom; drag the enlarged board to pan.
The book opens the bilingual field guide and character codex.

Keyboard: `1`–`4` recruit; focus the board and use arrows + `Enter` to deploy;
`Space` starts a wave when the board/page is focused; `F` casts Nova; `G` merges;
`B` benches; `R` repairs; `P` pauses; `M` toggles audio. Buttons retain their native
keyboard activation. Leaving a battle tab pauses it. Speed can toggle 1x / 2x.

## Entirely code

Six runtime files total **94,266 bytes (94.3 kB, uncompressed)**. No external
images, bitmap arrays, sprite sheets, audio, fonts, libraries, CDN, backend,
package manager or build step. Original character art is rasterized from pixel
rectangles, scanline polygons, lines and ellipses, then cached on canvases.
System fonts provide text; Web Audio oscillators provide optional sound.
The hub thumbnail is also inline SVG code, not a media file.

| Module | Responsibility |
| --- | --- |
| `core.js` | DOM-free simulation, state transitions, economy, combat and waves |
| `art.js` | Original pixel characters, equipment, rank accents and poses |
| `world.js` | Isometric scenery, depth sorting, projectiles, effects and camera |
| `app.js` | Bilingual DOM interface, input mapping, audio and safe storage |
| `index.html` / `style.css` | Semantic controls, dialogs and responsive layout |

Simulation updates use bounded catch-up and substeps of at most 1/60 second.
Authored waves use seeded combat timing for reproducibility. Rendering is not
the owner of gameplay state. `crystalSnapshot()` returns a copy for diagnostics;
`crystalProject(x, y)` exposes only the current screen projection.

## Run and test

From the repository root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/games/crystal-vanguard/v2/
node games/crystal-vanguard/v2/tests/core.cjs
```

The Node suite has no dependencies: **25 checks**, including economy/placement
invariants, merge semantics, pause, recovery, defeat, immutable end states and
successful complete campaigns across **20 seeds**.

Optional browser QA needs Python Playwright and Chromium (test tooling only):

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 games/crystal-vanguard/v2/tests/browser.py /tmp/cv2-qa
# CHROME_BIN can select a system Chromium executable.
```

**32 Chromium checks passed** with six viewport sizes (320x568 through
1440x900), mouse/touch interaction, reduced motion, localization, merging,
pause/resume, defeat/retry and an input-only eight-wave victory with the boss
visible. Screenshots were visually reviewed. The campaign pilot activates DOM
controls and clicks projected tiles, without modifying simulation state.

Validation boundary: browser navigation is blocked in the authoring environment,
including localhost. Browser QA injects the exact HTML/CSS/JS with Playwright
`set_content`; it is not a test of live URL loading, cache behavior, persistent
storage across reloads, physical touch hardware, or Safari/WebKit. Hosting must
be checked separately. Native keyboard/dialog handling is present, but the
spatial real-time battlefield is not a full nonvisual screen-reader game.

## 繁體中文

一張有高度的浮空遺跡、四種完整小人物、八波敵襲，以及最後的遺跡看守者。
招募後選取隊員，再點石板部署；同職同星的三位可以合成，最高三星。
最多八位出戰，倒下的隊員在下一波免費復原。每波一次的「晶爆」留給危急時刻。

角色的臉、頭髮、盔甲、披風、武器、動作，以及場景和音效，全部由程式生成。
這是一款原創的漫畫比例像素戰棋，沒有使用 RO 的角色、地圖或素材。
提供完整勝敗與重玩流程、繁體中文／英文、手機直橫向、縮放、暫停與兩倍速。
目前是第一章可玩版本，不包含裝備掉落、建築系統、開放世界或長篇養成。
