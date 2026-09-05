/* Isometric scene composition; simulation coordinates never depend on pixels. */
(function(root){
 'use strict';
 const A=root.CVArt,C=root.CVContent,E=root.CVEngine;
 const hash=(x,y,n=0)=>{let v=Math.imul(x+117,n+374761393)^Math.imul(y+91,668265263);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967296;};
 function direction(angle){return (Math.round(Math.atan2((Math.sin(angle)+Math.cos(angle))*.5,Math.cos(angle)-Math.sin(angle))/(Math.PI/4))+8)%8;}
 class Renderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.zoom=canvas.getBoundingClientRect().width<650?1.45:1;this.props=new Map();this.pan={x:0,y:0};this.effects=[];this.age=0;this.shake=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.background=document.createElement('canvas');this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();this.w=Math.max(240,Math.round(r.width/1.25));this.h=Math.max(200,Math.round(r.height/1.25));this.canvas.width=this.w;this.canvas.height=this.h;this.ctx.imageSmoothingEnabled=false;this.base=Math.min((this.w-24)/590,(this.h-30)/415);this.camera();}
  camera(){this.scale=this.base*this.zoom;this.ox=this.w/2+this.pan.x;this.oy=this.h*.48+this.pan.y;this.drawBackground();}
  stamp(g,key,p,paint){let im=this.props.get(key);if(!im){im=document.createElement('canvas');im.width=192;im.height=192;const c=im.getContext('2d');c.translate(96,154);paint(c);this.props.set(key,im);}g.drawImage(im,Math.round(p.x-96*this.scale),Math.round(p.y-154*this.scale),Math.round(192*this.scale),Math.round(192*this.scale));}
  setZoom(z){this.zoom=Math.max(.85,Math.min(1.9,z));this.pan={x:0,y:0};this.camera();}
  reset(){this.zoom=1;this.pan={x:0,y:0};this.camera();}
  point(x,y,z=0){return {x:this.ox+(x-y)*24*this.scale,y:this.oy+(x+y)*12*this.scale-z*this.scale};}
  cell(clientX,clientY){const r=this.canvas.getBoundingClientRect(),sx=(clientX-r.left)*this.w/r.width,sy=(clientY-r.top)*this.h/r.height;return this.fromScreen(sx,sy);}
  fromScreen(x,y){const a=(x-this.ox)/(24*this.scale),b=(y-this.oy)/(12*this.scale);return{x:Math.round((a+b)/2),y:Math.round((b-a)/2)};}
  hitUnit(s,clientX,clientY){const r=this.canvas.getBoundingClientRect(),x=(clientX-r.left)*this.w/r.width,y=(clientY-r.top)*this.h/r.height;const units=s.heroes.filter(h=>h.slot).sort((a,b)=>(b.x+b.y)-(a.x+a.y));return units.find(h=>{const p=this.point(h.x,h.y);return Math.abs(p.x-x)<18*this.scale&&y>p.y-58*this.scale&&y<p.y+5*this.scale;});}
  diamond(c,x,y,size,color,edge){const p=this.point(x,y),w=24*this.scale*size,h=12*this.scale*size;A.poly(c,[[p.x,p.y-h],[p.x+w,p.y],[p.x,p.y+h],[p.x-w,p.y]],color,edge);}
  drawBackground(){const c=this.background;c.width=this.w;c.height=this.h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
   const sky=g.createLinearGradient(0,0,0,this.h);sky.addColorStop(0,'#cbd8c5');sky.addColorStop(.65,'#b4cac1');sky.addColorStop(1,'#91afb0');g.fillStyle=sky;g.fillRect(0,0,this.w,this.h);
   // Distant terraces and cloud bands lend depth without downloaded scenery.
   for(let i=0;i<5;i++){const x=(i*.271+.07)%1*this.w,y=this.h*(.1+i*.075);g.globalAlpha=.4;A.poly(g,[[x-100,y+20],[x-32,y-20],[x+20,y-40],[x+68,y-9],[x+120,y+12],[x+78,y+45],[x-15,y+46]],i%2?'#829e9e':'#9fb2a4');g.globalAlpha=.4;A.ellipse(g,x,y+27,82,8,'#deead5');}g.globalAlpha=1;
   // World-space floor has a single shared pixel density and top-left light.
   for(let sum=-10;sum<=10;sum++)for(let x=-5;x<=5;x++){const y=sum-x;if(y<-5||y>5)continue;this.tile(g,x,y);}
   // Decorative perimeter only; deployment squares remain unobstructed.
   const deco=[[-5.7,-3.7,'tree'],[-3.8,-5.7,'tree'],[5.7,-3.8,'tree'],[-5.7,3.7,'tree'],[5.65,3.7,'tree'],[3.8,5.7,'tree'],[-5.25,-1.8,'pillar'],[1.8,-5.25,'pillar'],[5.2,1.8,'pillar'],[-1.8,5.2,'pillar']];
   deco.sort((a,b)=>a[0]+a[1]-b[0]-b[1]);for(const [x,y,type]of deco){const p=this.point(x,y);const seed=Math.floor(hash(x,y)*30);this.stamp(g,type+seed,p,c=>{if(type==='tree')A.tree(c,0,0,seed);else A.pillar(c,0,0,30+Math.floor(hash(x,y)*20));});}
   this.guild(g,-4.55,-4.45);
   const p=this.point(0,0);this.stamp(g,'pedestal',p,g=>{A.ellipse(g,0,4,43,19,'#748e89');A.ellipse(g,0,3,38,16,'#adb7a0');A.ellipse(g,0,3,31,13,'#879d92');for(let i=0;i<8;i++){const a=i*Math.PI/4;A.rect(g,Math.cos(a)*35-2,Math.sin(a)*15+2,4,2,'#e6d5a2');}});
  }
  tile(g,x,y){const p=this.point(x,y),w=24*this.scale,h=12*this.scale,n=hash(x,y),path=x===0||y===0||x===y||x===-y;const grass=['#819c69','#89a571','#91aa76','#7d9a6c'],road=['#c5bba0','#d3c5a6','#c9c0a4','#b9b69d'];const fill=(path?road:grass)[Math.floor(n*4)];
   if(x===5||y===5){const deep=(23+hash(x,y,3)*14)*this.scale;
    if(x===5)A.poly(g,[[p.x+w,p.y],[p.x+w,p.y+deep*.6],[p.x,p.y+h+deep],[p.x,p.y+h]],'#536e71','#405960');
    if(y===5)A.poly(g,[[p.x-w,p.y],[p.x,p.y+h],[p.x,p.y+h+deep],[p.x-w,p.y+deep*.6]],'#75827b','#405960');
    if(x===5)A.line(g,p.x+w-4*this.scale,p.y+7*this.scale,p.x+3*this.scale,p.y+h+7*this.scale,'#6e8580',2);
    if(y===5)A.line(g,p.x-w+4*this.scale,p.y+7*this.scale,p.x-3*this.scale,p.y+h+7*this.scale,'#929889',2);
   }
   A.poly(g,[[p.x,p.y-h],[p.x+w,p.y],[p.x,p.y+h],[p.x-w,p.y]],fill);
   if(path){A.line(g,p.x-w+2,p.y,p.x,p.y-h+1,'#e0d5b8');A.line(g,p.x+1,p.y+h-1,p.x+w-2,p.y,'#a29f86');const off=n>.5?4:-5;A.line(g,p.x-w/2,p.y+h/2,p.x+off*this.scale,p.y-h/2,'#b3ae93');for(let i=0;i<3;i++){const v=hash(x,y,i+11);A.rect(g,p.x+(v-.5)*w,p.y+(hash(y,x,i+9)-.5)*h,2*this.scale,this.scale,'#e2d5b3');}}
   else for(let i=0;i<7;i++){const dx=(hash(x,y,i+13)-.5)*w*1.5,dy=(hash(y,x,i+14)-.5)*h;if(Math.abs(dx/w)+Math.abs(dy/h)>.8)continue;A.line(g,p.x+dx,p.y+dy,p.x+dx-1,p.y+dy-2*this.scale,i%3===0?'#b2c086':'#698b60');if(i===0&&n>.75){A.rect(g,p.x+dx,p.y+dy-3*this.scale,2*this.scale,2*this.scale,'#eee2ac');}}
   if((x===5||y===5)&&!path){A.line(g,p.x-w+1,p.y,p.x,p.y+h-1,'#a5b975',2*this.scale);A.line(g,p.x,p.y+h-1,p.x+w-1,p.y,'#648968',2*this.scale);}
  }
  guild(g,x,y){const p=this.point(x,y);this.stamp(g,'guild',p,g=>{
   A.poly(g,[[-32,-2],[-32,-39],[0,-48],[33,-34],[33,4],[0,18]],'#d7cfb0','#425860');A.poly(g,[[0,-48],[33,-34],[33,4],[0,18]],'#a6ada0');A.poly(g,[[-43,-40],[-3,-66],[44,-42],[3,-18]],'#456d76','#344e59');A.poly(g,[[-43,-40],[-3,-66],[3,-44],[3,-18]],'#739b9a','#344e59');A.line(g,-40,-40,2,-19,'#bed0b1',2);A.line(g,3,-19,43,-41,'#83b2a4',2);for(let i=0;i<4;i++){A.line(g,-31+i*8,-44-i*4,-22+i*8,-38-i*4,'#aac4af');A.line(g,10+i*7,-25-i*4,17+i*7,-28-i*4,'#739c98');}
   A.box(g,-23,-21,14,20,'#536d70','#927e60');A.line(g,-16,-18,-16,-3,'#d9c797',2);A.line(g,-22,-11,-11,-11,'#d9c797',2);A.poly(g,[[8,-11],[21,-17],[21,7],[8,13]],'#425861','#657367');A.rect(g,12,-1,2,3,'#edd28e');A.line(g,40,-22,40,15,'#7c6654',2);A.poly(g,[[41,-24],[58,-22],[57,-8],[49,-3],[41,-8]],'#4c918b','#365c62');A.poly(g,[[48,-19],[52,-15],[48,-10],[44,-15]],'#e8d8a3');});}
  event(e){if(['slash','burst','cleave','kill','merge','place','damage','down','corehit','pulse'].includes(e.type))this.effects.push({...e,life:e.type==='damage'?.75:e.type==='merge'?1.1:.55,total:e.type==='damage'?.75:e.type==='merge'?1.1:.55});if(this.effects.length>140)this.effects.splice(0,this.effects.length-140);if(e.type==='corehit'&&!this.reduced)this.shake=.35;}
  draw(s,ui,dt){this.age+=s.paused?0:dt;const g=this.ctx;g.clearRect(0,0,this.w,this.h);g.save();if(this.shake>0&&!this.reduced)g.translate(Math.sin(this.age*90)*2,Math.cos(this.age*84)*2);g.drawImage(this.background,0,0);
   const selected=s.heroes.find(h=>h.id===ui.selected),plan=s.status==='plan';
   if(plan){
    if(selected){for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++)if(E.cellOK(x,y)){const p=this.point(x,y);g.globalAlpha=.5;A.rect(g,p.x,p.y,1,1,'#eaf0d3');}g.globalAlpha=1;}
    const w=C.waves[Math.min(s.wave,7)];for(const lane of w.lanes){const d=C.directions[lane],len=Math.hypot(d.x,d.y),p=this.point(d.x/len*5.1,d.y/len*5.1);const q=this.point(d.x/len*4.6,d.y/len*4.6);g.save();g.translate(p.x,p.y);g.rotate(Math.atan2(q.y-p.y,q.x-p.x));A.poly(g,[[11,0],[-3,-6],[-3,-2],[-11,-2],[-11,2],[-3,2],[-3,6]],'#e8b366','#775b47');g.restore();g.font=`bold ${Math.max(8,9*this.scale)}px ui-monospace,monospace`;g.textAlign='center';g.fillStyle='#394951';g.fillText(d.label,p.x,p.y-11*this.scale);}
    if(selected&&selected.slot){const a=E.stats(selected.kind,selected.rank);g.strokeStyle='#eff7d9';g.lineWidth=1;g.setLineDash([3,4]);g.beginPath();for(let i=0;i<=48;i++){const angle=i/48*Math.PI*2,p=this.point(selected.slot.x+Math.cos(angle)*a.range,selected.slot.y+Math.sin(angle)*a.range);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();g.setLineDash([]);}
    if(ui.cursor&&selected&&E.cellOK(ui.cursor.x,ui.cursor.y)){g.globalAlpha=.4;this.diamond(g,ui.cursor.x,ui.cursor.y,.92,'#f6f0c8','#fff4c1');g.globalAlpha=1;}
   }
   const actors=[...s.heroes.filter(h=>h.slot&&(h.alive||h.death>0)).map(h=>({...h,hero:true})),...s.enemies.filter(e=>e.alive||e.death>0)];
   for(const a of actors){const p=this.point(a.x,a.y);g.globalAlpha=.24;A.ellipse(g,p.x,p.y+2*this.scale,(a.kind==='elder'?23:13)*this.scale,5*this.scale,'#253d47');g.globalAlpha=1;if(a.id===ui.selected){this.diamond(g,a.x,a.y,.8,'#b9c696','#faf0ae');}}
   const drawables=[...actors,{crystal:true,x:0,y:0}].sort((a,b)=>a.x+a.y-(b.x+b.y));
   for(const a of drawables){const p=this.point(a.x,a.y);if(a.crystal){const bob=this.reduced?0:Math.round(Math.sin(this.age*1.8)*2);const time=Math.asin(bob/2)/1.8;this.stamp(g,'crystal'+bob+(s.coreFlash>0?'flash':''),p,g=>A.crystal(g,0,0,time,s.coreFlash>0));continue;}
    const walking=a.steps&&Math.abs((a.steps-(this.lastSteps?.[a.id]??a.steps)))>.001;let action=!a.alive?'death':a.hurt>0?'hurt':a.attack>0?(a.kind==='mage'?'cast':'attack'):walking?'walk':'idle';let frame=action==='death'?Math.min(3,Math.floor((.7-a.death)*6)):action==='attack'||action==='cast'?Math.min(3,Math.floor((.42-a.attack)*9)):action==='walk'?Math.floor(a.steps)%4:Math.floor(this.age*2+a.id)%2;
    if(this.reduced&&action==='idle')frame=0;
    const image=A.sprite(a.kind,a.rank??1,direction(a.facing),action,frame),size=this.scale*(a.kind==='elder'?1.35:.88);
    g.drawImage(image,Math.round(p.x-48*size),Math.round(p.y-82*size),Math.round(96*size),Math.round(96*size));
    if(a.hero&&a.alive){const by=p.y+7*this.scale;for(let n=0;n<a.rank;n++){const sx=p.x+(n-(a.rank-1)/2)*7*this.scale;A.poly(g,[[sx,by-2],[sx+2,by],[sx,by+2],[sx-2,by]],'#fff0a8','#956b43');}}
    if(a.hp<a.maxHp&&a.alive){const bw=(a.kind==='elder'?42:24)*this.scale;A.rect(g,p.x-bw/2,p.y-61*size,bw,3*this.scale,'#31434c');A.rect(g,p.x-bw/2+1,p.y-61*size+1,(bw-2)*a.hp/a.maxHp,this.scale,a.hero?'#b5d78a':'#d68c73');}
   }
   this.lastSteps=Object.fromEntries(actors.map(a=>[a.id,a.steps]));
   for(const shot of s.shots){const t=Math.min(1,shot.time/shot.total),x=shot.from.x+(shot.to.x-shot.from.x)*t,y=shot.from.y+(shot.to.y-shot.from.y)*t;const p=this.point(x,y,24+Math.sin(t*Math.PI)*(shot.kind==='mage'?40:4));const from=this.point(shot.from.x,shot.from.y,24),to=this.point(shot.to.x,shot.to.y,24);if(shot.kind==='mage'){A.ellipse(g,p.x,p.y,4*this.scale,4*this.scale,'#d67f62');A.ellipse(g,p.x-1,p.y-1,2*this.scale,2*this.scale,'#fff0ba');}else{const a=Math.atan2(to.y-from.y,to.x-from.x);A.line(g,p.x-Math.cos(a)*10*this.scale,p.y-Math.sin(a)*10*this.scale,p.x,p.y,'#faf0c0',2);}}
   if(s.pulseFx>0){g.globalAlpha=s.pulseFx*.65;g.strokeStyle='#e4f6c8';g.lineWidth=3*this.scale;g.beginPath();g.ellipse(this.ox,this.oy,(1-s.pulseFx)*150*this.scale,(1-s.pulseFx)*75*this.scale,0,0,Math.PI*2);g.stroke();g.globalAlpha=1;}
   this.drawEffects(g,s.paused?0:dt);
   if(!this.reduced)for(let i=0;i<9;i++){const t=this.age*.3+i*1.8,p=this.point(Math.sin(i*93)*5+Math.sin(t)*.4,Math.cos(i*17)*5,18+Math.sin(t)*5);g.globalAlpha=.4+.25*Math.sin(t*2);A.rect(g,p.x,p.y,1.5,1.5,'#ffffd1');}g.globalAlpha=1;
   g.restore();this.shake=Math.max(0,this.shake-dt);
  }
  drawEffects(g,dt){for(const e of this.effects){e.life-=dt;const age=1-e.life/e.total,p=this.point(e.x??0,e.y??0);g.globalAlpha=Math.max(0,1-age);if(e.type==='damage'){g.font=`bold ${Math.max(9,10*this.scale)}px ui-monospace,monospace`;g.textAlign='center';g.lineWidth=2;g.strokeStyle='#3c3a48';g.fillStyle=e.enemy?'#fff2c2':'#ffb19a';const y=p.y-40*this.scale-age*18*this.scale;g.strokeText(e.amount,p.x,y);g.fillText(e.amount,p.x,y);}
    else if(e.type==='slash'||e.type==='cleave'){g.strokeStyle=e.type==='cleave'?'#fff4c6':'#e7ecdb';g.lineWidth=(e.type==='cleave'?4:2)*this.scale;g.beginPath();g.ellipse(p.x,p.y-16*this.scale,(10+age*12)*this.scale,(6+age*8)*this.scale,-.7,-1,2);g.stroke();}
    else if(e.type==='burst'||e.type==='merge'||e.type==='kill'){const color=e.type==='burst'?'#f2c184':e.type==='merge'?'#f7e8a2':'#d6edb0';for(let k=0;k<8;k++){const a=k*Math.PI/4,r=(4+age*(e.type==='merge'?45:23))*this.scale;A.rect(g,p.x+Math.cos(a)*r,p.y-20*this.scale+Math.sin(a)*r*.65-age*8,2*this.scale,2*this.scale,color);}}
    else if(e.type==='place'){g.strokeStyle='#fff0b1';g.beginPath();g.ellipse(p.x,p.y,18*this.scale+age*10,8*this.scale+age*5,0,0,Math.PI*2);g.stroke();}}
   g.globalAlpha=1;this.effects=this.effects.filter(e=>e.life>0);}
 }
 root.CVRenderer=Renderer;
})(globalThis);
