/* Isometric stage, depth sorting, procedural scenery and combat effects. */
(function(root){
  'use strict';
  const A=root.CVArt,G=root.CV,W=840,H=600;
  const project=(x,y,z=0)=>({x:420+(x-y)*29,y:295+(x+y)*14.5-z});
  function Renderer(canvas){
    this.canvas=canvas;this.scene=A.surface(W,H);this.ctx=this.scene.getContext('2d');this.base=A.surface(W,H);this.bg=A.surface(W,H);
    this.time=0;this.effects=[];this.motes=[];this.zoom=1;this.pan={x:0,y:0};this.view={x:0,y:0,scale:1};this.shake=0;
    this.drawBackground();this.drawTerrain();
  }
  Renderer.prototype.drawBackground=function(){
    const c=this.bg.getContext('2d'),p=A.painter(c);
    for(let y=0;y<H;y+=4){const n=y/H;c.fillStyle=`rgb(${Math.round(24+10*n)},${Math.round(34+19*n)},${Math.round(53+17*n)})`;c.fillRect(0,y,W,4);}
    p.ellipse(677,84,34,34,'#9fb2b3');p.ellipse(668,79,31,31,'#c0c8b9');p.ellipse(662,74,6,4,'#aabbb2');p.ellipse(680,93,9,3,'#acbdb4');
    const island=(x,y,k)=>{p.poly([[x-58*k,y],[x,y-18*k],[x+65*k,y],[x+21*k,y+11*k],[x-18*k,y+8*k]],'#2a3b54');p.poly([[x-45*k,y+3*k],[x+39*k,y+6*k],[x+4*k,y+50*k]],'#223047');for(let i=0;i<4;i++)p.poly([[x+(i-2)*18*k,y],[x+(i-2)*18*k+6*k,y-29*k],[x+(i-2)*18*k+13*k,y]],'#344960');};
    island(130,117,.9);island(735,190,.8);island(87,428,.62);island(717,470,1);
    for(let i=0;i<80;i++){const x=(i*137.51)%W,y=(i*71.71)%250;p.r(x,y,i%9===0?2:1,1,i%4?'#526578':'#a0b5b8');}
    for(let i=0;i<7;i++){const y=463+i*18;p.poly([[0,y],[170,y-11],[310,y+7],[510,y-10],[690,y+2],[840,y-9],[840,y+4],[0,y+12]],`rgba(111,160,168,${.015+i*.003})`);}
  };
  Renderer.prototype.drawTerrain=function(){
    const c=this.base.getContext('2d'),p=A.painter(c);
    const dp=(x,y)=>{const v=project(x,y);return[v.x,v.y];};
    const top=dp(-4.5,-4.5),right=dp(4.5,-4.5),bottom=dp(4.5,4.5),left=dp(-4.5,4.5);
    p.ellipse(420,453,178,39,'#1c2c42');
    p.poly([left,bottom,[bottom[0]+4,bottom[1]+61],[355,511],[294,473],[213,449],[left[0]+14,left[1]+64]],'#34465d','#27374e');
    p.poly([bottom,right,[right[0]-12,right[1]+51],[597,419],[533,457],[465,500],[bottom[0]+4,bottom[1]+61]],'#41516a','#27374e');
    for(let i=0;i<11;i++){
      const a=project(-4.5+i*.82,4.5),b=project(4.5,4.5-i*.82);
      p.poly([[a.x+2,a.y+9],[a.x+20,a.y+18],[a.x+18,a.y+43],[a.x+5,a.y+35]],i%2?'#3e5064':'#304157');
      p.poly([[b.x-2,b.y+10],[b.x+18,b.y],[b.x+15,b.y+31],[b.x+3,b.y+46]],i%2?'#526076':'#394c62');
    }
    // Thin waterfalls and hanging roots, all still pixel strokes.
    for(let i=0;i<5;i++){p.r(539+i*3,416-i*2,2,40+i*5,i%2?'#628b99':'#476d87');p.r(253+i*2,376+i*2,1,25+i*3,'#466d68');}
    for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++){
      const v=project(x,y),n=((x*17+y*31+123)%5+5)%5;
      const road=x===0||y===0||Math.abs(x)===Math.abs(y);
      const colors=road?['#899890','#83938e','#8d9a92','#80938f','#8a978e']:['#667f7b','#708a7e','#73877b','#6b8378','#71897e'];
      const q=[dp(x-.5,y-.5),dp(x+.5,y-.5),dp(x+.5,y+.5),dp(x-.5,y+.5)];
      p.poly(q,colors[n],'#526c6d');p.line(q[0][0]+1,q[0][1]+1,q[1][0]-1,q[1][1]+1,road?'#acb4a0':'#91a48c');
      if(road){p.line(v.x-16,v.y+3,v.x-4,v.y+9,'#728580');if(n===1)p.line(v.x+2,v.y-8,v.x+6,v.y-1,'#677d7b');p.r(v.x+14,v.y-1,3,1,'#b1b9a1');}
      else{p.r(v.x-8+n*3,v.y-2,3,1,'#9aad90');p.r(v.x+7,v.y+3,2,1,'#4b7469');if(n===3){p.r(v.x-10,v.y,2,2,'#c5b997');p.r(v.x-9,v.y-2,1,2,'#9aae8d');}}
      if(Math.abs(x)===4||Math.abs(y)===4){p.r(v.x-5,v.y+5,9,2,'#536f65');p.r(v.x-8,v.y+3,5,2,'#92a47d');}
    }
    // Separate approach bridges; their shadows keep the floating platform grounded in depth.
    for(const d of G.DIRS){const len=Math.hypot(...d);for(let k=5;k<=7;k++){
      const x=d[0]/len*k,y=d[1]/len*k,v=project(x,y);if(Math.max(Math.abs(x),Math.abs(y))<4.6)continue;p.ellipse(v.x,v.y+32,23,7,'#17283b');
      const q=[dp(x-.46,y-.46),dp(x+.46,y-.46),dp(x+.46,y+.46),dp(x-.46,y+.46)];
      p.poly([q[1],q[2],[q[2][0],q[2][1]+8],[q[1][0],q[1][1]+8]],'#465568');
      p.poly([q[2],q[3],[q[3][0],q[3][1]+8],[q[2][0],q[2][1]+8]],'#3b495f');p.poly(q,'#758887','#3d5264');
      p.line(q[0][0],q[0][1]+1,q[1][0],q[1][1]+1,'#a1af9e');p.r(v.x-2,v.y-1,5,2,'#aac3ad');
    }}
    // Engraved octagonal altar, not a forbidden square disguised as a tile.
    const corners=[];for(let i=0;i<8;i++){const a=Math.PI/4*i;corners.push(dp(Math.cos(a)*1.35,Math.sin(a)*1.35));}
    p.poly(corners,'#536a73','#c2c6a5');
    const rim=corners.map(([x,y])=>[420+(x-420)*.84,295+(y-295)*.84]);p.poly(rim,'#7f9493','#344b5f');
    for(let i=0;i<8;i++){const a=Math.PI/4*i,v=project(Math.cos(a)*1.08,Math.sin(a)*1.08);p.r(v.x-2,v.y-1,4,2,'#bde0c6');}
    // Small wildflowers and chipped stone around the rim.
    for(let i=0;i<20;i++){const side=i%4,t=-3.8+(i%5)*1.7,x=side===0?-4.2:side===1?4.2:t,y=side===2?-4.2:side===3?4.2:t,v=project(x,y);p.r(v.x,v.y-4,1,6,'#426956');p.r(v.x-2,v.y-3,2,2,i%3?'#c6c29a':'#d99dab');p.r(v.x+1,v.y-5,2,2,i%3?'#e1d5a7':'#ae81ac');}
  };
  Renderer.prototype.resize=function(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.dpr=d;this.width=r.width;this.height=r.height;};
  Renderer.prototype.toScreen=function(x,y){const p=project(x,y),v=this.view;return{x:p.x*v.scale+v.x,y:p.y*v.scale+v.y};};
  Renderer.prototype.tileAt=function(x,y){const v=this.view,dx=((x-v.x)/v.scale-420)/29,dy=((y-v.y)/v.scale-295)/14.5;return{x:Math.round((dx+dy)/2),y:Math.round((dy-dx)/2)};};
  Renderer.prototype.zoomIn=function(){this.zoom=this.zoom===1?1.45:1;this.pan={x:0,y:0};};
  Renderer.prototype.ingest=function(events,reduced){for(const e of events){
    if(['attack','blast','merge','pulse','leak','kill','damage','down','enrage','deploy','repair'].includes(e.type))this.effects.push({...e,age:0,life:e.type==='damage'?.7:e.type==='pulse'?1:e.type==='merge'?1.3:.5});
    if(!reduced&&e.type==='leak')this.shake=3;if(!reduced&&e.type==='pulse')this.shake=2;
  }if(this.effects.length>140)this.effects.splice(0,this.effects.length-140);};
  Renderer.prototype.ring=function(x,y,r,color,dash=false){const c=this.ctx;c.strokeStyle=color;c.lineWidth=1;c.setLineDash(dash?[4,5]:[]);c.beginPath();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,v=project(x+Math.cos(a)*r,y+Math.sin(a)*r);i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y);}c.stroke();c.setLineDash([]);};
  Renderer.prototype.tree=function(x,y,size=1){const c=this.ctx,p=A.painter(c),v=project(x,y);c.save();c.translate(v.x,v.y);c.scale(size,size);p.ellipse(0,2,18,6,'#334e54');p.poly([[-3,1],[-4,-34],[3,-35],[5,2]],'#65575a','#26394a');p.r(-1,-25,2,26,'#ad8b72');
    for(let i=0;i<3;i++){const t=-24-i*15,w=25-i*5;p.poly([[-w,t+9],[-w+9,t-7],[-w+6,t-5],[-3,t-31],[4,t-24],[w-6,t-6],[w-3,t-4],[w,t+7],[4,t+11]],['#446965','#51776c','#668774'][i],'#304f54');p.poly([[-w+4,t+5],[-3,t-24],[-7,t-7],[0,t-11],[-4,t+6]],['#5e8571','#73947a','#8ba889'][i]);}c.restore();};
  Renderer.prototype.ruin=function(x,y){const c=this.ctx,p=A.painter(c),v=project(x,y);c.save();c.translate(v.x,v.y);
    const pillar=(x,h)=>{p.poly([[x-8,0],[x+8,4],[x+12,0],[x+12,-h],[x-4,-h-4],[x-8,-h]],'#77848d','#354d63');p.poly([[x-8,-h],[x+4,-h-3],[x+8,-h],[x+8,4],[x-8,0]],'#94a099');p.r(x-4,-h+4,3,h-8,'#b2b7a8');for(let k=10;k<h;k+=12)p.line(x-6,-k,x+6,-k+2,'#637581');p.r(x-9,-h,18,4,'#b4b8a6');};
    pillar(-19,61);pillar(21,44);p.poly([[-28,-60],[-28,-71],[7,-69],[22,-56],[22,-44],[13,-48],[6,-58]],'#909d98','#354d63');p.line(-25,-69,5,-66,'#c3c2aa');p.r(-21,-58,3,17,'#526f63');p.r(-18,-55,3,10,'#769175');c.restore();};
  Renderer.prototype.portal=function(lane,active,lang){const c=this.ctx,p=A.painter(c),d=G.DIRS[lane],len=Math.hypot(...d),v=project(d[0]/len*7.25,d[1]/len*7.25);c.save();c.translate(v.x,v.y);p.ellipse(0,1,16,6,'#334257');
    for(const s of [-1,1]){p.r(s*13-3,-26,7,29,'#34475d');p.r(s*13-2,-26,5,26,'#7b8e91');p.r(s*13-4,-27,9,4,'#a0aea0');p.r(s*13-1,-19,2,11,active?'#dfa7bd':'#73939a');}
    p.poly([[-16,-26],[-12,-32],[0,-38],[13,-32],[17,-26],[11,-28],[0,-32],[-10,-27]],active?'#b69aab':'#768c91','#33475c');
    if(active){p.ellipse(0,-17,5,11,'#b986ad44');p.poly([[0,-24],[3,-17],[0,-10],[-3,-17]],'#e1aac2');}
    c.font='9px ui-monospace,monospace';c.textAlign='center';c.fillStyle=active?'#f3d5bd':'#8ca0a5';const names=lang==='zh'?['北','東北','東','東南','南','西南','西','西北']:['N','NE','E','SE','S','SW','W','NW'];c.fillText(names[lane],0,-43);c.restore();};
  Renderer.prototype.crystal=function(s,reduced){const c=this.ctx,p=A.painter(c),v=project(0,0),bob=reduced?0:Math.round(Math.sin(this.time*1.6)*2);c.save();c.translate(v.x,v.y);
    p.ellipse(0,0,26,13,'#33485a');p.poly([[-22,-2],[0,-13],[22,-2],[22,7],[0,19],[-22,7]],'#667f85','#30485b');p.poly([[-22,-2],[0,-13],[22,-2],[0,10]],'#a2b4a4','#536b71');p.poly([[-15,-3],[0,-11],[15,-3],[0,5]],'#5b8789');
    c.globalAlpha=.08;p.ellipse(0,-20,34,24,'#abf2d6');c.globalAlpha=1;
    c.translate(0,bob);const damaged=s.crystal<35;
    p.poly([[0,-65],[15,-37],[10,-14],[0,-5],[-13,-20],[-16,-41]],'#2b5467','#243c53');
    p.poly([[0,-64],[-13,-41],[-9,-24],[0,-11],[3,-37]],damaged?'#daa1ba':'#80d4ce');
    p.poly([[0,-64],[13,-37],[8,-17],[0,-11],[3,-37]],damaged?'#986da7':'#4593aa');
    p.poly([[0,-59],[-9,-40],[0,-35],[3,-39]],damaged?'#f0c6d0':'#caf3d4');
    p.line(-9,-39,-6,-23,'#e3f4d0');p.line(3,-38,9,-34,'#a6e3d2');p.line(0,-33,0,-15,'#94d8ca');
    for(let i=0;i<3;i++){const a=this.time*.4+i*2.094,x=Math.cos(a)*21,y=-27+Math.sin(a)*7;p.poly([[x,y-6],[x+3,y],[x,y+5],[x-3,y]],i%2?'#afd9c7':'#73baba','#375f70');}
    c.restore();};
  Renderer.prototype.unit=function(u,enemy,reduced){const c=this.ctx,p=A.painter(c),v=project(u.x,u.y),kind=u.kind,large=kind==='boss',scale=large?1.65:kind==='golem'?1.15:1.05;const pose=u.hurt>0?3:u.attack>0?2:u.moving?1:0;const frame=reduced&&!u.moving?0:Math.floor(this.time*(u.moving?8:3)+u.id)%4;
    const art=A.sprite(kind,u.rank||1,u.face,pose,frame);p.ellipse(v.x,v.y+2,large?22:11,large?8:4,'#263e4b80');c.save();
    if(u.down){c.globalAlpha=.4;c.translate(v.x,v.y);c.rotate(-Math.PI/2);c.drawImage(art,-36*scale,-69*scale,72*scale,84*scale);c.restore();return;}
    if(u.hurt>0)c.globalAlpha=.7+Math.sin(u.hurt*60)*.2;
    let dx=0,dy=0;if(u.attack>0&&kind==='blade'&&!reduced){dx=Math.cos(u.face*Math.PI/4)*Math.sin((.42-u.attack)/.42*Math.PI)*5;dy=Math.sin(u.face*Math.PI/4)*Math.sin((.42-u.attack)/.42*Math.PI)*3;}
    c.drawImage(art,Math.round(v.x-36*scale+dx),Math.round(v.y-69*scale+dy),Math.round(72*scale),Math.round(84*scale));c.restore();
    const top=v.y-(large?87:kind==='slime'?27:kind==='wisp'?49:53);
    if(u.hp<u.maxHp){const w=large?55:26;p.r(v.x-w/2-1,top-5,w+2,5,'#273245');p.r(v.x-w/2,top-4,w,3,'#4c5263');p.r(v.x-w/2,top-4,Math.max(1,w*u.hp/u.maxHp),3,enemy?'#df9695':'#b8d7a4');}
    if(!enemy){for(let i=0;i<u.rank;i++){const xx=v.x+(i-(u.rank-1)/2)*6;p.poly([[xx,top-12],[xx+1,top-10],[xx+3,top-10],[xx+1,top-8],[xx+2,top-6],[xx,top-7],[xx-2,top-6],[xx-1,top-8],[xx-3,top-10],[xx-1,top-10]],'#f2d89b');}}
    if(large){c.fillStyle='#e4b2c6';c.font='9px ui-monospace,monospace';c.textAlign='center';c.fillText('WARDEN',v.x,top-10);}
  };
  Renderer.prototype.draw=function(s,ui,dt){
    if(s.phase!=='paused')this.time+=dt;
    const c=this.ctx,p=A.painter(c);c.clearRect(0,0,W,H);c.drawImage(this.bg,0,0);c.drawImage(this.base,0,0);
    const next=G.WAVES[Math.min(7,s.phase==='battle'?s.wave-1:s.wave)];
    // A forecast is visible before every wave, on the actual entrances it describes.
    const objects=[];for(let i=0;i<8;i++){const d=G.DIRS[i],len=Math.hypot(...d);objects.push({depth:(d[0]+d[1])/len*7.25,draw:()=>this.portal(i,next.lanes.includes(i),ui.lang)});}
    const scenery=[[-5.2,-2.8,'ruin'],[2.5,-5.05,'tree'],[3.2,-5.15,'tree'],[-5.2,2.8,'tree'],[-5.15,3.65,'tree'],[5.05,2.8,'tree']];
    for(const [x,y,type]of scenery)objects.push({depth:x+y,draw:()=>type==='ruin'?this.ruin(x,y):this.tree(x,y,type==='tree'?.8:1)});
    if(ui.selected){const u=s.units.find(v=>v.id===ui.selected);if(u&&u.tile){this.ring(u.tile.x,u.tile.y,G.stats(u.kind,u.rank).range,G.JOBS[u.kind].color+'80',true);this.ring(u.x,u.y,.52,'#f1d4a0');}}
    if(s.phase==='prep'){
      for(const u of s.units)if(u.tile){const v=project(u.tile.x,u.tile.y);p.ellipse(v.x,v.y,9,4,G.JOBS[u.kind].color+'80');}
      if(ui.hover&&G.validTile(ui.hover.x,ui.hover.y)){const{x,y}=ui.hover,q=[project(x-.5,y-.5),project(x+.5,y-.5),project(x+.5,y+.5),project(x-.5,y+.5)].map(v=>[v.x,v.y]);p.poly(q,ui.selected?'#eddaa133':'#b9d6b422',ui.selected?'#f0d89d':'#b9d6b4');}
    }
    objects.push({depth:.2,draw:()=>this.crystal(s,ui.reduced)});
    for(const u of s.units)if(u.tile)objects.push({depth:u.x+u.y+.02,draw:()=>this.unit(u,false,ui.reduced)});
    for(const e of s.enemies)objects.push({depth:e.x+e.y,draw:()=>this.unit(e,true,ui.reduced)});
    objects.sort((a,b)=>a.depth-b.depth);for(const o of objects)o.draw();
    if(s.phase==='prep'&&ui.hover&&G.validTile(ui.hover.x,ui.hover.y)&&ui.selected){const u=s.units.find(v=>v.id===ui.selected);if(u&&!u.tile){c.globalAlpha=.5;this.unit({...u,x:ui.hover.x,y:ui.hover.y},false,true);c.globalAlpha=1;}}
    for(const sh of s.shots){const a=project(sh.from.x,sh.from.y,27),b=project(sh.to.x,sh.to.y,20),t=Math.min(1,sh.time/sh.duration),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*(sh.kind==='mage'?43:9);
      if(sh.kind==='mage'){p.ellipse(x,y,5,5,'#ed9979');p.ellipse(x,y,3,3,'#f6dca1');p.r(x-1,y-2,2,2,'#fff1c4');p.r(x-(b.x-a.x)*.025,y+4,3,3,'#be6980');}
      else{const angle=Math.atan2(b.y-a.y,b.x-a.x);p.line(x-Math.cos(angle)*11,y-Math.sin(angle)*11,x,y,'#ddc798');p.poly([[x,y],[x-Math.cos(angle-.5)*4,y-Math.sin(angle-.5)*4],[x-Math.cos(angle+.5)*4,y-Math.sin(angle+.5)*4]],'#e1e9ce');}}
    this.effects=this.effects.filter(e=>e.age<e.life);for(const e of this.effects){if(s.phase!=='paused')e.age+=dt;const t=e.age/e.life,v=project(e.x||0,e.y||0);c.globalAlpha=Math.max(0,1-t);
      if(e.type==='damage'){c.font=(e.value>65?'bold 12px':'10px')+' ui-monospace,monospace';c.fillStyle=e.value>65?'#ffe3a8':'#fcf1d1';c.textAlign='center';c.fillText(e.value,v.x,v.y-35-t*19);}
      else if(e.type==='attack'&&e.kind==='blade'){const b=project(e.tx,e.ty,20);c.strokeStyle='#f9e9c8';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,15+t*9,.3+t,2.6+t);c.stroke();}
      else if(e.type==='attack'&&e.kind==='guard')this.ring(e.x,e.y,.5+t*.8,'#f0d99e');
      else if(e.type==='pulse')this.ring(0,0,t*6,'#c5e8d1');
      else if(e.type==='blast'||e.type==='kill'||e.type==='merge'||e.type==='enrage'){
        const count=ui.reduced?4:e.type==='merge'?18:10;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,d=8+t*(e.type==='merge'?35:20),x=v.x+Math.cos(a)*d,y=v.y-18+Math.sin(a)*d*.7-t*10;p.r(x,y,2+(i%2),2+(i%2),e.type==='blast'?'#ffd5a0':e.type==='merge'?'#f4dca7':'#acded0');}}
      else if(e.type==='deploy'){this.ring(e.x,e.y,.3+t*.6,'#e8dba7');}
      c.globalAlpha=1;
    }
    if(!ui.reduced){for(let i=0;i<17;i++){const x=100+(i*71.77)%650+Math.sin(this.time*.5+i)*7,y=150+(i*31.47)%280+Math.cos(this.time*.4+i)*9;const a=.15+.3*(Math.sin(this.time+i)+1)/2;c.globalAlpha=a;p.r(x,y,2,2,i%3?'#d9e6bd':'#e6bdad');}c.globalAlpha=1;}
    const out=this.canvas.getContext('2d'),d=this.dpr||1,w=this.width||1,h=this.height||1;out.setTransform(d,0,0,d,0,0);out.clearRect(0,0,w,h);out.imageSmoothingEnabled=false;
    const scale=Math.min(w/(w<520?700:W),h/H)*this.zoom,offsetX=(w-W*scale)/2+this.pan.x,offsetY=(h-H*scale)/2+this.pan.y;
    this.view={x:offsetX,y:offsetY,scale};let shake=0;if(!ui.reduced&&this.shake>0){shake=Math.sin(this.time*71)*this.shake;this.shake=Math.max(0,this.shake-dt*12);}
    const sky=out.createLinearGradient(0,offsetY,0,offsetY+H*scale);sky.addColorStop(0,'#182235');sky.addColorStop(1,'#223546');out.fillStyle=sky;out.fillRect(0,0,w,h);
    out.drawImage(this.scene,offsetX+shake,offsetY,W*scale,H*scale);
  };
  root.CVWorld={Renderer,project,W,H};
})(globalThis);
