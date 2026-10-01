const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
for(const amount of [200000,250000,300000])test('starting salary '+amount+' flows into payroll, personal cash, and saves',()=>{
 let ui=bootDOM();try{
  assert.equal(ui.document.querySelector('#welcomeSalary input:checked').value,'300000');
  ui.click(`#welcomeSalary input[value="${amount}"]`);ui.click('#welcomeStart');assert.equal(ui.run('state.officerSalary'),amount);
  assert.equal(ui.run('state.expansion.salarySetYear'),1);ui.click('#skipIntro');
  const save=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',save]]);
  assert(ui.document.getElementById('welcomeSalary').hidden);ui.click('#welcomeStart');assert.equal(ui.run('state.officerSalary'),amount);
  ui.click('#welcomeMenu');assert(ui.document.getElementById('welcomeSalary').hidden);ui.click('#welcomeStart');assert.equal(ui.run('state.officerSalary'),amount);
  ui.click('#commit');ui.finishEntries();assert.equal(ui.run('state.balances.役員報酬'),amount);
  assert.equal(ui.run("lastReport.entries.find(e=>e.type==='officerSocial').amount"),amount*.15);
  assert.equal(ui.run('state.owner'),Math.max(0,amount*.8-200000));assert.equal(ui.run('state.balances.役員貸付金'),Math.max(0,200000-amount*.8));
  assert(ui.run('E.assertState(state)'));assert(ui.run('!!ShopBackup.validate(captureSave())'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('salary survives the complete opening explanation and Escape cannot skip selection',()=>{
 const ui=bootDOM();try{
  const event=new ui.window.Event('cancel',{cancelable:true});ui.document.getElementById('welcomeDialog').dispatchEvent(event);assert(event.defaultPrevented);
  ui.click('#welcomeSalary input[value="250000"]');ui.click('#welcomeStart');
  for(let i=0;i<10&&!ui.run('introComplete');i++)ui.click('#introNext');
  assert(ui.run('introComplete'));assert.equal(ui.run('state.officerSalary'),250000);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('ranked start records the selected salary using the existing replay command',async()=>{
 const ui=bootDOM();try{
  ui.click('#welcomeStart');ui.click('#skipIntro');
  ui.run("rankScenario={scenario:'2026-10'};openShop('test',startingSalaryOptions('rankStartingSalary'));rankRequest=async(path)=>path==='/api/start'?{id:'12345678-1234-1234-1234-123456789012',seed:42,scenario:'2026-10',engine:Ranked.VERSION}:{revision:path.endsWith('/step')?1:0};");
  ui.click('#rankStartingSalary input[value="200000"]');await ui.run('startRanked()');
  assert.equal(ui.run('state.officerSalary'),200000);assert.deepEqual(JSON.parse(ui.run('JSON.stringify(state.replay.ops[0])')),{op:'salary',args:[200000]});
  assert.equal(ui.run('Ranked.apply(Ranked.create(42),state.replay.ops[0]).state.officerSalary'),200000);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
