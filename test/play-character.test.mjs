import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareCharacter} from '../app/play/character-asset.mjs';

test('supplied Baymax is grounded, animated, and returns to idle',async()=>{
  const bytes=await readFile(new URL('../public/play-assets/bighero/character.glb',import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  assert.equal(json.images.length,4);
  assert.ok(json.images.every(image=>Number.isInteger(image.bufferView)),'Textures are embedded');
  // Geometry and animations use the actual GLB; browser verification covers image decoding.
  const loader=new GLTFLoader().register(()=>({name:'test-textures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const character=prepareCharacter(gltf);
  try {
    const bounds=new THREE.Box3().setFromObject(character.model,true);
    assert.ok(Math.abs(bounds.min.y)<.001);
    assert.ok(Math.abs(bounds.max.y-2.6)<.001);
    const leg=gltf.scene.getObjectByName('Armor_U_LegL');
    assert.ok(leg,'Original skeleton is retained');
    const rest=leg.quaternion.clone();
    character.update(.25,true);
    assert.ok(rest.angleTo(leg.quaternion)>.05,'Walking moves the original rig');
    character.update(.25,false);
    character.update(.25,false);
    assert.ok(rest.angleTo(leg.quaternion)<.001,'Stopping restores idle');
  } finally {character.dispose();}
});
