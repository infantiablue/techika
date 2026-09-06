import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movement, movePlayer, collectNearby, canDeliver, LOAVES, BAKERY, WORLD_RADIUS } from '../app/play/mechanics.mjs';
import { PICKUPS, MISSIONS, createProgress, advanceMissions, missionSummary, deliveryReady } from '../app/play/missions.mjs';

test('island movement, collision sliding, boundary, pickups and delivery', () => {
  const forward=movement(new Set(['KeyW']),0,.02);
  assert.equal(forward.x,0);assert.ok(forward.z<0);
  const diagonal=movement(new Set(['KeyW','KeyD']),0,.02);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-Math.abs(forward.z))<1e-9);
  assert.equal(movement(new Set(['KeyW','ShiftLeft']),0,.02).z,-.16);
  const turned=movement(new Set(['ArrowUp']),Math.PI/2,.02);
  assert.ok(turned.x<0);assert.ok(Math.abs(turned.z)<1e-9);
  assert.deepEqual(movement(new Set(),0,.02),{x:0,z:0});
  assert.equal(movement(new Set(['KeyW']),0,10).z,-.225);
  const wall=[{x:1,z:0,w:1,d:3}];
  assert.deepEqual(movePlayer({x:0,z:0},{x:.2,z:.2},wall),{x:0,z:.2});
  assert.equal(movePlayer({x:WORLD_RADIUS,z:0},{x:.2,z:0},[]).x,WORLD_RADIUS);
  const collected=new Set();
  for(let i=0;i<LOAVES.length;i++){assert.deepEqual(collectNearby(LOAVES[i],collected),[i]);collected.add(i);assert.deepEqual(collectNearby(LOAVES[i],collected),[]);}
  assert.equal(canDeliver(BAKERY,new Set([0,1])),false);
  assert.equal(canDeliver(BAKERY,collected),true);
  assert.equal(canDeliver({x:50,z:50},collected),false);
});

test('every quest stop is reachable in the actual village geometry', async () => {
  const THREE=await import('three');
  const {buildWorld,disposeWorld}=await import('../app/play/world.js');
  const {SPAWN}=await import('../app/play/mechanics.mjs');
  const scene=new THREE.Scene(),world=buildWorld(scene),queue=[SPAWN],seen=new Set([`${SPAWN.x},${SPAWN.z}`]);
  try {
    for(let i=0;i<queue.length;i++)for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const p=movePlayer(queue[i],{x,z},world.obstacles),key=`${p.x},${p.z}`;
      if(!seen.has(key)){seen.add(key);queue.push(p);}
    }
    for(const target of [...PICKUPS,...MISSIONS.at(-1).points,BAKERY])assert.ok(queue.some(p=>Math.hypot(p.x-target.x,p.z-target.z)<1.5),`Unreachable quest stop: ${JSON.stringify(target)}`);
  } finally {disposeWorld(scene);}
});

test('all five missions award once, require deliveries, and reset cleanly',()=>{
  const progress=createProgress();
  assert.equal(missionSummary(progress).score,0);
  for(const p of PICKUPS){advanceMissions(p,progress);const score=missionSummary(progress).score;advanceMissions(p,progress);assert.equal(missionSummary(progress).score,score);}
  assert.equal(missionSummary(progress).missions.filter(m=>m.id!=='explore').every(m=>!m.complete),true);
  advanceMissions({x:50,z:0},progress,true);
  assert.equal(progress.delivered.size,0);
  assert.equal(deliveryReady(BAKERY,progress),true);
  advanceMissions(BAKERY,progress,true);
  assert.equal(progress.delivered.size,4);
  assert.equal(deliveryReady(BAKERY,progress),false);
  for(const p of MISSIONS.at(-1).points)advanceMissions(p,progress);
  const result=missionSummary(progress);
  assert.equal(result.finished,5);assert.equal(result.score,1350);
  advanceMissions(BAKERY,progress,true);
  for(const p of PICKUPS)advanceMissions(p,progress,true);
  assert.equal(missionSummary(progress).score,1350);
  assert.equal(missionSummary(createProgress()).score,0);
});

test('items stay in the bag until a full set is handed over at the bakery',()=>{
  const progress=createProgress(),bread=PICKUPS.filter(p=>p.mission==='bread');
  advanceMissions(bread[0],progress);
  advanceMissions(BAKERY,progress,true);
  assert.equal(progress.delivered.size,0,'Partial sets cannot complete a mission');
  assert.equal(missionSummary(progress).carried,1);
  for(const p of bread)advanceMissions(p,progress);
  const before=missionSummary(progress);
  assert.equal(before.missions[0].complete,false);
  assert.equal(before.missions[0].awaitingDelivery,true);
  assert.equal(before.carried,5);
  advanceMissions({x:50,z:0},progress,true);
  advanceMissions(BAKERY,progress);
  assert.equal(progress.delivered.size,0,'Delivery needs both proximity and interaction');
  assert.equal(deliveryReady(BAKERY,progress),true);
  advanceMissions(BAKERY,progress,true);
  const after=missionSummary(progress);
  assert.equal(after.carried,0);
  assert.equal(after.missions[0].complete,true);
  assert.equal(after.missions[0].awaitingDelivery,false);
  assert.equal(after.score,before.score+150);
  for(const p of bread)advanceMissions(p,progress);
  advanceMissions(BAKERY,progress,true);
  assert.equal(missionSummary(progress).carried,0);
  assert.equal(missionSummary(progress).score,after.score);
});
