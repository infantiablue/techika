import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeWorld } from './world';

export async function loadBakeryAsset(url) {
  const gltf=await new GLTFLoader().loadAsync(url);
  const model=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  const footprint=Math.max(size.x,size.z);
  if(!Number.isFinite(footprint)||footprint<=0){disposeWorld(model);throw new Error('The bakery model has no usable geometry.');}
  model.scale.multiplyScalar(9/footprint);
  model.updateMatrixWorld(true);
  bounds.setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.add(new THREE.Vector3(-7-center.x,-bounds.min.y,-6-center.z));
  model.updateMatrixWorld(true);
  model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
  const mixer=gltf.animations.length?new THREE.AnimationMixer(model):null;
  gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
  return {model,mixer};
}

export function replaceBakery(scene,world,model) {
  const oldNodes=new Set();world.bakery.traverse(node=>oldNodes.add(node));
  world.obstacles.splice(0,world.obstacles.length,...world.obstacles.filter(o=>!world.bakeryObstacles.includes(o)));
  world.cameraObstacles.splice(0,world.cameraObstacles.length,...world.cameraObstacles.filter(o=>!oldNodes.has(o)));
  world.animated.splice(0,world.animated.length,...world.animated.filter(o=>!oldNodes.has(o.mesh)));
  scene.remove(world.bakery);disposeWorld(world.bakery);
  scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  world.obstacles.push({x:center.x,z:center.z,w:size.x,d:size.z});
  model.traverse(node=>{if(node.isMesh)world.cameraObstacles.push(node);});
  world.bakery=model;
}
