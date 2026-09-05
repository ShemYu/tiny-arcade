import {createRig,updateRig} from './three/rig.mjs';
import {RIG_IDS} from './guard-rig.mjs';
import {ActorMotion,deformVertex} from './guard-motion.mjs?v=professional1';
import * as THREE from './vendor/three/three.module.min.js';
import {W,H,CORE,ENTRANCES,HEROES,BUILDINGS,WAVES,TEXT} from './guard-content.mjs';
import {BattlefieldCamera} from './three/camera.mjs?v=professional1';
import {ForestAssets} from './three/assets.mjs?v=professional1';
import {ObjectFactory} from './three/objects.mjs?v=professional1';
import {EffectsView} from './three/effects.mjs?v=professional1';
import {WorldLabels} from './three/labels.mjs?v=professional1';

export class Renderer {
  constructor(canvas,context) {
    this.canvas=canvas;this.backend='three';this.zoom=canvas.getBoundingClientRect().width<600?1.65:1;
    this.pan={x:0,y:0};this.displayPan={x:0,y:0};this.displayZoom=this.zoom;this.azimuth=Math.PI/4;this.displayAzimuth=this.azimuth;this.hover=null;this.tool=null;this.selected='knight';this.lang='zh';
    this.time=0;this.ready=false;this.lost=false;this.disposed=false;this.frames=[];this.env=[];
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.gpu=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true,powerPreference:'default'});
    this.gpu.setClearColor(0x000000,0);this.gpu.outputColorSpace=THREE.SRGBColorSpace;
    this.gpu.toneMapping=THREE.NoToneMapping;
    this.view=new BattlefieldCamera();this.scene=new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#fff9e6','#879b7b',2.1));
    const sun=new THREE.DirectionalLight('#fff1cd',2.1);sun.position.set(-8,16,7);this.scene.add(sun);
    this.assets=new ForestAssets();this.factory=new ObjectFactory(this.assets);
    this.effects=new EffectsView(this.scene,this.factory);this.labels=new WorldLabels(canvas);
    this.actors=new Map();this.buildings=new Map();this.routeKey='';this.effectIds=new WeakMap();this.nextEffect=1;
    this.contextLost=e=>{e.preventDefault();this.lost=true;canvas.dispatchEvent(new CustomEvent('forest-context',{detail:{lost:true}}));};
    this.contextRestored=()=>{this.lost=false;this.resize();canvas.dispatchEvent(new CustomEvent('forest-context',{detail:{lost:false}}));};
    canvas.addEventListener('webglcontextlost',this.contextLost);canvas.addEventListener('webglcontextrestored',this.contextRestored);
  }
  async load() {
    await this.assets.load();
    for(const key of ['atlas','environment','frames','env'])this[key]=this.assets[key];
    this.terrain=this.factory.terrain();this.scene.add(this.terrain);
    this.crystal=this.factory.crystal();this.scene.add(this.crystal);
    this.coreBar=this.factory.healthBar('#75c6b4',1.1);this.coreBar.position.set(CORE.x,2.45,CORE.y);this.scene.add(this.coreBar);
    const tileGeometry=new THREE.PlaneGeometry(.97,.97);tileGeometry.rotateX(-Math.PI/2);
    this.cursor=new THREE.Mesh(tileGeometry,new THREE.MeshBasicMaterial({color:'#eaf0b4',transparent:true,opacity:.5,depthWrite:false}));
    this.cursor.position.y=.03;this.cursor.visible=false;this.scene.add(this.cursor);
    this.range=new THREE.Group();this.factory.ring(this.range,1,'#cdebea',.025);this.scene.add(this.range);
    this.home=new THREE.Group();this.factory.ring(this.home,.27,'#faf0bd',.04);this.scene.add(this.home);
    this.routes=new THREE.Group();this.scene.add(this.routes);
    this.ready=true;this.resize();
  }
  resize() {
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
    this.dpr=Math.min(devicePixelRatio||1,this.width<600?1.5:2);
    this.gpu.setPixelRatio(this.dpr);this.gpu.setSize(this.width,this.height,false);this.camera();
  }
  camera(){this.view.update(this.width||1,this.height||1,this.displayZoom??this.zoom,this.displayPan??this.pan,this.displayAzimuth??this.azimuth);this.scale=this.view.scale;}
  rotate(delta){this.azimuth+=delta;this.camera();}
  resetCamera(mobile=false){this.pan={x:0,y:0};this.azimuth=Math.PI/4;this.zoom=mobile&&this.width<600?1.65:1;this.camera();}
  project(x,y,z=0){this.camera();return this.view.project(x,y,z);}
  groundPoint(x,y){this.camera();return this.view.groundPoint(x,y);}
  unproject(x,y){this.camera();return this.view.unproject(x,y);}
  pickActor(state,px,py) {
    this.camera();this.scene.updateMatrixWorld(true);
    const targets=[...this.actors.values()].flatMap(group=>(group.userData.rig?group.userData.rig.children:[group.userData.body,group.userData.attackBody])).filter(body=>body?.userData.alive&&body.visible);
    for(const hit of this.view.ray(px,py).intersectObjects(targets,false)) {
      const body=hit.object,texture=body.material.map,uv=hit.uv;
      if(uv&&texture?.image) {
        const image=texture.image;
        texture.userData.alpha??=image.getContext('2d',{willReadFrequently:true}).getImageData(0,0,image.width,image.height).data;
        const x=Math.max(0,Math.min(image.width-1,Math.floor(uv.x*image.width))),y=Math.max(0,Math.min(image.height-1,Math.floor((1-uv.y)*image.height)));
        if(texture.userData.alpha[(y*image.width+x)*4+3]<48)continue;
      }
      const type=body.userData.actorType,source=type==='hero'?state.heroes:state.enemies;
      const actor=source.find(a=>a.id===body.userData.actorId);if(actor?.hp>0)return {...actor,type};
    }
    return null;
  }
  bar(group,value,max) {
    group.quaternion.copy(this.view.camera.quaternion);
    const ratio=THREE.MathUtils.clamp(value/max,0,1),{fill,width}=group.userData;
    fill.scale.x=width*ratio;fill.position.x=-(1-ratio)*width/2;
  }
  updateActors(game) {
    const state=game.state,alive=new Set();
    const update=(actor,type)=>{
      const hero=type==='hero',key=`${type}:${actor.id}`;alive.add(key);
      const base=hero?HEROES.find(h=>h.id===actor.id):null;
      const height=(hero?69:actor.boss?124:actor.kind==='jelly'?34:actor.kind==='golem'?66:48)/48;
      const texture=this.assets.actors[actor.sprite];
      let group=this.actors.get(key);
      if(!group){group=this.factory.actor(texture,height,hero?base.color:'#c48c76',type,actor.id);this.actors.set(key,group);this.scene.add(group);}
      const {body,attackBody,bar,select,slow,shadow}=group.userData;
      group.userData.motion??=new ActorMotion(actor);
      const pose=group.userData.motion.update(actor,this.motionDt||0,this.reduced,this.displayAzimuth??Math.PI/4,this.interpolation??1);
      group.position.set(pose.x,0,pose.y);body.material.map=texture;body.userData.alive=actor.hp>0;
      const width=texture.image.width/texture.image.height*height;
      body.scale.set(pose.face*width/pose.stretch,height*pose.stretch,1);
      body.position.set(pose.thrust*pose.face*.12,pose.lift,0);
      body.quaternion.copy(this.view.camera.quaternion);
      body.rotateZ(actor.hp>0?pose.lean:-pose.death*.65);
      const positions=body.geometry.attributes.position,rest=body.userData.rest;
      for(let i=0;i<positions.count;i++){const p=deformVertex(rest[i*3],rest[i*3+1],pose,actor.flying);positions.setXYZ(i,p.x,p.y,rest[i*3+2]);}
      positions.needsUpdate=true;
      const weight=0,opacity=actor.hp>0?1:hero?.32:Math.max(0,1-pose.death);
      body.material.opacity=opacity*(1-weight);body.visible=weight<.995;
      body.material.color.set(pose.hit>.05?'#ffe6d8':actor.enraged?'#ffd2c4':'#ffffff');
      attackBody.visible=hero&&weight>.005;attackBody.userData.alive=actor.hp>0;
      if(attackBody.visible){attackBody.material.map=this.assets.actors[actor.sprite+1];attackBody.material.opacity=opacity*weight;attackBody.position.copy(body.position);attackBody.quaternion.copy(body.quaternion);attackBody.translateZ(.005);attackBody.scale.copy(body.scale);const art=attackBody.material.map.image;attackBody.scale.x=pose.face*(art.width/art.height)*height/pose.stretch;}
      if(hero&&this.assets.rigs){
        group.userData.rig??=createRig(this.assets.rigs[RIG_IDS.indexOf(actor.id)],actor.id);
        const rig=group.userData.rig;if(!rig.parent)group.add(rig);
        updateRig(rig,this.assets.rigs[RIG_IDS.indexOf(actor.id)],pose,height,this.view.camera,actor.hp>0);body.visible=false;attackBody.visible=false;
      }
      shadow.scale.setScalar(actor.boss?.6:.35);shadow.visible=actor.hp>0;
      bar.position.y=height/Math.cos(Math.PI/6)+.15+body.position.y;bar.visible=actor.hp>0;
      this.bar(bar,actor.hp,hero?game.stats(actor).hp:actor.maxHp);
      select.visible=hero?actor.id===this.selected:actor.id===state.focus;slow.visible=actor.slow>0;
      if(hero&&actor.id===this.selected) {
        const p=this.view.project(actor.x,actor.y,84+body.position.y*42);
        this.labels.put('selected',TEXT(base.name,this.lang),p.x,p.y,{size:Math.max(10,11*this.scale)});
        this.home.position.set(actor.home.x,.04,actor.home.y);this.home.visible=this.tool==='move';
      }
      if(!hero&&actor.id===state.focus) {
        const p=this.view.project(actor.x,actor.y,height*48+24+(actor.flying?18:0));
        this.labels.put('focus','▼',p.x,p.y,{color:'#b15346',size:16});
      }
      if(actor.siege) {
        const p=this.view.project(actor.x,actor.y,height*48+16);
        this.labels.put(key,'⚒',p.x,p.y,{color:'#874c2c',size:13});
      }
    };
    for(const h of state.heroes)update(h,'hero');for(const e of state.enemies)update(e,'enemy');
    for(const [key,group]of this.actors)if(!alive.has(key)){this.factory.remove(group);this.actors.delete(key);}
  }
  updateBuildings(state) {
    const alive=new Set();
    for(const b of state.buildings) {
      alive.add(b.id);let group=this.buildings.get(b.id);
      if(group&&(group.userData.level!==b.level||group.userData.kind!==b.kind)){this.factory.remove(group);group=null;}
      if(!group){group=this.factory.building(b.kind,b.level);this.buildings.set(b.id,group);this.scene.add(group);}
      group.position.set(b.x,0,b.y);group.scale.y=b.ready>0?.25+.75*(1-b.ready/1.2):1;
      const bar=group.userData.bar;bar.visible=b.hp<b.maxHp;this.bar(bar,b.hp,b.maxHp);
      if(group.userData.turret) {
        const target=state.enemies.find(e=>e.id===state.focus)||state.enemies.find(e=>Math.hypot(e.x-b.x,e.y-b.y)<4.2);
        if(target)group.userData.turret.rotation.y=Math.atan2(b.x-target.x,b.y-target.y);
      }
      if(b.level>1){const p=this.view.project(b.x,b.y);this.labels.put(`level:${b.id}`,'◆'.repeat(b.level-1),p.x,p.y+14*this.scale,{color:'#86682e',size:10});}
    }
    for(const [id,group]of this.buildings)if(!alive.has(id)){this.factory.remove(group);this.buildings.delete(id);}
  }
  updateRoutes(game) {
    const state=game.state,waveIndex=Math.min(state.phase==='battle'?state.wave-1:state.wave,11);
    const key=`${game.navVersion}:${waveIndex}:${state.buildings.map(b=>`${b.id}:${b.x}:${b.y}`).join(',')}`;
    this.routes.visible=state.phase==='prep'||!['move',null].includes(this.tool);
    if(this.routeKey!==key) {
      for(const child of [...this.routes.children]){child.geometry.dispose();child.material.dispose();this.routes.remove(child);}
      for(const lane of WAVES[waveIndex].lanes) {
        const p=ENTRANCES[lane],route=game.route(p.x,p.y);
        const geometry=new THREE.BufferGeometry().setFromPoints(route.map(p=>new THREE.Vector3(p.x,.045,p.y)));
        const material=new THREE.LineDashedMaterial({color:'#fff0b6',dashSize:.15,gapSize:.16,transparent:true,opacity:.9,depthWrite:false});
        const line=new THREE.Line(geometry,material);line.computeLineDistances();this.routes.add(line);
      }
      this.routeKey=key;
    }
    for(const i of WAVES[waveIndex].lanes){const entry=ENTRANCES[i],p=this.view.project(entry.x,entry.y);this.labels.put(`gate:${i}`,TEXT(entry.name,this.lang),p.x,p.y+25*this.scale,{color:'#79563a',size:Math.max(10,11*this.scale)});}
  }
  updateCursor(game) {
    const h=this.hover,visible=h&&h.x>=0&&h.y>=0&&h.x<W&&h.y<H&&this.tool;
    this.cursor.visible=!!visible&&this.tool!=='move';this.range.visible=false;
    if(!visible){if(this.ghost)this.ghost.visible=false;return;}
    const building=BUILDINGS[this.tool],construct=['wall','tower','frost'].includes(this.tool);
    const valid=!construct||!game.canBuild(this.tool,h.x,h.y);
    this.cursor.position.set(h.x,.033,h.y);this.cursor.material.color.set(valid?'#e9f1b4':'#dd8579');
    if(construct) {
      if(this.ghost?.userData.kind!==this.tool){if(this.ghost)this.factory.remove(this.ghost);this.ghost=this.factory.building(this.tool);this.ghost.userData.ownedMaterials=[];
        this.ghost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.38;o.material.depthWrite=false;this.ghost.userData.ownedMaterials.push(o.material);}});this.scene.add(this.ghost);}
      this.ghost.visible=true;this.ghost.position.set(h.x,.015,h.y);
    } else if(this.ghost)this.ghost.visible=false;
    if(this.tool==='skill'||this.tool==='tower'||this.tool==='frost') {
      const radius=this.tool==='skill'?2.4:this.tool==='frost'?1.48:building.range;
      this.range.visible=true;this.range.position.set(h.x,.045,h.y);this.range.scale.setScalar(radius);
    }
    const b=game.state.buildings.find(b=>b.x===h.x&&b.y===h.y);
    if(b&&['repair','upgrade','sell'].includes(this.tool)) {
      const p=this.view.project(h.x,h.y,100);
      this.labels.put('building-info',`${TEXT(BUILDINGS[b.kind].name,this.lang)} Lv.${b.level} · ${Math.ceil(b.hp)}/${b.maxHp}${this.tool==='upgrade'&&b.level<3?' · '+(28+(b.level-1)*18)+'G':''}`,p.x,p.y,{color:'#fff8e5',className:'label-chip'});
    }
  }
  draw(game,dt=0) {
    if(!this.ready||this.lost||this.disposed)return;
    this.motionDt=Math.max(0,dt);this.time+=this.motionDt;const smoothing=this.reduced?1:1-Math.exp(-15*this.motionDt);this.displayZoom=(this.displayZoom??this.zoom)+(this.zoom-(this.displayZoom??this.zoom))*smoothing;this.displayPan??={...this.pan};this.displayPan.x+=(this.pan.x-this.displayPan.x)*smoothing;this.displayPan.y+=(this.pan.y-this.displayPan.y)*smoothing;this.displayAzimuth=this.reduced?this.azimuth:(this.displayAzimuth??this.azimuth)+(this.azimuth-(this.displayAzimuth??this.azimuth))*(1-Math.exp(-12*this.motionDt));this.camera();this.labels.begin();this.home.visible=false;
    this.updateActors(game);this.updateBuildings(game.state);this.updateRoutes(game);this.updateCursor(game);
    this.effects.update(game.state,this.time,this.reduced);
    const gem=this.crystal.userData.gem;
    gem.rotation.y=this.reduced?.3:this.time*.22;gem.position.y=1.28+(this.reduced?0:Math.sin(this.time*2)*.035);
    const crystalPos=this.view.project(CORE.x,CORE.y);
    const occluded=game.state.heroes.some(h=>{const p=this.view.project(h.x,h.y);return h.hp>0&&Math.abs(p.x-crystalPos.x)<35*this.scale&&p.y<crystalPos.y&&p.y>crystalPos.y-70*this.scale;});
    gem.material.opacity=occluded?.42:.88;
    this.coreBar.visible=game.state.core.hp<game.state.core.maxHp;this.bar(this.coreBar,game.state.core.hp,game.state.core.maxHp);
    for(const effect of game.state.effects)if(['number','coin'].includes(effect.type)) {
      let entry=this.effectIds.get(effect);if(!entry){entry={id:this.nextEffect++,born:this.time,ttl:effect.ttl};this.effectIds.set(effect,entry);}
      const age=(effect.duration??entry.ttl)-effect.ttl;if(age>entry.ttl)continue;
      const p=this.view.project(effect.x,effect.y,50+age*22);
      this.labels.put(`effect:${entry.id}`,effect.type==='coin'?`+${effect.value}`:effect.value,p.x,p.y,{color:effect.type==='coin'?'#8a6537':effect.color,className:effect.type==='number'?'label-damage':'',opacity:Math.min(1,(entry.ttl-age)*4),size:Math.max(11,13*this.scale)});
    }
    this.labels.end();this.gpu.render(this.scene,this.view.camera);
  }
  diagnostics(){return {backend:this.backend,motion:'professional1',riggedHeroes:[...this.actors.values()].filter(a=>a.userData.rig).length,revision:THREE.REVISION,contextLost:this.lost,drawCalls:this.gpu.info.render.calls,triangles:this.gpu.info.render.triangles,geometries:this.gpu.info.memory.geometries,textures:this.gpu.info.memory.textures,actors:this.actors.size,buildings:this.buildings.size};}
  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);
    this.effects.dispose();for(const group of this.actors.values())this.factory.remove(group);for(const group of this.buildings.values())this.factory.remove(group);
    if(this.ghost)this.factory.remove(this.ghost);if(this.crystal)this.factory.remove(this.crystal);
    this.terrain?.traverse(o=>{if(o.isSprite)o.material.dispose();});
    this.routes?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    this.cursor?.geometry.dispose();this.cursor?.material.dispose();
    this.factory.dispose();this.assets.dispose();this.labels.dispose();this.gpu.dispose();this.scene.clear();
  }
}
