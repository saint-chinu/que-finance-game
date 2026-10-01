const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
function existingGame(){let ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');ui.click('#commit');ui.finishEntries();ui.click('#next');const saved=ui.window.localStorage.getItem('finance-game-v4');ui.close();return {ui:bootDOM([['finance-game-v4',saved],['que-finance-audio-v1','{"enabled":false,"volume":35}'],['other-data','keep']]),saved};}
test('start screen offers restart, and cancel keeps the existing game unchanged',()=>{
 const {ui,saved}=existingGame();try{
  assert.equal(ui.document.getElementById('welcomeNewGame').hidden,false);ui.click('#welcomeNewGame');
  assert(ui.document.getElementById('shopDialog').open);assert.match(ui.document.getElementById('shopDialogBody').textContent,/１世代/);
  ui.click('#cancelNewGame');assert(ui.document.getElementById('welcomeDialog').open);assert(!ui.document.getElementById('shopDialog').open);
  assert.equal(ui.run('state.turn'),2);assert.equal(ui.window.localStorage.getItem('finance-game-v4'),saved);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('confirmed restart preserves a recoverable save and settings, then boots into a new prologue',()=>{
 const {ui,saved}=existingGame();let fresh;try{
  ui.click('#welcomeNewGame');ui.document.getElementById('confirmNewGame').click();
  assert.equal(ui.errors.length,1);assert.match(ui.errors[0].message,/navigation/);
  assert.equal(ui.window.localStorage.getItem('finance-game-v4'),null);
  assert.equal(ui.window.localStorage.getItem('finance-game-v4-before-restore'),saved);
  ui.run('saveGame()');assert.equal(ui.window.localStorage.getItem('finance-game-v4'),null,'Late saves cannot resurrect old progress');
  assert.equal(ui.window.localStorage.getItem('other-data'),'keep');assert.equal(JSON.parse(ui.window.localStorage.getItem('que-finance-audio-v1')).volume,35);
  const storage=Array.from({length:ui.window.localStorage.length},(_,i)=>{const k=ui.window.localStorage.key(i);return [k,ui.window.localStorage.getItem(k)];});fresh=bootDOM(storage);
  assert(!fresh.run('introComplete'));assert.equal(fresh.document.getElementById('welcomeNewGame').hidden,true);fresh.click('#welcomeStart');assert(!fresh.document.getElementById('intro').classList.contains('hidden'));
  fresh.click('#skipIntro');assert.equal(fresh.run('state.turn'),1);assert.equal(fresh.run('state.history.length'),0);fresh.click('#backupMenu');assert(fresh.document.getElementById('downloadRollback'));assert.equal(fresh.errors.length,0);
 }finally{ui.close();fresh?.close();}
});
test('menu restart uses the same confirmation and storage failure never erases the game',()=>{
 const {ui,saved}=existingGame();try{
  ui.click('#welcomeStart');ui.click('#newGame');
  ui.window.Storage.prototype.setItem=function(){throw new Error('quota');};ui.click('#confirmNewGame');
  assert.match(ui.document.getElementById('newGameError').textContent,/中止/);assert.equal(ui.window.localStorage.getItem('finance-game-v4'),saved);
  assert(ui.run('introComplete'));assert.equal(ui.run('state.turn'),2);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
