/* Optional offline renderer QA: npm package @napi-rs/canvas, no browser or network. */
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {join,resolve}=require('node:path');
const {writeFileSync,mkdirSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),out=resolve(process.argv[2]||'/tmp/crystal-guard-proof');mkdirSync(out,{recursive:true});
 global.document={createElement:()=>createCanvas(1,1)};
 global.matchMedia=()=>({matches:false});global.devicePixelRatio=1;
 const {Renderer}=await import(join(root,'guard-render.mjs'));
 const {Game}=await import(join(root,'guard-core.mjs'));
 const atlas=await loadImage(join(root,'guard-assets/atlas.png'));
 const env=await loadImage(join(root,'guard-assets/environment.png'));
 for(const [name,w,h]of [['desktop',1280,720],['mobile',390,550]]){
  const canvas=createCanvas(w,h);canvas.getBoundingClientRect=()=>({width:w,height:h});
  const r=new Renderer(canvas);r.resize();r.atlas=atlas;r.environment=env;
  r.frames=r.measure(atlas,[0,315,634,946,1254],[0,327,650,925,1254]);
  r.env=r.measure(env,[0,455,915,env.width],[0,660,env.height]);
  assert.equal(r.frames.length,16);assert.equal(r.env.length,6);
  for(const f of [...r.frames,...r.env])assert.ok(f.w>0&&f.h>0);
  const g=new Game(42);g.build('tower',5,4);g.build('wall',3,5);g.build('frost',4,5);
  r.tool='move';r.draw(g,0);
  for(let x=0;x<15;x++)for(let y=0;y<11;y++){const p=r.project(x,y);const cell=r.unproject(p.x,p.y);assert.ok(cell.x===x&&cell.y===y);}
  for(const h of g.state.heroes){const p=r.project(h.x,h.y);assert.equal(r.pickActor(g.state,p.x,p.y-30*r.scale)?.type,'hero');}
  writeFileSync(join(out,`${name}-prep.png`),canvas.toBuffer('image/png'));
  g.start();for(let t=0;t<7*60;t++)g.tick(1/60);r.draw(g,.1);
  writeFileSync(join(out,`${name}-battle.png`),canvas.toBuffer('image/png'));
  console.log(name,`${w}x${h}`,`${r.frames.length} actor frames / ${r.env.length} environment frames`,`${g.state.enemies.length} enemies`);
 }
})();
