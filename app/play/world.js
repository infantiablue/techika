import * as THREE from 'three';
import { PICKUPS } from './missions.mjs';

// All scenery is original procedural geometry; the linked models are references.
export function buildWorld(scene) {
  const obstacles = [], cameraObstacles = [], animated = [], pickups = [];
  let seed = 731;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const materials = new Map();
  const mat = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true }));
    return materials.get(color);
  };
  const mesh = (geo, color, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, color, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  const cyl = (top, bottom, h, color, x, y, z, parent, sides = 10) => mesh(new THREE.CylinderGeometry(top, bottom, h, sides), color, x, y, z, parent);
  const ball = (r, color, x, y, z, parent, detail = 0) => mesh(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, parent);
  const block = (x,z,w,d) => obstacles.push({x,z,w,d});
  const beam = (a, b, width, color, parent = scene) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), diff = end.clone().sub(start);
    const m = box(width, diff.length(), width, color, ...start.clone().add(end).multiplyScalar(.5).toArray(), parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), diff.normalize()); return m;
  };
  const sea = mesh(new THREE.PlaneGeometry(2000,2000), '#6daeb3',0,-1.35,0); sea.rotation.x = -Math.PI/2; sea.castShadow = false;
  const shore = cyl(70,72,1.5,'#ddc49a',0,-1.1,0,scene,80);
  const ground = cyl(64,69,1,'#a6b57e',0,-.55,0,scene,80); ground.castShadow = false; shore.castShadow = false;
  cyl(11,11,.06,'#d8c7a0',0,.005,1,scene,32);
  // Winding footpaths remain on the same walkable ground plane.
  const path = (points, width) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x,.018,z)));
    const pts = curve.getPoints(60), positions = [], indices = [];
    pts.forEach((p,i) => {
      const tangent = curve.getTangent(i/60), side = new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(width/2);
      positions.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);
      if(i<60) { const n=i*2; indices.push(n,n+2,n+1,n+1,n+2,n+3); }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    const m=mesh(geo,'#d8c7a0',0,0,0);m.castShadow=false;
  };
  path([[0,11],[1,3],[1,-10],[17,-16],[30,-26]],3.3);
  path([[0,3],[-13,-4],[-23,-12],[-30,-23]],3.8);
  path([[0,7],[13,14],[23,23],[32,32],[39,42]],4);
  path([[-20,16],[-12,9],[0,5],[14,2],[22,-9]],3);
  const pot = (x,z,s=1,parent=scene,y=0) => {
    cyl(.29*s,.48*s,.75*s,'#b9744e',x,y+.4*s,z,parent);
    cyl(.32*s,.32*s,.13*s,'#d18a5a',x,y+.83*s,z,parent);
    cyl(.24*s,.24*s,.015,'#574637',x,y+.903*s,z,parent);
  };
  const bread = (x,y,z,parent=scene) => {
    const loaf=ball(.35,'#e3ad58',x,y,z,parent,1);loaf.scale.set(1,.58,.65);
    for(let i=-1;i<=1;i++) { const score=box(.04,.018,.27,'#fbe0a0',x+i*.14,y+.195,z,parent);score.rotation.y=-.4; }
    return loaf;
  };
  const tree = (x,z,size=1,olive=false) => {
    const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
    cyl(.16*size,.3*size,2.5*size,'#75654d',0,1.25*size,0,group,7);
    beam([0,1.5*size,0],[-.8*size,2.9*size,.1],.17*size,'#75654d',group);
    const colors=olive?['#718b60','#889e6b','#9cab78']:['#69864b','#809956','#8fa661'];
    for(let i=0;i<4;i++) {const leaf=ball((1.15+random()*.35)*size,colors[i%3],(random()-.5)*1.5*size,(2.6+random())*size,(random()-.5)*1.5*size,group,1);leaf.scale.y=.7;}
    block(x,z,.55*size,.55*size);
  };
  const roof = (x,z,w,d,h,parent) => {
    const gable=new THREE.Shape();gable.moveTo(-w/2,0);gable.lineTo(w/2,0);gable.lineTo(0,1.2);
    for(const side of [-1,1]) {const face=mesh(new THREE.ShapeGeometry(gable),'#e6d6ae',x,h,z+side*d/2,parent);if(side===-1)face.rotation.y=Math.PI;}

    for(const side of [-1,1]) {
      const r=box(w/2+ .6,.22,d+.9,'#ac5638',x+side*w/4,h+.75,z,parent);r.rotation.z=-side*.34;
      // Individual tile strips catch the afternoon light.
      for(let i=0;i<Math.ceil(d/.44);i++) {
        const tile=box(w/2+.55,.13,.32,['#bd6740','#c9794a','#d18a53'][i%3],x+side*w/4,h+.89,z-d/2+i*.44,parent);tile.rotation.z=-side*.34;
      }
    }
    box(.24,.2,d+1,'#d48955',x,h+1.25,z,parent);
  };
  const house = (x,z,w,d,h,color='#e6d6ae',bakery=false) => {
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    const walls=box(w,h,d,color,0,h/2,0,g);cameraObstacles.push(walls);block(x,z,w,d);
    box(w+.15,.38,d+.15,'#b5a384',0,.19,0,g);
    for(const side of [-1,1]) box(.18,h,.2,'#886043',side*(w/2-.08),h/2,d/2+.025,g);
    box(w+.15,.18,d+.1,'#896448',0,h-.25,0,g);
    box(1.25,2.1,.13,'#675546',0,1.05,d/2+.06,g);
    for(let i=0;i<5;i++)box(.035,2.1,.035,'#95805a',-.48+i*.24,1.05,d/2+.14,g);
    const windows = bakery ? [-w*.29,w*.29] : [-w*.29];
    for(const wx of windows) {
      box(1.05,1.15,.12,'#405e61',wx,h*.65,d/2+.09,g);
      box(1.35,.15,.3,'#8a664c',wx,h*.65-.62,d/2+.18,g);
      box(.08,1.15,.15,'#a0845d',wx,h*.65,d/2+.2,g);
      for(const s of [-1,1])box(.24,1.2,.15,'#688481',wx+s*.66,h*.65,d/2+.14,g);
    }
    roof(0,0,w,d,h,g);
    pot(w/2+.65,d/2,.85,g);
    if(bakery) {
      const canopy=box(w+.4,.08,2.8,'#c87b43',0,2.8,d/2+1.45,g);canopy.rotation.x=.14;
      for(const s of [-1,1]) cyl(.065,.075,2.7,'#876348',s*(w/2+.1),1.35,d/2+2.6,g,6);
      box(w+.35,.25,.08,'#e3aa6a',0,2.5,d/2+2.83,g);
      box(3.8,.18,.8,'#a07850',0,1,d/2+2,g);
      for(const s of [-1,1])box(.15,1,.6,'#725a42',s*1.55,.5,d/2+2,g);
      for(let i=0;i<7;i++)bread(-1.45+i*.48,1.22,d/2+2,g);
      block(x,z+d/2+2,3.8,.8);
      const oven=cyl(1.1,1.2,1.45,'#a9a291',-w/2-1.5,.75,d/2,g,9);
      ball(1.1,'#b6ad95',-w/2-1.5,1.45,d/2,g,1).scale.y=.75;
      box(.75,.75,.1,'#443d35',-w/2-1.5,.6,d/2+1.08,g);
      cyl(.28,.38,3,'#a99d87',-w/2-1.7,2.5,d/2-.35,g,6);
      block(x-w/2-1.5,z+d/2,2.3,2.3);cameraObstacles.push(oven);
      for(let i=0;i<5;i++) {const smoke=ball(.23+i*.08,'#e8e1ca',-w/2-1.7,4.2+i*.55,d/2-.35,g,1);smoke.material=new THREE.MeshStandardMaterial({color:'#e8e1ca',transparent:true,opacity:.45-i*.06,flatShading:true});animated.push({kind:'smoke',mesh:smoke,base:smoke.position.clone(),phase:i});}
      // A working sail windmill rises directly behind the bakery.
      cyl(1.15,1.6,8.5,'#e5d7af',0,4.25,-d/2+.5,g,8);
      for(let y=2;y<8;y+=2)box(2.45,.17,.2,'#8e6949',0,y,-d/2+1.7,g);
      cyl(0,1.7,1.8,'#b6603d',0,9.2,-d/2+.5,g,8);
      const blades=new THREE.Group();blades.position.set(0,7.2,-d/2+1.95);g.add(blades);
      for(let i=0;i<6;i++) {
        const sail=new THREE.Group();sail.rotation.z=i*Math.PI/3;blades.add(sail);
        box(.1,6.4,.1,'#80634a',0,0,0,sail);
        const shape=new THREE.Shape();shape.moveTo(.05,.6);shape.lineTo(.05,3.1);shape.lineTo(1.05,2.9);shape.lineTo(.4,.6);
        const canvas=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#f1e5c5',side:THREE.DoubleSide,roughness:1}));sail.add(canvas);
      }
      ball(.24,'#846143',0,7.2,-d/2+2.1,g,1);animated.push({kind:'mill',mesh:blades});
    }
    return g;
  };
  const bakery=house(-7,-6,6,5,4.1,'#edddba',true);
  const bakeryObstacles=[...obstacles];
  house(8,-8,4.7,4.5,3.6,'#ead9b5');
  house(15,5,5,4,3.1,'#e5d4af');
  house(-17,8,4.5,4,3.2,'#e5d7b8');
  house(-19,-8,4,4,3.3,'#dfcba6');
  house(8,-20,4.5,4,3,'#e6d9bb');
  house(-10,20,4,4,2.8,'#e2cdaa');
  // Village well and stepping stones.
  cyl(1.1,1.2,.75,'#b9b298',2,.38,-3,scene,12);cyl(.88,.88,.02,'#456d70',2,.77,-3,scene,12);block(2,-3,2.4,2.4);
  for(const x of [.7,3.3])box(.14,2.6,.14,'#8b7050',x,1.3,-3);
  beam([.6,2.6,-3],[3.4,2.6,-3],.15,'#8b7050');
  for(let i=0;i<55;i++) {
    const a=random()*Math.PI*2,r=2+random()*8;
    const p=cyl(.23+random()*.25,.3,.05,['#bbba9d','#c2bfa6','#d1c9ae'][i%3],Math.cos(a)*r,.055,Math.sin(a)*r+1,scene,5);p.scale.z=.7;p.rotation.y=random()*6;
  }
  for(const [x,z,s] of [[-14,-13,1.5],[15,-15,1.3],[-23,13,1.6],[20,16,1.2],[-9,15,1.1],[6,17,.85],[-27,-5,1.4]])tree(x,z,s);
  for(let i=0;i<24;i++) {const x=23+random()*22,z=-39+random()*23;if(Math.hypot(x-30,z+26)>3)tree(x,z,.7+random()*.45,true);}
  // Ancient colonnade with broken columns, open to walk through.
  box(13,.14,10,'#d1ccb4',-31,.04,-25);
  for(const x of [-36,-31,-26])for(const z of [-28,-22]) {
    const height=(x===-31&&z===-22)?1.8:5;
    cyl(.65,.7,.25,'#e3dac0',x,.25,z,scene,10);cyl(.38,.5,height,'#ded8bc',x,height/2+.35,z,scene,12);
    box(1.2,.3,1.2,'#ece3c9',x,height+.5,z);block(x,z,1.3,1.3);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(.035,.035,height-.15,'#c7c3a8',x+Math.cos(a)*.43,height/2+.35,z+Math.sin(a)*.43,scene,5);}
  }
  box(12,.65,1.25,'#ddd6bb',-31,5.9,-28);
  box(1.2,.65,7.3,'#ddd6bb',-36,5.9,-25);
  for(let i=0;i<8;i++){const r=ball(.4+random()*.35,'#babba3',-38+random()*14,.3,-32+random()*3);r.scale.y=.6;}
  // The coast: jetty, moored boat, and striped sail.
  const dock=new THREE.Group();dock.position.set(40,-.02,43);dock.rotation.y=-.65;scene.add(dock);
  for(let i=0;i<19;i++)box(3,.15,.43,'#a3865e',0,0,i*.46,dock);
  for(const x of [-1.3,1.3])for(const z of [0,3.5,7.5])cyl(.1,.13,2,'#806d50',x,-.35,z,dock,7);
  const boat=new THREE.Group();boat.position.set(46,-.7,48);boat.rotation.y=-.4;scene.add(boat);
  const hull=ball(2,'#8b6548',0,0,0,boat,1);hull.scale.set(.6,.35,1.6);
  box(1.6,.1,3.1,'#cfb17a',0,.35,0,boat);cyl(.05,.08,4.5,'#896f50',0,2.4,0,boat,7);
  const sailShape=new THREE.Shape();sailShape.moveTo(.1,.7);sailShape.lineTo(.1,4.5);sailShape.lineTo(2.1,.7);
  const sail=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),new THREE.MeshStandardMaterial({color:'#f4e4bd',side:THREE.DoubleSide}));boat.add(sail);animated.push({kind:'boat',mesh:boat});
  // Far islands frame the horizon without blocking the playable island.
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const r=140+random()*80;const hill=ball(20+random()*22,['#8fa7a0','#96b0a8','#a8beb3'][i%3],Math.cos(a)*r,0,Math.sin(a)*r,scene,1);hill.scale.set(1,.3+random()*.3,1);hill.castShadow=false;}
  // Ground cover is instanced to keep the world light on draw calls.
  const grassGeo=new THREE.ConeGeometry(.16,.55,3),grass=new THREE.InstancedMesh(grassGeo,mat('#8a9f66'),900);
  const dummy=new THREE.Object3D();
  for(let i=0;i<900;i++){const a=random()*Math.PI*2,r=13+random()*48;dummy.position.set(Math.cos(a)*r,.14,Math.sin(a)*r);dummy.rotation.set(0,random()*6,(random()-.5)*.3);dummy.scale.setScalar(.45+random());dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
  for(let i=0;i<65;i++){const a=random()*Math.PI*2,r=40+random()*22;const rock=ball(.3+random(),'#a4aa8b',Math.cos(a)*r,.18,Math.sin(a)*r);rock.scale.y=.55;}
  for(let i=0;i<30;i++){const a=random()*Math.PI*2,r=13+random()*35;const flower=ball(.1,['#e6c16c','#ece3b6','#b392ad'][i%3],Math.cos(a)*r,.38,Math.sin(a)*r);flower.castShadow=false;}
  for(const p of PICKUPS) {
    const g=new THREE.Group();g.name=p.id;g.position.set(p.x,1.1,p.z);scene.add(g);
    if(p.mission==='bread')bread(0,0,0,g);
    if(p.mission==='olives') {
      cyl(.3,.24,.3,'#a27c4d',0,-.06,0,g,8);
      for(const x of [-.15,0,.15])ball(.12,p.color,x,.13,0,g,1);
    }
    if(p.mission==='relics')mesh(new THREE.OctahedronGeometry(.38),p.color,0,0,0,g);
    if(p.mission==='shells'){const shell=ball(.38,p.color,0,0,0,g,1);shell.scale.set(1,.45,.8);}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,6,32),new THREE.MeshBasicMaterial({color:p.color}));ring.rotation.x=Math.PI/2;ring.position.y=-.85;g.add(ring);pickups.push(g);
  }
  const avatar=new THREE.Group();scene.add(avatar);
  const body=new THREE.Group();avatar.add(body);
  cyl(.32,.42,.85,'#4f6360',0,1.16,0,body,7);
  cyl(.34,.35,.2,'#9b5b49',0,.92,0,body,8);
  const coat=cyl(.38,.5,.65,'#bbb6a0',0,.7,0,body,7);coat.scale.z=.75;
  box(.46,.4,.22,'#3b4b50',0,1.55,-.04,body);
  ball(.3,'#d9b899',0,1.9,0,body,1).scale.set(.85,1, .9);
  const hair=ball(.32,'#dddcd0',0,2.05,-.025,body,1);hair.scale.set(1,.72,.94);
  for(const x of [-.22,.22]){const ear=cyl(0,.12,.47,'#d4d4ca',x,2.35,-.02,body,3);ear.rotation.z=-x*.6;}
  for(const x of [-.11,.11])box(.06,.055,.025,'#334846',x,1.94,.265,body);
  const limbs=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.position.set(side*.2,.65,0);body.add(leg);cyl(.15,.12,.57,'#4d504c',0,-.27,0,leg,6);box(.25,.2,.4,'#4d4239',0,-.57,.07,leg);limbs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.38,1.49,0);body.add(arm);cyl(.14,.11,.55,'#66746b',side*.07,-.23,0,arm,6);ball(.12,'#d9b899',side*.1,-.55,0,arm,1);limbs.push(arm);
  }
  const tail=ball(.26,'#c2c3b7',.12,.7,-.48,body,1);tail.scale.set(.8,.8,2.4);tail.rotation.x=.4;
  box(.36,.42,.22,'#83694d',0,1.25,-.32,body);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,24),new THREE.MeshBasicMaterial({color:'#405341',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;avatar.add(shadow);
  return { avatar, body, limbs, tail, obstacles, cameraObstacles, animated, pickups, bakery, bakeryObstacles };
}

export function disposeWorld(scene) {
  const geometries=new Set(), materials=new Set();
  scene.traverse(object=>{if(object.isInstancedMesh)object.dispose();if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();});
}
