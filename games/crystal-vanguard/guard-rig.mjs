/** Original-style authored cutouts. A shared joint pose feeds Canvas and Three. */
export const RIG_IDS=['knight','ranger','mage','priest'];
const XS=[0,232,404,636,793,969,1157,1356,1536],YS=[0,250,493,738,1024];
export function prepareParts(image){
 const source=document.createElement('canvas');source.width=image.width;source.height=image.height;const c=source.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const pixels=c.getImageData(0,0,source.width,source.height),d=pixels.data;
 // Chroma-key normalization of the authored export; protect muted purple costumes.
 for(let i=0;i<d.length;i+=4){const key=Math.min(d[i],d[i+2])-d[i+1];if(key>80&&d[i]>150&&d[i+2]>150)d[i+3]=0;else if(key>55&&d[i]>130&&d[i+2]>130){d[i+3]=Math.round(255*(80-key)/25);d[i]=Math.min(d[i],d[i+1]+55);d[i+2]=Math.min(d[i+2],d[i+1]+55);}}
 c.putImageData(pixels,0,0);
 return RIG_IDS.map((_,r)=>Array.from({length:8},(_,col)=>{
  let l=XS[col+1],t=YS[r+1],rr=XS[col],b=YS[r];
  for(let y=YS[r];y<YS[r+1];y++)for(let x=XS[col];x<XS[col+1];x++)if(d[(y*source.width+x)*4+3]>40){l=Math.min(l,x);t=Math.min(t,y);rr=Math.max(rr,x);b=Math.max(b,y);}
  if(rr<l)throw new Error(`Empty rig part ${r}:${col}`);
  const part=document.createElement('canvas');part.width=rr-l+5;part.height=b-t+5;part.getContext('2d').drawImage(source,l,t,rr-l+1,b-t+1,2,2,rr-l+1,b-t+1);return part;
 }));
}
const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
/** Pixel-neutral coordinates: head at y=0, soles at y=100. Legs use two-joint IK. */
export function rigPose(id,p){
 const robe=id==='mage'||id==='priest',parts=[];
 const add=(part,x,y,h,angle=0,anchor=.5,ay=0,uv=[0,1])=>{parts.push({part,x,y,h,angle,anchor,ay,uv});};
 const bob=p.lift*34,bodyY=38-bob,headH=robe?46:43;
 add(2,0,bodyY,robe?52:49,Math.sin(p.phase-.5)*p.move*.08+p.breath*.018);
 for(let i=0;i<2;i++){
  const foot=p.feet[i],hipX=i?9:-9,hipY=65-bob,fx=hipX+foot.x*69/p.face,fy=98+foot.y*35-foot.lift*69;
  const vx=fx-hipX,vy=fy-hipY,len=Math.min(36,Math.hypot(vx,vy)),base=Math.atan2(-vx,vy),bend=Math.acos(Math.min(1,len/36));
  const thigh=base-bend,shin=base+bend,knee=rotate(0,18,thigh);
  add(i?6:5,hipX,hipY,18,thigh,.5,0,[0,.5]);add(i?6:5,hipX+knee.x,hipY+knee.y,18,shin,.5,0,[.5,1]);
 }
 add(1,0,bodyY,robe?52:37,p.lean*.25);
 let left=-.12+Math.sin(p.phase)*p.move*.25,right=.12-Math.sin(p.phase)*p.move*.25;
 if(id==='knight'){left+=-p.anticipation*1.65+p.strike*1.35;right-=p.anticipation*.35+p.strike*.25;}
 if(id==='ranger'){right-=p.anticipation*1.4+p.strike*1.2;left+=p.anticipation*1.1+p.strike*.45;}
 if(robe){left+=p.anticipation*.65-p.strike*.4;right-=p.anticipation*.65+p.strike*.75;}
 const armH=robe?30:31,shoulderY=bodyY+5,aim=Math.max(p.anticipation,p.strike);
 const hands=[];
 for(let i=0;i<2;i++){
  const angle=i?right:left,sx=i?15:-15,rest=rotate(0,armH*.88,angle);
  let hx=sx+rest.x,hy=shoulderY+rest.y;
  if(id==='ranger'){const tx=i?42:12-p.strike*12,ty=shoulderY+(i?1:4);hx+=(tx-hx)*aim;hy+=(ty-hy)*aim;}
  const vx=hx-sx,vy=hy-shoulderY,len=Math.min(armH,Math.hypot(vx,vy)),base=Math.atan2(-vx,vy),bend=Math.acos(Math.min(1,len/armH))*(i?1:-1),upper=base-bend,lower=base+bend,knee=rotate(0,armH/2,upper);
  if(id==='ranger'){add(i?4:3,sx,shoulderY,armH*.55,upper,.5,0,[0,.55]);add(i?4:3,sx+knee.x,shoulderY+knee.y,armH*.55,lower,.5,.09,[.45,1]);}else{add(i?4:3,sx,shoulderY,armH,angle,.5,.10);}
  const wrist=rotate(0,armH/2,lower);hands.push({x:sx+knee.x+wrist.x,y:shoulderY+knee.y+wrist.y,angle:lower});
 }
 if(id!=='ranger'){const wrist=rotate(0,armH*.82,left);hands[0]={x:-15+wrist.x,y:shoulderY+wrist.y,angle:left};}
 const hand=hands[id==='ranger'?1:0],weaponAngle=id==='ranger'?-p.strike*.08:hand.angle+(id==='knight'?-Math.PI*.55:0);
 add(7,hand.x,hand.y,id==='knight'?44:robe?62:48,weaponAngle,.5,id==='knight'?.83:.68);
 add(0,0,bodyY+3,headH,-p.lean*.25,.5,.94);
 return parts;
}
export function drawRig(c,parts,id,pose,x,y,height,alpha=1){
 c.save();c.translate(x,y);c.scale(height/100,height/100);c.scale(Math.sign(pose.turn||pose.face)*Math.max(.32,Math.abs(pose.turn)),1);c.rotate(pose.stage==='dead'?pose.death*.65:pose.lean);c.translate(0,-100);c.globalAlpha=alpha;
 for(const p of rigPose(id,pose)){const im=parts[p.part],fraction=p.uv[1]-p.uv[0],w=im.width/im.height*p.h/fraction;c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.drawImage(im,0,im.height*p.uv[0],im.width,im.height*fraction,-w*p.anchor,-p.h*p.ay,w,p.h);c.restore();}c.restore();
}
