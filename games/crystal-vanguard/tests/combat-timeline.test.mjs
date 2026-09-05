import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../guard-core.mjs';
import {ActorMotion} from '../guard-motion.mjs';
const advance=(g,seconds,dt=1/60)=>{for(let t=0;t<seconds-1e-9;t+=dt)g.advanceCombat(Math.min(dt,seconds-t));};
function fixture(id='ranger'){const g=new Game(42);g.start();const h=g.state.heroes.find(h=>h.id===id),e=g.spawn('golem',0);e.x=h.x+1;e.y=h.y;e.speed=0;return {g,h,e};}
test('ranged windup and travel both precede damage; impact emits once',()=>{
 const {g,h,e}=fixture(),hp=e.hp;g.attack(h,e);advance(g,.2);assert.equal(e.hp,hp);assert.equal(g.state.projectiles.length,0);
 advance(g,.05);assert.equal(e.hp,hp);assert.equal(g.state.projectiles.length,1);advance(g,.2);assert.ok(e.hp<hp);const hit=e.hp;advance(g,2);assert.equal(e.hp,hit);assert.equal(g.state.events.filter(e=>e.kind==='hit').length,1);
});
test('melee marker fires once even when a tick crosses its boundary',()=>{
 const {g,h,e}=fixture('knight'),hp=e.hp;g.attack(h,e);advance(g,.17);assert.equal(e.hp,hp);g.advanceCombat(.05);assert.ok(e.hp<hp);const hit=e.hp;advance(g,1);assert.equal(e.hp,hit);
});
test('move cancels windup; death cancels unreleased attacks but preserves released arrows',()=>{
 const {g,h,e}=fixture();const hp=e.hp;g.attack(h,e);assert.ok(g.moveHero(h.id,h.x,h.y+1));advance(g,1);assert.equal(e.hp,hp);
 g.attack(h,e);h.hp=0;advance(g,1);assert.equal(e.hp,hp);h.hp=100;g.attack(h,e);advance(g,.26);h.hp=0;advance(g,1);assert.ok(e.hp<hp);
});
test('a dead missile target never awards duplicate kills or redirects to another enemy',()=>{
 const {g,h,e}=fixture();g.attack(h,e);advance(g,.26);g.damage(e,10000,h,true);const kills=g.state.kills,gold=g.state.gold;advance(g,1);assert.equal(g.state.kills,kills);assert.equal(g.state.gold,gold);
});
test('rain damage waits for falling arrows; clearCombat cancels all pending effects',()=>{
 const {g,h,e}=fixture(),hp=e.hp;g.skill(h.id,e.x,e.y);advance(g,.35);assert.equal(e.hp,hp);assert.equal(g.state.projectiles[0].kind,'rain');advance(g,.45);assert.ok(e.hp<hp);
 h.cool=0;g.skill(h.id,e.x,e.y);g.clearCombat();const before=e.hp;advance(g,1);assert.equal(e.hp,before);
});
test('fixed simulation gives identical combat under 30/60/120 Hz render schedules and double speed',()=>{
 const run=(hz,speed)=>{const {g,h,e}=fixture();g.state.queue=[{at:100,kind:'jelly',lane:0}];g.attack(h,e);let acc=0;for(let i=0;i<hz/speed;i++){acc+=speed/hz;while(acc>=1/60-1e-10){g.tick(1/60);acc-=1/60;}}return g.snapshot();};
 const baseline=run(60,1);for(const hz of [30,120])assert.deepEqual(run(hz,1),baseline);assert.deepEqual(run(60,2),baseline);
});
test('render interpolation is bounded and facing responds to camera rotation',()=>{
 const a={id:'ranger',x:1,y:0,prevX:0,prevY:0,hp:100,face:1,aim:{x:1,y:0},action:{age:.1,windup:.24,duration:.4}},m=new ActorMotion(a);
 assert.equal(m.update(a,1/60,false,0,.25).x,.25);assert.equal(m.update(a,1/60,false,Math.PI,1).face,-1);
});
test('stance foot holds its ground while the root moves',()=>{
 const a={id:'knight',x:0,y:0,hp:100,face:1},m=new ActorMotion(a);let maxError=0,last;
 for(let i=0;i<180;i++){a.x+=1/60;const p=m.update(a,1/60,false,0),cycle=(p.phase/(2*Math.PI))%1;if(i>30&&cycle>.1&&cycle<.45&&last){const world=p.x+p.feet[0].x;maxError=Math.max(maxError,Math.abs(world-last));}last=p.x+p.feet[0].x;}
 assert.ok(maxError<.004,`planted foot drift ${maxError}`);
});
test('released lifesteal cannot resurrect a fallen shooter',()=>{
 const {g,h,e}=fixture('knight');h.gear.weapon='fang';h.hp=0;g.damage(e,20,h);assert.equal(h.hp,0);
});
test('terminal ticks preserve even an unfinished interpolation snapshot',()=>{
 const {g,h}=fixture();g.state.phase='defeat';h.prevX=h.x-1;const before=g.snapshot();g.tick(1/60);assert.deepEqual(g.snapshot(),before);
});
