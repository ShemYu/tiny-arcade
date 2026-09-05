import {W,H,CORE,ROCKS,ENTRANCES,HEROES,BUILDINGS,ENEMIES,WAVES,GEAR} from './guard-content.mjs';
const copy=v=>JSON.parse(JSON.stringify(v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=(x,y)=>`${x},${y}`;
const inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const neighbors=(x,y)=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(p=>inside(...p));
const stone=new Set(ROCKS.map(p=>key(...p)));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Game {
 constructor(seed=Date.now()){this.state=this.fresh(seed);this.navigation();}
 fresh(seed){return {version:1,seed:seed>>>0,rng:seed>>>0,phase:'prep',wave:0,time:0,gold:100,core:{...CORE,hp:240,maxHp:240},heroes:HEROES.map((h,i)=>({...h,name:undefined,job:undefined,desc:undefined,skill:undefined,x:6+i%2*2,y:4+Math.floor(i/2)*2,home:{x:6+i%2*2,y:4+Math.floor(i/2)*2},hp:h.hp,baseHp:h.hp,gear:{weapon:null,armor:null,charm:null},cool:0,attack:0,anim:0,face:1,kills:0})),buildings:[],enemies:[],effects:[],fields:[],queue:[],reward:[],bag:[],nextId:1,kills:0,totalBuilt:0,level:1,focus:null,result:null};}
 random(){let t=this.state.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);this.state.rng>>>=0;return((t^t>>>14)>>>0)/4294967296;}
 stats(h){const base=HEROES.find(x=>x.id===h.id),s={hp:base.hp+22*(this.state.level-1),atk:base.atk+3*(this.state.level-1),range:base.range,haste:0,armor:0,heal:0,cdr:0,effects:[]};for(const id of Object.values(h.gear)){const g=GEAR.find(x=>x.id===id);if(!g)continue;for(const[k,v]of Object.entries(g.stats))s[k]=(s[k]||0)+v;s.effects.push(g.effect);}return s;}
 blocked(extra){const b=new Set(stone);for(const x of this.state.buildings)if(BUILDINGS[x.kind].solid&&x.hp>0)b.add(key(x.x,x.y));if(extra)b.add(key(extra.x,extra.y));return b;}
 flow(extra){const blocked=this.blocked(extra),dist=new Map([[key(CORE.x,CORE.y),0]]),queue=[[CORE.x,CORE.y]];for(let i=0;i<queue.length;i++){const[x,y]=queue[i];for(const[nx,ny]of neighbors(x,y)){const k=key(nx,ny);if(blocked.has(k)||dist.has(k))continue;dist.set(k,dist.get(key(x,y))+1);queue.push([nx,ny]);}}return dist;}
 navigation(){this.nav=this.flow();this.navVersion=(this.navVersion||0)+1;}
 route(x,y){let p=[Math.round(x),Math.round(y)],out=[{x:p[0],y:p[1]}];for(let n=0;n<200&&!(p[0]===CORE.x&&p[1]===CORE.y);n++){const d=this.nav.get(key(...p));const next=neighbors(...p).find(q=>this.nav.get(key(...q))<d);if(!next)break;p=next;out.push({x:p[0],y:p[1]});}return out;}
 validTile(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&inside(x,y)&&!stone.has(key(x,y));}
 canBuild(kind,x,y){const s=this.state,b=BUILDINGS[kind];if(!b||!('hp'in b)||!['prep','battle'].includes(s.phase))return 'phase';if(!this.validTile(x,y)||key(x,y)===key(CORE.x,CORE.y)||ENTRANCES.some(p=>p.x===x&&p.y===y))return 'tile';if(s.buildings.some(b=>b.x===x&&b.y===y)||s.heroes.some(h=>distance(h,{x,y})<.65)||s.enemies.some(e=>e.hp>0&&distance(e,{x,y})<.65))return 'occupied';if(s.gold<b.cost)return 'gold';if(b.solid){const nav=this.flow({x,y});if(!ENTRANCES.every(p=>nav.has(key(p.x,p.y)))||s.enemies.some(e=>e.hp>0&&!e.flying&&!nav.has(key(Math.round(e.x),Math.round(e.y))))||s.heroes.some(h=>!nav.has(key(Math.round(h.x),Math.round(h.y)))||!nav.has(key(h.home.x,h.home.y))))return 'route';}return null;}
 build(kind,x,y){const err=this.canBuild(kind,x,y);if(err)return{ok:false,error:err};const s=this.state,b=BUILDINGS[kind];s.gold-=b.cost;s.buildings.push({id:s.nextId++,kind,x,y,hp:b.hp,maxHp:b.hp,level:1,invested:b.cost,ready:s.phase==='battle'?1.2:0,attack:0});s.totalBuilt++;this.navigation();this.effect('build',{x,y,color:'#edd8a0',ttl:.8});return{ok:true};}
 interact(tool,x,y){const s=this.state;if(!['prep','battle'].includes(s.phase))return{ok:false,error:'phase'};const b=s.buildings.find(b=>b.x===x&&b.y===y);if(tool==='repair'&&x===CORE.x&&y===CORE.y){if(s.core.hp>=s.core.maxHp)return{ok:false,error:'full'};if(s.gold<10)return{ok:false,error:'gold'};s.gold-=10;s.core.hp=Math.min(s.core.maxHp,s.core.hp+35);this.effect('heal',{x,y,ttl:1});return{ok:true};}if(!b)return{ok:false,error:'building'};if(tool==='sell'){s.gold+=Math.floor(b.invested*.6*b.hp/b.maxHp);s.buildings=s.buildings.filter(a=>a!==b);this.navigation();return{ok:true};}if(tool==='repair'){if(b.hp>=b.maxHp)return{ok:false,error:'full'};if(s.gold<10)return{ok:false,error:'gold'};s.gold-=10;b.hp=Math.min(b.maxHp,b.hp+100);this.effect('heal',{x,y,ttl:1});return{ok:true};}if(tool==='upgrade'){if(b.level>=3)return{ok:false,error:'max'};const price=28+(b.level-1)*18;if(s.gold<price)return{ok:false,error:'gold'};s.gold-=price;b.invested+=price;b.level++;b.maxHp+=100;b.hp+=100;this.effect('build',{x,y,ttl:1,color:'#f3d58d'});return{ok:true};}return{ok:false,error:'tool'};}
 moveHero(id,x,y){const s=this.state,h=s.heroes.find(h=>h.id===id);if(!h||h.hp<=0||!['prep','battle'].includes(s.phase)||!this.validTile(x,y)||this.blocked().has(key(x,y))||key(x,y)===key(CORE.x,CORE.y))return false;h.home={x,y};if(s.phase==='prep'){h.x=x;h.y=y;}return true;}
 effect(type,data){this.state.effects.push({type,ttl:.5,...data});}
 start(){const s=this.state;if(s.phase!=='prep'||s.wave>=WAVES.length)return false;s.wave++;s.phase='battle';s.waveTime=0;s.queue=[];s.focus=null;const wave=WAVES[s.wave-1];let at=1.2,j=0;for(const[kind,count]of wave.groups){for(let n=0;n<count;n++){const lane=wave.lanes[j++%wave.lanes.length];s.queue.push({at,kind,lane});at+=kind==='boss'?2.3:Math.max(.5,1.05-s.wave*.025);}}s.queue.sort((a,b)=>a.at-b.at);return true;}
 spawn(kind,lane){const s=this.state,base=ENEMIES[kind],p=ENTRANCES[lane],scale=1+(s.wave-1)*.115;let hp=base.hp*scale;if(base.boss&&s.wave===12)hp*=1.65;const e={...base,kind,id:s.nextId++,x:p.x,y:p.y,hp,maxHp:hp,atk:base.atk*(1+(s.wave-1)*.065),slow:0,burn:0,attack:0,anim:0,enraged:false,step:null};s.enemies.push(e);return e;}
 damage(e,amount,source,magic=false){if(e.hp<=0)return;let dmg=Math.max(1,amount-(magic?0:e.armor));if(source?.gear&&this.stats(source).effects.includes('freeze')&&e.slow>0)dmg*=1.25;e.hp-=dmg;e.hit=.13;this.effect('number',{x:e.x,y:e.y,value:Math.round(dmg),ttl:.65,color:magic?'#d0b4eb':'#fff0ca'});if(source?.gear&&this.stats(source).effects.includes('lifesteal'))source.hp=Math.min(this.stats(source).hp,source.hp+Math.min(dmg,Math.max(0,e.hp+dmg))*.18);if(e.hp<=0){const s=this.state;s.gold+=e.gold;s.kills++;if(source?.gear)source.kills++;this.effect('coin',{x:e.x,y:e.y,value:e.gold,ttl:.8});}}
 attack(h,target){const s=this.state,st=this.stats(h),magic=h.id==='mage'||h.id==='priest';h.anim=.35;h.face=target.x-h.x>=0?1:-1;this.effect(h.id==='knight'?'slash':'shot',{x:h.x,y:h.y,tx:target.x,ty:target.y,ttl:.25,color:HEROES.find(a=>a.id===h.id).color});const victims=h.id==='mage'?s.enemies.filter(e=>e.hp>0&&distance(e,target)<1.15):[target];for(const e of victims){this.damage(e,st.atk,h,magic);if(st.effects.includes('freeze'))e.slow=2.3;if(st.effects.includes('burn'))e.burn=3;}
 if(st.effects.includes('cleave'))for(const e of s.enemies)if(e!==target&&e.hp>0&&distance(e,h)<1.7)this.damage(e,st.atk*.65,h);
 if(st.effects.includes('pierce')){const dx=target.x-h.x,dy=target.y-h.y,len=Math.hypot(dx,dy)||1;for(const e of s.enemies){if(e===target||e.hp<=0)continue;const along=((e.x-h.x)*dx+(e.y-h.y)*dy)/len,across=Math.abs((e.x-h.x)*dy-(e.y-h.y)*dx)/len;if(along>len&&along<len+3&&across<.65)this.damage(e,st.atk*.8,h);}}
 if(st.effects.includes('chain')){const others=s.enemies.filter(e=>e.hp>0&&e!==target&&distance(e,target)<2.6).sort((a,b)=>distance(a,target)-distance(b,target)).slice(0,2);for(const e of others){this.damage(e,st.atk*.65,h,true);this.effect('shot',{x:target.x,y:target.y,tx:e.x,ty:e.y,ttl:.3,color:'#abdcfa'});}}
 }
 skill(id,x,y){const s=this.state,h=s.heroes.find(h=>h.id===id);if(s.phase!=='battle'||!h||h.hp<=0||h.cool>0||!Number.isFinite(x)||!Number.isFinite(y)||!inside(x,y))return false;const base=HEROES.find(a=>a.id===id),st=this.stats(h);h.cool=base.cooldown*(1-Math.min(.65,st.cdr));h.anim=.6;if(id==='knight'){x=h.x;y=h.y;for(const e of s.enemies)if(e.hp>0&&!e.flying&&distance(e,h)<2.4){this.damage(e,st.atk*3.3,h);e.slow=2;}this.effect('burst',{x,y,ttl:.7,radius:2.4,color:'#e9bc74'});}else if(id==='ranger'){for(const e of s.enemies)if(e.hp>0&&distance(e,{x,y})<2.4)this.damage(e,st.atk*4.2,h);this.effect('rain',{x,y,ttl:.85,radius:2.4,color:'#d5e8a0'});}else if(id==='mage'){s.fields.push({x,y,ttl:5,tick:0,atk:st.atk*.45,source:id});this.effect('burst',{x,y,ttl:.8,radius:2.5,color:'#a9e0eb'});}else{for(const hero of s.heroes)if(hero.hp>0)hero.hp=Math.min(this.stats(hero).hp,hero.hp+100*(1+st.heal));for(const b of s.buildings)if(distance(b,{x,y})<3)b.hp=Math.min(b.maxHp,b.hp+65);this.effect('heal',{x,y,ttl:1.3,radius:3});}return true;}
 walk(h,dest,dt){const blocked=this.blocked();let goal={x:clamp(Math.round(dest.x),0,W-1),y:clamp(Math.round(dest.y),0,H-1)};if(blocked.has(key(goal.x,goal.y)))return;const start=[Math.round(h.x),Math.round(h.y)],q=[start],prev=new Map([[key(...start),null]]);let found=false;for(let i=0;i<q.length;i++){const p=q[i];if(p[0]===goal.x&&p[1]===goal.y){found=true;break;}for(const n of neighbors(...p)){const k=key(...n);if(!blocked.has(k)&&!prev.has(k)){prev.set(k,p);q.push(n);}}}if(!found)return;let p=[goal.x,goal.y],last=p;while(prev.get(key(...p))){last=p;p=prev.get(key(...p));}const to=distance(h,goal)<.6?goal:{x:last[0],y:last[1]};this.stepToward(h,to,h.speed*dt);}
 stepToward(e,p,step){const d=distance(e,p);if(d<.001)return;const f=Math.min(1,step/d);e.x+=(p.x-e.x)*f;e.y+=(p.y-e.y)*f;e.moving=true;e.face=p.x-e.x>=0?1:-1;}
 tick(dt){const s=this.state;if(s.phase!=='battle'||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.05);s.time+=dt;s.waveTime+=dt;for(const h of s.heroes){h.cool=Math.max(0,h.cool-dt);h.attack=Math.max(0,h.attack-dt);h.anim=Math.max(0,h.anim-dt);h.moving=false;}for(const ef of s.effects)ef.ttl-=dt;s.effects=s.effects.filter(e=>e.ttl>0);while(s.queue.length&&s.queue[0].at<=s.waveTime){const e=s.queue.shift();this.spawn(e.kind,e.lane);}
 for(const b of s.buildings){b.ready=Math.max(0,b.ready-dt);b.attack=Math.max(0,b.attack-dt);if(b.ready>0||b.hp<=0)continue;const base=BUILDINGS[b.kind];if(b.kind==='frost'){for(const e of s.enemies)if(e.hp>0&&!e.flying&&distance(e,b)<1.2+b.level*.28)e.slow=Math.max(e.slow,.3);}if(b.kind==='tower'&&b.attack<=0){const targets=s.enemies.filter(e=>e.hp>0&&distance(e,b)<base.range+.25*(b.level-1));const target=targets.find(e=>e.id===s.focus)||targets.sort((a,b)=>distance(a,CORE)-distance(b,CORE))[0];if(target){this.damage(target,base.atk*(1+.6*(b.level-1)),null);this.effect('shot',{x:b.x,y:b.y,tx:target.x,ty:target.y,ttl:.25,color:'#e9c578',tower:true});b.attack=base.rate;}}}
 for(const h of s.heroes){if(h.hp<=0)continue;const st=this.stats(h);let available=s.enemies.filter(e=>e.hp>0&&(h.id!=='knight'||!e.flying));if(h.id==='knight'){const near=available.filter(e=>distance(e,h.home)<3.4).sort((a,b)=>distance(a,h)-distance(b,h));const target=near.find(e=>e.id===s.focus)||near[0];if(target&&distance(h,target)>st.range*.85)this.walk(h,target,dt);else if(!target&&distance(h,h.home)>.12)this.walk(h,h.home,dt);}else if(distance(h,h.home)>.12)this.walk(h,h.home,dt);
 if(h.id==='priest'&&h.attack<=0){const hurt=s.heroes.filter(a=>a.hp>0&&a.hp<this.stats(a).hp-8&&distance(a,h)<st.range).sort((a,b)=>a.hp/this.stats(a).hp-b.hp/this.stats(b).hp)[0];if(hurt){hurt.hp=Math.min(this.stats(hurt).hp,hurt.hp+(24+st.atk*.5)*(1+st.heal));h.attack=h.rate/(1+st.haste);h.anim=.4;this.effect('heal',{x:hurt.x,y:hurt.y,ttl:.7});continue;}}
 if(h.attack>0)continue;available=available.filter(e=>distance(e,h)<=st.range).sort((a,b)=>h.id==='ranger'&&(a.flying!==b.flying)?(a.flying?-1:1):distance(a,CORE)-distance(b,CORE));const target=available.find(e=>e.id===s.focus)||available[0];if(target){this.attack(h,target);const aura=s.heroes.some(a=>a.id!==h.id&&a.hp>0&&this.stats(a).effects.includes('aura')&&distance(a,h)<3.5)?.18:0;h.attack=h.rate/(1+st.haste+aura);}}
 for(const f of s.fields){f.ttl-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.5;for(const e of s.enemies)if(e.hp>0&&distance(e,f)<2.5){e.slow=.8;this.damage(e,f.atk,s.heroes.find(h=>h.id===f.source),true);}}}s.fields=s.fields.filter(f=>f.ttl>0);
 for(const e of s.enemies){if(e.hp<=0)continue;e.attack=Math.max(0,e.attack-dt);e.hit=Math.max(0,(e.hit||0)-dt);e.anim=Math.max(0,e.anim-dt);e.moving=false;e.slow=Math.max(0,e.slow-dt);if(e.burn>0){e.burn-=dt;this.damageSilent(e,10*dt);if(e.hp<=0)continue;}if(e.boss&&!e.enraged&&e.hp<e.maxHp*.5){e.enraged=true;e.speed*=1.35;e.atk*=1.2;if(s.wave===12)for(let i=0;i<6;i++)s.queue.push({kind:i%2?'bat':'sapper',lane:i%3,at:s.waveTime+i*.8});s.queue.sort((a,b)=>a.at-b.at);this.effect('burst',{x:e.x,y:e.y,ttl:1,radius:2,color:'#de8973'});}
 let target=null;if(e.siege){target=s.buildings.filter(b=>b.hp>0&&distance(b,e)<3.5).sort((a,b)=>distance(a,e)-distance(b,e))[0];}
 if(!target)target=s.heroes.filter(h=>h.hp>0&&distance(h,e)<(e.flying?.65:1.12)).sort((a,b)=>distance(a,e)-distance(b,e))[0];
 if(target){if(distance(e,target)>1.05){this.stepToward(e,target,e.speed*dt*(e.slow>0?.52:1));}else if(e.attack<=0){const armor=target.gear?this.stats(target).armor:0;target.hp-=Math.max(1,e.atk-armor);e.attack=1.15;e.anim=.3;this.effect('slash',{x:e.x,y:e.y,tx:target.x,ty:target.y,ttl:.2,color:'#c67865'});if(target.gear&&this.stats(target).effects.includes('thorns'))this.damage(e,12,target,true);}continue;}
 if(distance(e,CORE)<.7){if(e.attack<=0){s.core.hp=Math.max(0,s.core.hp-e.atk);e.attack=1.2;this.effect('danger',{x:CORE.x,y:CORE.y,ttl:.5});}continue;}
 if(e.flying)this.stepToward(e,CORE,e.speed*dt);else{if(!e.step||e.navVersion!==this.navVersion||distance(e,e.step)<.06){const route=this.route(e.x,e.y);e.step=route[1]||route[0];e.navVersion=this.navVersion;}if(e.step)this.stepToward(e,e.step,e.speed*dt*(e.slow>0?.52:1));}
 }
 const dead=s.buildings.some(b=>b.hp<=0);s.buildings=s.buildings.filter(b=>b.hp>0);if(dead)this.navigation();s.enemies=s.enemies.filter(e=>e.hp>0);if(s.focus&&!s.enemies.some(e=>e.id===s.focus))s.focus=null;if(s.core.hp<=0){s.phase='defeat';s.result={wave:s.wave,kills:s.kills};return;}if(!s.queue.length&&!s.enemies.length)this.finishWave();}
 damageSilent(e,n){if(e.hp<=0)return;e.hp-=n;if(e.hp<=0){this.state.gold+=e.gold;this.state.kills++;this.effect('coin',{x:e.x,y:e.y,value:e.gold,ttl:.7});}}
 finishWave(){const s=this.state;if(s.phase!=='battle')return;s.gold+=WAVES[s.wave-1].reward;s.level=1+Math.floor(s.wave/3);for(const h of s.heroes){h.hp=this.stats(h).hp;h.x=h.home.x;h.y=h.home.y;h.attack=0;h.cool=Math.max(0,h.cool-12);}s.effects=[];s.fields=[];if(s.wave===WAVES.length){s.phase='victory';s.result={wave:s.wave,kills:s.kills};return;}s.phase='reward';s.reward=this.rollLoot();}
 rollLoot(){const s=this.state,boss=WAVES[s.wave-1].boss,tier=boss?3:s.wave>=5?2:1;const candidates=GEAR.filter(g=>g.tier<=tier&&(!boss||g.tier===3));const picks=[];const recent=new Set(s.bag.slice(-6));for(let i=0;i<3;i++){let pool=candidates.filter(g=>!picks.includes(g.id));if(pool.some(g=>!recent.has(g.id)))pool=pool.filter(g=>!recent.has(g.id));picks.push(pool[Math.floor(this.random()*pool.length)].id);}return picks;}
 chooseLoot(id){const s=this.state;if(s.phase!=='reward'||!s.reward.includes(id))return false;if(s.bag.length>=30)return false;s.bag.push(id);s.reward=[];s.phase='prep';return true;}
 equip(id,heroId){const s=this.state,h=s.heroes.find(h=>h.id===heroId),g=GEAR.find(g=>g.id===id);if(s.phase!=='prep'||!h||!g||!s.bag.includes(id)||(g.who!=='all'&&g.who!==heroId))return false;const old=h.gear[g.slot];s.bag.splice(s.bag.indexOf(id),1);h.gear[g.slot]=id;if(old)s.bag.push(old);h.hp=this.stats(h).hp;return true;}
 salvage(id){const s=this.state;if(s.phase!=='prep'||!s.bag.includes(id))return false;const g=GEAR.find(g=>g.id===id);s.bag.splice(s.bag.indexOf(id),1);s.gold+=g.tier*10;return true;}
 snapshot(){return copy(this.state);}
 checkpoint(){if(!['prep','reward'].includes(this.state.phase))return null;const s=this.snapshot();s.enemies=[];s.effects=[];s.fields=[];s.queue=[];return s;}
 static restore(data){
  // Rebuild a bounded checkpoint from canonical content, never trust saved combat stats.
  try {
   const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
   const integer=(n,a,b)=>Number.isInteger(n)&&finite(n,a,b);
   const tile=p=>p&&integer(p.x,0,W-1)&&integer(p.y,0,H-1);
   const known=id=>GEAR.some(g=>g.id===id);
   if(!data||data.version!==1||!['prep','reward'].includes(data.phase)||!integer(data.wave,0,WAVES.length-1)||!integer(data.seed,0,4294967295)||!integer(data.rng,0,4294967295)||!integer(data.gold,0,100000))return null;
   if(!data.core||!finite(data.core.hp,1,240)||!Array.isArray(data.heroes)||data.heroes.length!==4||new Set(data.heroes.map(h=>h.id)).size!==4)return null;
   if(!Array.isArray(data.buildings)||data.buildings.length>W*H||!Array.isArray(data.bag)||data.bag.length>30||data.bag.some(id=>!known(id)))return null;
   if(!Array.isArray(data.reward)||data.reward.some(id=>!known(id))||(data.phase==='reward'?(data.wave===0||data.reward.length!==3||new Set(data.reward).size!==3):data.reward.length!==0))return null;
   if(!integer(data.nextId,1,1000000)||!integer(data.kills,0,100000)||!integer(data.totalBuilt,0,100000)||!finite(data.time,0,10000000))return null;
   const g=new Game(data.seed),s=g.state;
   Object.assign(s,{rng:data.rng,phase:data.phase,wave:data.wave,gold:data.gold,nextId:data.nextId,kills:data.kills,totalBuilt:data.totalBuilt,time:data.time,level:1+Math.floor(data.wave/3),bag:[...data.bag],reward:[...data.reward]});
   s.core.hp=data.core.hp;
   for(const hero of s.heroes){
    const h=data.heroes.find(h=>h.id===hero.id);
    if(!h||!tile(h.home)||stone.has(key(h.home.x,h.home.y))||key(h.home.x,h.home.y)===key(CORE.x,CORE.y)||!h.gear||!finite(h.cool,0,60)||!integer(h.kills,0,100000))return null;
    for(const slot of ['weapon','armor','charm']){
     const id=h.gear[slot];
     if(id!==null&&!GEAR.some(item=>item.id===id&&item.slot===slot&&(item.who==='all'||item.who===hero.id)))return null;
     hero.gear[slot]=id;
    }
    Object.assign(hero,{home:{...h.home},x:h.home.x,y:h.home.y,cool:h.cool,kills:h.kills});hero.hp=g.stats(hero).hp;
   }
   const ids=new Set(),tiles=new Set();
   for(const b of data.buildings){
    const base=BUILDINGS[b.kind];
    if(!base||!('hp' in base)||!tile(b)||!integer(b.id,1,data.nextId-1)||ids.has(b.id)||!integer(b.level,1,3)||!finite(b.hp,1,base.hp+(b.level-1)*100))return null;
    const k=key(b.x,b.y);
    if(tiles.has(k)||stone.has(k)||k===key(CORE.x,CORE.y)||ENTRANCES.some(e=>e.x===b.x&&e.y===b.y)||base.solid&&s.heroes.some(h=>h.home.x===b.x&&h.home.y===b.y))return null;
    ids.add(b.id);tiles.add(k);
    s.buildings.push({id:b.id,kind:b.kind,x:b.x,y:b.y,level:b.level,hp:b.hp,maxHp:base.hp+(b.level-1)*100,invested:base.cost+(b.level>=2?28:0)+(b.level===3?46:0),ready:0,attack:0});
   }
   g.navigation();
   if(!ENTRANCES.every(p=>g.nav.has(key(p.x,p.y)))||s.heroes.some(h=>!g.nav.has(key(h.x,h.y))))return null;
   return g;
  }catch{return null;}
 }
}
