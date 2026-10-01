const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/js/engine.js'),R=require('../dist/js/replay.js'),P=require('../dist/js/progress.js');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');return ui;}
function boat(){let s=E.createState();s.turn=25;s.owner=30000000;s=E.lendByOwner(s,20000000);s=E.extension.buyFishery(s,0,{eligible:true,grade:'A',rate:2});s=E.extension.hireCrew(s,'captain');s=E.extension.hireCrew(s,'crew');return s;}
test('monthly PL stays visible when detailed statements are collapsed and reconciles across departments',()=>{
 const ui=start();try{let s=boat(),r=E.run(s,E.recommend(s,s.actionLocked),'list',s.actionLocked,{payment:'cash'});ui.run(`state=${JSON.stringify(r.state)};lastReport=${JSON.stringify(r.report)};renderPlanning();openStatements()`);
  const summary=ui.document.querySelector('.monthly-pl-summary');assert(summary);assert.equal(summary.closest('details'),null);
  assert.equal(ui.document.getElementById('reportFinancialDetails').open,false);
  const b=ui.run('plForTurns(state.turn,state.turn)');assert.equal(summary.querySelector('dd').textContent,ui.run(`amountText(${b.売上高})`));
  assert.equal(summary.querySelector('dl>div:last-child dd').textContent,ui.run(`amountText(${E.profit(b)})`));
  const top=[...ui.document.querySelectorAll('#reportQuickSummary > span b')].map(n=>n.textContent);assert(top.every(n=>n.endsWith('千円')));
  assert.match(ui.document.getElementById('reportTitle').textContent,/月次報告/);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('boat store-duty warnings persist for three months and the transfer path actually unlocks hiring',()=>{
 const ui=start();try{let s=boat(),r;for(let i=0;i<4;i++){r=E.run(s,E.recommend(s,s.actionLocked||'tend'),'list',s.actionLocked||'tend',{payment:'cash'});s=E.next(r.state);}ui.run(`state=${JSON.stringify(s)};lastReport=${JSON.stringify(r.report)};renderPlanning()`);
  assert.match(ui.document.getElementById('managementHints').textContent,/店番固定が3か月/);assert.match(ui.document.getElementById('staffAdvice').textContent,/店番に固定/);assert(ui.document.getElementById('hireStaff').disabled);
  ui.click('[data-review-boat]');const crew=ui.run('state.expansion.fishery.crew.find(c=>c.role==="crew").id');ui.click(`[data-staff-transfer="${crew}"][data-to="store"]`);
  assert.equal(ui.run('state.actionLocked'),null);assert.equal(ui.run('state.staff[0].wage'),280000);assert(ui.document.getElementById('managementHints').hidden);
  ui.run('closeShop();showHiring()');assert.match(ui.document.getElementById('shopDialogBody').textContent,/応募/);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('first-year cash headline compares against paid-in capital and preserves the complete cash bridge',()=>{
 let s=E.createState();for(let i=0;i<12;i++){s=E.run(s,E.recommend(s),'list','tend').state;if(i<11)s=E.next(s);}const before=JSON.stringify(s),r=P.review(s,1);assert.equal(r.capitalPaid,10000000);assert.equal(r.cashChangeAfterFunding,r.cash-10000000);assert.equal(r.openingCash+r.receipts-r.payments,r.cash);assert.equal(JSON.stringify(s),before);
 const ui=start();try{ui.run(`state=${JSON.stringify(s)};showYearReview(1)`);assert.match(ui.document.getElementById('shopDialogBody').textContent,/払込後からの預金増減/);assert.match(ui.document.getElementById('shopDialogBody').textContent,/設立時の払込後 10,000千円/);}finally{ui.close();}
});
test('decisions explain salary scoring, idle cruise, cash/credit trade-off and near-cap investment without executing actions',()=>{
 const ui=start();try{
  assert.match(ui.document.getElementById('welcomeSalary').textContent,/銀行の評価と財務健全性の点数/);ui.run('showHiring()');assert.match(ui.document.getElementById('shopDialogBody').textContent,/採用だけで売上が増えるとは限りません/);ui.run('closeShop()');
  ui.run('showCruise()');assert.match(ui.document.getElementById('shopDialogBody').textContent,/販促を休み続けると/);ui.run('closeShop()');
  ui.click('#editPurchase');ui.click('[data-payment="credit"]');assert.match(ui.document.getElementById('creditQueHint').textContent,/現金払いが苦しい月/);ui.click('#purchaseDialog footer button');
  ui.run("lastReport={turn:1,visitors:950,limit:950};renderPlanning()");assert.match(ui.document.getElementById('managementHints').textContent,/銀行の設備融資/);
  const before=ui.run('JSON.stringify(state)');ui.click('[data-review-investment]');assert(ui.document.getElementById('investmentPlanner').open);assert.equal(ui.run('JSON.stringify(state)'),before);
  assert.match(ui.document.getElementById('cashPlan').textContent,/売上を含む/);assert.match(ui.document.getElementById('tutorialPlanning').textContent,/売上を含まない/);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('only the relevant accounting lesson opens, including collection instead of a wall of introductory lessons',()=>{
 const ui=start();try{ui.run("renderAccountingGuide({turn:3,fy:1,month:6,entries:[{debit:'預金',credit:'売掛金'}]})");const opened=ui.document.querySelectorAll('#accountingBasicsBody > details[open]');assert.equal(opened.length,1);assert.match(opened[0].textContent,/売掛金の回収/);}finally{ui.close();}
});
test('profitability assigns 80 points to amounts, caps all components, and rescoring leaves saved books untouched',()=>{
 const X=E.extension;assert.equal(X.profitabilityScore({ordinary:3000000,totalOrdinary:20000000,assets:0,sales:0}),80);
 assert.equal(X.profitabilityScore({ordinary:3000000,totalOrdinary:20000000,assets:30000000,sales:37500000}),100);
 assert.equal(X.profitabilityScore({ordinary:-1,totalOrdinary:-1,assets:100,sales:100}),0);
 const snapshot={score:{ordinary:900000,totalOrdinary:2000000,assets:12000000,health:100,wealth:5,profitability:99,total:204},years:[{balances:{売上高:20000000}}],balances:{預金:10}};const before=JSON.stringify(snapshot),updated=R.rescoreSnapshot(snapshot);
 assert.equal(updated.score.profitability,25);assert.equal(updated.score.total,130);assert.equal(updated.score.model,X.SCORE_MODEL);assert.equal(JSON.stringify(snapshot),before);assert.deepEqual(updated.balances,snapshot.balances);
});
