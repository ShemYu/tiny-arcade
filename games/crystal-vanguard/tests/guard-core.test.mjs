import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,distance} from '../guard-core.mjs';
import {GEAR,ENTRANCES,HEROES,CORE} from '../guard-content.mjs';
const drain=(g,seconds=180)=>{for(let n=0;n<seconds*60&&g.state.phase==='battle';n++)g.tick(1/60);};
test('live building spends once, reroutes ground enemies and rejects sealing gates',()=>{
 const g=new Game(1);g.start();g.tick(.02);const before=g.route(0,5).length;
 assert.equal(g.build('wall',3,5).ok,true);assert.ok(g.route(0,5).length>before);
 const gold=g.state.gold;assert.equal(g.build('wall',3,5).ok,false);assert.equal(g.state.gold,gold);
 for(const [x,y] of [[0,4],[0,6]])assert.equal(g.build('wall',x,y).ok,true);
 assert.equal(g.build('wall',1,5).error,'route');
 assert.ok(ENTRANCES.every(e=>g.route(e.x,e.y).at(-1).x===CORE.x));
});
test('building actions preserve health, cost and navigation invariants',()=>{
 const g=new Game(2);g.build('wall',3,5);const b=g.state.buildings[0];
 assert.equal(g.interact('repair',3,5).error,'full');b.hp-=120;
 assert.equal(g.interact('repair',3,5).ok,true);assert.equal(b.hp,240);
 assert.equal(g.interact('upgrade',3,5).ok,true);assert.equal(b.level,2);assert.equal(b.maxHp,360);
 const gold=g.state.gold,refund=Math.floor(b.invested*.6*b.hp/b.maxHp);
 g.interact('sell',3,5);assert.equal(g.state.gold,gold+refund);assert.equal(g.route(0,5).length,8);
});
test('heroes cannot be sealed off by a new solid building',()=>{
 const g=new Game(3);g.moveHero('ranger',1,1);
 for(const p of [[0,1],[1,0],[2,1]])assert.equal(g.build('wall',...p).ok,true);
 assert.equal(g.build('wall',1,2).error,'route');
});
test('flying enemies cross walls while a sapper damages structures',()=>{
 const g=new Game(4);g.build('wall',3,5);g.start();g.state.queue=[];
 const bat=g.spawn('bat',0);bat.x=2.8;bat.y=5;
 const sapper=g.spawn('sapper',0);sapper.x=2;sapper.y=5;
 const b=g.state.buildings[0],hp=b.hp;
 for(let i=0;i<60;i++)g.tick(1/60);
 assert.ok(bat.x>3.5);assert.ok(b.hp<hp);
});
test('equipment modifies attacks: lifesteal, piercing and frost',()=>{
 const g=new Game(5),h=g.state.heroes[0];h.gear.weapon='fang';h.hp=100;
 let e=g.spawn('golem',0);e.x=h.x+.5;e.y=h.y;g.attack(h,e);assert.ok(h.hp>100);
 const r=g.state.heroes[1];r.gear.weapon='pierce';r.x=3;r.y=5;
 const a=g.spawn('goblin',0),b=g.spawn('goblin',0);a.x=5;a.y=5;b.x=6;b.y=5;
 const hp=b.hp;g.attack(r,a);assert.ok(b.hp<hp);
 const m=g.state.heroes[2];m.gear.weapon='icestaff';g.attack(m,e);assert.ok(e.slow>0);
});
test('healing does not create lifesteal from overkill damage',()=>{
 const g=new Game(6),h=g.state.heroes[0];h.gear.weapon='fang';h.hp=50;
 const e=g.spawn('jelly',0);e.hp=1;g.damage(e,999,h,true);assert.ok(h.hp<=50.18+1e-9);
});
test('cooldowns, death and phase gate active skills',()=>{
 const g=new Game(7);assert.equal(g.skill('mage',5,5),false);g.start();
 assert.equal(g.skill('mage',5,5),true);assert.equal(g.skill('mage',5,5),false);
 assert.equal(g.state.fields.length,1);assert.equal(g.skill('ranger',NaN,5),false);
 const before=g.snapshot();g.tick(NaN);g.tick(-1);assert.deepEqual(g.snapshot(),before);
});
test('loot selection is single-use, class-safe and swaps equipment to the bag',()=>{
 const g=new Game(8);g.start();g.finishWave();const id=g.state.reward[0];
 assert.equal(g.chooseLoot(id),true);assert.equal(g.chooseLoot(id),false);
 const gear=GEAR.find(a=>a.id===id),who=gear.who==='all'?'knight':gear.who;
 assert.equal(g.equip(id,who),true);assert.equal(g.state.heroes.find(h=>h.id===who).gear[gear.slot],id);
 g.state.bag.push('fang');assert.equal(g.equip('fang','mage'),false);
 g.state.bag.push('cleaver');g.equip('fang','knight');g.equip('cleaver','knight');assert.ok(g.state.bag.includes('fang'));
});
test('checkpoint resumes one run; a fresh run has no inherited gear',()=>{
 const g=new Game(9);g.build('tower',5,4);g.start();g.finishWave();
 const r=Game.restore(g.checkpoint());assert.ok(r);assert.equal(r.state.phase,'reward');assert.deepEqual(r.state.reward,g.state.reward);
 const id=r.state.reward[0];r.chooseLoot(id);assert.ok(Game.restore(r.checkpoint()));
 const fresh=new Game(9);assert.equal(fresh.state.bag.length,0);assert.ok(fresh.state.heroes.every(h=>Object.values(h.gear).every(x=>x===null)));
});
test('corrupt or incompatible checkpoints fail closed instead of breaking load',()=>{
 const g=new Game(10);const badMutations=[
  s=>s.core=null,s=>s.core.hp=NaN,s=>s.rng=-1,s=>s.heroes[1].id='knight',s=>s.heroes[0].gear.weapon='seraph',
  s=>s.heroes[0].cool='bad',s=>s.reward=['unknown'],s=>s.bag=null,
 ];
 for(const mutate of badMutations){const s=g.checkpoint();mutate(s);assert.equal(Game.restore(s),null);}
 const s=g.checkpoint();s.level=Infinity;s.heroes[0].atk=100000;s.heroes[0].speed=10000;const restored=Game.restore(s);
 assert.equal(restored.state.heroes[0].speed,HEROES[0].speed);assert.equal(restored.stats(restored.state.heroes[0]).atk,HEROES[0].atk);
});
test('an undefended crystal can lose; terminal states stop simulation',()=>{
 const g=new Game(11);for(const h of g.state.heroes)h.hp=0;g.start();drain(g);
 assert.equal(g.state.phase,'defeat');const s=g.snapshot();g.tick(1);assert.deepEqual(g.snapshot(),s);
});
export function playCampaign(seed){
 const g=new Game(seed),waves=[];
 const sites=[['tower',5,4],['tower',9,4],['frost',5,5],['frost',9,5],['tower',6,3],['tower',8,3],['frost',7,2],['tower',5,6],['tower',9,6],['tower',6,7],['tower',8,7]];
 for(let wave=0;wave<12;wave++){
  for(const [kind,x,y] of sites)if(!g.state.buildings.some(b=>b.x===x&&b.y===y))g.build(kind,x,y);
  for(const b of g.state.buildings)if(b.kind==='tower')g.interact('upgrade',b.x,b.y);
  while(g.state.core.hp<220&&g.state.gold>=10)g.interact('repair',7,5);
  if(!g.start())break;
  for(let t=0;t<180*60&&g.state.phase==='battle';t++){
   if(t%60===0){
    for(const h of g.state.heroes){const danger=g.state.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(a,CORE)-distance(b,CORE))[0];if(danger)g.skill(h.id,danger.x,danger.y);}
    if(g.state.core.hp<120)g.interact('repair',7,5);
   }
   g.tick(1/60);
  }
  waves.push({wave:g.state.wave,phase:g.state.phase,hp:Math.round(g.state.core.hp),gold:g.state.gold,time:Math.round(g.state.waveTime)});
  if(g.state.phase==='reward'){
   const id=g.state.reward.find(id=>GEAR.find(a=>a.id===id).slot==='weapon')||g.state.reward[0];
   const item=GEAR.find(a=>a.id===id),who=item.who==='all'?'knight':item.who;g.chooseLoot(id);g.equip(id,who);
  }else if(g.state.phase!=='victory')break;
 }
 return {g,waves};
}
test('complete 12-wave campaigns, with gear and construction, across five seeds',()=>{
 for(const seed of [1,7,42,123,2026]){const {g,waves}=playCampaign(seed);assert.equal(g.state.phase,'victory',JSON.stringify({seed,waves}));assert.equal(g.state.heroes.length,4);assert.ok(g.state.gold>=0);}
});
