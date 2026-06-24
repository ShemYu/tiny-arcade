# Contributing to Tiny Arcade

<p align="center">
  <a href="#english"><strong>English</strong></a> ·
  <a href="#繁體中文"><strong>繁體中文</strong></a>
</p>

Tiny Arcade welcomes code, art, audio, writing, translation, playtesting, accessibility improvements, balance ideas, and complete games. You do not need to be an experienced game developer to help.

---

## English

### Good ways to start

- Play a game and report one concrete problem.
- Comment on an existing issue with reproduction steps or design observations.
- Improve copy, translation, accessibility, controls, mobile behavior, or performance.
- Polish a visual, animation, sound effect, level, enemy, or rule.
- Open a [Game Wish](https://github.com/ShemYu/tiny-arcade/issues/new?template=game-wish.yml).
- Add a small, self-contained browser game.

For a large feature or a new game, opening an issue first is encouraged. A short discussion can prevent duplicated work and help keep the scope realistic.

### Local preview

Clone the repository and serve it as static files:

```bash
git clone https://github.com/ShemYu/tiny-arcade.git
cd tiny-arcade
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

Direct `file://` preview is discouraged because browser rules for linked assets and storage can vary.

### Repository model

```text
index.html                         # Arcade hub
games/<game-slug>/index.html      # Playable game
assets/previews/<game-slug>.png   # 16:9 preview
assets/scripts/catalog.js         # Game metadata source of truth
tools/game-assets/                # Shared asset validation tools
```

The hub intentionally has no framework, bundler, package manager, backend, or runtime dependency.

### Add a game

1. Create `games/<game-slug>/index.html`.
2. Keep runtime files inside that game folder whenever practical.
3. Add a 16:9 preview at `assets/previews/<game-slug>.png`.
4. Add one entry to `assets/scripts/catalog.js`.
5. Test keyboard, pointer, and touch behavior when those controls are supported.
6. Verify every relative path from both the arcade homepage and the game subpath.

A catalog entry follows this shape:

```js
{
  id: "new-game",
  title: {
    en: "New Game",
    zh: "新遊戲"
  },
  description: {
    en: "A clear one-sentence description.",
    zh: "清楚的一句話遊戲說明。"
  },
  path: "./games/new-game/",
  source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/new-game",
  preview: "./assets/previews/new-game.png",
  previewAlt: {
    en: "Gameplay preview of New Game",
    zh: "新遊戲的遊玩畫面"
  },
  genres: ["puzzle"],
  tags: ["single-player"],
  controls: ["keyboard", "touch"],
  status: "poc",
  featured: false,
  playTime: "5 min",
  added: "YYYY-MM-DD",
  updated: "YYYY-MM-DD"
}
```

### Game assets

Generic asset validation belongs under `tools/game-assets/`. Style locks, generation prompts, approved references, and runtime manifests should stay with the game that owns them.

For Mochi Sky, run:

```bash
python3 tools/game-assets/validate_game_assets.py games/mochi-sky/asset-manifest.json
```

Treat generated images as source art until they have been normalized and validated for their runtime role. A visually attractive sheet is not automatically a clean sprite sheet or seamless tile.

### Pull-request checklist

Before opening a pull request, please check that:

- the game starts without a console error;
- internal links and asset paths work from a subpath;
- the core loop is understandable without reading source code;
- controls are documented in the game UI or its folder README;
- the page remains usable at common desktop and mobile sizes;
- new text is available in English and Traditional Chinese where the surrounding interface is bilingual;
- borrowed or generated assets include appropriate attribution or source notes;
- relevant asset manifests or validators pass;
- the pull request explains what changed, why it changed, and how it was tested.

Small, focused pull requests are easier to review. Visual changes benefit greatly from a screenshot or short recording.

### A note on game ideas

A Game Wish is a conversation starter, not a delivery contract. Ideas may evolve, combine with other suggestions, or become community projects. Please avoid attaching copyrighted source assets that you do not have permission to redistribute; links and references are enough.

---

## 繁體中文

Tiny Arcade 歡迎程式、美術、音效、文字、翻譯、試玩回饋、無障礙改善、平衡想法，以及完整遊戲。你不需要先成為資深遊戲開發者，才有資格參與。

### 適合開始的方式

- 玩一款遊戲，回報一個具體問題。
- 在既有 issue 補上重現步驟或遊戲設計觀察。
- 改善文字、翻譯、無障礙、操作、手機體驗或效能。
- 打磨一張圖、一段動畫、一個音效、一個關卡、一名敵人或一條規則。
- 建立一張 [Game Wish 遊戲許願卡](https://github.com/ShemYu/tiny-arcade/issues/new?template=game-wish.yml)。
- 新增一款小而完整、可以獨立執行的網頁遊戲。

若是較大的功能或全新遊戲，建議先開 issue 簡單討論。幾句話就能幫助大家避免重工，也比較容易一起把範圍抓在能完成的位置。

### 本機預覽

```bash
git clone https://github.com/ShemYu/tiny-arcade.git
cd tiny-arcade
python3 -m http.server 8080
```

打開 `http://localhost:8080/`。

不建議直接使用 `file://`，因為不同瀏覽器對連結素材與儲存空間的安全規則可能不同。

### Repo 架構

```text
index.html                         # 遊戲櫃首頁
games/<game-slug>/index.html      # 可遊玩的遊戲
assets/previews/<game-slug>.png   # 16:9 預覽圖
assets/scripts/catalog.js         # 遊戲 metadata 的單一來源
tools/game-assets/                # 共用素材驗證工具
```

這個專案刻意不使用 framework、bundler、package manager、backend 或 runtime dependency。

### 新增一款遊戲

1. 建立 `games/<game-slug>/index.html`。
2. 實務允許時，將 runtime 檔案留在該遊戲資料夾內。
3. 在 `assets/previews/<game-slug>.png` 放一張 16:9 預覽圖。
4. 在 `assets/scripts/catalog.js` 新增一筆資料。
5. 若遊戲支援鍵盤、滑鼠或觸控，請分別實際測試。
6. 從遊戲櫃首頁與遊戲子路徑兩邊確認所有相對路徑。

Catalog 格式請參考英文區塊中的範例，或直接比照現有遊戲項目。

### 遊戲素材

通用的素材驗證邏輯放在 `tools/game-assets/`；風格鎖定、圖片生成 prompt、核准過的參考素材與 runtime manifest，則應留在所屬遊戲資料夾中。

Mochi Sky 可以執行：

```bash
python3 tools/game-assets/validate_game_assets.py games/mochi-sky/asset-manifest.json
```

生成圖片在完成切格、透明處理、錨點統一與驗證前，都應視為 source art。好看的圖不會自動變成乾淨的 sprite sheet 或無縫 tile。

### Pull request 檢查清單

送出 PR 前，請確認：

- 遊戲啟動時沒有 console error；
- 內部連結與素材路徑在子路徑下仍能運作；
- 不閱讀原始碼也能理解核心玩法；
- 操作方式已寫在遊戲 UI 或該遊戲的 README；
- 常見桌面與手機尺寸仍可正常使用；
- 周邊介面若為雙語，新文字也提供英文與繁體中文；
- 借用或生成的素材附上必要的 attribution 或來源說明；
- 對應的 asset manifest 或 validator 已通過；
- PR 清楚說明改了什麼、為什麼改，以及如何測試。

範圍小而集中的 PR 通常更容易 review。視覺修改若能附上截圖或短影片，會非常有幫助。

### 關於遊戲許願

Game Wish 是討論起點，不是交付合約。點子可能演變、和其他提案合併，或成為社群一起完成的專案。請不要直接附上沒有再散布權限的版權素材；提供連結或風格參考就足夠了。
