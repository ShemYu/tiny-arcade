import {HEROES} from './guard-content.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const MOTION_PROFILES={knight:{windup:.18,recovery:.24,stride:.78},ranger:{windup:.24,recovery:.16,stride:.72},mage:{windup:.32,recovery:.3,stride:.62},priest:{windup:.28,recovery:.27,stride:.64},enemy:{windup:.24,recovery:.27,stride:.7}};
/** Simulation owns every release and impact. Renderers only sample this timeline. */
export const combatMethods={
 beginAction(actor,kind,target){
  if(actor.hp<=0||actor.action)return false;
  const profile=MOTION_PROFILES[actor.id]||MOTION_PROFILES.enemy;
  const haste=actor.gear?1+this.stats(actor).haste:1;
  const windup=profile.windup/haste*(kind==='skill'?1.4:1);
  actor.action={id:this.state.nextId++,kind,targetId:target?.id,x:target.x,y:target.y,age:0,windup,duration:windup+profile.recovery/haste,released:false};
  actor.aim={x:target.x-actor.x,y:target.y-actor.y};actor.moving=false;return true;
 },
 attack(h,target){return target?.hp>0&&this.beginAction(h,'attack',target);},
 skill(id,x,y){const s=this.state,h=s.heroes.find(a=>a.id===id);if(s.phase!=='battle'||!h||h.hp<=0||h.cool>0||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=15||y>=11)return false;
  // An explicit skill supersedes a normal attack, but never erases a released missile.
  h.action=null;const st=this.stats(h);h.cool=HEROES.find(a=>a.id===id).cooldown*(1-Math.min(.65,st.cdr));return this.beginAction(h,'skill',{x,y});
 },
 emitCombat(kind,source){this.state.events.push({id:this.state.nextId++,kind,source,time:this.state.time});if(this.state.events.length>48)this.state.events.shift();},
 launch(from,target,payload){const s=this.state,duration=Math.max(.1,dist(from,target)/(payload.kind==='attack'?9:12));s.projectiles.push({type:'shot',id:s.nextId++,x:from.x,y:from.y,tx:target.x,ty:target.y,targetId:target.id,age:0,duration,...payload});},
 clearCombat(){this.state.projectiles=[];for(const a of [...this.state.heroes,...this.state.enemies])a.action=null;},
 advanceCombat(dt){
  const s=this.state,find=id=>s.enemies.find(e=>e.id===id)||s.heroes.find(h=>h.id===id)||s.buildings.find(b=>b.id===id);
  // Advance existing missiles first: a missile released this tick starts at age zero.
  for(const p of s.projectiles){p.age+=dt;const target=find(p.targetId);if(target?.hp>0){p.tx=target.x;p.ty=target.y;}if(p.age+1e-9<p.duration)continue;
   if(p.kind==='rain'){this.resolveSkill(s.heroes.find(h=>h.id===p.source),p.tx,p.ty);this.emitCombat('skill',p.source);}
   else if(target?.hp>0){const source=s.heroes.find(h=>h.id===p.source);if(p.kind==='attack')this.resolveAttack(source,target);else this.damage(target,p.amount,source,p.magic);this.effect('impact',{x:target.x,y:target.y,ttl:.18,radius:.35,color:p.color});this.emitCombat('hit',p.source);}
  }
  s.projectiles=s.projectiles.filter(p=>p.age+1e-9<p.duration);
  for(const actor of [...s.heroes,...s.enemies]){const a=actor.action;if(!a)continue;if(actor.hp<=0){actor.action=null;continue;}a.age+=dt;
   if(!a.released&&a.age+1e-9>=a.windup){a.released=true;const target=find(a.targetId);const color=HEROES.find(h=>h.id===actor.id)?.color||'#c67865';
    if(a.kind==='skill'){if(actor.id==='ranger')s.projectiles.push({type:'rain',id:s.nextId++,kind:'rain',source:actor.id,x:a.x,y:a.y,tx:a.x,ty:a.y,age:0,duration:.42});else{this.resolveSkill(actor,a.x,a.y);this.emitCombat('skill',actor.id);}}
    else if(a.kind==='heal'&&target?.hp>0){const st=this.stats(actor);target.hp=Math.min(this.stats(target).hp,target.hp+(24+st.atk*.5)*(1+st.heal));this.effect('heal',{x:target.x,y:target.y,ttl:.7});this.emitCombat('heal',actor.id);}
    else if(a.kind==='core'){if(dist(actor,s.core)<1){s.core.hp=Math.max(0,s.core.hp-actor.atk);this.effect('danger',{x:s.core.x,y:s.core.y,ttl:.5});this.emitCombat('hit',actor.id);}}
    else if(target?.hp>0){if(a.kind==='attack'&&actor.id!=='knight')this.launch(actor,target,{kind:'attack',source:actor.id,color});
     else if(dist(actor,target)<(a.kind==='enemy'?1.5:this.stats(actor).range+.3)){
      this.effect('slash',{x:actor.x,y:actor.y,tx:target.x,ty:target.y,ttl:.2,color});
      if(a.kind==='enemy'){const armor=target.gear?this.stats(target).armor:0;target.hp-=Math.max(1,actor.atk-armor);target.hit=.18;if(target.gear&&this.stats(target).effects.includes('thorns'))this.damage(actor,12,target,true);}
      else this.resolveAttack(actor,target);this.emitCombat('hit',actor.id);
     }
    }
   }
   if(a.age+1e-9>=a.duration)actor.action=null;
  }
 }
};
