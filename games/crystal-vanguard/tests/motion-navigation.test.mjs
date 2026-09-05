import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,distance} from '../guard-core.mjs';
import {findPath,clearPoint,clearSegment} from '../guard-navigation.mjs';
import {ActorMotion,deformVertex} from '../guard-motion.mjs';

test('hero walks continuously to an exact off-grid destination during preparation',()=>{
 const g=new Game(42),h=g.state.heroes[1],origin={x:h.x,y:h.y};
 assert.equal(g.moveHero(h.id,10.24,7.17),true);
 assert.equal(h.x,origin.x,'a command must not teleport the hero');
 let steps=0,diagonal=false,previous={...origin};
 for(let i=0;i<600&&distance(h,h.home)>.02;i++){
  g.tick(1/60);const step=distance(h,previous);assert.ok(step<=h.speed/60+.00001);
  if(Math.abs(h.x-previous.x)>.00001&&Math.abs(h.y-previous.y)>.00001)diagonal=true;
  previous={x:h.x,y:h.y};steps++;
 }
 assert.ok(steps>20);assert.ok(diagonal);assert.ok(distance(h,{x:10.24,y:7.17})<.02);
 const restored=Game.restore(g.checkpoint());assert.ok(restored);assert.deepEqual(restored.state.heroes[1].home,{x:10.24,y:7.17});
});

test('smoothed paths keep clearance around walls, including corners',()=>{
 const blocked=new Set(['4,3','4,4','4,5','5,5']);
 const start={x:2.2,y:3.3},target={x:6.15,y:5.8},path=findPath(start,target,blocked);
 assert.ok(path.length>1);assert.ok(path.length<9);let previous=start;
 for(const p of path){assert.ok(clearSegment(previous,p,blocked));previous=p;}
 assert.deepEqual(path.at(-1),target);
 assert.equal(clearPoint({x:4.55,y:4.55},blocked),false);
});

test('new walls invalidate movement paths and cannot overlap a fractional destination',()=>{
 const g=new Game(6),h=g.state.heroes[1];g.moveHero(h.id,10.24,4.2);
 assert.equal(g.build('wall',10,4).error,'occupied');
 assert.equal(g.build('wall',9,4).ok,true);
 for(let i=0;i<600;i++){g.tick(1/60);assert.ok(clearPoint(h,g.blocked()));}
 assert.ok(distance(h,h.home)<.03);
});

test('continuous poses vary between source frames, settle, and respect reduced motion',()=>{
 const a={x:0,y:0,hp:100,anim:0,face:1},motion=new ActorMotion(a),poses=[];
 for(let i=0;i<120;i++){a.x+=1/60;poses.push(motion.update(a,1/60));}
 assert.ok(new Set(poses.map(p=>p.lift.toFixed(4))).size>40);
 const p=poses.at(-1),left=deformVertex(-.15,.1,p),right=deformVertex(.15,.1,p);assert.notEqual(left.y,right.y);
 for(let i=0;i<120;i++)motion.update(a,1/60);assert.ok(motion.speed<.001);
 const reduced=motion.update(a,1/60,true);assert.equal(reduced.lean,0);assert.equal(reduced.stretch,1);assert.equal(reduced.move,0);
});

test('motion remains close across 30 and 120 Hz rendering without changing actors',()=>{
 function run(hz){const a={x:0,y:0,hp:100,anim:0,face:1},m=new ActorMotion(a);let p;for(let i=0;i<hz*2;i++){a.x=(i+1)/hz;const before=JSON.stringify(a);p=m.update(a,1/hz);assert.equal(JSON.stringify(a),before);}return p;}
 const slow=run(30),fast=run(120);assert.ok(Math.abs(slow.x-fast.x)<.02);assert.ok(Math.abs(slow.move-fast.move)<.01);
});
