'use client';

import { useEffect, useRef, useState } from 'react';
import { BAKERY, LANDMARKS } from './mechanics.mjs';
import { MISSIONS, PICKUPS, createProgress, missionSummary } from './missions.mjs';
import styles from './game.module.css';

const DELIVERY_GUIDE=`Collect one complete set: ${MISSIONS.filter(m=>m.id!=='explore').map(m=>`${m.points.length} ${m.item}`).join(', or ')}. Different item types cannot be combined into a set. Return to the bakery house marker and move close enough for “Deliver items” to appear. Press E or tap the button to hand over the set and complete its mission.`;

function Icon({ name, ...props }) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.5 1.5m12.6 12.6 1.5 1.5M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17h.01"/></>,
    map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/></>,
    expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>,
    bread: <><path d="M4 19C-1 14 7 3 15 4c7 1 7 8 2 12-4 4-10 6-13 3Z"/><path d="m8 8 3 3m1-6 3 3M5 12l3 3"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    reset: <><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/></>,
    journal: <><path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 0v18M9 8h6M9 12h6"/></>,
    sound: <><path d="m3 9 4 0 5-4v14l-5-4H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
    muted: <><path d="m3 9 4 0 5-4v14l-5-4H3V9Zm13 0 6 6m0-6-6 6"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function IslandMap({ state, large }) {
  return <svg className={large ? styles.largeMap : styles.map} viewBox="-75 -75 150 150" role="img" aria-label={`Island map. You are at ${state.location}. ${state.finished} of 5 missions complete.`}>
    <rect x="-75" y="-75" width="150" height="150" fill="#83afb0"/>
    <circle r="69" fill="#ddd1a9"/><circle r="63" fill="#aeb88c"/>
    <path d="M0 11 1 3 1-10 17-16 30-26M0 3-13-4-23-12-30-23M0 7 13 14 23 23 39 42M-20 16-12 9 0 5 14 2 22-9" fill="none" stroke="#e3d9b8" strokeWidth="3"/>
    {[[ -7,-6,6,5],[8,-8,5,5],[15,5,5,4],[-17,8,5,4],[-19,-8,4,4],[8,-20,5,4],[-10,20,4,4]].map(([x,z,w,h],i)=><rect key={i} x={x-w/2} y={z-h/2} width={w} height={h} fill="#ad7959"/>)}
    <rect x="-38" y="-30" width="14" height="10" fill="#dad4b6"/>
    {LANDMARKS.map(p=><g key={p.name}><circle cx={p.x} cy={p.z} r="1.5" fill="#53694f"/>{large&&<text x={p.x} y={p.z-5} textAnchor="middle" fontSize="4" fill="#263f37">{p.name}</text>}</g>)}
    {PICKUPS.map(p=>!state.collected.includes(p.id)&&<circle key={p.id} cx={p.x} cy={p.z} r={large?1.8:2.5} fill={p.color} stroke="#725e43" strokeWidth=".6"/>)}
    <g transform={`translate(${BAKERY.x} ${BAKERY.z})`} aria-label="Bakery delivery point"><circle r={large?4:5} fill="#fff0b0" stroke="#795b30" strokeWidth="1"/><path d="m-2 0 2-2 2 2v2h-4Z" fill="#795b30"/>{large&&<text x="-6" y="2" textAnchor="end" fontSize="4" fill="#263f37">Bakery · Deliver here</text>}</g>
    <circle cx={state.x} cy={state.z} r="5" fill="#ffffff" opacity=".3"/>
    <path d="m0-4 3 7-3-1-3 1Z" transform={`translate(${state.x} ${state.z}) rotate(${-state.yaw*180/Math.PI})`} fill="#fffdf0" stroke="#435e55" strokeWidth=".9"/>
    <text x="0" y="-66" textAnchor="middle" fontSize="7" fill="#395f60">N</text>
  </svg>;
}

