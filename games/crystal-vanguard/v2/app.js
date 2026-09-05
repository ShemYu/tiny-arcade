/* DOM controls and audio. The simulation never reads browser state. */
(() => {
  'use strict';
  const G=window.CV,A=window.CVArt,$=id=>document.getElementById(id),canvas=$('battlefield');
  const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,String(v));}catch{/* Private mode still gets a full game. */}}};
  const COPY={
    zh:{crystal:'琉璃之心',gold:'金幣',wave:'波次',chapter:'THE LAST LIGHT OF ASTER',map:'星霧遺跡',mapNote:'守住這束光，直到天亮。',mapInstructions:'選取隊員，再點石板部署 · 點角色可檢視',guild:'公會招募',recruitHint:'每位 6 金',army:'遠征隊',merge:'三合一',bench:'撤回',sell:'遣返',legacy:'原版',footnote:'一座遺跡，八個方向，一束不能熄滅的光。',
      names:{blade:'劍士',ranger:'弓手',mage:'法師',guard:'守衛',slime:'史萊姆',goblin:'哥布林',wisp:'幽火',golem:'石像兵',boss:'遺跡看守者'},
      roles:{blade:'近戰橫掃',ranger:'遠程速射',mage:'範圍爆破',guard:'護盾牽制'},
      details:{blade:'主動迎擊，斬擊同時傷害鄰近敵人。',ranger:'射程最遠、射速快，適合站在隊友後方。',mage:'火球沿弧線飛行，落地造成範圍傷害。',guard:'吸引附近敵人；周圍隊友受到的傷害降低 25%。'},
      prep:'整備中',battle:'交戰中',paused:'已暫停',won:'守住了',lost:'失守了',incoming:'下波來襲',remaining:'戰場 / 尚未出現',directions:['北','東北','東','東南','南','西南','西','西北'],allDirections:'八方來襲',
      field:'出戰',reserve:'備援',rosterHint:'綠點：出戰 · 橙點：備援',none:'選擇一位隊員',noneInfo:'招募後，點棋盤上的空格即可部署。',maxRank:'最高階',revive:'倒下的隊員，下波復原',mergeHint:'3 位同職同階 → 升階',repair:'修復 +25 · 8金',next:'迎戰第 {n} 波',pulse:'晶爆 · F',spent:'本波晶爆已用',restart:'再守一次',zoom:'放大後可拖曳',zoomed:'拖曳移動視角',
      welcome:'四位先遣隊已就位。招募隊員，迎接第一波！',bought:'{name} 加入隊伍！點石板部署。',placed:'部署完成。',merged:'升階！裝備與戰力一起成長。',cleared:'第 {n} 波守住了！+{g} 金，隊伍已復原。',waveStart:'第 {n} 波 · 守住水晶！',pulseCast:'琉璃晶爆！',enrage:'看守者甦醒——攻勢加劇！',repaired:'水晶恢復 25 點耐久。',returned:'已回到備援。',sold:'隊員已遣返，返還一半招募成本。',
      errors:{planningOnly:'戰鬥中不能調整隊伍。',noGold:'金幣不足。',benchFull:'備援已滿，先部署或合成。',fieldFull:'最多 8 位出戰，先合成或撤回。',invalidTile:'請選擇水晶周圍的石板，中央祭壇不能部署。',needThree:'需要 3 位同職業、同星階的隊員。',fullHealth:'水晶已經是滿耐久。',needArmy:'至少部署 1 位隊員才能開始。',pulseSpent:'每波只有一次晶爆。',battleOnly:'晶爆只能在戰鬥中使用。',invalid:'這個操作目前無法執行。'},
      pauseTitle:'火光會等你。',pauseNote:'戰場已暫停。離開視窗時也會自動暫停，不會偷走你的水晶。',continue:'繼續遠征',abandon:'重新開始',abandonTitle:'重新出發？',abandonNote:'這局的隊伍與進度會重置；已記錄的最佳分數不受影響。',cancel:'保留這一局',codexTitle:'守住最後一束光',codexKicker:'FIELD NOTES / 遠征手冊',
      rules:[['招募 → 部署','招募的隊員在備援。選取他，再點棋盤石板；最多 8 位出戰。空格可重新佈陣。'],['三位合成一位','3 位同職、同星階合成更強的一位，最高三星。優先消耗備援，保留選中隊員的位置。'],['看方向，再開戰','傳送門與右上角會預告來襲方向。倒下的隊友在下波免費復原。'],['留一手晶爆','每波一次，傷害並緩速水晶周圍的敵人。整備時可花 8 金修復 25 點水晶耐久。']],
      keyboard:'鍵盤：1–4 招募 · 方向鍵選格（先點棋盤）· Enter 部署 · Space 開戰 · F 晶爆 · G 合成 · B 撤回 · R 修復 · P 暫停 · M 靜音',artNote:'所有角色、場景與音效由程式繪製／合成，沒有載入圖像、字型或音檔。',winTitle:'天亮了，水晶還在。',loseTitle:'這束光，還能再點亮。',winNote:'八個方向的守望，換來了一個新的早晨。',loseNote:'調整防線、補上遠程火力，再試一次。',kills:'擊退',integrity:'水晶耐久',score:'本局分數',best:'最佳',inspect:'看看戰場',record:'新的最佳紀錄',pauseLabel:'暫停遊戲',mute:'關閉音效',unmute:'開啟音效',codex:'玩法與角色圖鑑',speed:'戰鬥速度',close:'關閉',battlefield:'戰場。方向鍵移動選格；Enter 部署選中隊員。1 至 4 招募，空白鍵開戰，P 暫停。'},
    en:{crystal:'CRYSTAL HEART',gold:'GOLD',wave:'WAVE',chapter:'THE LAST LIGHT OF ASTER',map:'Aster Ruins',mapNote:'Keep the light alive until dawn.',mapInstructions:'Select a hero, then tap a tile · Tap a hero to inspect',guild:'Guild contracts',recruitHint:'6 gold each',army:'Your expedition',merge:'Merge',bench:'Bench',sell:'Dismiss',legacy:'Original',footnote:'Eight roads. One ruin. A light worth keeping.',
      names:{blade:'Blade',ranger:'Ranger',mage:'Mage',guard:'Guard',slime:'Slime',goblin:'Goblin',wisp:'Wisp',golem:'Golem',boss:'Ruin Warden'},
      roles:{blade:'Melee cleave',ranger:'Fast shots',mage:'Area blast',guard:'Protect & hold'},
      details:{blade:'Intercepts nearby threats. Each slash cleaves clustered enemies.',ranger:'Long reach and fast arrows. Best behind a sturdy frontline.',mage:'Arcing fireballs explode on impact, damaging groups.',guard:'Draws nearby enemies. Allies close by take 25% less damage.'},
      prep:'PREPARE',battle:'BATTLE',paused:'PAUSED',won:'VICTORY',lost:'DEFEAT',incoming:'NEXT APPROACH',remaining:'ON FIELD / TO COME',directions:['N','NE','E','SE','S','SW','W','NW'],allDirections:'ALL EIGHT ROADS',
      field:'field',reserve:'reserve',rosterHint:'Green: deployed · Amber: reserve',none:'Select a hero',noneInfo:'Recruit a hero, then tap an empty tile to deploy.',maxRank:'Max rank',revive:'Fallen heroes return next wave',mergeHint:'3 matching heroes → rank up',repair:'Heal +25 · 8g',next:'BEGIN WAVE {n}',pulse:'CRYSTAL NOVA · F',spent:'NOVA USED THIS WAVE',restart:'ONE MORE DAWN',zoom:'Zoom, then drag to pan',zoomed:'Drag to pan',
      welcome:'Four scouts are ready. Recruit your party and meet the first wave!',bought:'{name} joined! Tap a tile to deploy.',placed:'Position secured.',merged:'Rank up! New armor, stronger resolve.',cleared:'Wave {n} held! +{g} gold. Your heroes are restored.',waveStart:'Wave {n} · Protect the crystal!',pulseCast:'Crystal nova!',enrage:'The Warden awakens — its assault intensifies!',repaired:'Crystal restored by 25.',returned:'Hero moved to reserve.',sold:'Hero dismissed; half the recruitment cost returned.',
      errors:{planningOnly:'Adjust your party between waves.',noGold:'Not enough gold.',benchFull:'Reserve is full. Deploy or merge first.',fieldFull:'Eight deployed heroes maximum. Merge or bench first.',invalidTile:'Choose a stone tile outside the central altar.',needThree:'You need 3 heroes of the same class and rank.',fullHealth:'The crystal is already at full health.',needArmy:'Deploy at least one hero first.',pulseSpent:'One nova per wave.',battleOnly:'Nova is only available during battle.',invalid:'That action is not available.'},
      pauseTitle:'The light can wait.',pauseNote:'Your battlefield is paused. Switching tabs pauses automatically, too.',continue:'CONTINUE EXPEDITION',abandon:'Start over',abandonTitle:'A fresh expedition?',abandonNote:'This party and run will be reset. Your recorded best score stays.',cancel:'Keep this run',codexTitle:'Keep the last light',codexKicker:'FIELD NOTES / EXPEDITION GUIDE',
      rules:[['Recruit → deploy','New heroes join your reserve. Select one, then tap a stone tile. Deploy up to 8; reposition between waves.'],['Three become one','Merge 3 matching heroes of the same rank, up to 3 stars. Reserve duplicates are consumed first; the selected position is kept.'],['Read the roads','Portals and the forecast reveal the next approach. Fallen heroes recover for free between waves.'],['Keep a nova in reserve','Once per wave, damage and slow enemies near the crystal. Between waves, spend 8 gold to repair 25 crystal health.']],
      keyboard:'Keyboard: 1–4 recruit · arrows select a tile (focus the board first) · Enter deploy · Space start wave · F nova · G merge · B bench · R repair · P pause · M mute',artNote:'All characters, scenery and sound are drawn or synthesized in code. No image, font or audio downloads.',winTitle:'Dawn. The crystal still shines.',loseTitle:'A light worth rekindling.',winNote:'Eight roads held. One more morning earned.',loseNote:'Shift your frontline, bring ranged support, and try again.',kills:'DEFEATED',integrity:'CRYSTAL',score:'RUN SCORE',best:'BEST',inspect:'View battlefield',record:'NEW PERSONAL BEST',pauseLabel:'Pause game',mute:'Mute sound',unmute:'Enable sound',codex:'How to play and character codex',speed:'Battle speed',close:'Close',battlefield:'Battlefield. Arrow keys move the tile cursor; Enter deploys the selected hero. Press 1 to 4 to recruit, Space to start a wave, and P to pause.'}
  };
  const params=new URLSearchParams(location.search);let lang=params.get('lang')||store.get('tinyArcadeLang')||(navigator.language.startsWith('zh')?'zh':'en');if(!COPY[lang])lang='en';
  const t=(key)=>COPY[lang][key],fmt=(str,values)=>str.replace(/\{(\w+)\}/g,(_,k)=>values[k]??'');
  const name=k=>t('names')[k]||k,keys=Object.keys(G.JOBS);
  let state=G.create(seed()),speed=1,muted=store.get('cv2Muted')==='1',best=Math.max(0,Math.min(999999,Number(store.get('cv2Best'))||0));
  let last=performance.now(),uiClock=0,lastUI=-1,rosterKey='',modalType='',modalResume=false,toastEnd=0,pointer=null;
  const ui={lang,selected:1,hover:null,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  const renderer=new CVWorld.Renderer(canvas);new ResizeObserver(()=>renderer.resize()).observe(canvas);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',e=>ui.reduced=e.matches);
  function seed(){try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Date.now()>>>0;}}
  const audio={ctx:null,bus:null,last:{},voices:0,
    unlock(){if(muted)return;try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.bus=this.ctx.createGain();this.bus.gain.value=.08;this.bus.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{/* Sound is optional. */}},
    tone(f,d=.12,type='sine',delay=0,vol=.4){if(muted||!this.ctx||this.ctx.state!=='running'||this.voices>24)return;try{const o=this.ctx.createOscillator(),g=this.ctx.createGain(),a=this.ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(f,a);g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(vol,a+.006);g.gain.exponentialRampToValueAtTime(.001,a+d);o.connect(g);g.connect(this.bus);o.start(a);o.stop(a+d+.01);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};}catch{}},
    play(k){const n=this.ctx?.currentTime||0;if((this.last[k]??-1)+.07>n)return;this.last[k]=n;if(k==='blade')this.tone(180,.07,'triangle',0,.25);else if(k==='ranger')this.tone(690,.045,'triangle',0,.13);else if(k==='mage')this.tone(260,.14,'sine',0,.3);else if(k==='guard')this.tone(120,.08,'triangle',0,.28);else if(k==='hit')this.tone(77,.2,'triangle',0,.55);else if(k==='kill')this.tone(580,.055,'sine',0,.12);else if(k==='deploy'||k==='recruit')this.tone(k==='deploy'?440:660,.13,'sine');else if(k==='merge'||k==='clear'||k==='win')[440,554,659,880].forEach((f,i)=>this.tone(f,.35,'sine',i*.09,.3));else if(k==='lose')[330,277,220].forEach((f,i)=>this.tone(f,.3,'triangle',i*.16,.3));else if(k==='pulse'){this.tone(110,.5,'triangle',0,.6);this.tone(880,.65,'sine',.08,.25);}}
  };
  function txt(id,value){const e=$(id),v=String(value);if(e.textContent!==v)e.textContent=v;}
  function toast(message,seconds=3){txt('announcement',message);$('announcement').classList.add('on');toastEnd=uiClock+seconds;}
  function result(r,message){if(!r.ok)toast(t('errors')[r.reason]||t('errors').invalid);else if(message)toast(message);updateUI(true);return r.ok;}
  function doRecruit(kind){audio.unlock();const r=G.recruit(state,kind);if(r.ok){ui.selected=r.id;toast(fmt(t('bought'),{name:name(kind)}));}else result(r);updateUI(true);if(r.ok){const el=$('roster').querySelector(`[data-unit="${r.id}"]`);if(el)$('roster').scrollTop=Math.max(0,el.offsetTop-$('roster').offsetTop-55);}}
  function doMerge(){audio.unlock();result(G.merge(state,ui.selected),t('merged'));}
  function doBench(){result(G.bench(state,ui.selected),t('returned'));}
  function doSell(){const id=ui.selected;if(result(G.sell(state,id),t('sold'))){ui.selected=state.units[0]?.id||null;updateUI(true);}}
  function doRepair(){audio.unlock();result(G.repair(state),t('repaired'));}
  function doAction(){audio.unlock();if(state.phase==='prep')result(G.beginWave(state));else if(state.phase==='battle')result(G.pulse(state));else if(['won','lost'].includes(state.phase))newRun();}
  function newRun(){modalResume=false;if($('modal').open)$('modal').close();state=G.create(seed());ui.selected=1;ui.hover=null;renderer.effects=[];renderer.shake=0;rosterKey='';last=performance.now();updateUI(true);toast(t('welcome'),5);}
  function buildShop(){
    $('recruits').replaceChildren();for(const kind of keys){const b=document.createElement('button');b.className='recruit';b.dataset.recruit=kind;b.innerHTML=`<canvas width="64" height="80" aria-hidden="true"></canvas><span class="recruit-info"><strong></strong><small></small><span class="cost">6</span></span>`;b.querySelector('strong').textContent=name(kind);b.querySelector('small').textContent=t('roles')[kind];b.setAttribute('aria-label',`${name(kind)} · 6 ${t('gold')} · ${t('details')[kind]}`);b.title=t('details')[kind];b.addEventListener('click',()=>doRecruit(kind));$('recruits').append(b);A.portrait(b.querySelector('canvas'),kind);}
  }
  function buildRoster(){
    const sig=state.units.map(u=>`${u.id}:${u.rank}:${!!u.tile}:${u.down}`).join('|')+ui.selected+lang;
    if(sig===rosterKey)return;rosterKey=sig;
    const scroll=$('roster').scrollTop;$('roster').replaceChildren();
    for(const u of state.units){const b=document.createElement('button');b.className=`roster-unit${u.id===ui.selected?' selected':''}${u.tile?'':' benched'}${u.down?' down':''}${G.mergeable(state,u.id)?' merge-ready':''}`;b.dataset.unit=u.id;b.setAttribute('aria-pressed',String(u.id===ui.selected));b.setAttribute('aria-label',`${name(u.kind)} ${'★'.repeat(u.rank)} · ${u.tile?t('field'):t('reserve')}`);b.title=`${name(u.kind)} ${'★'.repeat(u.rank)} · ${u.tile?`${u.tile.x},${u.tile.y}`:t('reserve')}`;b.innerHTML='<canvas width="48" height="64" aria-hidden="true"></canvas><span class="position-dot"></span><span class="rank"></span>';b.querySelector('.rank').textContent='★'.repeat(u.rank);b.addEventListener('click',()=>{ui.selected=u.id;updateUI(true);});$('roster').append(b);A.portrait(b.querySelector('canvas'),u.kind,u.rank);}
    $('roster').scrollTop=scroll;
  }
  function updateUI(force=false){
    if(!force&&uiClock-lastUI<.1)return;lastUI=uiClock;
    const prep=state.phase==='prep',battle=state.phase==='battle',field=state.units.filter(u=>u.tile).length,reserve=state.units.length-field;
    txt('health',state.crystal);$('health-bar').style.width=state.crystal+'%';$('health-bar').style.background=state.crystal<30?'#db929d':'var(--mint)';txt('gold',state.gold);txt('wave',String(Math.min(8,prep?state.wave+1:Math.max(1,state.wave))).padStart(2,'0'));txt('phase',t(state.phase));$('phase').classList.toggle('battle',battle);
    const w=G.WAVES[Math.min(7,battle?state.wave-1:state.wave)];txt('forecast-label',battle?t('remaining'):t('incoming'));txt('forecast',battle?`${state.enemies.length} / ${state.queue.length}`:w.lanes.length===8?t('allDirections'):w.lanes.map(i=>t('directions')[i]).join(' · '));txt('composition',Array.from(new Set(w.kinds.concat(w.boss?['boss']:[]))).map(name).join(' / '));
    txt('army-count',`${field}/${G.CAP} ${t('field')}`);txt('bench-note',`${t('rosterHint')} · ${reserve}/${G.BENCH}`);
    for(const b of $('recruits').children)b.disabled=!prep||state.gold<G.COST||reserve>=G.BENCH;
    buildRoster();const u=state.units.find(v=>v.id===ui.selected);
    if(u){const d=G.stats(u.kind,u.rank);txt('selected-name',`${name(u.kind)} ${'★'.repeat(u.rank)}`);txt('selected-stats',`ATK ${d.damage} · HP ${Math.ceil(u.hp)}/${u.maxHp}`);txt('selected-copy',t('details')[u.kind]);const n=state.units.filter(v=>v.kind===u.kind&&v.rank===u.rank).length;txt('merge',u.rank===3?t('maxRank'):`${t('merge')} ${Math.min(3,n)}/3`);}
    else{txt('selected-name',t('none'));txt('selected-stats','');txt('selected-copy',t('noneInfo'));txt('merge',t('merge'));}
    $('merge').disabled=!prep||!u||!G.mergeable(state,u.id);$('bench').disabled=!prep||!u?.tile||reserve>=G.BENCH;$('sell').disabled=!prep||!u;
    txt('phase-hint',battle?t('revive'):t('mergeHint'));txt('repair',t('repair'));$('repair').disabled=!prep||state.gold<8||state.crystal>=100;
    txt('action-label',prep?fmt(t('next'),{n:state.wave+1}):battle?t(state.pulseReady?'pulse':'spent'):t('restart'));
    $('action').classList.toggle('pulse',battle);$('action').disabled=state.phase==='paused'||(prep&&field===0)||(battle&&!state.pulseReady);
    txt('zoom-tip',renderer.zoom>1?t('zoomed'):t('zoom'));$('zoom').setAttribute('aria-pressed',String(renderer.zoom>1));
    $('sound').setAttribute('aria-pressed',String(muted));$('sound').setAttribute('aria-label',t(muted?'unmute':'mute'));$('pause').disabled=['won','lost'].includes(state.phase);
  }
  function localize(){ui.lang=lang;document.documentElement.lang=lang==='zh'?'zh-Hant':'en';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));txt('language',lang==='zh'?'EN':'中');$('language').setAttribute('aria-label',lang==='zh'?'Switch to English':'切換繁體中文');$('pause').setAttribute('aria-label',t('pauseLabel'));$('codex').setAttribute('aria-label',t('codex'));$('speed').setAttribute('aria-label',t('speed'));$('modal-close').setAttribute('aria-label',t('close'));canvas.setAttribute('aria-label',t('battlefield'));buildShop();rosterKey='';updateUI(true);}
  function modalButton(label,fn,primary=false){const b=document.createElement('button');b.textContent=label;b.className=primary?'primary':'secondary';b.addEventListener('click',fn);$('modal-actions').append(b);return b;}
  function openModal(type){
    if($('modal').open)return;modalType=type;modalResume=G.pause(state);if(modalResume&&audio.ctx)audio.ctx.suspend().catch(()=>{});$('modal-content').replaceChildren();$('modal-actions').replaceChildren();
    const content=$('modal-content');txt('modal-kicker',type==='codex'?t('codexKicker'):type==='end'?'EXPEDITION / FIRST LIGHT':'CRYSTAL VANGUARD II');
    if(type==='codex'){
      txt('modal-title',t('codexTitle'));const grid=document.createElement('div');grid.className='codex-grid';
      for(const kind of keys){const e=document.createElement('article');e.className='codex-entry';e.innerHTML='<canvas width="72" height="96" aria-hidden="true"></canvas><div><h3></h3><p></p></div>';e.querySelector('h3').textContent=name(kind);e.querySelector('p').textContent=t('details')[kind];grid.append(e);A.portrait(e.querySelector('canvas'),kind,2);}content.append(grid);
      const rules=document.createElement('div');rules.className='rules';for(const[title,body]of t('rules')){const p=document.createElement('p'),b=document.createElement('b');b.textContent=title+' — ';p.append(b,document.createTextNode(body));rules.append(p);}content.append(rules);
      const controls=document.createElement('p');controls.className='controls-note';controls.textContent=t('keyboard');content.append(controls);const note=document.createElement('p');note.className='controls-note';note.textContent=t('artNote');content.append(note);modalButton(t('continue'),()=>$('modal').close(),true);
    }else if(type==='end'){
      const won=state.phase==='won';txt('modal-title',t(won?'winTitle':'loseTitle'));
      const art=document.createElement('div');art.className='result-art';for(const kind of keys){const c=document.createElement('canvas');c.width=72;c.height=96;art.append(c);A.portrait(c,kind,Math.max(1,...state.units.filter(u=>u.kind===kind).map(u=>u.rank)));}content.append(art);
      const results=document.createElement('div');results.className='results';for(const [v,k]of [[state.kills,'kills'],[state.crystal+'%','integrity'],[state.score,'score']]){const e=document.createElement('div'),n=document.createElement('strong'),l=document.createElement('span');n.textContent=v;l.textContent=t(k);e.append(n,l);results.append(e);}content.append(results);
      const p=document.createElement('p');p.className='score-note';p.textContent=t(won?'winNote':'loseNote')+' '+t('best')+': '+best;content.append(p);modalButton(t('inspect'),()=>$('modal').close());modalButton(t('restart'),newRun,true);
    }else{
      txt('modal-title',t('pauseTitle'));const p=document.createElement('p');p.textContent=t('pauseNote');content.append(p);modalButton(t('abandon'),confirmReset);modalButton(t('continue'),()=>$('modal').close(),true);
    }
    $('modal').showModal();updateUI(true);
  }
  function confirmReset(){txt('modal-title',t('abandonTitle'));txt('modal-content',t('abandonNote'));$('modal-actions').replaceChildren();modalButton(t('cancel'),()=>$('modal').close());modalButton(t('abandon'),newRun,true);}
  $('modal').addEventListener('close',()=>{if(modalResume){G.resume(state);audio.unlock();}modalResume=false;last=performance.now();updateUI(true);});$('modal-close').addEventListener('click',()=>$('modal').close());
  function pause(){if(['battle','prep'].includes(state.phase))openModal('pause');}
  $('action').addEventListener('click',doAction);$('merge').addEventListener('click',doMerge);$('bench').addEventListener('click',doBench);$('sell').addEventListener('click',doSell);$('repair').addEventListener('click',doRepair);$('pause').addEventListener('click',pause);$('codex').addEventListener('click',()=>openModal('codex'));
  $('language').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';store.set('tinyArcadeLang',lang);localize();});
  $('speed').addEventListener('click',()=>{speed=speed===1?2:1;txt('speed',speed+'×');$('speed').setAttribute('aria-label',`${t('speed')} ${speed}×`);});
  $('sound').addEventListener('click',()=>{muted=!muted;store.set('cv2Muted',muted?'1':'0');if(muted&&audio.ctx)audio.ctx.suspend().catch(()=>{});else audio.unlock();updateUI(true);});
  $('zoom').addEventListener('click',()=>{renderer.zoomIn();updateUI(true);});
  function selectOrPlace(x,y){
    const tile=renderer.tileAt(x,y),selected=state.units.find(u=>u.id===ui.selected);
    if(state.phase==='prep'&&selected&&!selected.tile&&G.validTile(tile.x,tile.y)){result(G.deploy(state,selected.id,tile.x,tile.y),t('placed'));return;}
    const hits=state.units.filter(u=>u.tile).sort((a,b)=>(b.x+b.y)-(a.x+a.y));
    for(const u of hits){const p=renderer.toScreen(u.x,u.y),k=renderer.view.scale;if(Math.abs(x-p.x)<20*k&&y>p.y-52*k&&y<p.y+7*k){ui.selected=u.id;updateUI(true);return;}}
    if(state.phase==='prep'&&selected)result(G.deploy(state,selected.id,tile.x,tile.y),t('placed'));
  }
  const pointerPos=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;const p=pointerPos(e);pointer={...p,id:e.pointerId,startPan:{...renderer.pan},moved:false};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});audio.unlock();});
  canvas.addEventListener('pointermove',e=>{const p=pointerPos(e);if(pointer&&pointer.id===e.pointerId&&Math.hypot(p.x-pointer.x,p.y-pointer.y)>7){pointer.moved=true;if(renderer.zoom>1){renderer.pan.x=Math.max(-renderer.width*.4,Math.min(renderer.width*.4,pointer.startPan.x+p.x-pointer.x));renderer.pan.y=Math.max(-renderer.height*.4,Math.min(renderer.height*.4,pointer.startPan.y+p.y-pointer.y));}}ui.hover=renderer.tileAt(p.x,p.y);});
  canvas.addEventListener('pointerup',e=>{if(pointer&&pointer.id===e.pointerId){const p=pointerPos(e);if(!pointer.moved)selectOrPlace(p.x,p.y);pointer=null;}});
  canvas.addEventListener('pointercancel',()=>pointer=null);canvas.addEventListener('pointerleave',()=>{if(!pointer)ui.hover=null;});canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(state.phase==='prep')doBench();});
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;if($('modal').open){if((e.code==='KeyP'||e.code==='Space')&&modalType==='pause'){e.preventDefault();$('modal').close();}return;}
    if(e.repeat){if(['Space','Enter'].includes(e.code))e.preventDefault();return;}
    if(e.code==='Escape'){ui.selected=null;updateUI(true);return;}
    if(e.code==='KeyP'){e.preventDefault();pause();return;}if(e.code==='KeyM'){$('sound').click();return;}
    if(/^Digit[1-4]$/.test(e.code)){e.preventDefault();doRecruit(keys[Number(e.code.at(-1))-1]);return;}
    if(e.code==='KeyF'){e.preventDefault();audio.unlock();result(G.pulse(state));return;}if(e.code==='KeyG'){doMerge();return;}if(e.code==='KeyB'){doBench();return;}if(e.code==='KeyR'){doRepair();return;}
    if(e.target===canvas&&e.code.startsWith('Arrow')){e.preventDefault();const cur=ui.hover||{x:0,y:2},d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.code];ui.hover={x:Math.max(-4,Math.min(4,cur.x+d[0])),y:Math.max(-4,Math.min(4,cur.y+d[1]))};return;}
    if(e.target===canvas&&e.code==='Enter'){e.preventDefault();if(ui.selected&&ui.hover)result(G.deploy(state,ui.selected,ui.hover.x,ui.hover.y),t('placed'));return;}
    if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();doAction();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='battle')pause();});window.addEventListener('blur',()=>{if(state.phase==='battle')pause();});window.addEventListener('pagehide',()=>{if(state.phase==='battle')pause();});
  function frame(now){
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;uiClock+=dt;G.step(state,dt*speed);
    const events=state.events.splice(0);renderer.ingest(events,ui.reduced);
    for(const e of events){
      if(e.type==='attack')audio.play(e.kind);else if(e.type==='leak')audio.play('hit');else if(['recruit','deploy','merge','kill','pulse'].includes(e.type))audio.play(e.type);
      if(e.type==='wave')toast(fmt(t('waveStart'),{n:e.wave}));else if(e.type==='clear'){audio.play('clear');toast(fmt(t('cleared'),{n:e.wave,g:e.reward}),4);}
      else if(e.type==='enrage')toast(t('enrage'));else if(e.type==='pulse')toast(t('pulseCast'),1.5);
      else if(e.type==='win'||e.type==='lose'){best=Math.max(best,state.score);store.set('cv2Best',best);audio.play(e.type);openModal('end');}
    }
    if(uiClock>toastEnd)$('announcement').classList.remove('on');updateUI();renderer.draw(state,ui,dt);requestAnimationFrame(frame);
  }
  // Read-only diagnostics for reproducible browser QA. No state mutation or cheats.
  window.crystalSnapshot=()=>({...G.snapshot(state),selected:ui.selected,language:lang,speed,muted,best,zoom:renderer.zoom,modal:$('modal').open});
  window.crystalProject=(x,y)=>renderer.toScreen(x,y);
  localize();renderer.resize();toast(t('welcome'),6);requestAnimationFrame(frame);
})();
