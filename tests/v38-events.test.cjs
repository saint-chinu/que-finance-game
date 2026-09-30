const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),B=require('../dist/js/bank.js'),R=require('../dist/js/replay.js'),Backup=require('../dist/js/backup.js');
const {bootDOM}=require('./helpers/dom.cjs');
const assessment={score:90,grade:'A',eligible:true,rate:2,years:10,capacity:500000,workingNeed:1000000,short:{balance:0,available:1000000},equipment:{balance:0,available:5000000},metrics:[]};
const month=s=>E.run(s,E.recommend(s,s.actionLocked||'tend'),'list',s.actionLocked||'tend',{noise:1});
test('every year has 1–3 deterministic recruitment windows; only the first lifetime hire is unrestricted',()=>{
 const s=R.create(17),before=JSON.stringify(s);for(let year=0;year<10;year++){
  const base={...s,turn:year*12+1,staffSerial:1},r=E.recruitment(base);
  assert(r.count>=1&&r.count<=3);assert.equal(new Set(r.months).size,r.count);
  assert.equal(Array.from({length:12},(_,i)=>E.recruitment({...base,turn:year*12+i+1}).open).filter(Boolean).length,r.count);
  assert.deepEqual(E.recruitment(JSON.parse(JSON.stringify(base))),r);
 }
 assert.equal(JSON.stringify(s),before);
 const first=E.hire(s,'parttime',E.staffCandidates(s)[0]);first.actionLocked=null;
 while(E.recruitment(first).open)first.turn++;
 assert.throws(()=>E.hire(first,'employee'),/採用イベント/);
 first.staff=[];assert.equal(E.recruitment(first).first,false);assert.throws(()=>E.hire(first,'employee'));
 while(!E.recruitment(first).open)first.turn++;assert.equal(E.hire(first,'employee').staff.length,1);
});
test('ability hints occur after six elapsed months once, survive reload, and are not consumed by forecasts',()=>{
 let s=R.create(21);const id=E.staffCandidates(s)[0];s=E.hire(s,'employee',id);s.owner=10000000;s=E.lendByOwner(s,5000000);
 let r;for(let t=1;t<=7;t++){
  const before=JSON.stringify(s);E.forecast(s,E.recommend(s,s.actionLocked||'tend'),'list',s.actionLocked||'tend');assert.equal(JSON.stringify(s),before);
  r=month(s);s=r.state;
  assert.equal(r.report.staffHints.length,t===7?1:0);
  if(t<7)s=E.next(E.compact(s));
 }
 assert.equal(s.staff[0].abilityHintTurn,7);assert.equal(E.queComment(s,r.report).topic,'staffAbility');
 const payload={version:7,introComplete:true,state:s,lastReport:r.report,choice:{quantities:E.PRODUCTS.map(()=>0),price:'list',action:'tend'},seen:[]};
 s=Backup.decode(Backup.encode(payload)).state;assert.equal(s.history.at(-1).staffHints.length,1);
 const next=month(E.next(s));assert.equal(next.report.staffHints.length,0);
});
test('hint wording matches real storage, office, service and fishing effects',()=>{
 const s=E.createState(),base=E.capacities(s).dry;
 s.staff=[{id:'staff-1',role:'employee',characterId:'danball',hiredTurn:1}];assert(E.capacities(s).dry>base);assert.match(E.staffHints(s,7)[0].text,/スペース/);assert.equal(E.staffHints(s,6).length,0);
 s.staff[0].characterId='hofuku';assert(E.officeSaving(s)>0);assert.match(E.staffHints(s,7)[0].text,/経理/);
 s.turn=30;s.expansion.fishery={acquired:25,serial:1,crew:[{id:'crew-1',role:'captain',characterId:'madai',hiredTurn:26,wage:350000}],policy:'normal'};
 let checked=false;for(let t=32;t<44;t++){s.turn=t;const plain=structuredClone(s);delete plain.expansion.fishery.crew[0].characterId;E.extension.monthly(s);E.extension.monthly(plain);if(plain.expansion.fishery.last.quantity>0){assert(s.expansion.fishery.last.quantity>plain.expansion.fishery.last.quantity);checked=true;break;}}
 assert(checked);assert(E.staffHints(s).some(x=>x.characterId==='madai'&&/手際/.test(x.text)));
});
test('loans consume consultation action on all engine paths and linked equipment purchase succeeds atomically',()=>{
 const s=E.createState(),before=JSON.stringify(s),short=B.execute(s,assessment,'short',500000);
 assert.equal(short.actionLocked,'bank');assert.equal(short.bankConsultedTurn,s.turn);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>B.execute(E.hire(s),assessment,'short',500000),/行動/);
 const consulted=E.consultBank(s),equipment=B.execute(consulted,assessment,'freezer',300000);
 assert(equipment.equipment.freezer);assert.equal(equipment.actionLocked,'investment');assert.equal(equipment.turn,s.turn);E.assertState(equipment);
 const low=structuredClone(consulted);low.balances.預金=0;const snapshot=JSON.stringify(low);assert.throws(()=>B.execute(low,assessment,'freezer',300000));assert.equal(JSON.stringify(low),snapshot);
});
test('free bank view has no application controls; consultation resumes a linked investment request',()=>{
 const app=bootDOM();try{
  app.run('skipIntro();currentBankAssessment=()=>('+JSON.stringify(assessment)+')');
  app.click('#bankMenu');app.click('#viewBankAssessment');assert.equal(app.document.querySelector('[data-loan-request]'),null);assert.equal(app.run('state.actionLocked'),null);
  app.click('#closeReport');app.run("bankPurpose='freezer';requestBankLoan(300000)");assert.equal(app.run('state.actionLocked'),null);
  app.click('#confirmBankConsultation');assert.equal(app.run('state.actionLocked'),'bank');const button=app.document.querySelector('[data-loan-confirm="300000"]');assert(button&&!button.disabled);
  app.click('[data-loan-confirm="300000"]');assert(app.run('state.equipment.freezer'));assert.equal(app.run('state.turn'),1);assert.deepEqual(app.errors,[]);
 }finally{app.close();}
});
test('UI labels ability estimates, hides traits until tenure hint, and displays recruitment and campaign timing',()=>{
 const app=bootDOM();try{
  app.run('skipIntro()');app.click('#hireStaff');assert.match(app.document.getElementById('shopDialogBody').textContent,/接客力目安/);
  app.click('[data-hire-preview="parttime"]');app.click('[data-confirm-hire="parttime"]');
  app.run("state.actionLocked=null;while(E.recruitment(state).open)state.turn++;state.marketing=[{kind:'campaign',start:state.turn+1,end:state.turn+4,gain:.12}];renderPlanning();");
  assert(app.document.getElementById('hireStaff').disabled);assert.match(app.document.getElementById('promotionSchedule').textContent,/1か月後から有効/);
  app.run('state.turn++;renderPlanning()');assert.match(app.document.getElementById('promotionSchedule').textContent,/現在 100％/);
  app.run('state.turn+=4;renderPlanning()');assert.match(app.document.getElementById('promotionSchedule').textContent,/ありません/);assert.deepEqual(app.errors,[]);
 }finally{app.close();}
});
