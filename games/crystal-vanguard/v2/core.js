/* Crystal Vanguard II — DOM-free, seeded tactics simulation. */
(function (root) {
  'use strict';
  const JOBS = Object.freeze({
    blade:  Object.freeze({ hp: 170, damage: 28, rate: .85, range: 1.05, speed: 1.8, leash: 2.5, color: '#ef967f' }),
    ranger: Object.freeze({ hp: 100, damage: 22, rate: .82, range: 3.7, speed: 1.6, leash: .6, color: '#a4cc83' }),
    mage:   Object.freeze({ hp: 95, damage: 36, rate: 1.65, range: 3.25, speed: 1.25, leash: .5, color: '#c2a2ee' }),
    guard:  Object.freeze({ hp: 310, damage: 18, rate: 1.1, range: 1.0, speed: 1.25, leash: 1.65, color: '#efcc7d' })
  });
  const MONSTERS = Object.freeze({
    slime: { hp: 48, damage: 10, speed: .57, rate: 1.3, range: .7, leak: 5, gold: 1 },
    goblin: { hp: 75, damage: 15, speed: .78, rate: 1.05, range: .85, leak: 7, gold: 1 },
    wisp: { hp: 62, damage: 13, speed: .79, rate: 1.4, range: 2.0, leak: 6, gold: 1 },
    golem: { hp: 230, damage: 24, speed: .4, rate: 1.6, range: .95, leak: 12, gold: 3 },
    boss: { hp: 1600, damage: 35, speed: .30, rate: 1.5, range: 1.25, leak: 30, gold: 15 }
  });
  const DIRS = Object.freeze([[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].map(Object.freeze));
  const WAVES = Object.freeze([
    { lanes:[0,4], count:10, gap:.95, kinds:['slime'] },
    { lanes:[2,6], count:14, gap:.85, kinds:['slime','goblin','slime'] },
    { lanes:[1,3,5,7], count:18, gap:.75, kinds:['goblin','slime','wisp'] },
    { lanes:[0,2,4,6], count:22, gap:.7, kinds:['goblin','wisp','slime','golem'] },
    { lanes:[1,3,5,7], count:26, gap:.65, kinds:['goblin','wisp','goblin','slime'] },
    { lanes:[0,1,2,3,4,5,6,7], count:30, gap:.6, kinds:['goblin','wisp','golem','slime'] },
    { lanes:[0,1,2,3,4,5,6,7], count:34, gap:.55, kinds:['golem','goblin','wisp','goblin'] },
    { lanes:[0,1,2,3,4,5,6,7], count:28, gap:.68, kinds:['goblin','wisp','golem','slime'], boss:true }
  ].map(w => Object.freeze({...w,lanes:Object.freeze(w.lanes),kinds:Object.freeze(w.kinds)})));
  const COST=6, CAP=8, BENCH=8, MAX_RANK=3;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function rng(seed) { let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;}; }
  function stats(kind,rank=1) {
    const d=JOBS[kind]; if(!d)return null;
    const boost=[1,2.65,7.0][rank-1];
    return {...d,hp:Math.round(d.hp*boost),damage:Math.round(d.damage*boost),range:d.range+(rank-1)*.16};
  }
  function create(seed=1) {
    const s={seed:seed>>>0,rand:rng(seed),phase:'prep',resumePhase:null,wave:0,cleared:0,gold:18,
      crystal:100,time:0,battleTime:0,units:[],enemies:[],shots:[],queue:[],events:[],nextId:1,
      pulseReady:true,kills:0,recruited:0,merges:0,leaked:0,score:0,revision:0};
    [['blade',0,-2],['ranger',2,0],['mage',0,2],['guard',-2,0]].forEach(([kind,x,y])=>{
      const u=makeUnit(s,kind);u.tile={x,y};u.x=x;u.y=y;s.units.push(u);
    });
    return s;
  }
  function makeUnit(s,kind){const d=stats(kind);return{id:s.nextId++,kind,rank:1,tile:null,x:0,y:0,hp:d.hp,maxHp:d.hp,cooldown:0,attack:0,hurt:0,face:2,moving:false,down:false,kills:0};}
  function event(s,type,data={}){s.events.push({type,...data});if(s.events.length>256)s.events.shift();}
  function touch(s){s.revision++;}
  function recruit(s,kind){
    if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};
    if(!JOBS[kind])return{ok:false,reason:'invalid'};
    if(s.gold<COST)return{ok:false,reason:'noGold'};
    if(s.units.filter(u=>!u.tile).length>=BENCH)return{ok:false,reason:'benchFull'};
    const u=makeUnit(s,kind);s.units.push(u);s.gold-=COST;s.recruited++;touch(s);event(s,'recruit',{id:u.id,kind});return{ok:true,id:u.id};
  }
  function validTile(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&Math.abs(x)<=4&&Math.abs(y)<=4&&Math.hypot(x,y)>=1.5;}
  function deploy(s,id,x,y){
    if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};
    const u=s.units.find(u=>u.id===id);if(!u||!validTile(x,y))return{ok:false,reason:'invalidTile'};
    const other=s.units.find(v=>v.id!==id&&v.tile&&v.tile.x===x&&v.tile.y===y);
    if(!u.tile&&!other&&s.units.filter(v=>v.tile).length>=CAP)return{ok:false,reason:'fieldFull'};
    const old=u.tile;
    if(other){other.tile=old?{...old}:null;other.x=old?.x||0;other.y=old?.y||0;}
    u.tile={x,y};u.x=x;u.y=y;touch(s);event(s,'deploy',{id,x,y});return{ok:true};
  }
  function bench(s,id){
    if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};
    const u=s.units.find(v=>v.id===id);if(!u||!u.tile)return{ok:false,reason:'invalid'};
    if(s.units.filter(v=>!v.tile).length>=BENCH)return{ok:false,reason:'benchFull'};
    u.tile=null;touch(s);return{ok:true};
  }
  function sell(s,id){
    if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};
    const u=s.units.find(v=>v.id===id);if(!u)return{ok:false,reason:'invalid'};
    const amount=3*Math.pow(3,u.rank-1);s.gold+=amount;s.units=s.units.filter(v=>v.id!==id);touch(s);event(s,'sell',{amount});return{ok:true};
  }
  function mergeable(s,id){const u=s.units.find(v=>v.id===id);return !!u&&u.rank<MAX_RANK&&s.units.filter(v=>v.kind===u.kind&&v.rank===u.rank).length>=3;}
  function merge(s,id){
    if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};
    if(!mergeable(s,id))return{ok:false,reason:'needThree'};
    const u=s.units.find(v=>v.id===id);
    // Keep the selected hero; consume bench duplicates before deployed allies.
    const extras=s.units.filter(v=>v.id!==id&&v.kind===u.kind&&v.rank===u.rank).sort((a,b)=>Number(!!a.tile)-Number(!!b.tile)||a.id-b.id).slice(0,2);
    if(!u.tile){const location=extras.find(v=>v.tile);if(location)u.tile={...location.tile};}
    const ids=new Set(extras.map(v=>v.id));s.units=s.units.filter(v=>!ids.has(v.id));u.rank++;
    const d=stats(u.kind,u.rank);u.hp=u.maxHp=d.hp;u.x=u.tile?.x||0;u.y=u.tile?.y||0;
    s.merges++;touch(s);event(s,'merge',{id:u.id,x:u.x,y:u.y,rank:u.rank});return{ok:true,id:u.id};
  }
  function repair(s){if(s.phase!=='prep')return{ok:false,reason:'planningOnly'};if(s.gold<8)return{ok:false,reason:'noGold'};if(s.crystal>=100)return{ok:false,reason:'fullHealth'};s.gold-=8;s.crystal=Math.min(100,s.crystal+25);touch(s);event(s,'repair');return{ok:true};}
  function beginWave(s){
    if(s.phase!=='prep'||s.wave>=WAVES.length)return{ok:false,reason:'invalid'};
    if(!s.units.some(u=>u.tile))return{ok:false,reason:'needArmy'};
    s.wave++;s.phase='battle';s.battleTime=0;s.pulseReady=true;s.enemies=[];s.shots=[];s.queue=[];
    const w=WAVES[s.wave-1];
    for(let i=0;i<w.count;i++){const lane=w.lanes[i%w.lanes.length];s.queue.push({at:1+i*w.gap,lane,kind:w.kinds[i%w.kinds.length]});}
    if(w.boss)s.queue.push({at:9,lane:0,kind:'boss'});
    s.queue.sort((a,b)=>a.at-b.at);
    for(const u of s.units){const d=stats(u.kind,u.rank);u.hp=u.maxHp=d.hp;u.down=false;u.attack=0;u.hurt=0;u.cooldown=.15+s.rand()*.45;u.x=u.tile?.x||0;u.y=u.tile?.y||0;}
    touch(s);event(s,'wave',{wave:s.wave});return{ok:true};
  }
  function pause(s){if(s.phase==='battle'||s.phase==='prep'){s.resumePhase=s.phase;s.phase='paused';touch(s);return true;}return false;}
  function resume(s){if(s.phase==='paused'){s.phase=s.resumePhase;s.resumePhase=null;touch(s);return true;}return false;}
  function spawn(s,q){const d=MONSTERS[q.kind],v=DIRS[q.lane],len=Math.hypot(...v),scale=1+(s.wave-1)*.10;
    const hp=Math.round(d.hp*(q.kind==='boss'?1:scale));s.enemies.push({id:s.nextId++,kind:q.kind,lane:q.lane,x:v[0]/len*7.6,y:v[1]/len*7.6,hp,maxHp:hp,cooldown:.5,attack:0,hurt:0,slow:0,face:4,moving:true,enraged:false});}
  function face(a,b){const dx=b.x-a.x,dy=b.y-a.y;const sx=dx-dy,sy=(dx+dy)*.5;a.face=((Math.round(Math.atan2(sy,sx)/(Math.PI/4))+8)%8);}
  function move(a,b,speed,dt){const d=dist(a,b);if(d<.02){a.moving=false;return;}const step=Math.min(d,speed*dt);a.x+=(b.x-a.x)/d*step;a.y+=(b.y-a.y)/d*step;a.moving=true;face(a,b);}
  function hitEnemy(s,e,damage,owner=null){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-damage);e.hurt=.16;event(s,'damage',{x:e.x,y:e.y,value:Math.round(damage),enemy:true});
    if(e.hp<=0){s.gold+=MONSTERS[e.kind].gold;s.kills++;if(owner)owner.kills++;event(s,'kill',{x:e.x,y:e.y,kind:e.kind});touch(s);}}
  function pulse(s){if(s.phase!=='battle')return{ok:false,reason:'battleOnly'};if(!s.pulseReady)return{ok:false,reason:'pulseSpent'};s.pulseReady=false;for(const e of s.enemies){if(Math.hypot(e.x,e.y)<5.5){hitEnemy(s,e,70+s.wave*12);e.slow=2;}}touch(s);event(s,'pulse');return{ok:true};}
  function damageUnit(s,u,n){const protectedBy=s.units.some(v=>v.kind==='guard'&&v.tile&&!v.down&&dist(v,u)<1.8);const damage=n*(protectedBy?.75:1);u.hp=Math.max(0,u.hp-damage);u.hurt=.18;if(!u.hp){u.down=true;event(s,'down',{id:u.id,x:u.x,y:u.y});touch(s);}}
  function attackUnit(s,u,e){const d=stats(u.kind,u.rank);u.cooldown=d.rate;u.attack=.42;face(u,e);event(s,'attack',{kind:u.kind,x:u.x,y:u.y,tx:e.x,ty:e.y,rank:u.rank});
    if(u.kind==='ranger'||u.kind==='mage'){s.shots.push({id:s.nextId++,kind:u.kind,owner:u.id,target:e.id,from:{x:u.x,y:u.y},to:{x:e.x,y:e.y},time:0,duration:Math.max(.12,dist(u,e)/(u.kind==='ranger'?9:5)),damage:d.damage,rank:u.rank});}
    else if(u.kind==='blade'){for(const v of s.enemies)if(v.hp>0&&dist(v,e)<1.1)hitEnemy(s,v,d.damage,u);}
    else{hitEnemy(s,e,d.damage,u);e.slow=.8;}
  }
  function finishWave(s){s.cleared=s.wave;s.score=s.kills*10+s.crystal*5+s.merges*40;s.enemies=[];s.shots=[];
    if(s.wave===WAVES.length){s.phase='won';event(s,'win');}
    else{s.phase='prep';const reward=4+s.wave;s.gold+=reward;for(const u of s.units){u.down=false;u.hp=u.maxHp;u.x=u.tile?.x||0;u.y=u.tile?.y||0;u.attack=0;u.moving=false;}event(s,'clear',{wave:s.wave,reward});}
    touch(s);
  }
  function tick(s,dt){
    s.time+=dt;s.battleTime+=dt;
    while(s.queue.length&&s.queue[0].at<=s.battleTime)spawn(s,s.queue.shift());
    for(const u of s.units){u.attack=Math.max(0,u.attack-dt);u.hurt=Math.max(0,u.hurt-dt);u.moving=false;if(!u.tile||u.down)continue;u.cooldown-=dt;
      const d=stats(u.kind,u.rank),home=u.tile;
      const candidates=s.enemies.filter(e=>e.hp>0&&dist(e,home)<=d.range+d.leash+.25);
      candidates.sort((a,b)=>dist(a,u)-dist(b,u));const e=candidates[0];
      if(e){face(u,e);if(dist(u,e)<=d.range){if(u.cooldown<=0)attackUnit(s,u,e);}else{const len=dist(home,e),target={x:home.x+(e.x-home.x)/len*Math.min(d.leash,len),y:home.y+(e.y-home.y)/len*Math.min(d.leash,len)};move(u,target,d.speed,dt);}}
      else if(dist(u,home)>.06)move(u,home,d.speed,dt);
    }
    for(const p of s.shots){p.time+=dt;const e=s.enemies.find(v=>v.id===p.target&&v.hp>0);if(e)p.to={x:e.x,y:e.y};if(p.time>=p.duration&&!p.done){p.done=true;const owner=s.units.find(u=>u.id===p.owner);if(p.kind==='mage'){for(const v of s.enemies)if(v.hp>0&&dist(v,p.to)<1.25+(p.rank-1)*.15)hitEnemy(s,v,p.damage,owner);event(s,'blast',{x:p.to.x,y:p.to.y,rank:p.rank});}else if(e)hitEnemy(s,e,p.damage,owner);}}
    s.shots=s.shots.filter(p=>!p.done);
    for(const e of s.enemies){e.attack=Math.max(0,e.attack-dt);e.hurt=Math.max(0,e.hurt-dt);e.slow=Math.max(0,e.slow-dt);e.moving=false;if(e.hp<=0)continue;const d=MONSTERS[e.kind];e.cooldown-=dt;
      if(e.kind==='boss'&&!e.enraged&&e.hp<e.maxHp*.5){e.enraged=true;event(s,'enrage',{x:e.x,y:e.y});}
      // Guardians draw nearby attackers. Otherwise intercept only within a short aggro radius.
      const live=s.units.filter(u=>u.tile&&!u.down);const guards=live.filter(u=>u.kind==='guard'&&dist(u,e)<2.1);
      let targets=guards.length?guards:live.filter(u=>dist(u,e)<(e.kind==='wisp'?2.4:1.2));targets.sort((a,b)=>dist(a,e)-dist(b,e));const target=targets[0];
      if(target){face(e,target);if(dist(e,target)<=d.range){if(e.cooldown<=0){e.cooldown=d.rate/(e.enraged?1.3:1);e.attack=.35;damageUnit(s,target,d.damage*(1+(s.wave-1)*.05));event(s,'enemyAttack',{x:e.x,y:e.y,tx:target.x,ty:target.y});if(e.kind==='boss')for(const u of live)if(u.id!==target.id&&dist(u,target)<1.2)damageUnit(s,u,d.damage*.45);}}
        else move(e,target,d.speed*(e.slow>0?.5:1)*(e.enraged?1.4:1),dt);
      }else{if(Math.hypot(e.x,e.y)<.9){e.hp=0;e.escaped=true;s.crystal=Math.max(0,s.crystal-d.leak);s.leaked++;event(s,'leak',{damage:d.leak});touch(s);if(s.crystal===0){s.phase='lost';s.score=s.kills*10+s.merges*40;event(s,'lose');touch(s);return;}}else move(e,{x:0,y:0},d.speed*(e.slow>0?.5:1)*(e.enraged?1.4:1),dt);}
    }
    s.enemies=s.enemies.filter(e=>e.hp>0);
    if(!s.queue.length&&!s.enemies.length)finishWave(s);
  }
  function step(s,dt){if(s.phase!=='battle'||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(.2,dt);while(left>1e-8&&s.phase==='battle'){const d=Math.min(left,1/60);tick(s,d);left-=d;}}
  function snapshot(s){return JSON.parse(JSON.stringify(s,(key,value)=>key==='rand'||key==='events'?undefined:value));}
  const api={JOBS,MONSTERS,DIRS,WAVES,COST,CAP,BENCH,MAX_RANK,stats,create,recruit,deploy,bench,sell,mergeable,merge,repair,beginWave,pause,resume,pulse,step,snapshot,validTile};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CV=api;
})(globalThis);
