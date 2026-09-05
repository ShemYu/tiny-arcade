import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.min.js';
import {BattlefieldCamera} from '../three/camera.mjs';
import {ForestAssets,measureFrames} from '../three/assets.mjs';
import {ObjectFactory} from '../three/objects.mjs';
import {EffectsView} from '../three/effects.mjs';
import {Renderer} from '../guard-render.mjs';
import {Game} from '../guard-core.mjs';
import {HEROES} from '../guard-content.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};

async function assets() {
  const a=new ForestAssets();
  a.atlas=await loadImage(new URL('../guard-assets/atlas.png',import.meta.url).pathname);
  a.environment=await loadImage(new URL('../guard-assets/environment.png',import.meta.url).pathname);
  a.frames=measureFrames(a.atlas,[0,315,634,946,1254],[0,327,650,925,1254]);
  a.env=measureFrames(a.environment,[0,455,915,1254],[0,660,1254]);
  a.actors=a.frames.map(f=>a.texture(a.atlas,f));a.scenery=a.env.map(f=>a.texture(a.environment,f));
  return a;
}

test('raycasting addresses all 165 tiles after resize, pan, zoom and camera rotation',()=>{
  const view=new BattlefieldCamera();
  for(const [width,height]of [[1280,720],[390,550],[844,260]])
    for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.75])
      for(const zoom of [.65,1,1.65,2.8]) {
        view.update(width,height,zoom,{x:31,y:-22},angle);
        for(let y=0;y<11;y++)for(let x=0;x<15;x++) {
          const p=view.project(x,y);assert.deepEqual(view.unproject(p.x,p.y),{x,y});
        }
      }
});

test('original atlas crops remain nonempty, padded and color managed',async()=>{
  const a=await assets();assert.equal(a.frames.length,16);assert.equal(a.env.length,6);
  for(const t of a.textures){assert.equal(t.colorSpace,THREE.SRGBColorSpace);const pixels=t.image.getContext('2d').getImageData(0,0,t.image.width,t.image.height).data;assert.equal(pixels[3],0);assert.ok(pixels.some((v,i)=>i%4===3&&v>200));}
  a.dispose();assert.equal(a.textures.length,0);
});

test('scene reconciliation renders combat without changing simulation or leaking actor materials',async()=>{
  const a=await assets(),f=new ObjectFactory(a),scene=new THREE.Scene(),view=new BattlefieldCamera();view.update(1280,720);
  // Exercise the production scene adapter, substituting only the GPU draw and DOM text sinks.
  const r=Object.create(Renderer.prototype);
  Object.assign(r,{assets:a,factory:f,scene,view,actors:new Map(),buildings:new Map(),effectIds:new WeakMap(),nextEffect:1,routeKey:'',time:0,scale:view.scale,selected:'knight',tool:'move',lang:'zh',reduced:false,labels:{put(){}},home:new THREE.Group(),routes:new THREE.Group()});
  scene.add(r.home,r.routes);
  const game=new Game(42);game.build('tower',5,4);game.build('wall',3,5);game.build('frost',4,5);
  const before=game.snapshot();
  r.updateActors(game);r.updateBuildings(game.state);r.updateRoutes(game);
  assert.deepEqual(game.snapshot(),before);
  assert.equal(r.actors.size,4);assert.equal(r.buildings.size,3);
  const effects=new EffectsView(scene,f);game.start();
  let disposed=0,maxMaterials=0;
  for(let i=0;i<900;i++) {
    game.tick(1/60);r.time+=1/60;
    r.updateActors(game);r.updateBuildings(game.state);effects.update(game.state,r.time,false);
    for(const group of r.actors.values())if(!group.userData.watched){group.userData.watched=true;group.userData.body.material.addEventListener('dispose',()=>disposed++);}
    scene.updateMatrixWorld(true);
    scene.traverse(object=>assert.ok(object.matrixWorld.elements.every(Number.isFinite),`finite transform: ${object.type}`));
    maxMaterials=Math.max(maxMaterials,f.materials.size);
  }
  assert.ok(game.state.kills>0);assert.ok(disposed>0,'dead enemy sprite materials are disposed');
  assert.equal(r.actors.size,4+game.state.enemies.length);
  assert.ok(maxMaterials<35,`bounded shared materials: ${maxMaterials}`);
  game.state.effects=[];game.state.fields=[];effects.update(game.state,100,false);
  assert.equal(effects.items.size,0);assert.equal(effects.fields.size,0);
  effects.dispose();f.dispose();a.dispose();
});

test('visible hero cutouts are selectable with Three.js rays across rotated views',async()=>{
  const a=await assets(),f=new ObjectFactory(a),scene=new THREE.Scene(),view=new BattlefieldCamera(),game=new Game(99);
  const r=Object.create(Renderer.prototype);
  Object.assign(r,{assets:a,factory:f,scene,view,actors:new Map(),time:0,selected:'knight',tool:'move',lang:'zh',scale:1,reduced:true,labels:{put(){}},home:new THREE.Group(),camera(){}});
  // Separate actors so the test checks ray/alpha selection rather than occlusion priority.
  game.state.heroes.forEach((h,i)=>{h.x=2+i*3;h.y=5;h.home={x:h.x,y:h.y};h.face=i%2?-1:1;});
  for(const angle of [Math.PI/4,Math.PI/2,Math.PI]) {
    view.update(1280,720,1,{x:0,y:0},angle);r.updateActors(game);scene.updateMatrixWorld(true);
    for(const h of game.state.heroes) {
      const p=view.project(h.x,h.y,38);
      // Sample central painted pixels: transparent margins must never capture a hit.
      let hit=null;
      for(const dx of [-8,0,8])for(const dy of [-6,0,6]){const found=r.pickActor(game.state,p.x+dx,p.y+dy);if(found?.id===h.id)hit=found;}
      assert.equal(hit?.id,h.id,`select ${h.id} at angle ${angle}`);
    }
  }
  f.dispose();a.dispose();
});

test('pinned vendor release has its license and no network imports',async()=>{
  const path=new URL('../vendor/three/',import.meta.url);
  const pkg=JSON.parse(await readFile(new URL('package.json',path),'utf8'));assert.equal(pkg.version,'0.185.1');
  assert.match(await readFile(new URL('LICENSE',path),'utf8'),/MIT License/);
  for(const file of ['three.core.min.js','three.module.min.js'])assert.doesNotMatch(await readFile(new URL(file,path),'utf8'),/from\s*["']https?:/);
});


test('tower batching keeps opaque draw calls bounded across many structures',()=>{
  const factory=new ObjectFactory({});let calls=0;
  for(let i=0;i<30;i++) {
    const tower=factory.building('tower',i%3+1);
    tower.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)calls++;});
  }
  assert.equal(calls,60,'two opaque batches per tower, including its rotating turret');
  factory.dispose();
});
