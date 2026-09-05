# Lumen Loop / 流光迴路

**One button. Two orbits. Sixty seconds.**

Play: https://shemyu.github.io/tiny-arcade/games/lumen-loop/

A small, complete score-attack game. Your ship orbits clockwise. Switch between
inner and outer tracks, collect mint diamonds, avoid orange striped gates, and
keep the signal alive for 60 seconds. Three shields; no upgrades, accounts,
backend, ads, dependencies, or asset downloads.

## Controls and scoring

- Tap the playfield or the large button; Space, Enter, Left, or Right also switches.
- P / Escape pauses and resumes. M toggles synthesized sound.
- Eight consecutive lights increase the multiplier, up to 5x. Missing a light or
  hitting a gate resets the chain. Each light scores 10 times the current multiplier.
- Survive 60 seconds to receive 100 points per remaining shield.
- Leaving the tab pauses automatically. Resuming includes a short protected countdown.
- Best score, language, and mute preference stay on this device when storage is
  available. Storage and audio failures do not prevent play.

## Deliberately small

`index.html` owns DOM UI, Canvas2D drawing, synthesized Web Audio, and input.
`engine.js` owns seeded generation, movement, collision, scoring, and state transitions.
The runtime is about **33.2 kB uncompressed** across those two files. No image,
audio, font, sprite, framework, package manager, or build step is needed. Even the
hub preview and favicon are hand-written vector code. Nothing is fetched from a CDN.

The first six gates teach a fixed pattern. Later gates use a seeded generator;
every gate leaves one safe orbit. Angular speed gradually increases from 1.15 to
2 radians/second. Lane changes take 160 ms. Gaps are at least 0.70 radians, leaving
350 ms between gates even at maximum speed. Collisions are substepped at 120 Hz,
with bounded frame catch-up and a 1.2-second post-hit recovery window.

## Local development

From the repository root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/games/lumen-loop/
node games/lumen-loop/test.cjs
```

The Node test suite has no dependencies. It checks all state transitions, hit
windows, score finalization, frame stalls, 30/60/120 Hz input, and perfect input
through 100 deterministic seeds. `window.lumenSnapshot()` is a read-only diagnostic
snapshot for browser tests; it is not a writable cheat interface.

Browser QA used Chromium with mobile/touch emulation, keyboard input, reduced
motion, five viewport sizes (320x568 through 1280x900), game over and a full
60-second victory using an input-only pilot. Because the test environment blocks
browser navigation, the exact HTML and engine source were injected with
Playwright `set_content`; this is not a physical iPhone or Safari/WebKit test.

## 繁體中文

一個按鈕，兩條軌道，六十秒。白色飛船自動順時針繞行；點一下換軌，
收集薄荷綠菱形光點，避開橘色斜紋障礙。三層護盾用完就結束；撐完
60 秒，把訊號送回家。

每連續收集 8 個光點，倍率增加一級，最高 5 倍。漏接或碰撞會中斷連擊。
通關時每層剩餘護盾加 100 分。點擊畫面、下方按鈕或空白鍵都能換軌；
P / Escape 暫停，M 切換音效。切到別的視窗會自動暫停，繼續時有短倒數。

畫面、粒子、圖示與音效皆由程式生成，沒有任何外部素材或執行期套件。
支援繁體中文 / 英文、手機直向與橫向、降低動態效果，以及本機最佳分數。
既有 Tiny Arcade 遊戲不需修改。
