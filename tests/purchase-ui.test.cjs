const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');return ui;}
test('purchase entry is visible before actions and monthly confirmation stays directly below actions',()=>{
 const ui=start();try{
  const d=ui.document;assert(d.getElementById('purchasePlan'));assert(d.getElementById('purchasePlan').compareDocumentPosition(d.getElementById('actions'))&4);
  assert.equal(d.getElementById('actions').nextElementSibling.id,'commit');assert.match(d.getElementById('purchasePlanStatus').textContent,/入荷済み/);
  ui.click('#editPurchase');assert(d.getElementById('purchaseDialog').open);assert.match(d.querySelector('.purchase-intro').textContent,/追加する数量/);
  assert(d.querySelectorAll('.order-economics').length>0);assert([...d.querySelectorAll('.order-economics')].every(x=>!x.open));
  assert.equal(d.querySelector('button[data-product="0"][data-step="-10"]').disabled,true);ui.click('#purchaseDialog footer button');assert(!d.getElementById('purchaseDialog').open);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('editing quantities updates tax-inclusive totals without buying until month confirmation',()=>{
 const ui=start();try{
  const before=ui.run('JSON.stringify(state)'),initialCash=ui.run('state.balances.預金');ui.click('#editPurchase');
  ui.click('button[data-product="0"][data-step="10"]');assert.equal(ui.run('choice.quantities[0]'),10);
  assert.equal(ui.run('JSON.stringify(state)'),before);assert.equal(ui.document.getElementById('purchasePlanTotal').textContent,ui.run("yen(E.purchaseQuote(state,choice.quantities,'cash').total)"));
  ui.click('#purchaseDialog footer button');assert.equal(ui.run('state.balances.預金'),initialCash);
  ui.click('#commit');ui.finishEntries();assert(ui.run('state.closed'));assert.equal(ui.run('state.history.at(-1).choice.quantities[0]'),10);assert(ui.run('lastReport.spend>0'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('direct input persists, decrement clamps to zero, and recommendation is an explicit replacement',()=>{
 let ui=start();try{
  ui.click('#editPurchase');let input=ui.document.querySelector('input[data-product="0"]');input.value='3';input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));assert.equal(ui.run('choice.quantities[0]'),3);
  ui.click('button[data-product="0"][data-step="-10"]');assert.equal(ui.run('choice.quantities[0]'),0);
  input=ui.document.querySelector('input[data-product="2"]');input.value='2';input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
  const saved=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',saved]]);ui.click('#welcomeStart');assert.equal(ui.run('choice.quantities[2]'),2);
  ui.click('#recommendOrder');assert.equal(ui.run('JSON.stringify(choice.quantities)'),ui.run("JSON.stringify(E.recommend(state,currentAction(),choice.price,'cash'))"));
  assert.match(ui.document.getElementById('purchasePlanStatus').textContent,/追加購入は0/);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('capacity errors are shown beside quantities and can be fixed without losing progress',()=>{
 const ui=start();try{
  ui.click('#editPurchase');const input=ui.document.querySelector('input[data-product="0"]');input.value='100000';input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
  assert(!ui.document.getElementById('purchaseDialogWarning').hidden);assert(ui.document.getElementById('commit').disabled);assert(!ui.run('state.closed'));
  ui.click('#clearPurchase');assert(ui.document.getElementById('purchaseDialogWarning').hidden);assert(!ui.document.getElementById('commit').disabled);
  ui.click('#purchaseDialog footer button');ui.click('#commit');ui.finishEntries();assert(ui.document.getElementById('editPurchase').disabled);assert(ui.document.getElementById('recommendOrder').disabled);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('typing updates the amount and saved quantity before blur without replacing the input',()=>{
 const ui=start();try{
  ui.click('#editPurchase');const input=ui.document.querySelector('input[data-product="0"]');input.focus();input.value='3';input.dispatchEvent(new ui.window.Event('input',{bubbles:true}));
  assert.equal(ui.document.activeElement,input);assert.equal(ui.document.querySelector('input[data-product="0"]'),input);
  assert.equal(ui.run('choice.quantities[0]'),3);assert.equal(JSON.parse(ui.window.localStorage.getItem('finance-game-v4')).choice.quantities[0],3);
  assert.equal(ui.document.getElementById('purchasePlanTotal').textContent,'1,067円');assert.match(input.closest('.product-order').textContent,/支払予定：1,067円/);assert(!ui.run('state.closed'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});

test('payment buttons default to cash, credit explains once, persists, and pays next month',()=>{
 let ui=start();try{
  ui.click('#editPurchase');assert.equal(ui.document.querySelector('[data-payment="cash"]').getAttribute('aria-pressed'),'true');
  ui.click('button[data-product="0"][data-step="10"]');ui.click('[data-payment="credit"]');assert.equal(ui.run('choice.payment'),'credit');assert(!ui.document.getElementById('creditQueHint').hidden);assert.match(ui.document.getElementById('purchasePaymentInfo').textContent,/翌月/);
  assert.equal(ui.document.getElementById('purchasePlanTotal').textContent,'3,630円');ui.click('#dismissCreditHint');
  ui.click('[data-payment="cash"]');ui.click('[data-payment="credit"]');assert(ui.document.getElementById('creditQueHint').hidden);
  const save=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',save]]);ui.click('#welcomeStart');ui.click('#editPurchase');assert.equal(ui.run('choice.payment'),'credit');ui.click('[data-payment="credit"]');assert(ui.document.getElementById('creditQueHint').hidden);
  ui.click('#purchaseDialog footer button');ui.click('#commit');ui.finishEntries();assert.equal(ui.run('state.balances.買掛金'),3630);
  assert(ui.document.querySelector('[data-payment="cash"]').disabled);ui.click('#commit');assert.match(ui.document.getElementById('cashPlan').textContent,/3,630円/);
  ui.click('#editPurchase');ui.click('[data-payment="cash"]');ui.click('#clearPurchase');ui.click('#purchaseDialog footer button');ui.click('#commit');ui.finishEntries();assert.equal(ui.run('state.balances.買掛金'),0);assert.equal(ui.run('lastReport.payablePaid'),3630);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
