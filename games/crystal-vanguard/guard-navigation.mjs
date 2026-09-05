import {W,H} from './guard-content.mjs';
const key=(x,y)=>`${x},${y}`;
export function clearPoint(p,blocked,radius=.16) {
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>W-1||p.y>H-1)return false;
  for(let y=Math.floor(p.y-.5-radius);y<=Math.ceil(p.y+.5+radius);y++)for(let x=Math.floor(p.x-.5-radius);x<=Math.ceil(p.x+.5+radius);x++)
    if(blocked.has(key(x,y))&&Math.abs(p.x-x)<.5+radius&&Math.abs(p.y-y)<.5+radius)return false;
  return true;
}
export function clearSegment(a,b,blocked) {
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.1));
  for(let i=0;i<=steps;i++)if(!clearPoint({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},blocked))return false;
  return true;
}
/** Search a coarse grid, then remove every waypoint with a clear swept corridor. */
export function findPath(start,target,blocked) {
  if(!clearPoint(target,blocked))return [];
  if(clearSegment(start,target,blocked))return [{...target}];
  const first={x:Math.round(start.x),y:Math.round(start.y)},goal={x:Math.round(target.x),y:Math.round(target.y)};
  const queue=[first],previous=new Map([[key(first.x,first.y),null]]);let found=false;
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];if(p.x===goal.x&&p.y===goal.y){found=true;break;}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const q={x:p.x+dx,y:p.y+dy},k=key(q.x,q.y);
      if(q.x<0||q.y<0||q.x>=W||q.y>=H||blocked.has(k)||previous.has(k))continue;
      previous.set(k,p);queue.push(q);
    }
  }
  if(!found)return [];
  const raw=[{...target}];let p=goal;
  while(p){raw.push(p);p=previous.get(key(p.x,p.y));}raw.reverse();
  const result=[];let current=start,index=0;
  while(index<raw.length) {
    let far=-1;
    for(let j=raw.length-1;j>=index;j--)if(clearSegment(current,raw[j],blocked)){far=j;break;}
    if(far<0)return [];
    result.push(raw[far]);current=raw[far];index=far+1;
  }
  return result;
}
