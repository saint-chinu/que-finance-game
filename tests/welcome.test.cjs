const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
test('new game starts with instructions and visible disclaimer before the prologue',()=>{
 const ui=bootDOM();try{
  const dialog=ui.document.getElementById('welcomeDialog');assert(dialog.open);
  assert.equal(ui.document.activeElement.id,'welcomeTitle');
  assert.match(dialog.textContent,/税務アドバイスではありません/);assert.match(dialog.textContent,/実際の制度・取引とは異なります/);
  assert.match(dialog.textContent,/製作者は責任を負いません/);assert.match(dialog.textContent,/法令により免責が認められない/);
  assert.equal(ui.document.querySelectorAll('.welcome-steps li').length,3);
  assert.match(ui.document.getElementById('welcomeStart').textContent,/ゲームを始める/);
  ui.click('#welcomeStart');assert(!dialog.open);assert(!ui.run('introComplete'));
  ui.click('#skipIntro');assert(ui.run('introComplete'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('continue preserves saved progress and guide is reachable without changing finances',()=>{
 let ui=bootDOM();try{
  ui.click('#welcomeStart');ui.click('#skipIntro');ui.click('#commit');ui.finishEntries();ui.click('#next');
  const saved=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',saved]]);
  assert.match(ui.document.getElementById('welcomeStart').textContent,/続きから遊ぶ/);assert.equal(ui.run('state.turn'),2);
  const before=ui.run('JSON.stringify(state)');ui.click('#welcomeStart');assert.equal(ui.run('JSON.stringify(state)'),before);
  for(const selector of ['#welcomeMenu','#welcomeFooter']){
   ui.click(selector);assert(ui.document.getElementById('welcomeDialog').open);assert.equal(ui.document.getElementById('welcomeStart').textContent,'ゲームに戻る');ui.click('#welcomeStart');
   assert.equal(ui.run('JSON.stringify(state)'),before);assert.equal(ui.window.localStorage.getItem('finance-game-v4'),saved);
  }
  assert(ui.document.querySelector('#welcomeDialog [data-sound-toggle]'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
