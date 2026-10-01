const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/js/engine.js');
const {bootDOM}=require('./helpers/dom.cjs');
let fixture;
function march(){if(fixture)return structuredClone(fixture);let s=E.extension.setSalary(E.createState(),300000),r;for(let t=1;t<=12;t++){r=E.run(s,E.recommend(s),'list','tend',{payment:'cash',noise:1});assert(!r.state.ended);s=t===12?r.state:E.next(r.state);}fixture={state:s,report:r.report};return structuredClone(fixture);}
function startMarch(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');const f=march();ui.run(`state=${JSON.stringify(f.state)};lastReport=${JSON.stringify(f.report)};monthClosed=true;choice.quantities=E.PRODUCTS.map(()=>0);renderPlanning();saveGame();`);return ui;}
test('March close offers annual pay on April entry, preserves last year, and locks once confirmed',()=>{
 const ui=startMarch();try{
  const previous=ui.run('state.history.at(-1).balances.役員報酬');ui.run('advanceMonth()');assert.equal(ui.run('state.turn'),13);assert(ui.document.getElementById('annualSalaryDialog').open);
  assert.equal(ui.document.getElementById('annualSalaryAmount').value,'300000');ui.click('[data-annual-salary="250000"]');ui.click('#confirmAnnualSalary');
  assert.equal(ui.run('state.officerSalary'),250000);assert.equal(ui.run('state.expansion.salarySetYear'),2);assert.equal(ui.run('state.history.at(-1).balances.役員報酬'),previous);
  assert(!ui.document.getElementById('annualSalaryDialog').open);assert(ui.document.getElementById('annualSalaryReminder').hidden);
  assert.throws(()=>ui.run('E.extension.setSalary(state,200000)'));ui.run('showTaxPolicy()');assert(ui.document.getElementById('saveTaxSalary').disabled);ui.run('closeShop()');
  const ownerBefore=ui.run('state.owner');ui.run('closeMonth(true,true)');ui.finishEntries();assert.equal(ui.run('state.balances.役員報酬'),250000);assert.equal(ui.run("lastReport.entries.find(e=>e.type==='officerSocial').amount"),37500);
  assert.equal(ui.run('state.owner'),ownerBefore);ui.run('advanceMonth()');assert.equal(ui.run('state.turn'),14);assert(!ui.document.getElementById('annualSalaryDialog').open);assert.throws(()=>ui.run('E.extension.setSalary(state,200000)'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('postponed annual choice survives reload, blocks April close, and retaining salary counts as the yearly decision',()=>{
 let ui=startMarch();try{
  ui.run('advanceMonth()');ui.click('#laterAnnualSalary');assert(!ui.document.getElementById('annualSalaryReminder').hidden);
  ui.run('closeMonth()');assert(!ui.run('state.closed'));assert(ui.document.getElementById('annualSalaryDialog').open);ui.click('#laterAnnualSalary');
  const save=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',save]]);ui.click('#welcomeStart');assert(ui.document.getElementById('annualSalaryDialog').open);
  ui.click('#confirmAnnualSalary');assert.equal(ui.run('state.officerSalary'),300000);assert.equal(ui.run('state.expansion.salarySetYear'),2);
  const again=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',again]]);ui.click('#welcomeStart');assert(!ui.document.getElementById('annualSalaryDialog').open);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('custom pay is preserved, invalid values cannot confirm, and cruise stops by the next decision',()=>{
 const ui=startMarch();try{
  ui.run('state.officerSalary=350000;advanceMonth()');assert.equal(ui.document.getElementById('annualSalaryAmount').value,'350000');
  const input=ui.document.getElementById('annualSalaryAmount');input.value='123456';input.dispatchEvent(new ui.window.Event('input'));assert(ui.document.getElementById('confirmAnnualSalary').disabled);
  input.value='350000';input.dispatchEvent(new ui.window.Event('input'));ui.click('#confirmAnnualSalary');assert.equal(ui.run('state.officerSalary'),350000);
  ui.run('showCruise()');assert.deepEqual([...ui.document.getElementById('cruiseMonths').options].map(o=>o.value),['12']);assert.match(ui.document.getElementById('shopDialogBody').textContent,/決算まで/);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('new fiscal year can change again and the final year cannot start a new salary period',()=>{
 let s=march().state;s=E.extension.setSalary(E.next(s),250000);let r;
 for(let t=13;t<=24;t++){r=E.run(s,E.recommend(s),'list','tend',{payment:'cash',noise:1});assert(!r.state.ended);s=t===24?r.state:E.next(r.state);}
 s=E.extension.setSalary(E.next(s),200000);assert.equal(s.expansion.salarySetYear,3);assert.equal(s.officerSalary,200000);
 const ui=startMarch();try{ui.run('state.turn=120;advanceMonth()');assert.equal(ui.run('state.turn'),120);assert(!ui.document.getElementById('annualSalaryDialog').open);}finally{ui.close();}
});
