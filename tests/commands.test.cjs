const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),R=require('../dist/js/replay.js'),B=require('../dist/js/backup.js');
const {bootDOM}=require('./helpers/dom.cjs');
test('monthly named candidates are stable across inspection, save and replay; hires provide full capacity',()=>{
 let s=R.create(73129);const before=JSON.stringify(s),ids=E.staffCandidates(s);
 assert.equal(ids.length,2);assert.deepEqual(E.staffCandidates(JSON.parse(before)),ids);assert.equal(JSON.stringify(s),before);
 const next=structuredClone(s);next.turn++;assert.notDeepEqual(E.staffCandidates(next),ids);
 assert.throws(()=>E.hire(s,'parttime','unknown'));
 for(const role of ['parttime','employee','manager']){
  const hired=E.hire(s,role,ids[0]),server=R.apply(s,{op:'hire',args:[role,ids[0]]}).state;
  assert.deepEqual(server,hired);assert(!E.staffCandidates(hired).includes(ids[0]));
  assert.equal(E.limits(hired,'hire').service,E.staffService(hired.staff[0]));
  const r=E.run(hired,E.recommend(hired,'hire'),'list','hire',{noise:1});
  assert(r.report.cashSales+r.report.cardSales>0);assert.equal(r.state.balances.給料手当,E.ROLES[role].wage);E.assertState(r.state);
 }
});
test('hidden character traits affect service, attraction and office work without changing roles',()=>{
 const s=E.createState(),traits=Object.keys(E.STAFF_CHARACTERS).map(id=>{const x={...s,staff:[{role:'employee',origin:'external',characterId:id}]};return [E.limits(x,'sales').service,E.staffAffinity(x),E.officeSaving(x)];});
 assert.equal(new Set(traits.map(JSON.stringify)).size,4);
});
test('bank consultation consumes one owner action, preserves staff sales and survives backup/replay',()=>{
 let s=E.hire(R.create(73129),'parttime');s=E.next(E.run(s,E.recommend(s,'hire'),'list','hire').state);
 const n=E.consultBank(s);assert.equal(n.actionLocked,'bank');assert.equal(n.turn,s.turn);assert.deepEqual(n.balances,s.balances);assert.throws(()=>E.consultBank(n));assert.throws(()=>E.hire(n));
 assert.deepEqual(R.apply(s,{op:'consultBank',args:[]}).state,n);
 const r=E.run(n,E.recommend(n,'bank'),'list','tend',{noise:1});assert.equal(r.report.action,'bank');assert(r.report.served>0);assert.equal(E.limits(n,'bank').service,1050);E.assertState(r.state);
 const payload={version:7,introComplete:true,state:n,lastReport:null,choice:{quantities:E.recommend(n,'bank'),price:'list',action:'bank'},seen:[]};assert.equal(B.decode(B.encode(payload)).state.actionLocked,'bank');
 assert.throws(()=>E.consultBank(r.state));const solo=E.consultBank(E.createState());assert.equal(E.limits(solo,'bank').service,650);
});
test('集客投資: promotion lasts four months, a tournament sponsorship (only in offer months) six',()=>{
 const offer=E.sponsorEvent;
 for(const action of ['improve','sales']){
  E.sponsorEvent=()=>action==='sales';
  const s=E.hire(E.createState(),'parttime');s.actionLocked=null;
  const r=E.run(s,E.recommend(s,action),'list',action,{noise:1}),m=r.state.marketing.find(x=>x.kind==='campaign');
  const gains=Array.from({length:8},(_,i)=>E.marketingGain({...r.state,turn:s.turn+i}));
  (action==='sales'?[0,m.gain,m.gain,m.gain,m.gain,m.gain*2/3,m.gain/3,0]:[0,m.gain,m.gain,m.gain*2/3,m.gain/3,0,0,0]).forEach((expected,i)=>assert(Math.abs(gains[i]-expected)<1e-12));
  const base={...r.state,turn:s.turn+(action==='sales'?7:5)};assert.equal(E.effectiveAttraction(base),E.effectiveAttraction({...base,marketing:[]}));
 }
 E.sponsorEvent=()=>false;assert.throws(()=>E.run(E.createState(),E.PRODUCTS.map(()=>0),'list','sales'),/協賛募集/);E.sponsorEvent=offer;
});
test('property unlock requires consecutive profitable annual statements, not monthly profits or borrowing',()=>{
 const s=E.createState();s.turn=25;const h=(turn,profit)=>({turn,balances:{売上高:Math.max(0,profit),雑費:Math.max(0,-profit)}});
 for(const history of [[],[h(12,1),h(24,0)],[h(12,-1),h(24,1)],[h(12,1),h(36,1)],[h(22,1),h(23,1)]]){s.history=history;assert(!E.extension.propertyUnlocked(s));assert.throws(()=>E.extension.buyProperty(s,E.extension.market(s)[0].id,0,{eligible:true,grade:'A',rate:2}));}
 s.history=[h(12,1),h(24,1)];assert(E.extension.propertyUnlocked(s));s.history.push(h(36,-1));assert(E.extension.propertyUnlocked(s));
});
test('real DOM offers portraits, explicit bank action and gated real estate without exposing hidden ability numbers',()=>{
 const app=bootDOM();try{
  app.run('skipIntro()');assert(app.document.getElementById('propertyMenu').hidden);
  app.click('#diversificationMenu');assert.equal(app.document.querySelector('[data-property-view]'),null);
  app.click('#closeShopDialog');app.click('#hireStaff');const first=app.document.querySelector('[data-hire-preview="parttime"]');const id=first.dataset.characterId;
  assert(app.document.querySelector('img[alt="'+E.STAFF_CHARACTERS[id].name+'"]'));assert(!app.document.getElementById('shopDialogBody').textContent.includes(String(E.STAFF_CHARACTERS[id].office))||E.STAFF_CHARACTERS[id].office===0);
  app.click('[data-hire-preview="parttime"]');app.click('[data-confirm-hire="parttime"]');assert.equal(app.run('state.staff[0].characterId'),id);
  app.click('#commit');app.finishEntries();app.click('#next');const turn=app.run('state.turn');app.click('#bankMenu');assert.match(app.document.getElementById('shopDialogBody').textContent,/銀行員A/);
  app.click('#confirmBankConsultation');assert.equal(app.run('state.actionLocked'),'bank');assert.equal(app.run('state.turn'),turn);app.click('#closeReport');app.click('#commit');app.finishEntries();assert(app.run('lastReport.cashSales+lastReport.cardSales')>0);
  app.run("state.history=[{turn:12,balances:{売上高:1}},{turn:24,balances:{売上高:1}}];renderPlanning();showDiversification()");assert(!app.document.getElementById('propertyMenu').hidden);assert(app.document.querySelector('img[alt="サーティー"]'));assert(app.document.querySelector('[data-property-view]'));assert.deepEqual(app.errors,[]);
 }finally{app.close();}
});
