/* Import validation is independent of browser storage; failed validation cannot mutate a game. */
(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.ShopEngine,MAX_BYTES=16*1024*1024;
const fail=()=>{throw Error('バックアップの形式または帳簿が不正です。現在のデータは変更していません。');};
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function inspect(value,depth=0){
 if(depth>24)fail();
 if(typeof value==='number'&&!Number.isFinite(value))fail();
 if(typeof value==='string'&&(value.length>10000||/[<>]/.test(value)))fail();
 if(value&&typeof value==='object')for(const [key,v] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))fail();inspect(v,depth+1);}
}
function validate(payload){
 try{
  inspect(payload);if(![4,5,6,7].includes(payload?.version)||payload.introComplete!==true)fail();
  const p=structuredClone(payload),s=p.state;if(s?.firstHireTurn!==undefined&&!integer(s.firstHireTurn,1,s.turn))fail();if(!s||!integer(s.turn,1,120)||typeof s.closed!=='boolean')fail();
  for(const key of ['inventory','lots','staff','assets','receivables','history','entries','pendingEntries'])if(!Array.isArray(s[key]))fail();
  if(s.inventory.length!==E.PRODUCTS.length||s.lots.length!==E.PRODUCTS.length||s.history.length>120||s.entries.length>100000||s.staff.length>3)fail();
  const known=new Set(Object.keys(E.blankState().balances).concat('内装'));
  const balances=b=>{if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!known.has(k))||Object.values(b).some(v=>!integer(v,-Number.MAX_SAFE_INTEGER)))fail();};
  balances(s.balances);if(s.opening)balances(s.opening);
  if(!integer(s.owner,-Number.MAX_SAFE_INTEGER)||!Number.isFinite(s.attraction)||s.attraction<0||s.attraction>10||!integer(s.rng,0,4294967295))fail();
  for(const k of Object.keys(s.equipment||{}))if(!E.EQUIPMENT[k])fail();
  if(!s.equipment||s.staff.some(x=>!E.ROLES[x.role]||x.role==='que'||x.characterId!=null&&!Object.hasOwn(E.STAFF_CHARACTERS,x.characterId)&&x.characterId!=='madai'||!integer(x.hiredTurn,1,s.turn)))fail();
  s.lots.forEach((lots,i)=>{if(!integer(s.inventory[i])||!Array.isArray(lots)||lots.some(l=>!integer(l.quantity)||!integer(l.turn,1,s.turn)||l.amount!==undefined&&!integer(l.amount)))fail();});
  if(s.assets.some(a=>!integer(a.cost)||!integer(a.life,1,1200)||!integer(a.depreciation,0,a.cost)))fail();
  if(s.receivables.some(r=>!integer(r.amount)||!integer(r.due,1,240)))fail();
  if((s.loans||[]).some(l=>!integer(l.balance)||!integer(l.amount,l.balance)||!integer(l.months,1,l.kind==='property'?300:120)||!integer(l.start,1,s.turn)||!integer(l.payment)||!Number.isFinite(l.rate)||l.rate<=0||!['short','equipment','startup','property','fishery'].includes(l.kind)))fail();
  for(const key of ['taxes','vatDue','taxRefunds'])if((s[key]||[]).some(t=>!integer(t.amount)||!integer(t.due,1,240)))fail();
  if((s.taxLosses||[]).some(l=>!integer(l.year,1,10)||!integer(l.remaining)))fail();
  const validEntry=e=>{if(!e||!integer(e.turn,1,s.turn)||!integer(e.amount,1)||!known.has(e.debit)||!known.has(e.credit)||typeof e.memo!=='string')fail();};
  for(const e of [...s.entries,...s.pendingEntries])validEntry(e);
  let last=0;for(const h of s.history){if(h.turn!==last+1)fail();last=h.turn;balances(h.balances);}
  if(last!==(s.closed?s.turn:s.turn-1))fail();
  const c=p.choice;if(!c||c.payment!==undefined&&!['cash','credit'].includes(c.payment)||c.creditExplained!==undefined&&typeof c.creditExplained!=='boolean'||!Array.isArray(c.quantities)||c.quantities.length!==E.PRODUCTS.length||c.quantities.some(n=>!integer(n,0,100000))||!['list','plus10','minus10','sale'].includes(c.price)||!['tend','improve','sales','hire','bank','investment','fixture'].includes(c.action))fail();
  if(!Array.isArray(p.seen)||p.seen.some(x=>typeof x!=='string'))fail();
  if(p.animationQueue!==undefined&&!Array.isArray(p.animationQueue))fail();
  for(const e of p.animationQueue||[]){if(e.tutorialGroup){if(!Array.isArray(e.entries)||typeof e.memo!=='string')fail();e.entries.forEach(validEntry);}else validEntry(e);balances(e.before);balances(e.after);}
  if(p.animationReturn&&!['journal'].includes(p.animationReturn)||p.entryStage!==undefined&&!integer(p.entryStage,0,1))fail();
  for(const key of ['reviewSeen','milestoneSeen'])if(s[key]!==undefined&&!Array.isArray(s[key]))fail();
  if(s.replay&&(!/^[a-f0-9-]{36}$/.test(s.replay.id)||!/^\d{4}-\d{2}$/.test(s.replay.scenario)||!integer(s.replay.seed,1,4294967295)||typeof s.replay.engine!=='string'||!Array.isArray(s.replay.ops)||s.replay.ops.length>2000||s.replay.ops.some(o=>typeof o.op!=='string'||!Array.isArray(o.args))))fail();E.extension?.validateSave(s);p.state=E.migrate(s);E.assertState(p.state);
  if(p.state.closed){if(p.lastReport?.turn!==s.turn)fail();balances(p.lastReport.after);for(const k of Object.keys(s.balances))if((s.balances[k]||0)!==(p.lastReport.after[k]||0))fail();}
  p.version=7;p.monthClosed=s.closed;return p;
 }catch{fail();}
}
function encode(payload){const p=validate(payload);E.compact(p.state);return JSON.stringify({format:'que-finance-backup',version:1,exportedAt:new Date().toISOString(),save:p});}
function decode(text){if(typeof text!=='string'||text.length>MAX_BYTES)fail();let p;try{p=JSON.parse(text);}catch{fail();}if(p?.format==='que-finance-backup'){if(p.version!==1)fail();p=p.save;}return validate(p);}
function restore(storage,key,payload){
 const p=validate(payload),old=storage.getItem(key),serialized=JSON.stringify(p);
 // Write rollback first. If either write fails, the current save remains untouched.
 try{if(old)storage.setItem(key+'-before-restore',old);storage.setItem(key,serialized);}catch{throw Error('保存容量が足りないため復元できませんでした。現在のセーブはそのままです。');}
 return p;
}
const api={MAX_BYTES,validate,encode,decode,restore};if(typeof module!=='undefined')module.exports=api;root.ShopBackup=api;
})(globalThis);
