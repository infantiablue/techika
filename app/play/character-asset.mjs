import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeWorld } from './world.js';

export async function loadCharacterAsset() {
  return prepareCharacter(await new GLTFLoader().loadAsync('/play-assets/bighero/character.glb'));
}

export function prepareCharacter(gltf) {
  const model=new THREE.Group();
  model.add(gltf.scene);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const idleClip=THREE.AnimationClip.findByName(gltf.animations,'Idle');
  const walkClip=THREE.AnimationClip.findByName(gltf.animations,'Walk');
  if(!idleClip||!walkClip){disposeWorld(model);throw new Error('The character is missing its idle or walk animation.');}
  const idle=mixer.clipAction(idleClip),walk=mixer.clipAction(walkClip);
  let action=idle;
  idle.play();mixer.update(0);model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  const height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<=0){mixer.stopAllAction();disposeWorld(model);throw new Error('The character has no usable geometry.');}
  gltf.scene.scale.multiplyScalar(2.6/height);
  model.updateMatrixWorld(true);bounds.setFromObject(model,true);
  const center=bounds.getCenter(new THREE.Vector3());
  gltf.scene.position.add(new THREE.Vector3(-center.x,-bounds.min.y,-center.z));
  model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
  return {
    model,
    update(dt,moving,running=false){
      const next=moving?walk:idle;
      if(next!==action){action.fadeOut(.15);next.reset().fadeIn(.15).play();action=next;}
      walk.setEffectiveTimeScale(running?1.55:1);
      mixer.update(dt);
    },
    dispose(){
      mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
      const skeletons=new Set();model.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});
      skeletons.forEach(skeleton=>skeleton.dispose());disposeWorld(model);
    },
  };
}
