const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
/** A continuous, time-based pose. Presentation only: never writes gameplay state. */
export class ActorMotion {
 constructor(actor){this.x=actor.x;this.y=actor.y;this.lastX=actor.x;this.lastY=actor.y;this.time=0;this.stride=0;this.speed=0;this.lean=0;this.attackAge=9;this.lastAnim=0;this.lastHp=actor.hp;this.hitAge=9;this.face=actor.face||1;}
 update(actor,dt,reduced=false){
  dt=clamp(dt,0,.1);this.time+=dt;
  const dx=actor.x-this.lastX,dy=actor.y-this.lastY,travel=Math.hypot(dx,dy);
  if(travel>3){this.x=actor.x;this.y=actor.y;}
  const velocity=dt>0?Math.min(5,travel/dt):0;
  this.speed=damp(this.speed,velocity,velocity>this.speed?16:10,dt);
  this.x=damp(this.x,actor.x,32,dt);this.y=damp(this.y,actor.y,32,dt);
  this.stride+=this.speed*dt*10;this.lastX=actor.x;this.lastY=actor.y;
  if((actor.anim||0)>this.lastAnim+.05)this.attackAge=0;else this.attackAge+=dt;
  this.lastAnim=actor.anim||0;
  if(actor.hp<this.lastHp)this.hitAge=0;else this.hitAge+=dt;this.lastHp=actor.hp;
  const directional=dx-dy;
  if(Math.abs(directional)>.0005)this.face=directional>0?1:-1;
  else if(actor.anim>0)this.face=actor.face||this.face;
  this.lean=damp(this.lean,clamp(directional/(dt||1),-3,3)*-.025,13,dt);
  const move=clamp(this.speed/1.3,0,1),walk=Math.sin(this.stride),breath=Math.sin(this.time*2.5);
  const age=this.attackAge;
  const anticipation=1-ease(age/.10),strike=ease((age-.07)/.07)*(1-ease((age-.15)/.23));
  const weight=ease(age/.07)*(1-ease((age-.20)/.16));
  const recoil=Math.sin(clamp(this.hitAge/.22,0,1)*Math.PI)*(1-clamp(this.hitAge/.22,0,1));
  const pose={x:this.x,y:this.y,face:this.face,phase:this.stride,move,attack:weight,breath,lean:this.lean+(strike*.10-anticipation*.045)*this.face-recoil*.1*this.face,lift:Math.abs(walk)*.045*move+breath*.008*(1-move),stretch:1+breath*.009*(1-move)-Math.cos(this.stride*2)*.025*move,sway:walk*.02*move,thrust:strike*.12-anticipation*.035,hit:recoil};
  if(actor.kind==='jelly'){pose.stretch=1+Math.sin(this.time*7)*.12;pose.lift=Math.max(0,Math.sin(this.time*7))*.07;}
  if(actor.flying){pose.lift=.45+Math.sin(this.time*6)*.07;pose.lean+=Math.sin(this.time*4)*.07;}
  if(reduced)Object.assign(pose,{x:actor.x,y:actor.y,lift:actor.flying?.45:0,lean:0,stretch:1,sway:0,thrust:0,move:0,hit:0,breath:0,phase:0});
  return pose;
 }
}
/** Soft deformation of an intact painted cutout; no destructive image slicing. */
export function deformVertex(x,y,pose,flying=false) {
 const leg=1-ease((y-.02)/.43),side=x<0?-1:1;
 const step=Math.sin(pose.phase+side*Math.PI/2)*pose.move;
 const wing=flying?Math.sin(pose.phase+pose.breath*4)*Math.pow(Math.abs(x)*2,1.5)*.08:0;
 return {x:x+leg*step*.028+pose.sway*y*y+pose.thrust*y*.13,y:y+leg*Math.max(0,step)*.026+wing};
}
