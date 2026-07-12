import { PHASES } from './core.js';

const PHASE_LABELS = {
  [PHASES.PLANNING]: '部署階段',
  [PHASES.BATTLE]: '戰鬥階段',
  [PHASES.DEFEAT]: '水晶碎裂'
};

const MOBILE_PANEL_BY_PHASE = {
  [PHASES.PLANNING]: 'deploy',
  [PHASES.BATTLE]: 'status',
  [PHASES.DEFEAT]: 'info'
};

const ICON_BY_FALLBACK_SHAPE = Object.freeze({
  fighter: '⚔',
  barricade: '▥',
  tower: '⌁',
  slime: '芽',
  moth: '翅',
  golem: '岩',
  crystal: '晶',
  bolt: '•'
});

function iconForAsset(asset) {
  return ICON_BY_FALLBACK_SHAPE[asset.placeholder?.shape] ?? ICON_BY_FALLBACK_SHAPE[asset.fallback?.shape] ?? '◇';
}

function materialLabelForAsset(asset) {
  return asset.status === 'ready' ? '真實角色素材' : '臨時素材';
}

export function createToolButtonModel(content, tool) {
  const definition = content.get(tool.contentKind, tool.contentId);
  const asset = content.get('asset', definition.visualAssetId);
  return {
    id: tool.id,
    label: tool.label,
    icon: iconForAsset(asset),
    cost: definition.cost ?? 0,
    meta: `${definition.cost ?? 0}G · ${materialLabelForAsset(asset)}`
  };
}

export class HudController {
  constructor({ bus, session, content }) {
    this.bus = bus;
    this.session = session;
    this.content = content;
    this.logEntries = [];
    this.toastTimer = null;

    this.elements = {
      round: document.querySelector('#round-value'),
      gold: document.querySelector('#gold-value'),
      enemy: document.querySelector('#enemy-value'),
      crystalText: document.querySelector('#crystal-text'),
      crystalFill: document.querySelector('#crystal-fill'),
      phase: document.querySelector('#phase-badge'),
      waveProgress: document.querySelector('#wave-progress'),
      toast: document.querySelector('#toast'),
      unitCount: document.querySelector('#unit-count'),
      buildingCount: document.querySelector('#building-count'),
      spawnCount: document.querySelector('#spawn-count'),
      eventLog: document.querySelector('#event-log'),
      selection: document.querySelector('#selection-detail'),
      startWave: document.querySelector('#start-wave'),
      resetGame: document.querySelector('#reset-game'),
      cancelTool: document.querySelector('#cancel-tool'),
      toolGrid: document.querySelector('#tool-grid'),
      toolButtons: [],
      mobileTabs: [...document.querySelectorAll('[data-mobile-panel-target]')],
      mobileSheetToggle: document.querySelector('#mobile-sheet-toggle'),
      mobileSheetClose: document.querySelector('#mobile-sheet-close'),
      mobileResetGame: document.querySelector('#mobile-reset-game')
    };

    this.mobilePanel = document.documentElement.dataset.mobilePanel || 'deploy';
    this.mobileSheetOpen = document.documentElement.dataset.mobileSheet !== 'closed';
    this.lastPhase = this.session.state.phase;

    this.renderToolButtons();
    this.bindDomEvents();
    this.bindBusEvents();
    this.render(this.session.snapshot());
  }

  renderToolButtons() {
    const fragment = document.createDocumentFragment();
    for (const tool of this.content.all('tool')) {
      const model = createToolButtonModel(this.content, tool);
      const button = document.createElement('button');
      button.className = 'tool-button';
      button.dataset.tool = model.id;
      button.type = 'button';

      const icon = document.createElement('span');
      icon.className = 'tool-icon';
      icon.textContent = model.icon;

      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = model.label;
      const meta = document.createElement('small');
      meta.textContent = model.meta;
      copy.append(title, meta);

      button.append(icon, copy);
      fragment.append(button);
    }

    this.elements.toolGrid.replaceChildren(fragment);
    this.elements.toolButtons = [...this.elements.toolGrid.querySelectorAll('[data-tool]')];
  }

