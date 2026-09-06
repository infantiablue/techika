import * as THREE from 'three';
import { buildWorld, disposeWorld } from './world';
import { SPAWN, LANDMARKS, movement, movePlayer } from './mechanics.mjs';
import { createProgress, advanceMissions, missionSummary, deliveryReady } from './missions.mjs';
import { createSound } from './sound';

export function createGame(host, onUpdate, onError, onPause, bakeryUrl=null, onAssetStatus=()=>{}, onCharacterStatus=()=>{}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c4d9d4');
  scene.fog = new THREE.Fog('#c4d9d4',55,180);
  const mobile=window.matchMedia('(pointer: coarse), (max-width: 600px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1:1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label','Village game. Use W A S D or arrow keys to walk, Shift to run, Space to jump, E to deliver bread, and drag to look around.');
  host.appendChild(canvas);
  const camera = new THREE.PerspectiveCamera(48,1,.1,500);
  scene.add(new THREE.HemisphereLight('#f1f1d7','#7f8961',1.9));
  const sun = new THREE.DirectionalLight('#ffe1ae',2.8);
  sun.position.set(-28,45,20);sun.castShadow=true;
  sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:110});
  sun.shadow.bias=-.0004;sun.shadow.normalBias=.035;scene.add(sun);
  const world = buildWorld(scene);
  const keys=new Set(),sound=createSound();
  let progress=createProgress(),notice='',noticeUntil=0,lastStep=0;
  let position={...SPAWN},yaw=.35,pitch=.38,distance=22,active=false;
  let vertical=0,jump=0,walkingTime=0,last=0,elapsed=0,lastUI=-1,frame=0,disposed=false,drag=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target=new THREE.Vector3(),desired=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Raycaster();
  let bakeryMixer=null;
  let character=null;
  onCharacterStatus('loading');
  import('./character-asset.mjs').then(async({loadCharacterAsset})=>{
    if(disposed)return;
    const loaded=await loadCharacterAsset();
    if(disposed){loaded.dispose();return;}
    disposeWorld(world.body);world.body.clear();world.limbs=[];world.tail=null;
    world.body.add(loaded.model);character=loaded;onCharacterStatus('loaded');
  }).catch(()=>{if(!disposed)onCharacterStatus('failed');});
  if(bakeryUrl) {
    onAssetStatus('loading');
    import('./bakery-asset').then(async({loadBakeryAsset,replaceBakery})=>{
      if(disposed)return;
      const {model,mixer}=await loadBakeryAsset(bakeryUrl);
      if(disposed){mixer?.stopAllAction();disposeWorld(model);return;}
      replaceBakery(scene,world,model);bakeryMixer=mixer;onAssetStatus('loaded');
    }).catch(()=>{if(!disposed)onAssetStatus('failed');});
  }
  const emit=()=>{
    const nearest=LANDMARKS.reduce((a,b)=>Math.hypot(position.x-a.x,position.z-a.z)<Math.hypot(position.x-b.x,position.z-b.z)?a:b);
    onUpdate({x:position.x,z:position.z,jump,...missionSummary(progress),collected:[...progress.collected],nearBakery:deliveryReady(position,progress),location:nearest.name,yaw,notice:elapsed<noticeUntil?notice:''});
  };
  const updateMissions=(interact=false)=>{
    const events=advanceMissions(position,progress,interact);
    if(!events.length)return;
    world.pickups.forEach(p=>{p.visible=!progress.collected.has(p.name);});
    const event=events.at(-1);sound.play(event.type);notice=events.map(e=>e.message).join(' · ');noticeUntil=elapsed+4;emit();
  };
  const interact=()=>{if(active)updateMissions(true);};
  const setKey=(code,pressed)=>{if(pressed&&active){keys.add(code);if(code==='Space' && jump===0){vertical=5.8;sound.play('jump');}if(code==='KeyE')interact();}else keys.delete(code);};
  const supported=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','Space','KeyE','KeyQ','KeyR']);
  const down=event=>{if(event.code==='Escape'){keys.clear();onPause();return;}if(event.target!==canvas||event.metaKey||event.ctrlKey||event.altKey)return;if(supported.has(event.code)){event.preventDefault();if(!event.repeat)setKey(event.code,true);}};
  const up=event=>setKey(event.code,false);
  const clear=()=>{keys.clear();drag=null;sound.silence();};
  const pointerDown=event=>{if(event.button!==0)return;sound.unlock();canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY};};
  const pointerMove=event=>{if(!drag)return;yaw-=(event.clientX-drag.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-drag.y)*.003,.24,1.05);drag={x:event.clientX,y:event.clientY};};
  const pointerUp=()=>{drag=null;};
  const wheel=event=>{event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.012,7,23);};
  const lost=event=>{event.preventDefault();cancelAnimationFrame(frame);clear();onError('The 3D view was interrupted. Reload the game to restore it.');};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('webglcontextlost',lost);
  const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(host);
  const animate=now=>{
    if(disposed)return;
    const dt=Math.min((now-last)/1000 || .016,.05);last=now;elapsed+=dt;
    sound.updateMusic(active&&!document.hidden&&document.hasFocus());
    if(!document.hidden&&!reduced)bakeryMixer?.update(dt);
    let moving=false;
    if(active&&!document.hidden){
      if(keys.has('KeyQ'))yaw+=dt*1.5;
      if(keys.has('KeyR'))yaw-=dt*1.5;
      const delta=movement(keys,yaw,dt),next=movePlayer(position,delta,world.obstacles);
      moving=Math.hypot(next.x-position.x,next.z-position.z)>.0001;
      position=next;
      if(moving){walkingTime+=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?14:9);const angle=Math.atan2(delta.x,delta.z);world.body.rotation.y+=Math.atan2(Math.sin(angle-world.body.rotation.y),Math.cos(angle-world.body.rotation.y))*Math.min(1,dt*14);}
      if(vertical!==0||jump>0){vertical-=16*dt;jump=Math.max(0,jump+vertical*dt);if(jump===0)vertical=0;}
      updateMissions();
      if(moving&&jump===0&&elapsed-lastStep>(keys.has('ShiftLeft')||keys.has('ShiftRight')?.25:.38)){sound.play('step');lastStep=elapsed;}
    }
    world.avatar.position.set(position.x,0,position.z);
    world.body.position.y=jump+(moving&&!reduced?Math.abs(Math.sin(walkingTime))*.065:0);
    world.limbs.forEach((limb,i)=>{limb.rotation.x=moving?Math.sin(walkingTime+(i===0||i===3?0:Math.PI))*.55:0;});
    if(world.tail)world.tail.rotation.z=reduced?0:Math.sin(elapsed*2)*.12;
    if(!document.hidden)character?.update(active?dt:0,active&&moving&&jump===0&&!reduced,keys.has('ShiftLeft')||keys.has('ShiftRight'));
    if(!reduced)world.animated.forEach(({kind,mesh,base,phase})=>{
      if(kind==='mill')mesh.rotation.z=elapsed*.15;
      if(kind==='boat'){mesh.position.y=-.7+Math.sin(elapsed)*.08;mesh.rotation.z=Math.sin(elapsed*.8)*.025;}
      if(kind==='smoke'){mesh.position.y=base.y+Math.sin(elapsed+phase)*.18;mesh.position.x=base.x+Math.sin(elapsed*.6+phase)*.12;}
    });
    world.pickups.forEach((p,i)=>{if(!reduced){p.position.y=1.1+Math.sin(elapsed*2+i)*.12;p.rotation.y=elapsed*.5;}});
    target.set(position.x,1.7+jump*.3,position.z);
    desired.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);
    direction.copy(desired).sub(target);ray.set(target,direction.clone().normalize());ray.far=direction.length();
    const hit=ray.intersectObjects(world.cameraObstacles,false)[0];
    if(hit)desired.copy(target).addScaledVector(direction.normalize(),Math.max(1.4,hit.distance-.45));
    if(lastUI<0)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*10));
    camera.lookAt(target);renderer.render(scene,camera);
    if(elapsed-lastUI>.12){emit();lastUI=elapsed;}
    frame=requestAnimationFrame(animate);
  };
  frame=requestAnimationFrame(animate);
  return {
    setActive(value){active=value;clear();if(value)canvas.focus({preventScroll:true});},
    setKey,interact,unlockAudio:sound.unlock,setMuted:sound.setMuted,
    reset(){position={...SPAWN};yaw=.35;pitch=.38;distance=22;jump=0;vertical=0;progress=createProgress();notice='';noticeUntil=0;world.pickups.forEach(p=>p.visible=true);clear();emit();canvas.focus({preventScroll:true});},
    dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();sound.dispose();bakeryMixer?.stopAllAction();if(character){world.body.remove(character.model);character.dispose();}window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',lost);disposeWorld(scene);renderer.dispose();canvas.remove();}
  };
}
