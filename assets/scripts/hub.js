(() => {
  "use strict";

  const games = Array.isArray(window.TINY_ARCADE_GAMES)
    ? window.TINY_ARCADE_GAMES.slice()
    : [];

  const COPY = {
    en: {
      siteName: "Tiny Arcade",
      siteTagline: "Instant browser games",
      navLibrary: "Game library",
      navGitHub: "GitHub",
      eyebrow: "Browser game hub",
      heroTitleFirst: "Pick a game.",
      heroTitleSecond: "Press play.",
      heroCopy: "A growing collection of small browser games. No installs, no accounts, no loading screen before the loading screen.",
      statGame: "game",
      statGames: "games",
      statInstall: "zero installs",
      statPlay: "instant play",
      featuredLabel: "Featured now",
      featuredPlay: "Play featured game",
      libraryEyebrow: "All games",
      libraryTitle: "Find your next tiny world",
      libraryCopy: "Search by title or tag, then narrow the shelf by genre and controls.",
      searchLabel: "Search games",
      searchPlaceholder: "Search games, genres, or tags…",
      controlLabel: "Controls",
      controlAll: "All controls",
      sortLabel: "Sort",
      sortNewest: "Newest added",
      sortUpdated: "Recently updated",
      sortAZ: "Title A–Z",
      allGenres: "All",
      clear: "Clear filters",
      noResultsTitle: "No games match that combo.",
      noResultsCopy: "Try a shorter search or clear the active filters.",
      play: "Play now",
      source: "Source",
      resultsOne: "1 game",
      resultsMany: "{count} games",
      statusPoc: "POC",
      statusBeta: "Beta",
      statusComplete: "Complete",
      controls: "Controls",
      genres: "Genres",
      updated: "Updated",
      featureInstantTitle: "Open and play",
      featureInstantCopy: "Every game runs directly in a modern browser.",
      featureStaticTitle: "Static by default",
      featureStaticCopy: "No backend, account, install, or build pipeline required.",
      featureOpenTitle: "Readable source",
      featureOpenCopy: "Each game lives in its own folder and stays easy to inspect.",
      footerCopy: "A small-game hub created and curated by Shem.",
      keyboardHint: "Press / to search",
      langButton: "中文",
      genreNames: {
        platformer: "Platformer",
        action: "Action",
        puzzle: "Puzzle",
        arcade: "Arcade",
        casual: "Casual",
        strategy: "Strategy",
        simulation: "Simulation"
      },
      tagNames: {
        "pixel-art": "Pixel art",
        cute: "Cute",
        "single-player": "Single player",
        procedural: "Procedural",
        relaxing: "Relaxing",
        "tower-defense": "Tower defense",
        "auto-battler": "Auto battler"
      },
      controlNames: {
        keyboard: "Keyboard",
        touch: "Touch",
        mouse: "Mouse",
        gamepad: "Gamepad"
      }
    },
    zh: {
      siteName: "Tiny Arcade",
      siteTagline: "即開即玩的瀏覽器遊戲",
      navLibrary: "遊戲庫",
      navGitHub: "GitHub",
      eyebrow: "瀏覽器遊戲中心",
      heroTitleFirst: "選一款，",
      heroTitleSecond: "直接開玩。",
      heroCopy: "持續成長的單頁小遊戲收藏。不需安裝、不需帳號，也沒有進入 loading 畫面前的 loading 畫面。",
      statGame: "款遊戲",
      statGames: "款遊戲",
      statInstall: "零安裝",
      statPlay: "即開即玩",
      featuredLabel: "本期主打",
      featuredPlay: "玩主打遊戲",
      libraryEyebrow: "全部遊戲",
      libraryTitle: "找到下一個迷你世界",
      libraryCopy: "依名稱或標籤搜尋，再用類型與操作方式縮小範圍。",
      searchLabel: "搜尋遊戲",
      searchPlaceholder: "搜尋遊戲、類型或標籤…",
      controlLabel: "操作方式",
      controlAll: "全部操作",
      sortLabel: "排序",
      sortNewest: "最新加入",
      sortUpdated: "最近更新",
      sortAZ: "名稱 A–Z",
      allGenres: "全部",
      clear: "清除篩選",
      noResultsTitle: "找不到符合條件的遊戲。",
      noResultsCopy: "試著縮短關鍵字，或清除目前的篩選條件。",
      play: "立即遊玩",
      source: "原始碼",
      resultsOne: "1 款遊戲",
      resultsMany: "{count} 款遊戲",
      statusPoc: "POC",
      statusBeta: "Beta",
      statusComplete: "完成",
      controls: "操作",
      genres: "類型",
      updated: "更新",
      featureInstantTitle: "打開就能玩",
      featureInstantCopy: "每款遊戲都能直接在現代瀏覽器執行。",
      featureStaticTitle: "靜態優先",
      featureStaticCopy: "不需要後端、帳號、安裝或建置流程。",
      featureOpenTitle: "原始碼清楚",
      featureOpenCopy: "每款遊戲都有獨立目錄，容易閱讀與修改。",
      footerCopy: "由 Shem 建立與策展的小型遊戲中心。",
      keyboardHint: "按 / 開始搜尋",
      langButton: "EN",
      genreNames: {
        platformer: "平台跳躍",
        action: "動作",
        puzzle: "益智",
        arcade: "街機",
        casual: "休閒",
        strategy: "策略",
        simulation: "模擬"
      },
      tagNames: {
        "pixel-art": "像素美術",
        cute: "可愛",
        "single-player": "單人",
        procedural: "程序生成",
        relaxing: "療癒",
        "tower-defense": "守塔",
        "auto-battler": "自動戰棋"
      },
      controlNames: {
        keyboard: "鍵盤",
        touch: "觸控",
        mouse: "滑鼠",
        gamepad: "手把"
      }
    }
  };

  const state = {
    lang: "en",
    query: "",
    genre: "all",
    control: "all",
    sort: "newest"
  };

  const els = {
    html: document.documentElement,
    gameGrid: document.querySelector("#game-grid"),
    genreFilters: document.querySelector("#genre-filters"),
    searchInput: document.querySelector("#game-search"),
    controlFilter: document.querySelector("#control-filter"),
    sortSelect: document.querySelector("#sort-games"),
    resultCount: document.querySelector("#result-count"),
    clearButton: document.querySelector("#clear-filters"),
    emptyState: document.querySelector("#empty-state"),
    featured: document.querySelector("#featured-game"),
    gameCount: document.querySelector("#game-count"),
    langToggle: document.querySelector("#lang-toggle")
  };

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in embedded or privacy-restricted contexts.
    }
  }

  function t(key) {
    return COPY[state.lang][key] ?? COPY.en[key] ?? key;
  }

  function labelFrom(group, value) {
    return COPY[state.lang][group]?.[value] ?? value.replaceAll("-", " ");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .trim();
  }

  function getLocalized(value) {
    if (typeof value === "string") return value;
    return value?.[state.lang] || value?.en || "";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00Z`);
    return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-TW" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    const savedLang = storageGet("tinyArcadeLang");
    const browserLang = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

    state.lang = params.get("lang") === "zh" || params.get("lang") === "en"
      ? params.get("lang")
      : (savedLang === "zh" || savedLang === "en" ? savedLang : browserLang);
    state.query = params.get("q") || "";
    state.genre = params.get("genre") || "all";
    state.control = params.get("control") || "all";
    state.sort = ["newest", "updated", "az"].includes(params.get("sort"))
      ? params.get("sort")
      : "newest";
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.genre !== "all") params.set("genre", state.genre);
    if (state.control !== "all") params.set("control", state.control);
    if (state.sort !== "newest") params.set("sort", state.sort);
    if (state.lang !== "en") params.set("lang", state.lang);

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    try {
      history.replaceState(null, "", nextUrl);
    } catch {
      // Embedded previews can expose an opaque URL where history is read-only.
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function getGenres() {
    return [...new Set(games.flatMap((game) => game.genres || []))].sort((a, b) =>
      labelFrom("genreNames", a).localeCompare(labelFrom("genreNames", b), state.lang)
    );
  }

  function getControls() {
    return [...new Set(games.flatMap((game) => game.controls || []))].sort((a, b) =>
      labelFrom("controlNames", a).localeCompare(labelFrom("controlNames", b), state.lang)
    );
  }

  function searchableText(game) {
    const localizedLabels = ["en", "zh"].flatMap((lang) => {
      const copy = COPY[lang];
      return [
        ...(game.genres || []).map((value) => copy.genreNames?.[value]),
        ...(game.tags || []).map((value) => copy.tagNames?.[value]),
        ...(game.controls || []).map((value) => copy.controlNames?.[value])
      ];
    });
    const pieces = [
      game.id,
      game.title?.en,
      game.title?.zh,
      game.description?.en,
      game.description?.zh,
      ...(game.genres || []),
      ...(game.tags || []),
      ...(game.controls || []),
      ...localizedLabels
    ];
    return normalize(pieces.filter(Boolean).join(" "));
  }

  function filteredGames() {
    const query = normalize(state.query);
    const filtered = games.filter((game) => {
      const matchesQuery = !query || searchableText(game).includes(query);
      const matchesGenre = state.genre === "all" || game.genres?.includes(state.genre);
      const matchesControl = state.control === "all" || game.controls?.includes(state.control);
      return matchesQuery && matchesGenre && matchesControl;
    });

    return filtered.sort((a, b) => {
      if (state.sort === "az") {
        return getLocalized(a.title).localeCompare(getLocalized(b.title), state.lang);
      }
      const field = state.sort === "updated" ? "updated" : "added";
      return String(b[field] || "").localeCompare(String(a[field] || ""));
    });
  }

  function renderGenres() {
    const fragment = document.createDocumentFragment();
    const availableGenres = getGenres();
    if (state.genre !== "all" && !availableGenres.includes(state.genre)) state.genre = "all";
    const genres = ["all", ...availableGenres];

    genres.forEach((genre) => {
      const count = genre === "all"
        ? games.length
        : games.filter((game) => game.genres?.includes(genre)).length;
      const button = createElement("button", "filter-chip");
      button.type = "button";
      button.dataset.genre = genre;
      button.setAttribute("aria-pressed", String(state.genre === genre));
      button.append(
        document.createTextNode(genre === "all" ? t("allGenres") : labelFrom("genreNames", genre)),
        createElement("span", "filter-count", String(count))
      );
      button.addEventListener("click", () => {
        state.genre = genre;
        render();
        syncUrl();
      });
      fragment.append(button);
    });

    els.genreFilters.replaceChildren(fragment);
  }

  function renderControlOptions() {
    const current = state.control;
    const options = [{ value: "all", label: t("controlAll") }].concat(
      getControls().map((value) => ({ value, label: labelFrom("controlNames", value) }))
    );

    els.controlFilter.replaceChildren(...options.map(({ value, label }) => {
      const option = createElement("option", "", label);
      option.value = value;
      return option;
    }));

    state.control = options.some((option) => option.value === current) ? current : "all";
    els.controlFilter.value = state.control;
  }

  function statusLabel(status) {
    const key = `status${String(status || "poc").replace(/^./, (char) => char.toUpperCase())}`;
    return t(key);
  }

  function makeGameCard(game) {
    const article = createElement("article", "game-card");
    article.dataset.gameId = game.id;

    const mediaLink = createElement("a", "game-media");
    mediaLink.href = game.path;
    mediaLink.setAttribute("aria-label", `${t("play")}: ${getLocalized(game.title)}`);

    const image = document.createElement("img");
    image.src = game.preview;
    image.alt = getLocalized(game.previewAlt);
    image.loading = "lazy";
    image.decoding = "async";

    const status = createElement("span", `status status-${game.status || "poc"}`, statusLabel(game.status));
    mediaLink.append(image, status);

    const body = createElement("div", "game-card-body");
    const headingRow = createElement("div", "game-heading-row");
    const titleWrap = createElement("div");
    const title = createElement("h3");
    const titleLink = createElement("a", "game-title", getLocalized(game.title));
    titleLink.href = game.path;
    title.append(titleLink);
    const duration = createElement("span", "play-time", game.playTime || "");
    titleWrap.append(title);
    headingRow.append(titleWrap, duration);

    const description = createElement("p", "game-description", getLocalized(game.description));

    const meta = createElement("div", "game-meta");
    (game.genres || []).forEach((genre) => {
      meta.append(createElement("span", "meta-pill", labelFrom("genreNames", genre)));
    });
    (game.controls || []).forEach((control) => {
      meta.append(createElement("span", "meta-pill meta-control", labelFrom("controlNames", control)));
    });

    const tagList = createElement("ul", "tag-list");
    tagList.setAttribute("aria-label", "Tags");
    (game.tags || []).forEach((tag) => {
      const item = createElement("li", "", `#${labelFrom("tagNames", tag)}`);
      tagList.append(item);
    });

    const footer = createElement("div", "game-card-footer");
    const date = createElement("span", "updated-date", `${t("updated")} ${formatDate(game.updated)}`);
    const actions = createElement("div", "game-actions");

    const source = createElement("a", "secondary-action", t("source"));
    source.href = game.source;
    source.target = "_blank";
    source.rel = "noreferrer";

    const play = createElement("a", "primary-action");
    play.href = game.path;
    play.append(createElement("span", "", "▶"), document.createTextNode(t("play")));

    actions.append(source, play);
    footer.append(date, actions);
    body.append(headingRow, description, meta, tagList, footer);
    article.append(mediaLink, body);
    return article;
  }

  function renderGames() {
    const visibleGames = filteredGames();
    const fragment = document.createDocumentFragment();
    visibleGames.forEach((game) => fragment.append(makeGameCard(game)));
    els.gameGrid.replaceChildren(fragment);

    const countText = visibleGames.length === 1
      ? t("resultsOne")
      : t("resultsMany").replace("{count}", String(visibleGames.length));
    els.resultCount.textContent = countText;
    els.emptyState.hidden = visibleGames.length !== 0;
    els.gameGrid.hidden = visibleGames.length === 0;

    const hasFilters = Boolean(state.query) || state.genre !== "all" || state.control !== "all" || state.sort !== "newest";
    els.clearButton.hidden = !hasFilters;
  }

  function renderFeatured() {
    const game = games.find((item) => item.featured) || games[0];
    if (!game) {
      els.featured.hidden = true;
      return;
    }

    els.featured.hidden = false;
    const image = els.featured.querySelector("[data-featured-image]");
    if (image) {
      image.src = game.preview;
      image.alt = getLocalized(game.previewAlt);
    }
    document.querySelectorAll("[data-featured-preview]").forEach((preview) => {
      preview.src = game.preview;
    });
    els.featured.querySelector("[data-featured-title]").textContent = getLocalized(game.title);
    els.featured.querySelector("[data-featured-description]").textContent = getLocalized(game.description);
    els.featured.querySelector("[data-featured-link]").href = game.path;
    els.featured.querySelector("[data-featured-link]").setAttribute("aria-label", `${t("featuredPlay")}: ${getLocalized(game.title)}`);
    els.featured.querySelector("[data-featured-play]").textContent = t("featuredPlay");
  }

  function applyTranslations() {
    els.html.lang = state.lang === "zh" ? "zh-Hant" : "en";
    document.title = `${t("siteName")} — ${t("siteTagline")}`;
    document.querySelector('meta[name="description"]').content = t("heroCopy");

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAria));
    });

    els.langToggle.textContent = t("langButton");
    els.langToggle.setAttribute("aria-label", state.lang === "en" ? "切換成中文" : "Switch to English");
    els.gameCount.textContent = String(games.length);
    document.querySelector("[data-game-count-label]").textContent = games.length === 1 ? t("statGame") : t("statGames");

    const sortValue = state.sort;
    els.sortSelect.querySelector('[value="newest"]').textContent = t("sortNewest");
    els.sortSelect.querySelector('[value="updated"]').textContent = t("sortUpdated");
    els.sortSelect.querySelector('[value="az"]').textContent = t("sortAZ");
    els.sortSelect.value = sortValue;
  }

  function render() {
    applyTranslations();
    renderControlOptions();
    renderGenres();
    renderFeatured();
    renderGames();
    els.searchInput.value = state.query;
    els.sortSelect.value = state.sort;
  }

  function clearFilters() {
    state.query = "";
    state.genre = "all";
    state.control = "all";
    state.sort = "newest";
    render();
    syncUrl();
    els.searchInput.focus();
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderGames();
      syncUrl();
    });

    els.controlFilter.addEventListener("change", (event) => {
      state.control = event.target.value;
      renderGames();
      syncUrl();
    });

    els.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      renderGames();
      syncUrl();
    });

    els.clearButton.addEventListener("click", clearFilters);
    document.querySelector("#empty-clear").addEventListener("click", clearFilters);

    els.langToggle.addEventListener("click", () => {
      state.lang = state.lang === "en" ? "zh" : "en";
      storageSet("tinyArcadeLang", state.lang);
      render();
      syncUrl();
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        els.searchInput.focus();
      }
      if (event.key === "Escape" && document.activeElement === els.searchInput && els.searchInput.value) {
        state.query = "";
        renderGames();
        syncUrl();
        els.searchInput.value = "";
      }
    });
  }

  readUrlState();
  bindEvents();
  render();
})();
