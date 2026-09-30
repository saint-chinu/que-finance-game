/* Original, quiet procedural music. Audio preferences are independent of game saves. */
(()=>{
 'use strict';
 const key='que-finance-audio-v1', defaults={enabled:false,volume:20,bgm:true,sfx:true};
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 const prefs={...defaults};
 for(const field of ['enabled','bgm','sfx'])if(typeof saved?.[field]==='boolean')prefs[field]=saved[field];
 if(Number.isFinite(saved?.volume))prefs.volume=Math.max(0,Math.min(100,saved.volume));
 const Audio=window.AudioContext||window.webkitAudioContext;
 const panel=document.createElement('div');panel.className='sound-controls';
 panel.innerHTML='<button type="button" data-sound-toggle aria-pressed="false">♪ 音：オフ</button><details class="sound-settings"><summary>音の設定</summary><div><label>音量 <input id="soundVolume" type="range" min="0" max="100" step="5"><output id="soundVolumeValue"></output></label><label><input id="soundBgm" type="checkbox"> BGM</label><label><input id="soundSfx" type="checkbox"> 効果音</label><small id="soundStatus" role="status">初回は音オフ。小さな音からお試しください。</small></div></details>';
 document.querySelector('.top').append(panel);
 // Keep mute available inside modal screens as well as the main header.
 for(const header of document.querySelectorAll('dialog header,.report-buttons,.journal-header,.intro-heading')){
  const button=document.createElement('button');button.type='button';button.dataset.soundToggle='';button.className='sound-mute';header.append(button);
 }
 const volume=document.getElementById('soundVolume'),bgm=document.getElementById('soundBgm'),sfx=document.getElementById('soundSfx'),status=document.getElementById('soundStatus');
 let ctx,master,music,effects,timer=null,nextNote=0,step=0,revision=0,lastEffect=-Infinity;
 const voices=new Map();
 function persist(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}}
 function update(){
  for(const b of document.querySelectorAll('[data-sound-toggle]')){
   b.textContent=prefs.enabled?'♪ 音：オン':'♪ 音：オフ';b.setAttribute('aria-pressed',String(prefs.enabled));b.disabled=!Audio;
  }
  volume.value=String(prefs.volume);document.getElementById('soundVolumeValue').textContent=prefs.volume+'%';bgm.checked=prefs.bgm;sfx.checked=prefs.sfx;
  status.textContent=!Audio?'このブラウザーは音の再生に対応していません。':!prefs.enabled?'音はオフです。小さな音からお試しください。':prefs.volume===0?'音量は0%です。':!prefs.bgm&&!prefs.sfx?'BGM・効果音ともにオフです。':'控えめな音量で再生。別のタブでは自動で休止します。';
 }
 function stopVoices(bus){for(const [osc,voice]of voices){if(bus&&voice.bus!==bus)continue;try{osc.stop();}catch{}osc.disconnect();voice.gain.disconnect();voices.delete(osc);}}
 function stopMusic(){if(timer!==null){clearInterval(timer);timer=null;}stopVoices(music);}
 function note(midi,start,duration,level,bus,type='sine'){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(bus);voices.set(osc,{gain,bus});osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(osc);};osc.start(start);osc.stop(start+duration+.02);
 }
 // Eight mellow bars in C major; rests leave room for reading and decisions.
 const melody=[72,null,76,79,null,76,74,null,72,null,69,72,null,76,null,null,69,null,72,76,null,72,69,null,67,null,71,74,null,71,null,null,72,null,76,79,null,81,79,null,76,null,72,69,null,72,null,null,69,null,72,76,null,74,72,null,67,null,71,74,null,72,null,null];
 const chords=[[48,55,64],[45,52,60],[41,48,57],[43,50,59]];
 function schedule(){
  if(!prefs.enabled||!prefs.bgm||document.hidden||ctx.state!=='running')return;
  if(nextNote<ctx.currentTime)nextNote=ctx.currentTime+.04;
  while(nextNote<ctx.currentTime+.2){
   const index=step%melody.length;
   if(index%8===0)for(const pitch of chords[Math.floor(index/8)%4])note(pitch,nextNote,2.4,.035,music);
   if(melody[index]!==null)note(melody[index],nextNote,1.1,.085,music,'triangle');
   step++;nextNote+=.42;
  }
 }
 async function sync(gesture=false){
  const current=++revision;
  if(!Audio)return;
  if(!prefs.enabled||document.hidden||prefs.volume===0||(!prefs.bgm&&!prefs.sfx)){
   stopMusic();stopVoices();if(ctx){master.gain.setValueAtTime(0,ctx.currentTime);try{await ctx.suspend();}catch{}}return;
  }
  if(!ctx&&!gesture)return;
  try{
   if(!ctx){ctx=new Audio();master=ctx.createGain();music=ctx.createGain();effects=ctx.createGain();music.connect(master);effects.connect(master);master.connect(ctx.destination);}
   // Ceiling keeps even the maximum slider setting gentle.
   master.gain.setTargetAtTime(prefs.volume/100*.55,ctx.currentTime,.04);
   if(!prefs.bgm)stopMusic();if(!prefs.sfx)stopVoices(effects);
   await ctx.resume();
   if(current!==revision)return;
   if(prefs.bgm&&timer===null){nextNote=ctx.currentTime+.06;schedule();timer=setInterval(schedule,100);}
   status.textContent='控えめな音量で再生。別のタブでは自動で休止します。';
  }catch{if(current===revision){stopMusic();status.textContent='音を再開するには、音をオフにしてからオンにしてください。';}}
 }
 function effect(button){
  if(!ctx||ctx.state!=='running'||!prefs.enabled||!prefs.sfx||document.hidden||prefs.volume===0)return;
  const now=ctx.currentTime;if(now-lastEffect<.12)return;lastEffect=now;
  stopVoices(effects);
  if(['commit','next','introNext'].includes(button.id)){
   note(72,now,.18,.13,effects);note(76,now+.13,.25,.11,effects);
  }else note(button.classList.contains('action')?76:72,now,.085,.085,effects);
 }
 // Window capture also sees commands handled by the game's document capture listeners.
 window.addEventListener('click',event=>{
  const button=event.target.closest?.('button');
  if(button?.disabled)return;
  if(button?.hasAttribute('data-sound-toggle')){prefs.enabled=!prefs.enabled;persist();update();void sync(true);return;}
  if(event.target.closest?.('.sound-controls'))return;
  if(prefs.enabled){if(!ctx||ctx.state!=='running')void sync(true);if(button)effect(button);}
 },true);
 volume.addEventListener('input',()=>{prefs.volume=Number(volume.value);persist();update();void sync(true);});
 for(const [input,field]of [[bgm,'bgm'],[sfx,'sfx']])input.addEventListener('change',()=>{prefs[field]=input.checked;persist();update();void sync(true);});
 document.addEventListener('visibilitychange',()=>void sync());
 window.addEventListener('pagehide',()=>{revision++;stopMusic();stopVoices();if(ctx)void ctx.suspend().catch(()=>{});});
 update();
})();
