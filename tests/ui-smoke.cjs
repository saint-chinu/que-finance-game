const assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
let ui=bootDOM();
try {
 ui.click('#skipIntro');
 assert.match(ui.document.getElementById('compactLedger').textContent,/7,064/);
 ui.click('#commit');ui.finishEntries();
 assert(ui.run('state.closed'));assert.equal(ui.run('state.history.length'),1);
 ui.click('#next');assert.equal(ui.run('state.turn'),2);
 const saved=ui.window.localStorage.getItem('finance-game-v4');
 ui.close();ui=bootDOM([['finance-game-v4',saved]]);
 assert.equal(ui.run('state.turn'),2);
 ui.click('#backupMenu');assert.match(ui.document.getElementById('shopDialogBody').textContent,/現在のセーブをダウンロード/);
 ui.run('stageRestore(Backup.encode(captureSave()))');ui.run('confirmRestore()');
 assert.equal(ui.errors.length,1);assert.match(ui.errors[0].message,/navigation/);
 const restored=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',restored]]);
 assert.equal(ui.run('state.turn'),2);assert.equal(ui.run('state.history.length'),1);
 ui.click('#hireStaff');
 assert.match(ui.document.getElementById('shopDialogBody').textContent,/今月|採用/);
 assert.equal(ui.errors.length,0);
 console.log('UI smoke passed: start, month close, next month, reload, backup restore and hiring.');
} finally {ui.close();}
