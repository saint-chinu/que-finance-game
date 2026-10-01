const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');ui.run("const first=E.run(state,choice.quantities,'list','tend',{payment:'cash',noise:1});state=first.state;lastReport=first.report;monthClosed=true;advanceMonth()");return ui;}
function quantities(ui){return ui.run('JSON.stringify(choice.quantities)');}
function expected(ui){return ui.run("JSON.stringify(E.recommend(state,currentAction(),choice.price,choice.payment||'cash'))");}
test('enabling automatic orders immediately calculates and saves this month without purchasing stock',()=>{
 const ui=start();try{
  ui.click('#autoOrder');ui.click('#editPurchase');ui.click('#clearPurchase');const before=ui.run('JSON.stringify(state)');
  ui.click('#autoOrder');assert.equal(quantities(ui),expected(ui));assert(ui.run('choice.quantities.some(q=>q>0)'));
  assert.equal(ui.run('JSON.stringify(state)'),before);assert.equal(JSON.stringify(JSON.parse(ui.window.localStorage.getItem('finance-game-v4')).choice.quantities),expected(ui));
  assert.equal(ui.document.getElementById('purchasePlanTotal').textContent,ui.run('yen(orderCost())'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('automatic orders follow action, selling price, funds and payment changes',()=>{
 const ui=start();try{
  ui.run('state.attraction=2;renderPlanning()');
  const before=quantities(ui);ui.click('#actions [data-value="improve"], #actions [data-value="sales"]');assert.notEqual(quantities(ui),before);assert.equal(quantities(ui),expected(ui));
  ui.click('#editPurchase');ui.click('#prices [data-value="plus10"]');assert.equal(quantities(ui),expected(ui));
  ui.run("state.balances.預金=E.fixedCosts(state)+E.gross(state,E.promotionCost(currentAction()))+100000;renderPlanning()");const cash=quantities(ui);
  ui.click('[data-payment="credit"]');assert.equal(quantities(ui),expected(ui));assert.notEqual(quantities(ui),cash);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('reopening old automatic saves refreshes stale orders but preserves manual and disabled plans',()=>{
 const ui=start();let restored;try{
  const save=JSON.parse(ui.window.localStorage.getItem('finance-game-v4'));delete save.choice.autoOrder;save.choice.quantities.fill(0);save.choice.orderSource='prior';
  restored=bootDOM([['finance-game-v4',JSON.stringify(save)]]);assert.equal(quantities(restored),expected(restored));assert(restored.run('choice.quantities.some(q=>q>0)'));restored.close();restored=null;
  for(const choice of [{...save.choice,orderSource:'manual'},{...save.choice,autoOrder:false}]){
   restored=bootDOM([['finance-game-v4',JSON.stringify({...save,choice})]]);assert(restored.run('choice.quantities.every(q=>q===0)'));restored.close();restored=null;
  }
 }finally{restored?.close();ui.close();}
});
test('manual quantities survive action and bank changes and reload, then return to automatic next month',()=>{
 let ui=start();try{
  ui.click('#editPurchase');ui.click('#clearPurchase');ui.run('setQuantity(0,3)');ui.click('#purchaseDialog footer button');
  ui.click('#actions [data-value="improve"], #actions [data-value="sales"]');ui.click('#bankMenu');ui.click('#confirmBankConsultation');
  assert.equal(ui.run('choice.quantities[0]'),3);assert.equal(ui.run('choice.orderSource'),'manual');assert.match(ui.document.getElementById('autoOrderNote').textContent,/今月は手入力/);
  const save=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',save]]);assert.equal(ui.run('choice.quantities[0]'),3);
  ui.run("const result=E.run(state,choice.quantities,choice.price,currentAction(),{payment:'cash',noise:1});state=result.state;lastReport=result.report;monthClosed=true;advanceMonth()");assert.equal(quantities(ui),expected(ui));assert.equal(ui.run('choice.orderSource'),'recommended');assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('closed month orders are unchanged by automatic settings and existing inventory matches the ledger',()=>{
 const ui=start();try{
  ui.run("const result=E.run(state,choice.quantities,choice.price,currentAction(),{payment:'cash',noise:1});state=result.state;lastReport=result.report;monthClosed=true;renderPlanning()");
  const before=quantities(ui),inventory=ui.run('JSON.stringify(state.inventory)');ui.click('#autoOrder');ui.click('#autoOrder');
  assert.equal(quantities(ui),before);assert.equal(ui.run('JSON.stringify(state.inventory)'),inventory);assert(ui.run('E.assertState(state)'));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
