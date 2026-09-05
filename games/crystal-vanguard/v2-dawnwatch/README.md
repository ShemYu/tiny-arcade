# Crystal Vanguard II — The Dawnwatch / 琉璃城 II：晨曦守望

A playable **first art-direction and gameplay slice** of an original isometric
pixel-fantasy defense game.

Play: https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/v2-dawnwatch/?lang=zh

## Why a separate path?

During publication, `main` gained another complete V2 implementation, **First
Light / 星霧遺跡**, at `games/crystal-vanguard/v2/` (commit `72c2dfe`). This build
was moved to `v2-dawnwatch/` rather than overwriting that work. The original game,
`v0.2/`, the other V2 build, and the existing art branches are all preserved.
Dawnwatch uses its own `cvDawnwatch*` score and sound-preference storage keys.

## Play

Four original adventurer classes begin deployed. Recruit, combine three heroes
of the same class and rank, read the eight-direction forecast, reposition, and
survive eight waves including the Hollow King. Ranks run from one to three;
the squad limit is 12 including reserves. The selected hero survives a merge.
Recall and dismissal are available between waves; dismissal refunds 70% of the
investment. Fallen heroes revive and heal between waves. Repair the crystal
for 12 gold when needed.

Blade periodically cleaves, Ranger has an empowered third shot, Mage deals area
damage, and Guard reduces nearby allies' incoming damage. Crystal bloom heals
living deployed heroes by 35% of maximum health and damages enemies near the
crystal, once per wave.

Select a portrait and then a clear ground tile to deploy. **Space** begins a wave
when the page or field is focused; focused buttons retain native activation.
**E** casts bloom, **P / Escape** pauses, and **M** toggles synthesized sound.
Select a hero, focus the field, and use **arrow keys + Enter** for keyboard
placement. Drag to pan; **+ / - / View** adjusts the camera, and **1x / 2x** changes
battle speed. Leaving a battle tab pauses automatically. Touch uses the same
visible controls.

Open **Atelier / 角色圖鑑** (the `図` button on mobile) to inspect the actual
production characters by animation, direction, and rank.

## Consistency before asset count

The goal is complete, recognizable fantasy adventurers, not abstract geometric
icons. These are **original code-drawn characters, not Ragnarok Online assets**.
The initial art interpretation does not claim RO-level detail or animation
quality. Technical validation is not a substitute for art approval.

All professions share fixed proportions, joints, palette ramps, upper-left
lighting, frame dimensions, and foot root. Clothing, hair, weapons, and rank
ornaments attach to that rig. The atelier and battle call the same renderer.
Frames are generated on 96x96 in-memory canvases with foot root (48,82).
Scanline fills and integer line drawing avoid antialiased sprite edges. Cached
sprites and scenery use nearest-neighbor drawing. Death intentionally fades
and rotates. No high-resolution illustration is downsampled into a sprite.

Seven runtime files total **89,943 bytes (89.9 kB) uncompressed**, excluding docs,
tests, and the hub's vector-code cover. No downloaded images, fonts, sprite
sheets, audio files, third-party runtime, CDN, backend, or build step is needed.

| File | Responsibility |
| --- | --- |
| `content.js` | Immutable professions, enemies, waves, economy constants |
| `engine.js` | DOM-free commands, placement, merging, combat, progression |
| `art.js` | Pixel characters, equipment, scenery primitives, frame cache |
| `renderer.js` | Isometric projection, camera, depth sorting, effects, picking |
| `app.js` | DOM, bilingual copy, input, safe optional storage, Web Audio |
| `index.html`, `style.css` | Responsive controls, overlays, and dialogs |

`CVGame.snapshot()` returns a copied diagnostic state; `CVGame.project(x,y)`
helps input-driven browser tests click world coordinates. No unlimited-resource
or production state-mutation interface is exposed.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/games/crystal-vanguard/v2-dawnwatch/
node games/crystal-vanguard/v2-dawnwatch/test.cjs
```

The dependency-free Node suite passes **23 checks** covering economy, placement,
swaps, merging, pause, healing, frame deltas, progression, and end-state stability.
A normal-command pilot buys, merges, deploys, and uses bloom through all eight
waves: crystal 93, 162 defeated, score 5892. No gold or health is injected into
that full-run pilot. The original squad without recruitment or repositioning
eventually loses.

Chromium verification passed **36 UI checks**, including keyboard, touch,
language, camera, merging, pause, retry, reduced motion, and viewport sizes
320x568, 390x844, 430x932, 844x390, and 1280x800. The upright-frame gate checked
**1,920 profession/rank/direction/action/frame combinations**: no partial-alpha
pixels and no marks touching a canvas boundary. Intentional fading death poses
are excluded. Separate input-only browser runs reached victory, defeat, and
successful retries. Runtime blob hashes matched the tested local source.
The UI checks were rerun after the publication-path/storage-key adjustment.

**QA boundary:** browser navigation is administratively blocked in the authoring
environment. Playwright loaded exact HTML/CSS/JS using `set_content` and script
injection, not by navigating the live site. Long campaign tests accelerated the
browser clock and are not real-time performance benchmarks. No physical iPhone
or Safari/WebKit test was performed. Hosting must be verified separately.

## Initial-slice scope

One map, four classes, five enemy types including the boss, three ranks, eight
waves. Poses and anatomy remain compact. There is no building/pathfinding system,
inventory, online account, campaign, or mid-run persistence. Local best score,
last result, sound preference, and language are optional device-only storage.

## 繁體中文

從招募、三合一升階、部署，一路到八波首領與勝敗結算的可玩初版。
四位冒險者已預先部署，可以直接迎戰；也可依金色箭頭調整防線。
每波之間隊員會復甦、補滿生命，戰鬥中每波可用一次「晶耀救援」。

這次優先解決的是**角色、裝備與動作的一致性**，不是為零素材而犧牲角色。
角色圖鑑與戰場使用同一套繪製程式，方便檢查動作、朝向與升階外觀。
目前是朝經典斜俯視奇幻 RPG 氣質邁進的小型版本，不是 RO 原作素材，
也不把自動化測試通過視為美術已達標。

提交前發現另一份「星霧遺跡」V2 已加入 main，因此本版獨立放在
`v2-dawnwatch/`；原版、v0.2 與另一份 V2 全部保留，可直接比較。