export default function Game({bakeryUrl=null}) {
  const host=useRef(null),engine=useRef(null),dialog=useRef(null);
  const [ready,setReady]=useState(false),[started,setStarted]=useState(false),[panel,setPanel]=useState(null),[error,setError]=useState('');
  const [muted,setMuted]=useState(false),[selected,setSelected]=useState('bread');
  const [assetStatus,setAssetStatus]=useState(bakeryUrl?'loading':'missing');
  const [characterStatus,setCharacterStatus]=useState('loading');
  const [state,setState]=useState(()=>({x:0,z:11,jump:0,...missionSummary(createProgress()),collected:[],location:'Bakery square',yaw:.35,nearBakery:false,notice:''}));
  const mission=state.missions.find(m=>m.id===selected)||state.missions[0];
  const bakeryDistance=Math.hypot(state.x-BAKERY.x,state.z-BAKERY.z);
  const deliveryMission=state.missions.find(m=>m.awaitingDelivery)||(mission.id!=='explore'&&!mission.complete?mission:state.missions.find(m=>m.id!=='explore'&&!m.complete));
  useEffect(()=>{
    let cancelled=false;
    import('./engine').then(({createGame})=>{
      if(cancelled)return;
      try {engine.current=createGame(host.current,setState,setError,()=>setPanel(p=>p?null:'help'),bakeryUrl,setAssetStatus,setCharacterStatus);setReady(true);}
      catch(e){console.error(e);setError('Your browser could not start the 3D world. Enable hardware acceleration or try a browser with WebGL 2 support.');}
    }).catch(()=>{if(!cancelled)setError('The game could not load. Check your connection and reload.');});
    return()=>{cancelled=true;engine.current?.dispose();engine.current=null;};
  },[bakeryUrl]);
  useEffect(()=>{if(panel&&!dialog.current.open)dialog.current.showModal();else if(!panel&&dialog.current.open)dialog.current.close();},[panel]);
  useEffect(()=>{engine.current?.setActive(started&&!panel&&!error);},[started,panel,error,ready]);
  function hold(code,pressed,event){event.preventDefault();if(pressed){engine.current?.unlockAudio();event.currentTarget.setPointerCapture(event.pointerId);}engine.current?.setKey(code,pressed);}
  function begin(){engine.current?.unlockAudio();setStarted(true);}
  function toggleSound(){const value=!muted;engine.current?.setMuted(value);setMuted(value);}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await host.current.parentElement.requestFullscreen();}catch{setPanel('help');}}
  return <main className={styles.game} aria-label="Hearth and Horizon game">
    <div ref={host} className={styles.viewport}/>
    <div className={styles.shade}/>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.emblem}>H<span>✧</span>H</span><div><span className={styles.eyebrow}>A LITTLE WORLD TO GET LOST IN</span><h1>Hearth <i>&</i> Horizon</h1></div></div>
      <div className={styles.weather}><Icon name="sun"/><span>Late afternoon<small>Aegean islands</small></span></div>
      <nav className={styles.tools} aria-label="Game options">
        <button disabled={!ready} onClick={toggleSound} aria-label={muted?'Enable music and sound':'Mute music and sound'} aria-pressed={!muted} title="Music and sound"><Icon name={muted?'muted':'sound'}/></button>
        <button onClick={()=>setPanel('missions')} aria-label="Open mission journal" title="Missions"><Icon name="journal"/></button>
        <button onClick={()=>setPanel('map')} aria-label="Open island map" title="Island map"><Icon name="map"/></button>
        <button onClick={()=>setPanel('help')} aria-label="Controls and credits" title="Controls and credits"><Icon name="help"/></button>
        <button onClick={fullscreen} aria-label="Toggle full screen" title="Full screen"><Icon name="expand"/></button>
      </nav>
    </header>
    <div className={styles.location}><span>✧</span><span>{state.location}</span><span>✧</span></div>
    {!started&&!error&&<section className={styles.welcome}>
      <p className={styles.eyebrow}>NO HURRY. NO WRONG TURNS.</p>
      <h2>A little further.<br/>A little wonder.</h2>
      <p>Warm bread, wandering paths, and a sea that goes on forever. Make yourself at home.</p>
      <button className={styles.primary} disabled={!ready} onClick={begin}>{ready?'Begin wandering':'Preparing your island…'}<Icon name="arrow"/></button>
      <span className={styles.hint}>{characterStatus==='loading'?'Loading Baymax…':characterStatus==='failed'?'Baymax could not load; temporary explorer available.':'Explore as Baymax'} · Five island missions · Sound {muted?'off':'on'}</span>
    </section>}
    {started&&<aside className={styles.quest}>
      <div className={styles.questTop}><span className={styles.questIcon}><Icon name="journal"/></span><span className={styles.eyebrow}>{mission.complete?'MISSION COMPLETE':mission.awaitingDelivery?'RETURN TO BAKERY':'TRACKED MISSION'}</span><span className={styles.count}>{mission.count}<span> / {mission.total}</span></span></div>
      <h2>{mission.title}</h2>
      <p>{mission.complete?'Well done. Choose another mission in your journal.':mission.id==='explore'?'Visit the square, grove, temple, and coast. Each discovery earns 50 points.':mission.awaitingDelivery?'Full set ready! Return to the bakery, then press E or tap Deliver items.':`Collect ${mission.total-mission.count} more ${mission.item}. Delivery unlocks at ${mission.total}/${mission.total} of this item type. +25 per item.`}</p>
      <div className={styles.progress}>{mission.points.map((_,i)=><span key={i} data-found={i<mission.count}/>)}</div>
      <p className={styles.inventory}>Bag: {state.carried} items{state.carried>0?` · Bakery ${bakeryDistance.toFixed(1)} m away`:''}</p>
      <details className={styles.deliveryGuide}><summary>How deliveries work</summary><p>{DELIVERY_GUIDE}</p></details>
      <button className={styles.journalLink} data-complete={mission.complete} onClick={()=>setPanel('missions')}>Mission journal <span>{state.finished} / 5 complete →</span></button>
    </aside>}
    {started&&<div className={styles.score} aria-label={`Score: ${state.score} points`}><span className={styles.eyebrow}>THIS WALK</span><strong>{state.score.toLocaleString('en-US')} <small>pts</small></strong></div>}
    {started&&state.notice&&<div className={styles.notice} role="status">{state.notice}</div>}
    <div className={styles.bottomRight}><button className={styles.minimapButton} onClick={()=>setPanel('map')} aria-label="Expand island map"><IslandMap state={state}/></button><span className={styles.mapCaption}>YOUR LITTLE CORNER OF THE WORLD</span></div>
    {started&&state.nearBakery&&<button className={styles.interact} onClick={()=>engine.current?.interact()}><kbd>E</kbd> Deliver items <Icon name="bread"/></button>}
    {started&&!state.nearBakery&&bakeryDistance<5&&deliveryMission&&<div className={`${styles.interact} ${styles.deliveryHint}`} role="status">{deliveryMission.awaitingDelivery?'Full set ready — move closer to the bakery house marker to deliver.':`Not ready to deliver: collect ${deliveryMission.total-deliveryMission.count} more ${deliveryMission.item} for a full set (${deliveryMission.count}/${deliveryMission.total}).`}</div>}
    <footer className={styles.footer}><div className={styles.controls}><span><kbd>W A S D</kbd> Move</span><span><kbd>SHIFT</kbd> Run</span><span><kbd>SPACE</kbd> Jump</span><span className={styles.mouseHint}>Drag to look · Scroll to zoom</span></div><span className={styles.status}><i/>{started?'Take the scenic route':'Your adventure is waiting'}</span></footer>
    {started&&<div className={styles.touchControls} aria-label="Touch movement controls"><div className={styles.dpad}>{[['KeyW','↑'],['KeyA','←'],['KeyS','↓'],['KeyD','→']].map(([key,label])=><button key={key} aria-label={`Move ${key==='KeyW'?'forward':key==='KeyS'?'backward':key==='KeyA'?'left':'right'}`} onPointerDown={e=>hold(key,true,e)} onPointerUp={e=>hold(key,false,e)} onPointerCancel={e=>hold(key,false,e)} onLostPointerCapture={()=>engine.current?.setKey(key,false)}>{label}</button>)}</div><button className={styles.jumpButton} onPointerDown={e=>hold('Space',true,e)} onPointerUp={e=>hold('Space',false,e)} onPointerCancel={e=>hold('Space',false,e)} onLostPointerCapture={()=>engine.current?.setKey('Space',false)}>Jump</button></div>}
    <dialog ref={dialog} className={styles.dialog} onCancel={e=>{e.preventDefault();setPanel(null);}} onClick={e=>{if(e.target===dialog.current)setPanel(null);}}>
      <div className={styles.dialogBody}>
        <button className={styles.close} onClick={()=>setPanel(null)} aria-label="Close panel">×</button>
        <p className={styles.eyebrow}>{panel==='map'?'FOLLOW YOUR CURIOSITY':panel==='missions'?`${state.finished} OF 5 COMPLETE · ${state.score} POINTS`:'MAKE YOURSELF AT HOME'}</p>
        <h2>{panel==='map'?'The island, at a glance.':panel==='missions'?'Good things to do.':'A wanderer’s field guide.'}</h2>
        {panel==='map'?<><IslandMap state={state} large/><p>Gold: bread · Green: olives · Blue: relics · Pink: shells. The white arrow is you. The house marker is the bakery delivery point.</p></>:panel==='missions'?<div className={styles.missionList}>{state.missions.map(m=><button key={m.id} onClick={()=>{setSelected(m.id);setPanel(null);}} aria-pressed={selected===m.id}><span style={{color:m.color}}>●</span><span><strong>{m.title}</strong><small>{m.complete?'Complete':m.awaitingDelivery?`${m.carried} in bag · Deliver at bakery`:`${m.count} / ${m.total} ${m.item}`} · +{m.reward} completion bonus</small></span><b>{m.complete?'✓':'→'}</b></button>)}<p>Your bag holds {state.carried} items. Collect full sets, return to the bakery house marker, then press E or tap Deliver items. Collection alone does not finish an item mission. Score resets when you start a fresh walk.</p></div>:<>
          <dl className={styles.guide}><div><dt>Walk / run</dt><dd>W A S D or arrows / Shift</dd></div><div><dt>Look around</dt><dd>Drag the view, or Q / R</dd></div><div><dt>Zoom / jump</dt><dd>Scroll / Space</dd></div><div><dt>Return bread / pause</dt><dd>E near the bakery / Esc</dd></div></dl>
          <p>Collect bread, olives, relics, and shells, then deliver full sets to the bakery. Visit all four landmarks for an exploration bonus. Use the journal to track a mission. On a touch screen, use the arrows and drag the view to turn.</p>
          <h3>How deliveries work</h3><p>{DELIVERY_GUIDE}</p>
          <button className={styles.restart} onClick={toggleSound}><Icon name={muted?'muted':'sound'}/>Music and sound {muted?'off':'on'} — tap to {muted?'enable':'mute'}</button>
          <div className={styles.credits}><strong>Behind this little world</strong><p><a href="https://sketchfab.com/3d-models/dae-villages-ancient-greek-bakery-364b1b220b1943999d69180b5f322ca5" target="_blank" rel="noreferrer">Ancient Greek Bakery by Bram Verheyen</a> — <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. {assetStatus==='loaded'?'Original asset loaded; scaled and positioned for this island.':assetStatus==='loading'?'Original asset is loading.':assetStatus==='failed'?'The original asset could not load. The temporary bakery is shown; reload to retry.':'Original asset awaiting download. A temporary bakery is currently shown.'} Other scenery is procedural.</p><p><a href="https://www.blendswap.com/blends/view/76636" target="_blank" rel="noreferrer">Armored Baymax by DoodleNotes1</a> — <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>, marked as noncommercial fan art in the supplied license. Converted for the web, scaled, and given a simple walk cycle. {characterStatus==='loaded'?'You are playing as the supplied Baymax model.':characterStatus==='loading'?'Baymax is loading.':'Baymax could not load. The temporary explorer is shown; reload to retry.'}</p></div>
          <button className={styles.restart} onClick={()=>{engine.current?.reset();engine.current?.unlockAudio();setSelected('bread');setStarted(true);setPanel(null);}}><Icon name="reset"/> Start a fresh walk</button>
        </>}
        <button className={styles.primary} onClick={()=>setPanel(null)}>Back to the island <Icon name="arrow"/></button>
      </div>
    </dialog>
    <span className={styles.srOnly} role="status" aria-live="polite">{state.finished===5?'All missions complete. Keep exploring.':`${state.finished} of 5 missions complete. ${state.score} points.`}</span>
    <output className={styles.srOnly} data-testid="player-position">{state.x.toFixed(2)}, {state.z.toFixed(2)}, {state.jump.toFixed(2)}</output>
    {error&&<section className={styles.error} role="alert"><h2>The island needs a moment.</h2><p>{error}</p><button className={styles.primary} onClick={()=>window.location.reload()}>Reload game</button></section>}
  </main>;
}
