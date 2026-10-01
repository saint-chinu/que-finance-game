const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');return ui;}
test('bank consultation closes the menu before its capture handler opens another screen',()=>{
 const ui=start();try{
  const menu=ui.document.querySelector('.command-menu');menu.open=true;ui.click('#bankMenu');
  assert.equal(menu.open,false,'The management menu must close even when bank navigation stops propagation');
  assert(ui.document.getElementById('shopDialog').open);
  ui.click('#viewBankAssessment');assert(ui.document.getElementById('report').classList.contains('show'));assert.equal(menu.open,false);
  ui.click('#closeReport');assert.equal(ui.document.getElementById('report').classList.contains('show'),false);
  menu.open=true;ui.click('#bankMenu');ui.click('#confirmBankConsultation');
  assert.equal(ui.run('state.bankConsultedTurn'),ui.run('state.turn'));assert.equal(menu.open,false);
  ui.click('#closeReport');menu.open=true;ui.click('#bankMenu');
  assert(ui.document.getElementById('report').classList.contains('show'));assert.equal(menu.open,false);
  ui.click('#closeReport');assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('regular commands still run when the menu closes before dispatch',()=>{
 const ui=start();try{
  const menu=ui.document.querySelector('.command-menu');menu.open=true;ui.click('#statementsMenu');
  assert.equal(menu.open,false);assert(ui.document.getElementById('report').classList.contains('show'));ui.click('#closeReport');
  menu.open=true;ui.click('#welcomeMenu');assert.equal(menu.open,false);assert(ui.document.getElementById('welcomeDialog').open);ui.click('#welcomeStart');
  assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
