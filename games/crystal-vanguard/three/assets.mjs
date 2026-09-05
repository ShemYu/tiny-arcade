import {prepareParts} from '../guard-rig.mjs';
import * as THREE from '../vendor/three/three.module.min.js';

export function measureFrames(image,xs,ys) {
  const canvas=document.createElement('canvas');
  canvas.width=image.width; canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data, frames=[];
  for(let r=0;r<ys.length-1;r++) for(let c=0;c<xs.length-1;c++) {
    const x0=xs[c],x1=xs[c+1],y0=ys[r],y1=ys[r+1];
    let l=x1,t=y1,right=x0,bottom=y0;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(data[(y*canvas.width+x)*4+3]>40) {
      l=Math.min(l,x);t=Math.min(t,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    if(right<l||bottom<t)throw new Error(`Empty art frame ${r},${c}`);
    frames.push({x:l,y:t,w:right-l+1,h:bottom-t+1});
  }
  return frames;
}

/** Each cropped texture has transparent padding to prevent atlas edge bleeding. */
export class ForestAssets {
  constructor(){this.textures=[];}
  async load() {
    const loader=new THREE.ImageLoader();
    [this.atlas,this.environment]=await Promise.all([
      loader.loadAsync(new URL('../guard-assets/atlas.png',import.meta.url).href),
      loader.loadAsync(new URL('../guard-assets/environment.png',import.meta.url).href)
    ]);
    this.frames=measureFrames(this.atlas,[0,315,634,946,1254],[0,327,650,925,1254]);
    this.env=measureFrames(this.environment,[0,455,915,this.environment.width],[0,660,this.environment.height]);
    this.actors=this.frames.map(f=>this.texture(this.atlas,f));
    this.scenery=this.env.map(f=>this.texture(this.environment,f));
    const image=await loader.loadAsync(new URL('../guard-assets/hero-parts.png',import.meta.url).href);
    this.rigParts=prepareParts(image);this.rigs=this.rigParts.map(row=>row.map(image=>this.texture(image,{x:0,y:0,w:image.width,h:image.height})));
  }
  texture(image,frame) {
    const canvas=document.createElement('canvas');canvas.width=frame.w+4;canvas.height=frame.h+4;
    canvas.getContext('2d').drawImage(image,frame.x,frame.y,frame.w,frame.h,2,2,frame.w,frame.h);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=2;
    this.textures.push(texture);return texture;
  }
  dispose(){for(const t of this.textures)t.dispose();this.textures.length=0;}
}
