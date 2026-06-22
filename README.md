# Single-Page Games

一個用來收納可直接在瀏覽器執行的迷你遊戲 repo。

## Games

- **麻糬星野** — 像素風橫向卷軸 POC
  - 路徑：`games/mochi-sky/`
  - 操作：`← → / A D` 移動、`Space / W` 跳躍、長按 `X` 吸入、`C` 發射、`R` 重來、`P` 暫停

## Structure

```text
single-page-games/
├── index.html
├── assets/
│   └── previews/
│       └── mochi-sky.png
├── games/
│   └── mochi-sky/
│       └── index.html
├── .nojekyll
└── publish-to-github.sh
```

所有站內連結與資源都使用相對路徑，因此可部署在 GitHub Pages 的 project subpath：

- 目錄頁：`https://shemyu.github.io/single-page-games/`
- 遊戲頁：`https://shemyu.github.io/single-page-games/games/mochi-sky/`

## Publish

需要安裝並登入 [GitHub CLI](https://cli.github.com/)：

```bash
gh auth login
chmod +x publish-to-github.sh
./publish-to-github.sh
```

腳本會建立公開 repo `ShemYu/single-page-games`、push `main`，並將 GitHub Pages 設為從 repo 根目錄發布。
