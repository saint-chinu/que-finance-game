const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('dist/js/audio.js','utf8');
function setup(saved){
 const dom=new JSDOM('<header class="top"></header><dialog><header></header></dialog><button id="commit">確定</button>',{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,contexts=[],timers=new Map();let tick=0;
 class Param{setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
 class Node{constructor(){this.gain=new Param();this.frequency=new Param();}connect(target){this.target=target;}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
 class Audio{constructor(){this.currentTime=1;this.state='suspended';this.destination={};this.oscillators=[];contexts.push(this);}createGain(){return new Node();}createOscillator(){const n=new Node();this.oscillators.push(n);return n;}async resume(){this.state='running';}async suspend(){this.state='suspended';}}
 w.AudioContext=Audio;w.setInterval=fn=>{timers.set(++tick,fn);return tick;};w.clearInterval=id=>timers.delete(id);
 if(saved)w.localStorage.setItem('que-finance-audio-v1',saved);
 w.eval(source);
 const click=selector=>w.document.querySelector(selector).click();
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {w,contexts,timers,click,flush,close:()=>w.close(),hide:async value=>{Object.defineProperty(w.document,'hidden',{configurable:true,value});w.document.dispatchEvent(new w.Event('visibilitychange'));await flush();}};
}
test('sound is opt-in, modal mute silences it, preferences survive reload',async()=>{
 const u=setup();try{
  assert.equal(u.contexts.length,0);u.click('#commit');assert.equal(u.contexts.length,0);
  u.click('.top [data-sound-toggle]');await u.flush();assert.equal(u.contexts.length,1);assert.equal(u.timers.size,1);assert(u.contexts[0].oscillators.some(n=>n.started));
  u.click('dialog [data-sound-toggle]');await u.flush();assert.equal(u.contexts[0].state,'suspended');assert.equal(u.timers.size,0);assert(u.contexts[0].oscillators.every(n=>n.stopped&&n.disconnected));
  const restored=setup(u.w.localStorage.getItem('que-finance-audio-v1'));try{assert.equal(restored.contexts.length,0);assert.equal(restored.w.document.querySelector('[data-sound-toggle]').getAttribute('aria-pressed'),'false');}finally{restored.close();}
 }finally{u.close();}
});
test('background pauses, foreground resumes once, rapid toggles do not duplicate music',async()=>{
 const u=setup();try{
  u.click('[data-sound-toggle]');await u.flush();await u.hide(true);assert.equal(u.timers.size,0);assert.equal(u.contexts[0].state,'suspended');
  await u.hide(false);assert.equal(u.timers.size,1);assert.equal(u.contexts[0].state,'running');
  u.click('[data-sound-toggle]');u.click('[data-sound-toggle]');await u.flush();assert.equal(u.timers.size,1);assert.equal(u.contexts.length,1);
  u.click('[data-sound-toggle]');await u.hide(true);await u.hide(false);assert.equal(u.timers.size,0);
 }finally{u.close();}
});
test('BGM and effects can be disabled independently and rapid clicks are limited',async()=>{
 const u=setup();try{
  u.click('[data-sound-toggle]');await u.flush();u.click('#soundBgm');await u.flush();assert.equal(u.timers.size,0);
  const ctx=u.contexts[0],before=ctx.oscillators.length;u.click('#commit');u.click('#commit');assert.equal(ctx.oscillators.length,before+2);
  u.click('#soundSfx');await u.flush();ctx.currentTime+=1;u.click('#commit');await u.flush();assert.equal(ctx.oscillators.length,before+2);
  assert.equal(ctx.state,'suspended');
 }finally{u.close();}
});
test('remembered sound waits for interaction; invalid settings cannot set excessive volume',async()=>{
 const u=setup(JSON.stringify({enabled:true,volume:999,bgm:false,sfx:true}));try{
  assert.equal(u.contexts.length,0);assert.equal(u.w.document.getElementById('soundVolume').value,'100');
  u.click('#commit');await u.flush();assert.equal(u.contexts.length,1);assert.equal(u.timers.size,0);
  const input=u.w.document.getElementById('soundVolume');input.value='0';input.dispatchEvent(new u.w.Event('input'));await u.flush();assert.equal(u.contexts[0].state,'suspended');
 }finally{u.close();}
});
