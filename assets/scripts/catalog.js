/**
 * Tiny Arcade catalog
 *
 * Add one object here whenever a new game is published. The home page builds
 * its featured area, filters, search index, counters, and cards from this list.
 */
window.TINY_ARCADE_GAMES = [
  {
    id: "lumen-loop",
    title: { en: "Lumen Loop", zh: "流光迴路" },
    description: {
      en: "One button, two orbits, sixty seconds. Switch lanes, catch the light, and bring the signal home. Entirely drawn and scored in code.",
      zh: "一個按鈕，兩條軌道，六十秒。切換內外軌、收集光點、閃開障礙，把訊號送回家。畫面與音效全由程式生成。"
    },
    path: "./games/lumen-loop/",
    source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/lumen-loop",
    // The preview is hand-written vector code, not a downloaded or generated asset.
    preview: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#101d23"/><g fill="none" stroke="#324a4f"><circle cx="440" cy="180" r="138"/><circle cx="440" cy="180" r="97"/><circle cx="440" cy="180" r="153" stroke-dasharray="1 8"/></g><circle cx="440" cy="180" r="78" fill="none" stroke="#adf0d3" stroke-width="2" stroke-dasharray="340 150" transform="rotate(-90 440 180)"/><g fill="#adf0d3"><path d="m578 180 6 6-6 6-6-6zm-138 91 6 6-6 6-6-6zm-97-97 6 6-6 6-6-6z"/><path d="m431 39 20 7-20 7 4-7z" fill="#f5efe0"/></g><g fill="#ff946e"><path d="M528 176h20v8h-20zM433 310h20v8h-20z"/></g><g font-family="system-ui,sans-serif"><text x="38" y="111" fill="#94aaa9" font-size="12" letter-spacing="3">ONE-BUTTON ARCADE</text><text x="35" y="178" fill="#f5efe0" font-size="57" font-weight="900" letter-spacing="-3">LUMEN</text><text x="35" y="233" fill="#adf0d3" font-size="57" font-weight="900" letter-spacing="-3">LOOP</text><text x="38" y="278" fill="#94aaa9" font-size="12" letter-spacing="2">60 SEC / 2 ORBITS</text><text x="440" y="194" fill="#f5efe0" font-size="46" text-anchor="middle">60</text></g></svg>`),
    previewAlt: { en: "Code-drawn mint orbits, a white ship, and orange gates", zh: "程式繪製的雙軌、白色飛船與橘色障礙" },
    genres: ["arcade", "action"],
    tags: ["procedural", "single-player"],
    controls: ["keyboard", "mouse", "touch"],
    status: "complete",
    featured: false,
    playTime: "1 min",
    added: "2026-09-05",
    updated: "2026-09-05"
  },
  {
    id: "mochi-sky",
    title: {
      en: "Mochi Sky",
      zh: "麻糬星野"
    },
    description: {
      en: "A pastel pixel platformer. Jump, inhale bubble enemies, fire star shots, and reach the rainbow gate.",
      zh: "粉彩像素風橫向卷軸遊戲。跳躍、吸入泡泡怪、發射星彈，最後抵達彩虹星門。"
    },
    path: "./games/mochi-sky/",
    source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/mochi-sky",
    preview: "./assets/previews/mochi-sky.png",
    previewAlt: {
      en: "Mochi Sky gameplay with a round pink hero in a pastel pixel world",
      zh: "麻糬星野遊戲畫面，粉紅色圓滾滾角色站在粉彩像素世界中"
    },
    genres: ["platformer", "action"],
    tags: ["pixel-art", "cute", "single-player"],
    controls: ["keyboard", "touch"],
    status: "poc",
    featured: true,
    playTime: "5–10 min",
    added: "2026-06-22",
    updated: "2026-06-22"
  },
  {
    id: "crystal-vanguard",
    title: {
      en: "Crystal Vanguard",
      zh: "琉璃城：八方守晶"
    },
    description: {
      en: "A pixel tactics tower-defense game. Recruit, merge, deploy, and guard the crystal from enemies arriving from eight directions.",
      zh: "像素戰棋守塔遊戲。招募、合成、部署戰棋，抵禦八方來襲的敵軍並守住華麗水晶。"
    },
    path: "./games/crystal-vanguard/",
    source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/crystal-vanguard",
    preview: "./assets/previews/crystal-vanguard.png",
    previewAlt: {
      en: "Crystal Vanguard gameplay showing a pixel battlefield with crystal defense UI",
      zh: "琉璃城：八方守晶遊戲畫面，顯示像素戰場與水晶防衛介面"
    },
    genres: ["strategy", "arcade"],
    tags: ["pixel-art", "tower-defense", "auto-battler", "single-player"],
    controls: ["keyboard", "mouse", "touch"],
    status: "poc",
    featured: false,
    playTime: "10–20 min",
    added: "2026-06-23",
    updated: "2026-06-23"
  },
  {
  id: "wink-pop-seoul",
  title: {
    en: "Wink Pop Seoul",
    zh: "韓系偶像電眼伸展台"
  },
  description: {
    en: "A side-scrolling idol charm game. Aim your gaze, compete with rivals, and win fans before time runs out.",
    zh: "橫向捲軸偶像放電小遊戲。瞄準男粉絲、和競爭對手搶人氣，在時間結束前收服粉絲。"
  },
  path: "./games/wink-pop-seoul/",
  source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/wink-pop-seoul",
  preview: "./assets/previews/wink-pop-seoul.png",
  previewAlt: {
    en: "Wink Pop Seoul gameplay with an idol charming fans in a festival street",
    zh: "韓系偶像電眼伸展台遊戲畫面，偶像在祭典街道上對粉絲放電"
  },
  genres: ["arcade", "action"],
  tags: ["cute", "single-player"],
  controls: ["mouse", "touch"],
  status: "poc",
  featured: false,
  playTime: "3–5 min",
  added: "2026-06-24",
  updated: "2026-06-24"
}
];
