import { BAKERY, LANDMARKS, LOAVES } from './mechanics.mjs';

export const MISSIONS = [
  { id: 'bread', title: 'The baker’s lost loaves', item: 'loaves', color: '#e3ad58', points: LOAVES, reward: 150 },
  { id: 'olives', title: 'An olive harvest', item: 'olive baskets', color: '#637c45', points: [{x:25,z:-20},{x:34,z:-30},{x:39,z:-22}], reward: 150 },
  { id: 'relics', title: 'Echoes of the old temple', item: 'relics', color: '#79c5c1', points: [{x:-33,z:-24},{x:-28,z:-26},{x:-35,z:-18}], reward: 150 },
  { id: 'shells', title: 'Treasures of the tide', item: 'shells', color: '#efa995', points: [{x:25,z:32},{x:34,z:38},{x:40,z:32}], reward: 150 },
  { id: 'explore', title: 'Every corner of the island', item: 'landmarks', color: '#f5d789', points: LANDMARKS, reward: 200 },
];
export const PICKUPS = MISSIONS.filter(m=>m.id!=='explore').flatMap(m=>m.points.map((p,i)=>({...p,id:`${m.id}-${i}`,mission:m.id,color:m.color})));

export function createProgress() { return { collected: new Set(), delivered: new Set(), visited: new Set() }; }

export function missionSummary(progress) {
  const missions=MISSIONS.map(m=>{
    const count=m.id==='explore'?progress.visited.size:m.points.filter((_,i)=>progress.collected.has(`${m.id}-${i}`)).length;
    const complete=m.id==='explore'?count===m.points.length:progress.delivered.has(m.id);
    return {...m,count,total:m.points.length,complete,carried:m.id==='explore'||complete?0:count,awaitingDelivery:m.id!=='explore'&&!complete&&count===m.points.length};
  });
  return { missions, carried:missions.reduce((sum,m)=>sum+m.carried,0), score:progress.collected.size*25+progress.visited.size*50+missions.filter(m=>m.complete).reduce((sum,m)=>sum+m.reward,0), finished:missions.filter(m=>m.complete).length };
}

export function advanceMissions(position, progress, interact=false) {
  const events=[];
  for(const p of PICKUPS) if(!progress.collected.has(p.id)&&Math.hypot(position.x-p.x,position.z-p.z)<1.5) {
    progress.collected.add(p.id);
    const mission=missionSummary(progress).missions.find(m=>m.id===p.mission);
    events.push({type:'pickup',id:p.id,message:`+25 · ${mission.count}/${mission.total} ${mission.item} in your bag${mission.awaitingDelivery?' · Return to the bakery to deliver':''}`});
  }
  for(const p of LANDMARKS) if(!progress.visited.has(p.name)&&Math.hypot(position.x-p.x,position.z-p.z)<4) {
    progress.visited.add(p.name);events.push({type:'discovery',message:`+50 · ${p.name} discovered`});
    if(progress.visited.size===LANDMARKS.length)events.push({type:'complete',message:'+200 · Every corner explored'});
  }
  if(interact&&Math.hypot(position.x-BAKERY.x,position.z-BAKERY.z)<3) {
    for(const mission of missionSummary(progress).missions) if(mission.awaitingDelivery) {
      progress.delivered.add(mission.id);events.push({type:'complete',message:`+${mission.reward} · ${mission.total} ${mission.item} delivered · ${mission.title} complete`});
    }
  }
  return events;
}

export function deliveryReady(position,progress) {
  return Math.hypot(position.x-BAKERY.x,position.z-BAKERY.z)<3&&missionSummary(progress).missions.some(m=>m.awaitingDelivery);
}
