'use strict';
const assert = require('node:assert/strict');
const G = require('./engine.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function play(seed, pilot, dt=1/120) {
  const s=G.create(seed);G.start(s);let frames=0;
  while(s.status==='playing' && frames++ < 10000){pilot(s);G.step(s,dt);s.events.length=0;}
  return s;
}
const perfect=s=>{const next=s.rows.find(r=>!r.judged && r.angle>=s.angle);if(next && s.target!==next.safe)G.switchLane(s);};
test('ready does not simulate; invalid dt is harmless',()=>{const s=G.create(1);G.step(s,10);assert.equal(s.time,0);assert.equal(G.switchLane(s),false);G.start(s);for(const dt of [0,-1,NaN,Infinity])G.step(s,dt);assert.equal(s.time,0);});
test('pause freezes time, position, and input',()=>{const s=G.create(1);G.start(s);G.step(s,.1);G.pause(s);const before=JSON.stringify(s);G.step(s,.2);assert.equal(G.switchLane(s),false);assert.equal(JSON.stringify(s),before);G.resume(s);G.step(s,.1);assert.ok(s.time>.1);});
test('switching takes 160ms, is reversible, and stays in bounds',()=>{const s=G.create(1);G.start(s);G.switchLane(s);G.step(s,.08);assert.ok(Math.abs(s.lane-.5)<1e-8);G.switchLane(s);G.step(s,.2);assert.equal(s.lane,0);G.switchLane(s);G.step(s,.2);assert.equal(s.lane,1);});
test('identical seeds and inputs reproduce a complete flight',()=>{const a=play(234,perfect),b=play(234,perfect);assert.equal(a.score,b.score);assert.equal(a.count,b.count);assert.equal(a.status,b.status);});
test('100 seeds have a reachable, collision-free full route',()=>{for(let seed=0;seed<100;seed++){const s=play(seed,perfect);assert.equal(s.status,'won',`seed ${seed}`);assert.equal(s.hp,3,`seed ${seed}`);assert.equal(s.collected,s.count-s.rows.filter(r=>!r.judged).length);assert.equal(s.missed,0);assert.equal(s.bonus,300);assert.ok(s.rows.length<10);assert.equal(s.time,60);}});
test('inaction loses; damage never makes negative shields',()=>{const s=play(1,()=>{});assert.equal(s.status,'lost');assert.equal(s.hp,0);assert.ok(s.time<25);const score=s.score;G.step(s,1);assert.equal(s.hp,0);assert.equal(s.score,score);});
test('32 chained lights reach the capped 5x multiplier',()=>{const s=play(2,perfect);assert.equal(G.multiplier(s),5);assert.ok(s.maxChain>32);assert.ok(s.score>2000);});
test('large frame gaps are bounded rather than lethal fast-forwards',()=>{const s=G.create(1);G.start(s);G.step(s,60);assert.ok(s.time<=.2500001);assert.equal(s.hp,3);});
test('30, 60 and 120Hz pilots can complete the same route',()=>{for(const dt of [1/30,1/60,1/120]){const s=play(88,perfect,dt);assert.equal(s.status,'won');assert.equal(s.hp,3);assert.equal(s.missed,0);}});
test('collision window cannot be bypassed by late switch',()=>{const s=G.create(5);G.start(s);s.rows=[{id:9,angle:.05,safe:1,danger:true,judged:false,hit:false}];G.step(s,1/120);assert.equal(s.hp,2);assert.equal(s.chain,0);});
test('one gate damages once and recovery protects successive gates',()=>{const s=G.create(5);G.start(s);s.rows=[{id:9,angle:.05,safe:1,danger:true,judged:false,hit:false},{id:10,angle:.15,safe:1,danger:true,judged:false,hit:false}];G.step(s,.25);assert.equal(s.hp,2);assert.ok(s.invincible>0);});
test('post-game score and bonus are immutable under repeated updates',()=>{const s=play(4,perfect),score=s.score;for(let i=0;i<100;i++)G.step(s,.1);assert.equal(s.score,score);assert.equal(G.switchLane(s),false);});
console.log(`\n${passed} checks passed.`);
