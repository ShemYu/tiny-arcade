'use strict';
const assert=require('node:assert/strict');
const G=require('../core.js');
let count=0;
function test(name,fn){fn();console.log('PASS '+name);count++;}
function fight(s,seconds=200,pilot=()=>{}){let n=0;while(s.phase==='battle'&&n++<seconds*10){pilot(s);G.step(s,.1);s.events.length=0;}return s;}
const pads=[[0,-2],[2,0],[0,2],[-2,0],[-2,-2],[2,2],[-2,2],[2,-2]];
function plan(s){
  let n=0,i=s.wave*7;
  while(s.gold>=G.COST&&n++<50){
    if(!G.recruit(s,['ranger','mage','blade','guard'][i++%4]).ok)break;
    let u;while((u=s.units.find(v=>G.mergeable(s,v.id))))assert.equal(G.merge(s,u.id).ok,true);
    for(const v of s.units.filter(u=>!u.tile)){const p=pads.find(([x,y])=>!s.units.some(u=>u.tile&&u.tile.x===x&&u.tile.y===y));if(p)G.deploy(s,v.id,...p);}
  }
}
function campaign(seed){const s=G.create(seed);let turns=0;
  while(s.phase==='prep'&&turns++<8){plan(s);assert.equal(G.beginWave(s).ok,true);fight(s,200,s=>{if(s.pulseReady&&s.enemies.filter(e=>Math.hypot(e.x,e.y)<3).length>=4)G.pulse(s);});}
  return s;
}
test('initial party is playable without buying or deploying',()=>{const s=G.create();assert.equal(s.units.length,4);assert.equal(s.units.filter(u=>u.tile).length,4);assert.equal(s.gold,18);assert.equal(s.phase,'prep');});
test('recruit costs gold exactly once and validates class',()=>{const s=G.create(),n=s.units.length;assert.equal(G.recruit(s,'not-a-class').ok,false);assert.equal(s.gold,18);const r=G.recruit(s,'mage');assert.equal(r.ok,true);assert.equal(s.gold,12);assert.equal(s.units.length,n+1);assert.equal(s.units.at(-1).tile,null);});
test('insufficient gold cannot produce a hero',()=>{const s=G.create();for(let i=0;i<3;i++)G.recruit(s,'blade');const n=s.units.length;assert.equal(G.recruit(s,'mage').reason,'noGold');assert.equal(s.gold,0);assert.equal(s.units.length,n);});
test('reserve has a hard cap and no failed-purchase charge',()=>{const s=G.create();s.gold=100;for(let i=0;i<8;i++)G.recruit(s,'blade');const gold=s.gold;assert.equal(G.recruit(s,'blade').reason,'benchFull');assert.equal(s.gold,gold);});
test('altar, out-of-bounds and fractional tiles are rejected',()=>{const s=G.create();for(const[x,y]of [[0,0],[1,1],[5,1],[-5,0],[2.1,3]])assert.equal(G.deploy(s,1,x,y).ok,false);assert.deepEqual(s.units[0].tile,{x:0,y:-2});});
test('moving to an occupied tile swaps two deployed heroes',()=>{const s=G.create();assert.equal(G.deploy(s,1,2,0).ok,true);assert.deepEqual(s.units[0].tile,{x:2,y:0});assert.deepEqual(s.units[1].tile,{x:0,y:-2});});
test('reserve replacement moves the former occupant to reserve',()=>{const s=G.create(),r=G.recruit(s,'mage');G.deploy(s,r.id,2,0);assert.equal(s.units[1].tile,null);assert.deepEqual(s.units.find(u=>u.id===r.id).tile,{x:2,y:0});});
test('eight-hero deployment limit cannot be exceeded',()=>{const s=G.create();s.gold=100;for(let i=0;i<4;i++){const r=G.recruit(s,'ranger');assert.equal(G.deploy(s,r.id,...pads[i+4]).ok,true);}const r=G.recruit(s,'blade');assert.equal(G.deploy(s,r.id,4,4).reason,'fieldFull');assert.equal(s.units.filter(u=>u.tile).length,8);});
test('three-to-one merge preserves selection, position and heals',()=>{const s=G.create();const a=G.recruit(s,'blade'),b=G.recruit(s,'blade');s.units[0].hp=1;assert.equal(G.merge(s,1).ok,true);assert.equal(s.units[0].rank,2);assert.deepEqual(s.units[0].tile,{x:0,y:-2});assert.equal(s.units[0].hp,G.stats('blade',2).hp);assert.ok(!s.units.some(u=>u.id===a.id||u.id===b.id));assert.equal(s.units.length,4);});
test('merging a reserve hero inherits a consumed deployed position',()=>{const s=G.create();const a=G.recruit(s,'blade');G.recruit(s,'blade');G.merge(s,a.id);const u=s.units.find(u=>u.id===a.id);assert.deepEqual(u.tile,{x:0,y:-2});assert.equal(u.rank,2);});
test('merge consumes reserve duplicates before deployed duplicates',()=>{const s=G.create();s.gold=50;const a=G.recruit(s,'blade'),b=G.recruit(s,'blade'),c=G.recruit(s,'blade');G.deploy(s,a.id,3,2);G.merge(s,1);assert.ok(s.units.some(u=>u.id===a.id));assert.ok(!s.units.some(u=>u.id===b.id||u.id===c.id));});
test('maximum rank and nonmatching groups are not mergeable',()=>{const s=G.create();assert.equal(G.merge(s,1).ok,false);s.units[0].rank=3;assert.equal(G.mergeable(s,1),false);});
test('dismissal refunds half the recruitment equivalent',()=>{const s=G.create();G.recruit(s,'blade');G.recruit(s,'blade');G.merge(s,1);const gold=s.gold;assert.equal(G.sell(s,1).ok,true);assert.equal(s.gold,gold+9);assert.ok(!s.units.some(u=>u.id===1));});
test('repairs are bounded, paid, and never charge at full health',()=>{const s=G.create();assert.equal(G.repair(s).reason,'fullHealth');assert.equal(s.gold,18);s.crystal=90;assert.equal(G.repair(s).ok,true);assert.equal(s.crystal,100);assert.equal(s.gold,10);});
test('battle locks recruitment, deployment, merge, bench and repair',()=>{const s=G.create();G.beginWave(s);for(const r of [G.recruit(s,'blade'),G.deploy(s,1,2,2),G.merge(s,1),G.bench(s,1),G.repair(s),G.sell(s,1)])assert.equal(r.reason,'planningOnly');});
test('a wave requires a deployed party',()=>{const s=G.create();s.units.forEach(u=>G.bench(s,u.id));assert.equal(G.beginWave(s).reason,'needArmy');assert.equal(s.wave,0);});
test('pause freezes the simulation; resume preserves the phase',()=>{const s=G.create();G.beginWave(s);G.step(s,.1);G.pause(s);const before=G.snapshot(s);G.step(s,10);assert.deepEqual(G.snapshot(s),before);assert.equal(G.beginWave(s).ok,false);G.resume(s);G.step(s,.1);assert.ok(s.time>.1);});
test('invalid deltas and long stalls cannot fast-forward combat',()=>{const s=G.create();G.beginWave(s);for(const dt of [NaN,Infinity,-1,0])G.step(s,dt);assert.equal(s.time,0);G.step(s,1000);assert.ok(s.time<=.200001);});
test('nova can be used once per wave, not in planning',()=>{const s=G.create();assert.equal(G.pulse(s).reason,'battleOnly');G.beginWave(s);assert.equal(G.pulse(s).ok,true);assert.equal(G.pulse(s).reason,'pulseSpent');fight(s);G.beginWave(s);assert.equal(s.pulseReady,true);});
test('wave one clears and restores every hero to their home',()=>{const s=G.create();G.beginWave(s);fight(s);assert.equal(s.phase,'prep');assert.equal(s.cleared,1);for(const u of s.units){assert.equal(u.hp,u.maxHp);assert.equal(u.down,false);assert.equal(u.x,u.tile.x);assert.equal(u.y,u.tile.y);}});
test('poor deployment can lose; health never becomes negative',()=>{const s=G.create();s.units.forEach(u=>G.bench(s,u.id));G.deploy(s,1,4,4);for(let i=0;i<4&&s.phase==='prep';i++){G.beginWave(s);fight(s);}assert.equal(s.phase,'lost');assert.equal(s.crystal,0);const before=G.snapshot(s);G.step(s,1);assert.deepEqual(G.snapshot(s),before);});
test('complete eight-wave campaign is reachable across 20 seeds',()=>{for(let seed=0;seed<20;seed++){const s=campaign(seed);assert.equal(s.phase,'won',`seed ${seed}`);assert.equal(s.cleared,8);assert.equal(s.enemies.length,0);assert.equal(s.queue.length,0);assert.ok(s.crystal>0);assert.ok(s.merges>0);assert.ok(s.units.some(u=>u.rank===3));assert.ok(s.time<360);}});
test('same seed and input produce exactly the same campaign',()=>{assert.deepEqual(G.snapshot(campaign(471)),G.snapshot(campaign(471)));});
test('terminal states cannot replay rewards or advance a ninth wave',()=>{const s=campaign(6),before=G.snapshot(s);assert.equal(G.beginWave(s).ok,false);assert.equal(G.recruit(s,'blade').ok,false);G.step(s,1);assert.deepEqual(G.snapshot(s),before);});
test('combat queues, effects and roster stay bounded',()=>{const s=campaign(8);assert.ok(s.events.length<=256);assert.ok(s.units.length<=16);assert.equal(s.shots.length,0);assert.ok(Number.isFinite(s.score));});
console.log(`\n${count} core checks passed.`);