  bindDomEvents() {
    for (const button of this.elements.toolButtons) {
      button.addEventListener('click', () => {
        this.bus.emit('command:select-tool', { toolId: button.dataset.tool });
        this.setMobileSheet(false);
      });
    }

    this.elements.cancelTool.addEventListener('click', () => {
      this.bus.emit('command:cancel-tool');
    });

    this.elements.startWave.addEventListener('click', () => {
      if (this.session.state.phase === PHASES.PLANNING) {
        this.bus.emit('command:start-wave');
      } else if (this.session.state.phase === PHASES.DEFEAT) {
        this.bus.emit('command:reset');
      } else {
        this.setMobilePanel('status');
      }
    });

    this.elements.resetGame.addEventListener('click', () => {
      this.bus.emit('command:reset');
    });

    for (const tab of this.elements.mobileTabs) {
      tab.addEventListener('click', () => {
        this.setMobilePanel(tab.dataset.mobilePanelTarget);
      });
    }

    this.elements.mobileSheetToggle.addEventListener('click', () => {
      const nextOpen = !this.mobileSheetOpen;
      if (nextOpen) {
        this.setMobilePanel(MOBILE_PANEL_BY_PHASE[this.session.state.phase] ?? 'status');
      }
      this.setMobileSheet(nextOpen);
    });

    this.elements.mobileSheetClose.addEventListener('click', () => {
      this.setMobileSheet(false);
    });

    this.elements.mobileResetGame.addEventListener('click', () => {
      this.bus.emit('command:reset');
      this.setMobileSheet(false);
    });
  }

  bindBusEvents() {
    this.bus.on('session:changed', ({ state }) => this.render(state));
    this.bus.on('ui:toast', ({ message, tone }) => this.showToast(message, tone));
    this.bus.on('ui:log', (entry) => this.appendLog(entry));
    this.bus.on('boot:progress', ({ progress }) => {
      this.elements.waveProgress.textContent = `素材載入 ${Math.round(progress * 100)}%`;
    });
    this.bus.on('boot:ready', () => {
      this.elements.waveProgress.textContent = '尚未開始';
    });
    this.bus.on('asset:warning', ({ message }) => {
      this.showToast(message, 'bad');
      this.appendLog({ message, tone: 'bad', at: Date.now() });
    });
  }

  render(state) {
    if (state.phase !== this.lastPhase) {
      this.setMobilePanel(MOBILE_PANEL_BY_PHASE[state.phase] ?? 'status');
      this.setMobileSheet(state.phase === PHASES.PLANNING);
      this.lastPhase = state.phase;
    }

    this.elements.round.textContent = String(state.round);
    this.elements.gold.textContent = String(state.gold);
    this.elements.enemy.textContent = String(state.counts.enemies);
    this.elements.unitCount.textContent = String(state.counts.units);
    this.elements.buildingCount.textContent = String(state.counts.buildings);
    this.elements.spawnCount.textContent = `${state.wave.spawned} / ${state.wave.total}`;

    this.elements.crystalText.textContent = `${state.crystal.hp} / ${state.crystal.maxHp}`;
    const crystalRatio = state.crystal.maxHp > 0 ? state.crystal.hp / state.crystal.maxHp : 0;
    this.elements.crystalFill.style.width = `${Math.max(0, crystalRatio) * 100}%`;

    this.elements.phase.textContent = `第 ${state.round} 回合 · ${PHASE_LABELS[state.phase] ?? state.phase}`;
    this.elements.phase.className = `phase-badge ${state.phase}`;

    if (state.phase === PHASES.BATTLE) {
      this.elements.waveProgress.textContent = `敵 ${state.counts.enemies} · ${state.wave.spawned} / ${state.wave.total}`;
    } else if (state.phase === PHASES.DEFEAT) {
      this.elements.waveProgress.textContent = '請重新開始';
    } else {
      this.elements.waveProgress.textContent = '尚未開始';
    }

    const planning = state.phase === PHASES.PLANNING;
    this.elements.startWave.disabled = false;
    const primaryTitle = this.elements.startWave.querySelector('strong');
    const primaryDetail = this.elements.startWave.querySelector('span');
    if (state.phase === PHASES.BATTLE) {
      primaryTitle.textContent = '查看即時戰況';
      primaryDetail.textContent = '召集指令將在後續遊戲性階段接回';
    } else if (state.phase === PHASES.DEFEAT) {
      primaryTitle.textContent = '重新開始';
      primaryDetail.textContent = '返回第一回合重新部署';
    } else {
      primaryTitle.textContent = '開始下一波';
      primaryDetail.textContent = '部署完成後進入自動戰鬥';
    }

    const mobileToggleLabel = this.elements.mobileSheetToggle.querySelector('strong');
    const mobileToggleIcon = this.elements.mobileSheetToggle.querySelector('span');
    if (planning && state.selectedTool) {
      const tool = this.content.get('tool', state.selectedTool);
      const selectedModel = createToolButtonModel(this.content, tool);
      mobileToggleLabel.textContent = `${selectedModel.label} ${selectedModel.cost}G`;
      mobileToggleIcon.textContent = selectedModel.icon;
    } else {
      mobileToggleLabel.textContent = state.phase === PHASES.PLANNING
        ? '部署'
        : state.phase === PHASES.DEFEAT ? '結果' : '戰況';
      mobileToggleIcon.textContent = state.phase === PHASES.DEFEAT ? '!' : state.phase === PHASES.BATTLE ? '◎' : '✦';
    }

    for (const button of this.elements.toolButtons) {
      const tool = this.content.get('tool', button.dataset.tool);
      const definition = this.content.get(tool.contentKind, tool.contentId);
      button.classList.toggle('active', state.selectedTool === tool.id);
      button.disabled = !planning || state.gold < (definition.cost ?? 0);
    }

    this.renderSelection(state.selectedTool);
  }

