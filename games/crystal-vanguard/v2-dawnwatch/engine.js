/* Deterministic combat, economy and commands. Independent of Canvas and the DOM. */
(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./content.js'):root.CVContent;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const cellOK=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&Math.abs(x)<=4&&Math.abs(y)<=4&&Math.hypot(x,y)>=1.8;
  function stats(kind,rank=1){const h=C.heroes[kind],power=[1,2.65,7.1][rank-1];return {...h,hp:Math.round(h.hp*power),damage:Math.round(h.damage*power),range:h.range+(rank-1)*.12};}
  function makeHero(s,kind,slot=null){const a=stats(kind);return {id:s.nextId++,kind,rank:1,slot,x:slot?.x??0,y:slot?.y??0,hp:a.hp,maxHp:a.hp,alive:true,cooldown:0,attack:0,hurt:0,death:0,steps:0,facing:1.2,attacks:0};}
  function create(){const s={status:'plan',paused:false,wave:0,time:0,battleTime:0,gold:28,core:C.coreHP,heroes:[],enemies:[],shots:[],events:[],nextId:1,schedule:[],spawned:0,kills:0,score:0,pulseReady:true,pulseFx:0,coreFlash:0,revision:0};
    s.heroes=[makeHero(s,'blade',{x:0,y:-2}),makeHero(s,'ranger',{x:2,y:0}),makeHero(s,'mage',{x:-2,y:0}),makeHero(s,'guard',{x:0,y:2})];return s;}
  function emit(s,type,data={}){s.events.push({type,...data});if(s.events.length>160)s.events.shift();}
  function touch(s){s.revision++;}
  function recruit(s,kind){if(s.status!=='plan'||s.paused)return 'phase';if(!C.heroes[kind])return 'kind';if(s.heroes.length>=C.maxRoster)return 'full';if(s.gold<C.heroes[kind].cost)return 'gold';s.gold-=C.heroes[kind].cost;const h=makeHero(s,kind);s.heroes.push(h);touch(s);emit(s,'recruit',{id:h.id});return h.id;}
  function place(s,id,x,y){if(s.status!=='plan'||s.paused)return 'phase';const h=s.heroes.find(h=>h.id===id);if(!h)return 'unit';if(!cellOK(x,y))return 'cell';const occupant=s.heroes.find(o=>o.id!==id&&o.slot?.x===x&&o.slot?.y===y);if(occupant){occupant.slot=h.slot?{...h.slot}:null;occupant.x=occupant.slot?.x??0;occupant.y=occupant.slot?.y??0;}h.slot={x,y};h.x=x;h.y=y;h.facing=Math.atan2(y,x);touch(s);emit(s,'place',{id,x,y});return true;}
  function bench(s,id){if(s.status!=='plan'||s.paused)return false;const h=s.heroes.find(h=>h.id===id);if(!h)return false;h.slot=null;touch(s);return true;}
  function mergeCandidates(s,id){const h=s.heroes.find(h=>h.id===id);if(!h||h.rank>=C.maxRank)return [];return s.heroes.filter(o=>o.kind===h.kind&&o.rank===h.rank&&o.id!==id).slice(0,2);}
  function merge(s,id){if(s.status!=='plan'||s.paused)return 'phase';const h=s.heroes.find(h=>h.id===id),others=mergeCandidates(s,id);if(!h||others.length!==2)return 'copies';if(!h.slot)h.slot=others.find(o=>o.slot)?.slot??null;const ids=new Set(others.map(o=>o.id));s.heroes=s.heroes.filter(o=>!ids.has(o.id));h.rank++;const a=stats(h.kind,h.rank);h.hp=h.maxHp=a.hp;h.x=h.slot?.x??0;h.y=h.slot?.y??0;touch(s);emit(s,'merge',{id,x:h.x,y:h.y,rank:h.rank});return true;}
  function sell(s,id){if(s.status!=='plan'||s.paused)return false;const h=s.heroes.find(h=>h.id===id);if(!h)return false;s.gold+=Math.floor(C.heroes[h.kind].cost*Math.pow(3,h.rank-1)*.7);s.heroes=s.heroes.filter(o=>o.id!==id);touch(s);return true;}
  function repair(s){if(s.status!=='plan'||s.paused||s.core>=C.coreHP||s.gold<C.repairCost)return false;s.gold-=C.repairCost;s.core=Math.min(C.coreHP,s.core+C.repairAmount);touch(s);emit(s,'repair');return true;}
  function start(s){if(s.status!=='plan'||s.paused||s.wave>=C.waves.length||!s.heroes.some(h=>h.slot))return false;s.wave++;s.status='battle';s.battleTime=0;s.spawned=0;s.enemies=[];s.shots=[];s.pulseReady=true;
    for(const h of s.heroes){h.hp=h.maxHp;h.alive=true;h.x=h.slot?.x??0;h.y=h.slot?.y??0;h.cooldown=.2+(h.id%4)*.12;h.attack=0;h.hurt=0;h.death=0;h.attacks=0;}
    const w=C.waves[s.wave-1];s.schedule=[];for(let i=0;i<w.count;i++)s.schedule.push({at:.6+i*w.gap,kind:w.mix[i%w.mix.length],lane:w.lanes[i%w.lanes.length]});
    if(w.boss)s.schedule.push({at:8,kind:'elder',lane:7});s.schedule.sort((a,b)=>a.at-b.at);touch(s);emit(s,'wave',{wave:s.wave});return true;}
  function spawn(s,item){const w=C.waves[s.wave-1],a=C.monsters[item.kind],d=C.directions[item.lane],len=Math.hypot(d.x,d.y),offset=((s.spawned%3)-1)*.18;const hp=Math.round(a.hp*w.scale);
    s.enemies.push({id:s.nextId++,kind:item.kind,x:d.x/len*6.3+offset,y:d.y/len*6.3-offset,hp,maxHp:hp,alive:true,cooldown:.3,attack:0,hurt:0,death:0,steps:0,facing:0,lane:item.lane});s.spawned++;}
  function move(a,target,speed,dt,stop=0){const d=dist(a,target);if(d<=stop||d<1e-6)return false;const n=Math.min(speed*dt,d-stop);a.x+=(target.x-a.x)/d*n;a.y+=(target.y-a.y)/d*n;a.facing=Math.atan2(target.y-a.y,target.x-a.x);a.steps+=dt*7;return true;}
  function hitEnemy(s,e,damage){if(!e?.alive)return;e.hp=Math.max(0,e.hp-damage);e.hurt=.15;emit(s,'damage',{x:e.x,y:e.y,amount:Math.round(damage),enemy:true});if(e.hp<=0){e.alive=false;e.death=.55;s.kills++;const r=C.monsters[e.kind].reward;s.gold+=r;s.score+=r*10;touch(s);emit(s,'kill',{x:e.x,y:e.y,kind:e.kind});}}
  function hitHero(s,h,damage){if(!h.alive)return;const aura=s.heroes.some(g=>g.slot&&g.alive&&g.kind==='guard'&&g.id!==h.id&&dist(g,h)<2.0);damage=Math.max(1,damage-stats(h.kind,h.rank).armor)*(aura?.75:1);h.hp=Math.max(0,h.hp-damage);h.hurt=.16;emit(s,'damage',{x:h.x,y:h.y,amount:Math.round(damage),enemy:false});if(h.hp<=0){h.alive=false;h.death=.7;emit(s,'down',{x:h.x,y:h.y});}}
  function attackHero(s,h,target){const a=stats(h.kind,h.rank);h.attacks++;h.cooldown=a.interval;h.attack=.42;h.facing=Math.atan2(target.y-h.y,target.x-h.x);h.aim={x:target.x,y:target.y};
    if(h.kind==='ranger'||h.kind==='mage'){const travel=h.kind==='mage'?.48:.24;s.shots.push({id:s.nextId++,kind:h.kind,from:{x:h.x,y:h.y},to:{x:target.x,y:target.y},target:target.id,damage:a.damage*(h.kind==='ranger'&&h.attacks%3===0?1.75:1),time:0,total:travel,splash:h.kind==='mage'?.95:0});emit(s,'shoot',{kind:h.kind});}
    else {hitEnemy(s,target,a.damage);emit(s,'slash',{x:target.x,y:target.y,fromX:h.x,fromY:h.y,kind:h.kind});if(h.kind==='blade'&&h.attacks%3===0){for(const e of s.enemies){if(e.id!==target.id&&e.alive&&dist(e,target)<1.25)hitEnemy(s,e,a.damage*.7);}emit(s,'cleave',{x:target.x,y:target.y});}}
  }
  function pulse(s){if(s.status!=='battle'||s.paused||!s.pulseReady)return false;s.pulseReady=false;s.pulseFx=1;for(const h of s.heroes)if(h.alive&&h.slot)h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.35);for(const e of s.enemies)if(e.alive&&Math.hypot(e.x,e.y)<3)hitEnemy(s,e,55);emit(s,'pulse');touch(s);return true;}
  function finishWave(s){s.shots=[];const reward=12+s.wave*2;s.gold+=reward;s.score+=100+s.core*2;
    if(s.wave>=C.waves.length){s.status='won';emit(s,'win');}
    else {s.status='plan';for(const h of s.heroes){h.x=h.slot?.x??0;h.y=h.slot?.y??0;h.hp=h.maxHp;h.alive=true;h.attack=0;h.hurt=0;h.death=0;}s.enemies=[];emit(s,'clear',{reward});}touch(s);}
  function tick(s,dt){s.time+=dt;s.battleTime+=dt;s.pulseFx=Math.max(0,s.pulseFx-dt);s.coreFlash=Math.max(0,s.coreFlash-dt);while(s.spawned<s.schedule.length&&s.schedule[s.spawned].at<=s.battleTime)spawn(s,s.schedule[s.spawned]);
    for(const a of [...s.heroes,...s.enemies]){a.attack=Math.max(0,a.attack-dt);a.hurt=Math.max(0,a.hurt-dt);a.cooldown-=dt;if(!a.alive)a.death=Math.max(0,a.death-dt);}
    const aliveEnemies=s.enemies.filter(e=>e.alive), defenders=s.heroes.filter(h=>h.alive&&h.slot);
    for(const h of defenders){const a=stats(h.kind,h.rank);let target=null,nearest=Infinity;for(const e of aliveEnemies){if(!e.alive||dist(e,h.slot)>a.leash+a.range+.35)continue;const d=dist(e,h);if(d<nearest){target=e;nearest=d;}}
      if(target){h.facing=Math.atan2(target.y-h.y,target.x-h.x);if(nearest<=a.range){if(h.cooldown<=0)attackHero(s,h,target);}else if(h.attack===0)move(h,target,a.speed,dt,a.range*.9);}
      else if(h.attack===0)move(h,h.slot,a.speed,dt,.05);
    }
    for(const shot of s.shots){shot.time+=dt;if(shot.time>=shot.total){const target=s.enemies.find(e=>e.id===shot.target);if(shot.splash){const at=target?.alive?target:shot.to;for(const e of s.enemies)if(e.alive&&dist(e,at)<shot.splash)hitEnemy(s,e,shot.damage);emit(s,'burst',{x:at.x,y:at.y});}else hitEnemy(s,target,shot.damage);}}
    s.shots=s.shots.filter(p=>p.time<p.total);
    for(const e of aliveEnemies){if(!e.alive)continue;const a=C.monsters[e.kind];let target=null,nearest=Infinity;for(const h of defenders){if(!h.alive)continue;const d=dist(e,h);const aggro=h.kind==='guard'?2.1:1.25;if(d<aggro&&d<nearest){target=h;nearest=d;}}
      if(target){e.facing=Math.atan2(target.y-e.y,target.x-e.x);if(nearest<=a.range){if(e.cooldown<=0){hitHero(s,target,a.damage);e.cooldown=a.interval;e.attack=.4;}}else if(e.attack===0)move(e,target,a.speed,dt,a.range*.9);}
      else {const d=Math.hypot(e.x,e.y);if(d<=.8){s.core=Math.max(0,s.core-a.core);e.alive=false;e.death=.2;s.coreFlash=.5;emit(s,'corehit',{amount:a.core});touch(s);if(s.core===0){s.status='lost';emit(s,'lose');return;}}else if(e.attack===0)move(e,{x:0,y:0},a.speed,dt,.7);}
    }
    s.enemies=s.enemies.filter(e=>e.alive||e.death>0);
    if(s.spawned===s.schedule.length&&!s.enemies.some(e=>e.alive))finishWave(s);
    // A safety ceiling prevents an unforeseen melee stalemate from trapping a run.
    if(s.status==='battle'&&s.battleTime>150){s.core=Math.max(0,s.core-1);if(!s.core){s.status='lost';emit(s,'lose');}}
  }
  function step(s,dt){if(s.status!=='battle'||s.paused||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(.25,dt);while(remaining>1e-8&&s.status==='battle'){const h=Math.min(1/60,remaining);tick(s,h);remaining-=h;}}
  function pause(s,value=true){if(s.status==='won'||s.status==='lost')return false;s.paused=Boolean(value);return true;}
  const api={create,stats,cellOK,recruit,place,bench,mergeCandidates,merge,sell,repair,start,pulse,step,pause};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CVEngine=api;
})(globalThis);
