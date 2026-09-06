// Original synthesized island music and effects need no downloads.
export function createSound() {
  let context=null, master=null, muted=false, closed=false;
  const voices=new Set(),musicVoices=new Set();
  let nextNote=0,noteIndex=0;
  const melody=[74,78,81,78,76,78,74,null,71,74,78,74,73,71,69,null,67,71,74,78,76,74,71,null,69,73,76,81,78,76,74,null];
  function unlock() {
    if(closed||muted)return;
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      if(!context){context=new Audio();master=context.createGain();master.gain.value=.24;master.connect(context.destination);}
      if(context.state==='suspended')void context.resume().catch(()=>{});
    } catch { /* A blocked audio device must not stop the game. */ }
  }
  function tone(frequency,duration,offset=0,type='sine',volume=.3,end=frequency,music=false) {
    if(muted||closed||context?.state!=='running'||voices.size>20)return;
    const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+offset;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(end,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    oscillator.connect(gain);gain.connect(master);voices.add(oscillator);
    if(music)musicVoices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);musicVoices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    oscillator.start(start);oscillator.stop(start+duration+.02);
  }
  function stopMusic() {
    for(const voice of musicVoices)try{voice.stop();}catch{}
    musicVoices.clear();nextNote=0;
  }
  function updateMusic(playing) {
    if(!playing||muted||closed||context?.state!=='running'){stopMusic();return;}
    const now=context.currentTime;
    if(nextNote<now)nextNote=now+.03;
    while(nextNote<now+.15) {
      const offset=nextNote-now,note=melody[noteIndex%melody.length];
      if(note!==null){const frequency=440*2**((note-69)/12);tone(frequency,.55,offset,'triangle',.11,frequency,true);}
      if(noteIndex%4===0){const root=[50,47,43,45][Math.floor(noteIndex/8)%4],frequency=440*2**((root-69)/12);tone(frequency,1.25,offset,'sine',.12,frequency,true);tone(frequency*1.5,1.1,offset,'sine',.045,frequency*1.5,true);}
      noteIndex=(noteIndex+1)%melody.length;nextNote+=.36;
    }
  }
  function play(kind) {
    if(kind==='step')tone(110,.07,0,'triangle',.12,55);
    if(kind==='jump')tone(240,.16,0,'sine',.2,520);
    if(kind==='pickup'){tone(660,.13);tone(990,.19,.09);}
    if(kind==='discovery'){tone(440,.25);tone(660,.3,.12);}
    if(kind==='complete')[523,659,784,1047].forEach((f,i)=>tone(f,.35,i*.11,'sine',.28));
  }
  return {
    unlock,play,updateMusic,
    setMuted(value){muted=value;if(master)master.gain.value=value?0:.24;if(value)stopMusic();else unlock();},
    silence(){stopMusic();for(const voice of voices)try{voice.stop();}catch{}},
    dispose(){closed=true;stopMusic();for(const voice of voices)try{voice.stop();}catch{};voices.clear();if(context)void context.close().catch(()=>{});}
  };
}
