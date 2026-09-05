import * as THREE from '../vendor/three/three.module.min.js';
import {W,H} from '../guard-content.mjs';

/** Grid coordinates are world X/Z. Camera state never changes the simulation. */
export class BattlefieldCamera {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 160);
    this.raycaster = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.point = new THREE.Vector3();
    this.ndc = new THREE.Vector2();
    this.width = 1; this.height = 1;
  }
  update(width, height, zoom = 1, pan = {x:0,y:0}, azimuth = Math.PI/4) {
    this.width = Math.max(1,width); this.height = Math.max(1,height);
    this.scale = Math.min(this.width/1050, this.height/660) * zoom;
    this.pixels = 48*this.scale;
    const c=this.camera, halfH=this.height/(2*this.pixels), halfW=this.width/(2*this.pixels);
    Object.assign(c,{left:-halfW,right:halfW,top:halfH,bottom:-halfH});
    const elevation=Math.PI/6;
    const direction=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
    const right=new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth));
    const up=new THREE.Vector3().crossVectors(direction,right);
    const target=new THREE.Vector3((W-1)/2,0,(H-1)/2)
      .addScaledVector(right,-pan.x/this.pixels)
      .addScaledVector(up,(pan.y+24*this.scale)/this.pixels);
    c.position.copy(target).addScaledVector(direction,45);
    c.up.set(0,1,0); c.lookAt(target); c.updateProjectionMatrix(); c.updateMatrixWorld();
  }
  project(x,y,lift=0) {
    this.point.set(x,lift/(48*Math.cos(Math.PI/6)),y).project(this.camera);
    return {x:(this.point.x+1)*this.width/2,y:(1-this.point.y)*this.height/2};
  }
  ray(px,py) {
    this.ndc.set(px/this.width*2-1,1-py/this.height*2);
    this.raycaster.setFromCamera(this.ndc,this.camera);
    return this.raycaster;
  }
  groundPoint(px,py) {
    const p=this.ray(px,py).ray.intersectPlane(this.ground,this.point);
    return p?{x:p.x,y:p.z}:{x:-1,y:-1};
  }
  unproject(px,py) {
    const p=this.ray(px,py).ray.intersectPlane(this.ground,this.point);
    return p?{x:Math.round(p.x)||0,y:Math.round(p.z)||0}:{x:-1,y:-1};
  }
}
