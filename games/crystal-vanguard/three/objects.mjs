import * as THREE from '../vendor/three/three.module.min.js';
import {W,H,CORE,ROCKS} from '../guard-content.mjs';

/** Shared immutable geometry/materials are owned by one render session. */
export class ObjectFactory {
  constructor(assets) {
    this.assets=assets; this.geometries=new Map();this.materials=new Map();
  }
  geometry(key,create){if(!this.geometries.has(key))this.geometries.set(key,create());return this.geometries.get(key);}
  material(color,unlit=false){const key=`${color}:${unlit}`;if(!this.materials.has(key))this.materials.set(key,unlit?new THREE.MeshBasicMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.88,metalness:.04}));return this.materials.get(key);}
  box(parent,size,position,color) {
    const mesh=new THREE.Mesh(this.geometry('box',()=>new THREE.BoxGeometry(1,1,1)),this.material(color));
    mesh.scale.set(...size);mesh.position.set(...position);parent.add(mesh);return mesh;
  }
  cylinder(parent,rTop,rBottom,height,position,color,sides=8) {
    const key=`cylinder:${rTop}:${rBottom}:${height}:${sides}`;
    const mesh=new THREE.Mesh(this.geometry(key,()=>new THREE.CylinderGeometry(rTop,rBottom,height,sides)),this.material(color));
    mesh.position.set(...position);parent.add(mesh);return mesh;
  }
  ring(parent,radius=.5,color='#dbeccb',thickness=.035) {
    const key=`ring:${radius}:${thickness}`;
    const mesh=new THREE.Mesh(this.geometry(key,()=>new THREE.RingGeometry(radius-thickness,radius,48)),this.material(color,true));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.035;parent.add(mesh);return mesh;
  }
  shadow(parent,radius=.4) {
    const key='shadow';
    if(!this.materials.has(key))this.materials.set(key,new THREE.MeshBasicMaterial({color:'#344b35',transparent:true,opacity:.16,depthWrite:false}));
    const mesh=new THREE.Mesh(this.geometry('disc',()=>new THREE.CircleGeometry(1,24)),this.materials.get(key));
    mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(radius);mesh.position.y=.012;parent.add(mesh);return mesh;
  }
  bakeStatic(group,key) {
    // One vertex-colored draw for a building's fixed opaque parts. Keep moving
    // turrets, health bars and transparent shadows outside this batch.
    const parts=group.children.filter(o=>o.isMesh&&o.material.isMeshStandardMaterial);
    if(parts.length<2)return;
    const geometry=this.geometry(`baked:${key}`,()=>{
      const positions=[],normals=[],colors=[];
      for(const mesh of parts) {
        mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);
        const p=g.getAttribute('position'),n=g.getAttribute('normal'),color=mesh.material.color;
        for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(color.r,color.g,color.b);}
        g.dispose();
      }
      const baked=new THREE.BufferGeometry();baked.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));baked.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));baked.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return baked;
    });
    if(!this.materials.has('vertex-lit'))this.materials.set('vertex-lit',new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.04}));
    for(const part of parts)group.remove(part);
    group.add(new THREE.Mesh(geometry,this.materials.get('vertex-lit')));
  }
  sprite(texture,height) {
    const material=new THREE.SpriteMaterial({map:texture,alphaTest:.18,transparent:true,depthWrite:true,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.center.set(.5,.035);
    const ratio=texture.image.width/texture.image.height;sprite.scale.set(height*ratio,height,1);
    sprite.userData.height=height;sprite.userData.width=height*ratio;return sprite;
  }
  healthBar(color,width=.7) {
    const group=new THREE.Group();
    const geometry=this.geometry('plane',()=>new THREE.PlaneGeometry(1,1));
    const back=new THREE.Mesh(geometry,this.material('#425648',true));back.scale.set(width+.05,.09,1);group.add(back);
    const fill=new THREE.Mesh(geometry,this.material(color,true));fill.scale.set(width,.045,1);fill.position.z=.008;group.add(fill);
    group.userData={fill,width};return group;
  }
  actor(texture,height,color,type,id) {
    const group=new THREE.Group();
    const geometry=new THREE.PlaneGeometry(1,1,8,12);geometry.translate(0,.465,0);
    const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.08,transparent:true,side:THREE.DoubleSide,toneMapped:false});
    const body=new THREE.Mesh(geometry,material);body.scale.set(height*texture.image.width/texture.image.height,height,1);
    body.userData={height,actorType:type,actorId:id,rest:new Float32Array(geometry.attributes.position.array)};group.add(body);
    const attackBody=new THREE.Mesh(geometry,material.clone());attackBody.userData={actorType:type,actorId:id};attackBody.material.depthWrite=false;attackBody.visible=false;group.add(attackBody);
    const shadow=this.shadow(group,type==='hero'?.35:.3);
    const bar=this.healthBar(color,type==='hero'?.68:.62);group.add(bar);
    const select=this.ring(group,.49,'#eff6ca');select.visible=false;
    const slow=this.ring(group,.43,'#a3e1ec');slow.visible=false;
    group.userData={body,attackBody,shadow,bar,select,slow,ownedMaterials:[body.material,attackBody.material],ownedGeometries:[geometry]};return group;
  }
  building(kind,level=1) {
    const group=new THREE.Group();this.shadow(group,.48);
    if(kind==='wall') {
      for(let i=-1;i<=1;i++) {
        this.box(group,[.19,.68,.22],[i*.28,.34,0],'#9b7854');
        this.cylinder(group,.001,.15,.18,[i*.28,.77,0],'#c0a17b',4);
      }
      for(const y of [.2,.51])this.box(group,[.93,.10,.12],[0,y,.15],'#755940');
      if(level>1)for(const x of [-.36,.36])this.box(group,[.08,.7,.28],[x,.38,0],'#708786');
    } else if(kind==='tower') {
      this.cylinder(group,.46,.52,.16,[0,.08,0],'#b7bda6');
      for(const x of [-.27,.27])for(const z of [-.27,.27])this.box(group,[.11,1.02,.11],[x,.62,z],'#77654e');
      for(const y of [.35,.95])for(const z of [-.3,.3])this.box(group,[.7,.09,.08],[0,y,z],'#a99268');
      this.box(group,[.79,.14,.79],[0,1.13,0],'#6b8274');
      for(const z of [-.39,.39])this.box(group,[.87,.2,.09],[0,1.28,z],'#b19a6f');
      this.cylinder(group,.15,.18,.25,[0,1.34,0],'#c9bc95');
      const turret=new THREE.Group();turret.position.y=1.53;group.add(turret);
      this.box(turret,[.75,.08,.09],[0,0,0],'#7b5b3d');
      this.box(turret,[.08,.08,.66],[0,0,-.13],'#b39b6a');
      this.cylinder(turret,0,.07,.15,[0,0,-.49],'#d4d6b8',4).rotation.x=-Math.PI/2;
      group.userData.turret=turret;
      this.bakeStatic(turret,'tower-turret');
      for(let i=1;i<level;i++)this.ring(group,.5+i*.035,'#dbc17a');
    } else {
      this.cylinder(group,.46,.5,.09,[0,.045,0],'#879f9b');
      this.cylinder(group,.39,.39,.025,[0,.103,0],'#c3e8e1');
      this.ring(group,.39,'#f2ffec').position.y=.121;
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3;
        const gem=this.cylinder(group,0,.07,.21,[Math.cos(a)*.29,.23,Math.sin(a)*.29],'#9dd8df',4);
        gem.rotation.z=.25*Math.sin(a);
      }
    }
    this.bakeStatic(group,`${kind}:${level}`);
    const bar=this.healthBar('#dfc88b',.65);bar.position.y=kind==='tower'?1.9:1.03;bar.visible=false;group.add(bar);
    group.userData.bar=bar;group.userData.kind=kind;group.userData.level=level;return group;
  }
  crystal() {
    const group=new THREE.Group();this.shadow(group,.72);
    this.cylinder(group,.63,.76,.18,[0,.09,0],'#aaa98d');
    this.cylinder(group,.52,.6,.2,[0,.27,0],'#d2cba9');
    this.cylinder(group,.44,.46,.11,[0,.43,0],'#839d90');
    this.ring(group,.7,'#d5e9c1').position.y=.19;
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2;
      this.cylinder(group,.13,.17,.34,[Math.sin(a)*.56,.34,Math.cos(a)*.56],'#c4bda0');
    }
    const material=new THREE.MeshStandardMaterial({color:'#77d3c2',emissive:'#318d89',emissiveIntensity:.45,metalness:.25,roughness:.22,transparent:true,opacity:.88,flatShading:true,depthWrite:false});
    const gem=new THREE.Mesh(this.geometry('crystal',()=>new THREE.OctahedronGeometry(.5)),material);
    gem.scale.set(.78,1.9,.78);gem.position.y=1.28;group.add(gem);
    const inner=new THREE.Mesh(this.geometry('crystal',()=>new THREE.OctahedronGeometry(.5)),this.material('#c8fff0',true));inner.scale.set(.28,.85,.28);gem.add(inner);
    const orbit=this.ring(group,.48,'#e8ffd9',.025);orbit.position.y=.65;
    group.position.set(CORE.x,0,CORE.y);group.userData={gem,orbit,ownedMaterials:[material]};return group;
  }
  terrain() {
    const group=new THREE.Group();
    this.box(group,[W,.55,H],[(W-1)/2,-.34,(H-1)/2],'#8c9a76');
    this.box(group,[W-.18,.25,H-.18],[(W-1)/2,-.72,(H-1)/2],'#798d6f');
    const tiles=new THREE.InstancedMesh(this.geometry('tile',()=>new THREE.BoxGeometry(1.002,.12,1.002)),this.material('#ffffff'),W*H);
    const matrix=new THREE.Matrix4(),color=new THREE.Color();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
      const n=(x*67+y*103)%7,road=y===5||x===7&&y<6,near=Math.abs(x-CORE.x)<=1&&Math.abs(y-CORE.y)<=1;
      color.set(near?'#d9d6b6':road?['#d1cba7','#d8cfad','#d8d0b3'][n%3]:['#b3c190','#b4c291','#b3c290','#b4c191','#b3c191','#b4c291','#b3c291'][n]);
      const i=y*W+x;tiles.setMatrixAt(i,matrix.makeTranslation(x,-.06,y));tiles.setColorAt(i,color);
    }
    tiles.instanceMatrix.needsUpdate=true;tiles.instanceColor.needsUpdate=true;group.add(tiles);
    for(const [x,z] of ROCKS) {
      const rock=new THREE.Mesh(this.geometry('rock',()=>new THREE.DodecahedronGeometry(.42,0)),this.material('#bdc2ac'));
      rock.scale.set(1,.77,.83);rock.rotation.set(.2,x,.15);rock.position.set(x,.24,z);group.add(rock);
    }
    // Original painted scenery remains as camera-facing cutouts around the 3D island.
    const props=[[0,-1,1,165],[2,-.6,8.4,175],[0,2,10.6,150],[1,11.5,-1.8,155],[3,2.8,-.9,130],[2,14,-1.2,150],[0,15.2,9,160],[4,12.7,10.4,54],[4,6.5,10.7,50],[4,-.7,3.1,55],[5,14,3.6,68],[4,9.4,-.9,55],[2,5,-1.7,155],[0,15.7,2,140]];
    for(const [index,x,z,height] of props) {
      const sprite=this.sprite(this.assets.scenery[index],height/48);sprite.position.set(x,0,z);group.add(sprite);
    }
    return group;
  }
  remove(group) {
    group.removeFromParent();
    group.traverse(o=>{if(o.userData.ownedMaterials)for(const m of o.userData.ownedMaterials)m.dispose();if(o.userData.ownedGeometries)for(const g of o.userData.ownedGeometries)g.dispose();});
  }
  dispose() {
    for(const g of this.geometries.values())g.dispose();
    for(const m of this.materials.values())m.dispose();
    this.geometries.clear();this.materials.clear();
  }
}
