/* Native-pixel atelier. Every character is built from the same rig and palettes.
 * Scanline polygons and Bresenham lines deliberately avoid antialiased edges.
 * Generated frames are cached in memory, never fetched as image assets.
 */
(function(root){
 'use strict';
 const P={ink:'#302c40',deep:'#243c45',skin:'#e5ac86',skinLight:'#ffe0b0',skinShade:'#b97666',white:'#fff2cd',steel:'#a7c9cf',steelLight:'#e8ece1',steelDark:'#64858f',gold:'#d6a25e',goldLight:'#f7d88c',goldDark:'#946e49',brown:'#704e44',hair:'#674337',hairLight:'#af764c',teal:'#4c9f9b',tealLight:'#98d4bc',tealDark:'#32646d',green:'#6e955e',greenLight:'#b3c978',greenDark:'#44634e',purple:'#77628e',purpleLight:'#b8a0c0',purpleDark:'#4c486b'};
 function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function line(c,x0,y0,x1,y1,col,width=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let e=dx+dy;for(let i=0;i<2000;i++){rect(c,x0-Math.floor(width/2),y0-Math.floor(width/2),width,width,col);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
 function poly(c,pts,col,outline=null){const ps=pts.map(p=>p.map(Math.round));let lo=Math.min(...ps.map(p=>p[1])),hi=Math.max(...ps.map(p=>p[1]));c.fillStyle=col;for(let y=lo;y<=hi;y++){let xs=[];for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let k=0;k<xs.length;k+=2)c.fillRect(Math.ceil(xs[k]),y,Math.floor(xs[k+1])-Math.ceil(xs[k])+1,1);}if(outline)for(let i=0;i<ps.length;i++)line(c,...ps[i],...ps[(i+1)%ps.length],outline);}
 function ellipse(c,x,y,rx,ry,col){for(let dy=-ry;dy<=ry;dy++){const dx=Math.floor(rx*Math.sqrt(Math.max(0,1-dy*dy/(ry*ry))));rect(c,x-dx,y+dy,dx*2+1,1,col);}}
 function box(c,x,y,w,h,col,edge=P.ink){rect(c,x,y,w,h,edge);rect(c,x+1,y+1,w-2,h-2,col);}
 const cache=new Map();
 function weapon(c,kind,x,y,angle,rank){
   const point=(a,b)=>[Math.round(x+a*Math.cos(angle)-b*Math.sin(angle)),Math.round(y+a*Math.sin(angle)+b*Math.cos(angle))];
   const shape=(ps,col,out=P.ink)=>poly(c,ps.map(p=>point(...p)),col,out);
   if(kind==='blade'){
     shape([[-2,3],[-2,-22-rank*2],[0,-27-rank*2],[3,-22-rank*2],[2,3]],P.steel);line(c,...point(0,-23-rank*2),...point(0,-3),P.steelLight);shape([[-6,-2],[6,-2],[6,1],[-6,1]],rank>1?P.gold:P.brown);shape([[-1,1],[1,1],[1,7],[-1,7]],P.brown);rect(c,x-2,y+6,4,2,P.goldLight);
   }else if(kind==='ranger'){
     const q=[[-3,-22],[3,-17],[6,-7],[4,4],[-2,12]];for(let i=0;i<q.length-1;i++)line(c,...point(...q[i]),...point(...q[i+1]),P.ink,3);for(let i=0;i<q.length-1;i++)line(c,...point(...q[i]),...point(...q[i+1]),P.gold);line(c,...point(-3,-22),...point(-2,12),P.white);line(c,...point(-4,-5),...point(17,-5),P.brown);shape([[17,-5],[13,-7],[13,-3]],P.steelLight);
   }else if(kind==='mage'){
     shape([[-1,9],[-2,-34],[1,-34],[2,9]],P.goldDark);shape([[-1,6],[0,-28],[1,-28],[1,6]],P.goldLight,null);const at=point(0,-34);ellipse(c,...at,5,6,P.ink);ellipse(c,at[0],at[1]-1,4,5,P.gold);poly(c,[[at[0],at[1]-7],[at[0]+4,at[1]-2],[at[0],at[1]+3],[at[0]-4,at[1]-2]],P.tealLight,P.tealDark);rect(c,at[0]-2,at[1]-4,2,3,P.white);
   }else{
     shape([[-1,5],[-2,-19],[0,-25],[3,-19],[2,5]],P.steelLight);shape([[-5,-4],[5,-4],[5,-1],[-5,-1]],P.gold);shape([[-1,0],[1,0],[1,8],[-1,8]],P.brown);
   }
 }
 function shield(c,x,y,kind,rank){if(kind==='guard'){poly(c,[[x-10,y-10],[x+9,y-10],[x+10,y+4],[x,y+15],[x-10,y+5]],P.gold,P.ink);poly(c,[[x-7,y-7],[x+6,y-7],[x+7,y+3],[x,y+11],[x-7,y+3]],P.tealDark);line(c,x,y-5,x,y+7,P.goldLight,2);line(c,x-5,y,x+5,y,P.goldLight,2);poly(c,[[x,y-4],[x+3,y],[x,y+4],[x-3,y]],P.tealLight);}else{ellipse(c,x,y,7,8,P.ink);ellipse(c,x,y-1,6,7,rank>1?P.gold:P.brown);ellipse(c,x,y-1,4,5,rank>1?P.tealDark:P.goldDark);rect(c,x-1,y-2,3,3,P.steelLight);line(c,x-4,y-5,x+1,y-6,P.goldLight);}}
 function humanoid(c,kind,rank,dir,action,frame){
   const right=[0,1,7].includes(dir),left=[3,4,5].includes(dir),back=[5,6,7].includes(dir),side=dir===0||dir===4,face=right?1:left?-1:0;
   const walk=action==='walk',attack=action==='attack'||action==='cast',hurt=action==='hurt',dead=action==='death';
   const cycle=[-2,0,2,0][frame%4],bob=walk?(frame%2):action==='idle'?(frame%2):0;
   let y=bob+(hurt?1:0);if(dead)y+=frame*3;
   c.save();if(dead){c.translate(32,70);c.rotate((face||1)*Math.min(1.35,frame*.38));c.translate(-32,-70);c.globalAlpha=1-frame*.17;}
   const cape=kind==='ranger'?P.green:kind==='mage'?P.purple:kind==='guard'?P.teal:P.teal;
   const light=kind==='ranger'?P.greenLight:kind==='mage'?P.purpleLight:kind==='guard'?P.steelLight:P.white;
   const body=kind==='ranger'?P.green:kind==='mage'?P.purple:kind==='guard'?P.steel:P.white;
   const dark=kind==='ranger'?P.greenDark:kind==='mage'?P.purpleDark:kind==='guard'?P.steelDark:'#c5b397';
   // Cape, quiver and far arm share the same shoulders and fixed root.
   poly(c,[[24,38+y],[40,38+y],[43+cycle/2,62+y],[34,60+y],[27,64+y],[20+cycle/2,60+y]],cape,P.ink);
   line(c,24,42+y,24+cycle/2,58+y,dark,2);line(c,37,44+y,39+cycle/2,58+y,light);
   if(kind==='ranger'){poly(c,[[22,35+y],[27,34+y],[29,54+y],[24,57+y]],P.brown,P.ink);for(let i=0;i<3;i++){line(c,23+i*2,39+y,20+i*2,28+y,P.goldLight);line(c,20+i*2,28+y,18+i*2,31+y,P.white);}}
   const legs=walk?cycle:0;
   // Leg motion changes joint pose, never the frame or character scale.
   box(c,25,53+y,7,12+legs,P.brown);box(c,34,53+y,7,12-legs,P.brown);
   box(c,23,63+y+legs,10,6,'#514553');box(c,34,63+y-legs,10,6,'#514553');
   rect(c,24,64+y+legs,5,1,P.gold);rect(c,35,64+y-legs,5,1,P.gold);rect(c,25,54+y,2,6,dark);rect(c,35,54+y,2,6,dark);
   const swing=attack?[0,-3,-6,1][frame%4]:walk?cycle:0;
   const swordSide=back?-1:1;const rx=32+swordSide*13,ly=48+y;
   box(c,32-swordSide*15,40+y,7,13-swing,body);box(c,32-swordSide*14,50+y-swing,6,6,P.skin);
   // Tunic and a two-tone belt give the torso volume at native resolution.
   poly(c,[[25,37+y],[38,37+y],[42,43+y],[39,56+y],[25,56+y],[22,44+y]],body,P.ink);
   poly(c,[[35,39+y],[40,43+y],[38,55+y],[34,55+y]],dark);rect(c,26,40+y,3,9,light);
   if(back){line(c,31,39+y,32,54+y,dark);poly(c,[[27,39+y],[37,39+y],[40,58+y],[33,62+y],[24,57+y]],cape,P.ink);line(c,29,43+y,27,55+y,light);}
   else {poly(c,[[25,38+y],[31,40+y],[32,46+y],[27,45+y]],dark);poly(c,[[38,38+y],[32,40+y],[32,46+y],[36,44+y]],light);line(c,31,46+y,31,52+y,dark);}
   rect(c,24,52+y,16,4,P.brown);box(c,30,52+y,5,4,P.goldLight,P.goldDark);
   if(kind==='mage'){poly(c,[[25,49+y],[38,49+y],[43,63+y],[34,65+y],[23,63+y]],body,P.ink);line(c,26,51+y,25,61+y,P.purpleLight,2);line(c,37,52+y,39,61+y,P.gold);rect(c,28,56+y,2,2,P.goldLight);rect(c,34,59+y,2,2,P.goldLight);rect(c,24,63+y,17,2,P.gold);}
   if(kind==='guard'||rank>1){box(c,21,39+y,10,7,kind==='guard'?P.steel:P.gold);box(c,35,39+y,10,7,kind==='guard'?P.steelDark:P.goldDark);rect(c,22,39+y,8,2,P.steelLight);rect(c,36,39+y,8,2,rank>1?P.goldLight:P.steelLight);}
   box(c,rx-3,41+y+swing/2,7,12,body);box(c,rx-2,50+y+swing/2,6,6,P.skin);rect(c,rx-1,50+y+swing/2,3,2,P.skinLight);
   // Neck / face construction: same dimensions for every profession and action.
   box(c,29,34+y,7,6,P.skinShade);const hx=32+face*2,hy=27+y;
   ellipse(c,hx,hy,12,12,P.ink);ellipse(c,hx,hy-1,11,11,P.skin);ellipse(c,hx-2,hy-3,9,8,P.skinLight);
   rect(c,hx-12,hy,3,5,P.skin);rect(c,hx+10,hy,3,5,P.skinShade);
   const hair=kind==='mage'?'#83778e':kind==='ranger'?'#925d40':P.hair;
   const hairHi=kind==='mage'?'#c1b6c7':kind==='ranger'?'#d6a05b':P.hairLight;
   if(!back){const eye=side?face*5:face*2;rect(c,hx-6+eye,hy,4,5,P.ink);rect(c,hx-5+eye,hy,2,3,kind==='mage'?P.purple: P.tealDark);rect(c,hx-5+eye,hy,1,1,P.white);if(!side){rect(c,hx+3+eye,hy,4,5,P.ink);rect(c,hx+4+eye,hy,2,3,P.tealDark);rect(c,hx+4+eye,hy,1,1,P.white);}rect(c,hx+face*2,hy+6,2,1,P.skinShade);rect(c,hx-8,hy+5,3,1,'#edb39a');rect(c,hx+6,hy+5,2,1,'#edb39a');}
   // Asymmetric fringe, one shared upper-left light. No mirrored weapon frames.
   poly(c,[[hx-12,hy+1],[hx-13,hy-8],[hx-9,hy-13],[hx-4,hy-14],[hx-1,hy-16],[hx+5,hy-14],[hx+10,hy-10],[hx+12,hy-4],[hx+11,hy+5],[hx+8,hy+1],[hx+7,hy-6],[hx+3,hy-2],[hx,hy-6],[hx-5,hy-2],[hx-7,hy-5],[hx-10,hy+3]],hair,P.ink);
   poly(c,[[hx-10,hy-9],[hx-6,hy-12],[hx+1,hy-12],[hx-2,hy-9],[hx+4,hy-9],[hx+1,hy-6],[hx-5,hy-8],[hx-7,hy-5]],hairHi);
   if(back){ellipse(c,hx,hy-1,11,11,hair);poly(c,[[hx-10,hy-6],[hx-7,hy-11],[hx+1,hy-12],[hx+8,hy-7],[hx+6,hy-5],[hx-2,hy-8]],hairHi);for(let i=0;i<4;i++)line(c,hx-7+i*4,hy+1,hx-8+i*4,hy+8,P.hair);}
   if(kind==='blade'){
     poly(c,[[25,37+y],[32,39+y],[39,35+y],[39,39+y],[32,42+y],[24,39+y]],P.teal,P.ink);line(c,25,37+y,31,39+y,P.tealLight);poly(c,[[28,40+y],[24,41+y],[21+cycle,48+y],[27+cycle,46+y]],P.teal,P.tealDark);
   }else if(kind==='ranger'){
     poly(c,[[hx-14,hy-7],[hx-10,hy-15],[hx+2,hy-17],[hx+11,hy-11],[hx+15,hy-5],[hx+3,hy-6],[hx-2,hy-4]],P.green,P.ink);poly(c,[[hx-10,hy-10],[hx-7,hy-14],[hx+2,hy-15],[hx+6,hy-11],[hx-1,hy-10]],P.greenLight);line(c,hx+6,hy-10,hx+16,hy-24,P.goldLight,2);poly(c,[[hx+9,hy-16],[hx+13,hy-24],[hx+18,hy-25],[hx+15,hy-18]],P.white);
   }else if(kind==='mage'){
     poly(c,[[hx-17,hy-10],[hx-8,hy-14],[hx-2,hy-31],[hx+10,hy-29],[hx+14,hy-25],[hx+5,hy-27],[hx+9,hy-12],[hx+16,hy-9],[hx+10,hy-6],[hx-7,hy-6]],P.purple,P.ink);poly(c,[[hx-7,hy-14],[hx-1,hy-29],[hx+4,hy-28],[hx+2,hy-13]],P.purpleLight);poly(c,[[hx-8,hy-13],[hx+8,hy-12],[hx+9,hy-9],[hx-9,hy-10]],P.gold);rect(c,hx,hy-12,3,3,P.tealLight);
   }else{
     poly(c,[[hx-13,hy+5],[hx-14,hy-7],[hx-8,hy-15],[hx+7,hy-15],[hx+13,hy-7],[hx+12,hy+6],[hx+9,hy+9],[hx+8,hy-5],[hx-8,hy-5],[hx-10,hy+9]],P.steel,P.ink);poly(c,[[hx-12,hy-7],[hx-7,hy-13],[hx+1,hy-13],[hx+1,hy-7]],P.steelLight);line(c,hx,hy-14,hx,hy-7,P.gold,2);rect(c,hx-10,hy-6,20,2,P.gold);poly(c,[[hx-2,hy-15],[hx-3,hy-22],[hx+4,hy-24],[hx+9,hy-20],[hx+3,hy-20],[hx+1,hy-14]],P.teal,P.ink);
   }
   const arc=kind==='mage'?[-.12,.25,.6,.1]:[.2,1.2,1.7,.6];
   const weaponAngle=attack?(face||1)*arc[frame%4]:(face||1)*.12;
   if(kind==='blade'||kind==='guard')shield(c,32-swordSide*12,52+y-swing/2,kind,rank);
   weapon(c,kind,rx,53+y+swing/2,weaponAngle,rank);
   if(rank>=2){rect(c,23,47+y,3,2,P.goldLight);rect(c,37,47+y,3,2,P.goldLight);}
   if(rank===3){poly(c,[[hx-8,hy-13],[hx-8,hy-19],[hx-3,hy-16],[hx,hy-22],[hx+3,hy-16],[hx+8,hy-19],[hx+8,hy-13]],P.goldLight,P.goldDark);rect(c,hx-1,hy-16,3,3,P.tealLight);}
   if(hurt){c.globalCompositeOperation='source-atop';c.globalAlpha=.45;rect(c,0,0,64,80,P.white);}
   c.restore();
 }
 function monster(c,kind,dir,action,frame){const walk=action==='walk',a=action==='attack',dead=action==='death';const b=walk?[0,-1,0,1][frame%4]:frame%2;const right=[0,1,7,2].includes(dir);c.save();if(!right){c.translate(64,0);c.scale(-1,1);}if(dead){c.globalAlpha=Math.max(0,1-frame*.24);c.translate(0,frame*2);}if(kind==='sprout'){
   ellipse(c,32,62+b,16+(b>0?1:0),9-b,P.ink);ellipse(c,32,61+b,15,8-b,P.tealDark);ellipse(c,30,58+b,13,7,P.teal);ellipse(c,27,55+b,7,3,P.tealLight);rect(c,23,54+b,4,2,P.white);rect(c,29,59+b,2,4,P.ink);rect(c,39,59+b,2,4,P.ink);rect(c,33,65+b,4,1,P.ink);poly(c,[[31,52+b],[25,47+b],[25,43+b],[31,44+b],[34,51+b]],P.greenLight,P.greenDark);poly(c,[[32,51+b],[33,44+b],[40,41+b],[39,47+b]],P.green,P.greenDark);if(a)rect(c,42,61,5,3,P.white);
 }else if(kind==='imp'){
   box(c,23,59+b,6,11,P.brown);box(c,36,58-b,6,11,P.brown);poly(c,[[23,44+b],[40,44+b],[43,59+b],[37,64+b],[24,60+b]],P.brown,P.ink);poly(c,[[26,45+b],[38,45+b],[37,57+b],[27,57+b]],P.goldDark);ellipse(c,32,37+b,13,13,P.ink);ellipse(c,32,37+b,12,12,P.green);poly(c,[[21,34+b],[11,29+b],[17,40+b],[23,40+b]],P.green,P.ink);poly(c,[[41,34+b],[49,30+b],[46,40+b],[40,40+b]],P.green,P.ink);poly(c,[[19,31+b],[23,22+b],[36,20+b],[42,27+b],[45,31+b]],'#a66e53',P.ink);line(c,22,29+b,41,28+b,'#e0a36c',2);rect(c,25,36+b,4,4,P.white);rect(c,37,36+b,4,4,P.white);rect(c,27,37+b,2,3,P.ink);rect(c,39,37+b,2,3,P.ink);poly(c,[[30,39+b],[39,40+b],[38,44+b],[31,45+b]],P.greenLight,P.greenDark);rect(c,28,47+b,11,2,P.ink);rect(c,29,45+b,2,4,P.white);box(c,18,48+b,7,9,P.green);box(c,41,48+b,6,8,P.green);line(c,47,60+b,48+(a?8:0),37+b,P.brown,4);poly(c,[[44+(a?8:0),32+b],[50+(a?8:0),29+b],[54+(a?8:0),38+b],[48+(a?8:0),42+b]],P.goldDark,P.ink);
 }else if(kind==='wolf'){
   const step=walk?[2,-1,-2,1][frame%4]:0;
   poly(c,[[15,48+b],[7,39+b],[3,37+b],[5,48+b],[16,57+b]],P.steelDark,P.ink);poly(c,[[14,45+b],[34,42+b],[47,51+b],[42,61+b],[18,61+b],[12,54+b]],P.steelDark,P.ink);poly(c,[[18,45+b],[33,45+b],[36,49+b],[16,50+b]],P.steel);box(c,17+step,57+b,6,12-step,P.steelDark);box(c,35-step,57+b,6,12+step,P.steelDark);rect(c,16+step,68+b-step,8,3,P.ink);rect(c,35-step,68+b+step,8,3,P.ink);poly(c,[[32,36+b],[36,27+b],[42,34+b],[49,29+b],[52,40+b],[60,47+b],[59,53+b],[47,56+b],[35,51+b]],P.steelDark,P.ink);poly(c,[[38,41+b],[46,42+b],[50,48+b],[58,47+b],[56,53+b],[45,54+b],[38,49+b]],P.white);rect(c,44,41+b,5,3,P.ink);rect(c,46,41+b,2,2,P.goldLight);rect(c,56,46+b,5,4,P.ink);if(a){rect(c,51,54+b,9,4,P.ink);rect(c,52,54+b,2,2,P.white);}line(c,37,31+b,38,35+b,P.purpleLight,2);
 }else{
   const boss=kind==='elder',stone=boss?'#776776':'#79868b',shine=boss?'#b59a9b':'#b0b9aa',shadow=boss?'#4e475f':'#4c626e';
   box(c,17,58+b,12,13,shadow);box(c,37,58-b,12,13,shadow);poly(c,[[17,37+b],[45,37+b],[51,58+b],[39,64+b],[22,63+b],[13,55+b]],stone,P.ink);poly(c,[[19,38+b],[33,36+b],[35,48+b],[20,50+b]],shine);poly(c,[[35,38+b],[44,39+b],[48,55+b],[37,59+b]],shadow);poly(c,[[13,37+b],[20,43+b],[16,59+b],[6,59+b],[5,46+b]],stone,P.ink);poly(c,[[46,37+b],[56,40+b],[60,55+b-(a?9:0)],[50,61+b-(a?9:0)],[43,52+b]],stone,P.ink);poly(c,[[18,19+b],[30,13+b],[44,18+b],[46,34+b],[36,41+b],[21,35+b]],stone,P.ink);poly(c,[[20,20+b],[29,16+b],[33,18+b],[31,29+b],[21,29+b]],shine);poly(c,[[33,17+b],[43,20+b],[43,33+b],[34,37+b]],shadow);rect(c,22,28+b,7,3,P.ink);rect(c,34,28+b,7,3,P.ink);rect(c,24,28+b,4,2,boss?P.goldLight:P.tealLight);rect(c,35,28+b,4,2,boss?P.goldLight:P.tealLight);poly(c,[[31,42+b],[37,49+b],[31,56+b],[26,49+b]],boss?P.goldLight:P.tealLight,P.ink);line(c,31,38+b,32,43+b,P.ink);line(c,24,58+b,26,53+b,P.ink);if(boss){poly(c,[[18,22+b],[12,6+b],[24,14+b],[31,3+b],[38,13+b],[52,7+b],[45,24+b]],P.goldDark,P.ink);poly(c,[[19,17+b],[15,10+b],[24,18+b],[31,8+b],[38,18+b],[48,11+b],[44,21+b]],P.goldLight);rect(c,30,16+b,4,5,P.tealLight);}
 }
 if(action==='hurt'){c.globalCompositeOperation='source-atop';c.globalAlpha=.4;rect(c,0,0,64,80,P.white);}c.restore();}
 function sprite(kind,rank=1,dir=1,action='idle',frame=0){frame%=4;const key=[kind,rank,dir,action,frame].join('/');if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=96;c.height=96;const g=c.getContext('2d');g.translate(16,12);if(['blade','ranger','mage','guard'].includes(kind))humanoid(g,kind,rank,dir,action,frame);else monster(g,kind,dir,action,frame);cache.set(key,c);return c;}
 function tree(c,x,y,seed=0){const h=42+seed%13;poly(c,[[x-5,y],[x-4,y-h],[x+4,y-h],[x+6,y]],P.brown,P.deep);rect(c,x-2,y-h,2,h-2,'#a07953');const tiers=[[0,-h-19,23,12],[-7,-h-9,26,13],[9,-h-4,23,13],[0,-h+8,25,11]];for(const [dx,dy,rx,ry]of tiers){ellipse(c,x+dx,y+dy,rx,ry,'#365d56');ellipse(c,x+dx-2,y+dy-3,rx-2,ry-2,'#527e5f');ellipse(c,x+dx-6,y+dy-6,rx-7,Math.max(3,ry-5),'#7c9c65');for(let k=0;k<5;k++)rect(c,x+dx-10+(k*7+seed)%24,y+dy-7+(k*5)%12,3,2,'#abc37a');}poly(c,[[x-4,y-3],[x-14,y+3],[x+10,y+4],[x+4,y-5]],P.brown);}
 function pillar(c,x,y,h=48){poly(c,[[x-10,y],[x-10,y-h],[x,y-h-5],[x+10,y-h],[x+10,y],[x,y+5]],'#7d8790',P.deep);poly(c,[[x-10,y-h],[x,y-h-5],[x,y+5],[x-10,y]],'#b3b6a9');poly(c,[[x,y-h-5],[x+10,y-h],[x+10,y],[x,y+5]],'#687b84');line(c,x-6,y-h+3,x-6,y-3,'#d0c8b0',2);poly(c,[[x-13,y-h],[x,y-h-7],[x+13,y-h],[x,y-h+7]],'#c9c5ae',P.deep);line(c,x+3,y-14,x+7,y-24,'#3f555f');for(let i=0;i<3;i++)ellipse(c,x-6+i*5,y+1,5,2,'#668d60');}
 function crystal(c,x,y,time=0,flash=0){
   poly(c,[[x-27,y+2],[x,y-12],[x+27,y+2],[x+27,y+10],[x,y+24],[x-27,y+10]],'#5c7781',P.deep);poly(c,[[x-27,y+2],[x,y-12],[x+27,y+2],[x,y+16]],'#a7b8ac',P.deep);poly(c,[[x-18,y],[x,y-9],[x+18,y],[x,y+9]],'#3c646d',P.deep);line(c,x-23,y+9,x,y+20,P.gold);line(c,x,y+20,x+23,y+9,P.goldDark);
   const bob=Math.round(Math.sin(time*1.8)*2),cy=y-20+bob;
   poly(c,[[x,cy-44],[x+17,cy-18],[x+13,cy+8],[x,cy+23],[x-16,cy+5],[x-19,cy-17]],flash?P.white:'#4aabad',P.deep);
   poly(c,[[x,cy-44],[x-19,cy-17],[x-4,cy-10]],flash?P.white:'#c9f2d5');poly(c,[[x,cy-44],[x+17,cy-18],[x-4,cy-10]],flash?P.white:'#86d7c4');poly(c,[[x-19,cy-17],[x-4,cy-10],[x,cy+23],[x-16,cy+5]],'#63beb1');poly(c,[[x-4,cy-10],[x+17,cy-18],[x+13,cy+8],[x,cy+23]],'#397e95');line(c,x,cy-40,x-3,cy-11,'#ecffe3');line(c,x-3,cy-10,x,cy+20,'#b2eccf');poly(c,[[x+8,cy-12],[x+12,cy-15],[x+10,cy-4],[x+6,cy-1]],'#89d3c3');
 }
 root.CVArt={P,rect,line,poly,ellipse,box,sprite,tree,pillar,crystal,cache};
})(globalThis);
