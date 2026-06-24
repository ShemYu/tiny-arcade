/**
 * Tiny Arcade catalog
 *
 * Add one object here whenever a new game is published. The home page builds
 * its featured area, filters, search index, counters, and cards from this list.
 */
window.TINY_ARCADE_GAMES = [
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
    en: "K-Idol Eye Runway",
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
    en: "K-Idol Eye Runway gameplay with an idol charming fans in a festival street",
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
