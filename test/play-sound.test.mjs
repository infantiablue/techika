import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSound } from '../app/play/sound.js';

test('sound waits for a gesture, respects mute, and releases audio on exit',()=>{
  let contexts=0,played=0,closed=0,stopped=0;
  const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  class AudioContext {
    constructor(){contexts++;this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
    createOscillator(){return {frequency:parameter(),connect(){},disconnect(){},start(){played++;},stop(){stopped++;}};}
    close(){closed++;return Promise.resolve();}
  }
  const previous=globalThis.window;globalThis.window={AudioContext};
  try {
    const sound=createSound();sound.play('pickup');assert.equal(contexts,0);assert.equal(played,0);
    sound.unlock();assert.equal(contexts,1);
    for(const event of ['step','jump','pickup','discovery','complete'])sound.play(event);
    assert.equal(played,10);
    sound.setMuted(true);sound.play('pickup');assert.equal(played,10);
    sound.setMuted(false);sound.play('pickup');assert.equal(played,12);assert.equal(contexts,1);
    sound.silence();assert.ok(stopped>=12);
    sound.dispose();sound.unlock();sound.play('pickup');assert.equal(closed,1);assert.equal(contexts,1);assert.equal(played,12);
  } finally {if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

test('music loops after a gesture, pauses, mutes, resumes, and disposes without duplicate scheduling',()=>{
  let context,played=0,closed=0;
  const nodes=[];
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  class AudioContext {
    constructor(){context=this;this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createOscillator(){const node={frequency:param(),connect(){},disconnect(){},start(){played++;},stop(time){this.ends=time??context.currentTime;}};nodes.push(node);return node;}
    close(){closed++;return Promise.resolve();}
  }
  const previous=globalThis.window;globalThis.window={AudioContext};
  try {
    const sound=createSound();sound.updateMusic(true);assert.equal(context,undefined);
    sound.unlock();sound.updateMusic(true);assert.equal(played,3);
    sound.updateMusic(true);assert.equal(played,3,'One frame must not reschedule notes');
    for(let i=0;i<80;i++){
      context.currentTime+=.36;
      for(const node of nodes)if(!node.ended&&node.ends<=context.currentTime){node.ended=true;node.onended?.();}
      sound.updateMusic(true);
    }
    assert.ok(played>80,'Music continues beyond two loops');
    sound.updateMusic(false);const paused=played;
    assert.ok(nodes.every(node=>node.ends<=context.currentTime),'Pausing cancels scheduled notes');
    sound.updateMusic(false);assert.equal(played,paused);
    sound.setMuted(true);sound.updateMusic(true);assert.equal(played,paused);
    sound.setMuted(false);sound.updateMusic(true);assert.ok(played>paused);
    sound.dispose();const disposed=played;sound.updateMusic(true);sound.unlock();
    assert.equal(played,disposed);assert.equal(closed,1);
  } finally {if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
