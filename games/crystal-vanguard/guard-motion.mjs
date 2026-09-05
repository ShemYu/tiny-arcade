import {MOTION_PROFILES} from './guard-combat.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const damp=(a,b,r,dt)=>a+(b-a)*(1-Math.exp(-r*dt));
/** Distance-driven gait and simulation interpolation. Never writes to actors. */
export class ActorMotion {
 constructor(a){this.x=a.x;this.y=a.y;this.lastX=a.x;this.lastY=a.y;this.time=0;this.stride=0;this.speed=0;this.face=a.face||1;this.turn=this.face;this.lastHp=a.hp;this.hitAge=9;this.feet=[{},{}];this.direction={x:1,y:0};}
 update(a,dt,reduced=false,angle=Math.PI/4,alpha=1){
  dt=clamp(dt,0,.1);this.time+=dt;const profile=MOTION_PROFILES[a.id]||MOTION_PROFILES.enemy;
  const x=(a.prevX??a.x)+(a.x-(a.prevX??a.x))*alpha,y=(a.prevY??a.y)+(a.y-(a.prevY??a.y))*alpha;
  let dx=x-this.lastX,dy=y-this.lastY,travel=Math.hypot(dx,dy);if(travel>2){dx=dy=travel=0;this.feet=[{},{}];}
  const velocity=dt?Math.min(5,travel/dt):this.speed;this.speed=damp(this.speed,velocity,18,dt);
  if(travel>.00001)this.direction={x:dx/travel,y:dy/travel};
  this.stride+=travel/profile.stride*Math.PI*2;this.lastX=x;this.lastY=y;this.x=x;this.y=y;
  const aim=a.action?a.aim:this.direction,screen=(aim?.x||0)*Math.cos(angle)-(aim?.y||0)*Math.sin(angle);
  if(Math.abs(screen)>.08&&(travel>.00001||a.action))this.face=screen>0?1:-1;
  this.turn=damp(this.turn,this.face,22,dt);
  if(a.hp<this.lastHp)this.hitAge=0;else this.hitAge+=dt;this.lastHp=a.hp;
  const move=clamp(this.speed/1.2,0,1),breath=Math.sin(this.time*2.4),action=a.action;
  const age=action?Math.max(0,action.age-(1-alpha)/60):0;
  const windup=action?.windup||1,after=age-windup;
  const ready=action?ease(age/windup):0;
  const strike=action?ease((after+.035)/.07)*(1-ease(after/(action.duration-windup))):0;
  const anticipation=action&&age<windup?ready:0;
  const recoil=Math.sin(clamp(this.hitAge/.2,0,1)*Math.PI)*(1-clamp(this.hitAge/.2,0,1));
  const feet=this.feet.map((foot,i)=>{
   const cycle=((this.stride/(2*Math.PI)+i*.5)%1+1)%1,stance=cycle<.6;
   if(foot.stance!==stance||foot.x===undefined){foot.stance=stance;if(stance){foot.x=x+this.direction.x*profile.stride*.3;foot.y=y+this.direction.y*profile.stride*.3;}}
   let fx,fy,lift=0;if(stance&&move>.1){fx=foot.x-x;fy=foot.y-y;}else{const u=ease((cycle-.6)/.4),offset=(-.3+u*.6)*profile.stride;fx=this.direction.x*offset;fy=this.direction.y*offset;lift=Math.sin(clamp((cycle-.6)/.4,0,1)*Math.PI)*.10*move;}
   return {x:clamp((fx*Math.cos(angle)-fy*Math.sin(angle))*move,-.28,.28),y:(fx*Math.sin(angle)+fy*Math.cos(angle))*.5*move,lift};
  });
  const pose={x,y,face:this.face,turn:this.turn,phase:this.stride,move,feet,attack:action?1:0,anticipation,strike,age,stage:a.hp<=0?'dead':action?(age<windup?'windup':after<.08?'active':'recover'):move>.1?'move':'idle',breath,lean:-screen*.035*move+(strike*.08-anticipation*.035)*this.face-recoil*.08*this.face,lift:Math.abs(Math.sin(this.stride))*.028*move+breath*.006*(1-move),stretch:1, sway:Math.sin(this.stride)*.02*move,thrust:strike*.10,hit:recoil,death:clamp((a.deathAge||0)/.3,0,1)};
  if(a.kind==='jelly'){pose.stretch=1+Math.sin(this.time*7)*.12;pose.lift=Math.max(0,Math.sin(this.time*7))*.07;}
  if(a.flying){pose.phase=this.time*12;pose.lift=.45+Math.sin(this.time*6)*.07;}
  if(reduced)Object.assign(pose,{turn:this.face,lift:a.flying?.45:0,lean:0,stretch:1,sway:0,thrust:0,move:0,hit:0,breath:0,phase:0,feet:[{x:0,y:0,lift:0},{x:0,y:0,lift:0}]});
  return pose;
 }
}
export function deformVertex(x,y,p,flying=false){const leg=1-ease((y-.02)/.43),step=Math.sin(p.phase+(x<0?-1:1)*Math.PI/2)*p.move;return{x:x+leg*step*.018+p.sway*y*y,y:y+leg*Math.max(0,step)*.026+(flying?Math.sin(p.phase)*Math.pow(Math.abs(x)*2,1.5)*.08:0)};}