  setMobilePanel(panelId) {
    const validPanels = new Set(this.elements.mobileTabs.map((tab) => tab.dataset.mobilePanelTarget));
    if (!validPanels.has(panelId)) return;

    this.mobilePanel = panelId;
    document.documentElement.dataset.mobilePanel = panelId;
    this.setMobileSheet(true);

    for (const tab of this.elements.mobileTabs) {
      const active = tab.dataset.mobilePanelTarget === panelId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    }
  }

  setMobileSheet(open) {
    this.mobileSheetOpen = Boolean(open);
    document.documentElement.dataset.mobileSheet = this.mobileSheetOpen ? 'open' : 'closed';
    this.elements.mobileSheetToggle.setAttribute('aria-expanded', String(this.mobileSheetOpen));
  }

  renderSelection(toolId) {
    if (!toolId) {
      this.elements.selection.textContent = '選擇工具後，點擊有效格子部署。右鍵點擊既有單位可回收一半成本。';
      return;
    }

    const tool = this.content.get('tool', toolId);
    const definition = this.content.get(tool.contentKind, tool.contentId);
    const attackLabel = {
      melee: '近戰',
      projectile: '投射物',
      none: '無攻擊'
    }[definition.attack.type];

    const skills = (definition.skillIds ?? [])
      .map((skillId) => this.content.get('skill', skillId).name)
      .join('、');

    this.elements.selection.textContent = [
      `${definition.name}｜${definition.role ?? ''}`,
      `成本 ${definition.cost ?? 0}G · HP ${definition.stats.maxHp} · ${attackLabel}`,
      skills ? `技能：${skills}` : '',
      definition.description
    ].filter(Boolean).join('\n');
  }

  showToast(message, tone = 'info') {
    clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.className = `toast show ${tone === 'bad' ? 'bad' : tone === 'good' ? 'good' : ''}`;

    this.toastTimer = setTimeout(() => {
      this.elements.toast.className = 'toast';
    }, 2300);
  }

  appendLog(entry) {
    this.logEntries.unshift(entry);
    this.logEntries = this.logEntries.slice(0, 8);
    this.elements.eventLog.replaceChildren();

    for (const item of this.logEntries) {
      const row = document.createElement('div');
      row.className = 'log-entry';
      row.textContent = item.message;
      this.elements.eventLog.appendChild(row);
    }
  }
}
