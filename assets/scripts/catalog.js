/**
 * Tiny Arcade catalog
 *
 * Add one object here whenever a new game is published. The home page builds
 * its featured area, filters, search index, counters, and cards from this list.
 */
window.TINY_ARCADE_GAMES = [
  {
    id: "crystal-vanguard-dawnwatch",
    title: { en: "Crystal Vanguard II: Dawnwatch", zh: "琉璃城 II：晨曦守望" },
    description: {
      en: "An original isometric pixel-fantasy defense game. Recruit four adventurer classes, merge, deploy, and keep the dawn crystal alive through eight waves.",
      zh: "斜俯視像素奇幻守城初版。招募四種冒險者、三合一升階、重新部署，守住八方攻勢與最後的首領。"
    },
    path: "./games/crystal-vanguard/v2-dawnwatch/",
    source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/crystal-vanguard/v2-dawnwatch",
    // An illustrated vector cover, not a gameplay screenshot or external asset.
    preview: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#e9e4ce"/><path d="M0 270 140 206 300 280 450 220 640 302V360H0Z" fill="#c6d0bc"/><path d="m300 240 145-76 167 76v28l-158 74-154-77Z" fill="#637e79"/><path d="m300 240 145-76 167 76-158 75Z" fill="#8ea677"/><path d="m331 240 119-58 130 57-124 57Z" fill="#adba8a"/><path d="m310 237 11-5 141 69-10 5zm39-23 13-7 143 70-14 7zm53-26 11-5 146 69-13 6z" fill="#c9c4a2"/><path d="m322 247 127-63 14 6-128 64zm40 20 131-64 12 6-131 64zm41 20 130-65 12 6-130 65z" fill="#c9c4a2"/><path d="m420 232 35-18 35 17v13l-34 17-36-16Z" fill="#66848b"/><path d="m420 232 35-18 35 17-34 18Z" fill="#c7ccb0"/><path d="m454 107 31 47-7 58-24 28-30-34-6-50Z" fill="#4daca8" stroke="#375d67" stroke-width="2"/><path d="m454 107-36 49 27 12z" fill="#cdf2ce"/><path d="m454 107 31 47-40 14z" fill="#8ed8be"/><path d="m445 168 40-14-7 58-24 28Z" fill="#3e8296"/><path d="m454 112-9 56 9 66" fill="none" stroke="#d7f7d2" stroke-width="2"/><g fill="#f7ecc7"><path d="m520 128 3 8 8 3-8 3-3 8-3-8-8-3 8-3zm-126 40 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g><g font-family="Georgia,serif" fill="#30484d"><text x="34" y="58" font-family="system-ui,sans-serif" font-size="10" letter-spacing="3">TINY ARCADE / DAWNWATCH</text><text x="31" y="122" font-size="39" font-weight="bold">CRYSTAL</text><text x="31" y="164" font-size="36" font-weight="bold">VANGUARD</text><text x="35" y="215" font-size="43" fill="#9e7a40">II</text><text x="34" y="247" font-size="18">The Dawnwatch</text><text x="35" y="288" font-family="system-ui,sans-serif" font-size="10" letter-spacing="2">4 HEROES / 8 WAVES</text></g><rect x="15" y="15" width="610" height="330" rx="2" fill="none" stroke="#b7ac8a"/></svg>`),
    previewAlt: { en: "Illustrated cover with a teal crystal over an isometric highland island", zh: "插畫式封面：斜俯視高地島嶼上的青綠水晶" },
    genres: ["strategy", "arcade"],
    tags: ["pixel-art", "tower-defense", "auto-battler", "single-player"],
    controls: ["keyboard", "mouse", "touch"],
    status: "beta",
    featured: false,
    playTime: "5–10 min",
    added: "2026-09-05",
    updated: "2026-09-05"
  },
  {
    id: "crystal-vanguard-v2",
    title: { en: "Crystal Vanguard II", zh: "琉璃城 II：星霧遺跡" },
    description: {
      en: "A code-only isometric pixel adventure. Recruit four classes, merge your heroes, and hold eight roads against the Ruin Warden.",
      zh: "純程式打造的 2.5D 漫畫像素戰棋。招募四職業、三合一升階，抵禦八方敵襲與遺跡看守者。"
    },
    path: "./games/crystal-vanguard/v2/",
    source: "https://github.com/ShemYu/tiny-arcade/tree/main/games/crystal-vanguard/v2",
    // Hand-written vector illustration. No media download or embedded bitmap.
    preview: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#1c2b3e"/><circle cx="552" cy="66" r="25" fill="#bcc6b3"/><path d="m320 200 134-66 145 69-137 72z" fill="#83958a" stroke="#acb8a0"/><path d="m320 200 142 75v52l-75-20-58-39z" fill="#3c4e65"/><path d="m462 275 137-72-11 61-77 51-49 12z" fill="#526078"/><g fill="none" stroke="#667d78"><path d="m345 188 140 75m-112-89 140 75m-112-89 140 75m-112-88 140 75m-99-79-133 66m160-52-132 67m159-52-132 65m158-51-133 65"/></g><ellipse cx="461" cy="212" rx="27" ry="12" fill="#537c83"/><path d="m461 139 17 31-6 30-11 14-15-21-5-26z" fill="#80d4ce" stroke="#304d63" stroke-width="2"/><path d="m461 139 4 32-4 43 11-14 6-30z" fill="#4593aa"/><path d="m461 139-15 27 19 5z" fill="#caf3d4"/><g stroke="#273548" stroke-width="2"><g transform="translate(386 203)"><path d="m-9-12-4 19 12-4 13 5-4-20" fill="#954e61"/><path d="m-6 0-1 14h6V3h4v11h6L7 0" fill="#819aa6"/><path d="M-9-15H9V3H-9Z" fill="#bccdcd"/><path d="M-9-29H8l3 9-5 8H-5l-7-8Z" fill="#f0c5a0"/><path d="m-12-24 3-10 7 2 5-2 8 5v10l-5-6-4 5-4-5-6 5z" fill="#b2bcc7"/><path d="M14 0v-32l3-5 3 5V0Z" fill="#cbdcd6"/><path d="M10-2h14" stroke="#e6c996"/></g><g transform="translate(513 205)"><path d="m-7-13-8 27h28L7-13Z" fill="#9580b0"/><path d="M-8-29H7l4 11-7 5H-6l-5-7Z" fill="#edc59e"/><path d="m-16-25 8-7 2-18 10-5 8 7H4l7 15 7 8-17 3z" fill="#a28dbd"/><path d="M17 14V-36" stroke="#ca9e77" stroke-width="3"/><path d="m17-45 5 7-5 7-5-7Z" fill="#abdfc9"/></g></g><g font-family="Georgia,serif" fill="#eee5ce"><text x="30" y="122" font-size="35">CRYSTAL</text><text x="30" y="164" font-size="35">VANGUARD</text><text x="31" y="217" font-size="49" fill="#edcc94">II</text></g><g font-family="monospace" fill="#b4c2b9" font-size="10" letter-spacing="2"><text x="32" y="78">CHAPTER 01 / FIRST LIGHT</text><text x="32" y="265">4 CLASSES / 8 WAVES</text><text x="32" y="286">100% CODE</text></g></svg>`),
    previewAlt: { en: "Vector illustration of an isometric crystal island with a knight and mage", zh: "純程式向量示意：浮空水晶遺跡、劍士與法師" },
    genres: ["strategy", "arcade"],
    tags: ["pixel-art", "tower-defense", "procedural", "single-player"],
    controls: ["keyboard", "mouse", "touch"],
    status: "beta",
    featured: false,
    playTime: "4–6 min",
    added: "2026-09-05",
    updated: "2026-09-05"
  },
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
