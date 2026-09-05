import * as THREE from '../vendor/three/three.module.min.js';

/** Transient meshes are reconciled by effect identity and released when expired. */
export class EffectsView {
  constructor(scene,factory){this.scene=scene;this.factory=factory;this.items=new Map();this.fields=new Map();}
  beam(parent,from,to,color,radius=.025) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.sub(a);
    const mesh=new THREE.Mesh(this.factory.geometry('beam',()=>new THREE.CylinderGeometry(1,1,1,5)),this.factory.material(color,true));
    mesh.position.copy(a).addScaledVector(delta,.5);mesh.scale.set(radius,delta.length(),radius);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;
  }
  create(effect) {
    const group=new THREE.Group(),f=this.factory,color=effect.color||'#b2e4d4';
    group.position.set(effect.x,.045,effect.y);
    if(effect.type==='shot'||effect.type==='slash') {
      this.beam(group,[0,effect.tower?1.5:.72,0],[effect.tx-effect.x,.5,effect.ty-effect.y],color,effect.type==='slash'?.045:.019);
    } else if(effect.type==='rain') {
      for(let i=0;i<12;i++) {
        const x=Math.sin(i*31)*1.9,z=Math.cos(i*21)*1.9;
        this.beam(group,[x-.22,1.8,z],[x,.05,z],color,.02);
      }
    } else {
      f.ring(group,effect.radius||.7,color,.05);
      if(effect.type==='heal') {
        f.box(group,[.1,.5,.08],[0,.9,0],'#d6f5b5');
        f.box(group,[.4,.1,.08],[0,.9,0],'#d6f5b5');
      }
    }
    this.scene.add(group);return group;
  }
  update(state,time,reduced) {
    const alive=new Set();
    for(const effect of state.effects) {
      if(['number','coin'].includes(effect.type))continue;
      alive.add(effect);
      let item=this.items.get(effect);
      if(!item){item={group:this.create(effect),born:time,ttl:effect.ttl};this.items.set(effect,item);}
      const age=time-item.born;
      item.group.visible=age<item.ttl;
      if(!['shot','slash','rain'].includes(effect.type))item.group.scale.setScalar(reduced?1:1+Math.min(age,1)*.5);
      if(effect.type==='rain')item.group.position.y=reduced?.05:.05+Math.max(0,.5-age);
    }
    for(const [key,item] of this.items)if(!alive.has(key)){this.factory.remove(item.group);this.items.delete(key);}
    const fields=new Set(state.fields);
    for(const field of fields) {
      let group=this.fields.get(field);
      if(!group) {
        group=new THREE.Group();this.factory.ring(group,2.5,'#a3dfe0',.035);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;this.factory.cylinder(group,0,.07,.26,[Math.cos(a)*2.2,.15,Math.sin(a)*2.2],'#d4f6ee',4);}
        this.scene.add(group);this.fields.set(field,group);
      }
      group.position.set(field.x,.035,field.y);group.rotation.y=reduced?0:time*.25;
    }
    for(const [field,group]of this.fields)if(!fields.has(field)){this.factory.remove(group);this.fields.delete(field);}
  }
  dispose(){for(const {group}of this.items.values())this.factory.remove(group);for(const group of this.fields.values())this.factory.remove(group);this.items.clear();this.fields.clear();}
}
