import * as THREE from '../vendor/three/three.module.min.js';
import {rigPose} from '../guard-rig.mjs';
export function createRig(textures,id){
 const root=new THREE.Group(),materials=textures.map(map=>new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 root.userData={id,ownedMaterials:materials,ownedGeometries:[]};
 // One reusable mesh per visible segment; no per-frame geometry allocation.
 for(let i=0;i<12;i++){const geometry=new THREE.PlaneGeometry(1,1);root.userData.ownedGeometries.push(geometry);const mesh=new THREE.Mesh(geometry,materials[0]);mesh.userData={actorType:'hero',actorId:id,alive:true};root.add(mesh);}
 return root;
}
export function updateRig(root,textures,pose,height,camera,alive){
 root.quaternion.copy(camera.quaternion);root.rotateZ(alive?-pose.lean:-pose.death*.65);root.scale.set(Math.sign(pose.turn||pose.face)*Math.max(.32,Math.abs(pose.turn))*height/100,height/100,height/100);
 const segments=rigPose(root.userData.id,pose);root.children.forEach((m,i)=>m.visible=i<segments.length);
 segments.forEach((p,i)=>{const mesh=root.children[i],fraction=p.uv[1]-p.uv[0],im=textures[p.part].image,w=im.width/im.height*p.h/fraction;
  mesh.material=root.userData.ownedMaterials[p.part];mesh.material.opacity=alive?1:.32;mesh.material.color.set(pose.hit>.06?'#ffe1c9':'#ffffff');mesh.userData.alive=alive;
  const cx=w*(.5-p.anchor),cy=p.h*(.5-p.ay);mesh.position.set(p.x+cx*Math.cos(p.angle)-cy*Math.sin(p.angle),100-p.y-cx*Math.sin(p.angle)-cy*Math.cos(p.angle),i*.04);mesh.rotation.z=-p.angle;mesh.scale.set(w,p.h,1);
  const uv=mesh.geometry.attributes.uv;uv.setXY(0,0,1-p.uv[0]);uv.setXY(1,1,1-p.uv[0]);uv.setXY(2,0,1-p.uv[1]);uv.setXY(3,1,1-p.uv[1]);uv.needsUpdate=true;
 });
}
