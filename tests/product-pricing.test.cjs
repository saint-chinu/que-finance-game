const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),R=require('../dist/js/replay.js');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');return ui;}
test('individual prices change revenue and demand only for the selected product, including rods',()=>{
 const s=E.createState(),q=E.PRODUCTS.map(()=>0),base=E.run(s,q,'list','tend',{noise:1,payment:'cash'});
 const priced=E.setProductPrice(s,0,605),r=E.run(priced,q,'list','tend',{noise:1,payment:'cash'});
 assert.equal(s.productPrices,undefined);assert.deepEqual(priced.balances,s.balances);assert.deepEqual(priced.inventory,s.inventory);
 assert.equal(r.report.productResults[0].unitPrice,605);assert.equal(r.report.productResults[0].sales,r.report.productResults[0].quantity*605);assert(r.report.productResults[0].quantity<base.report.productResults[0].quantity);
 for(let i=1;i<E.PRODUCTS.length;i++){assert.equal(r.report.productResults[i].unitPrice,base.report.productResults[i].unitPrice);assert.equal(r.report.productResults[i].quantity,base.report.productResults[i].quantity);}
 assert(E.assertState(r.state));assert.equal(E.run(E.setProductPrice(s,2,33000),q,'list','tend',{noise:1}).report.productResults[2].unitPrice,33000);
});
test('individual prices persist next month, override bulk changes, and reset to legacy pricing',()=>{
 let s=E.setProductPrice(E.createState(),0,600);assert.equal(E.sellingTerms(s,0,'sale').unitPrice,600);assert.equal(E.sellingTerms(s,1,'sale').unitPrice,440);
 s=E.next(E.run(s,E.recommend(s,'tend','sale','cash'),'sale','tend',{noise:1,payment:'cash'}).state);assert.equal(E.sellingTerms(s,0).unitPrice,600);
 s=E.setProductPrice(s,0,null);assert.equal(s.productPrices,undefined);assert.equal(E.sellingTerms(s,0,'plus10').unitPrice,605);
});
test('price bounds, locked months, unavailable products and malformed saves are rejected',()=>{
 const s=E.createState();for(const bad of [0,-1,274,1101,550.5,NaN,Infinity,'600',undefined])assert.throws(()=>E.setProductPrice(s,0,bad));
 for(const i of [-1,8,1.5,5,7])assert.throws(()=>E.setProductPrice(s,i,550));
 assert.throws(()=>E.setProductPrice({...s,closed:true},0,600));assert.throws(()=>E.setProductPrice({...s,ended:true},0,600));
 for(const bad of [{0:600},[],[600],Array(8),E.PRODUCTS.map(()=>0)])assert.throws(()=>E.assertState({...s,productPrices:bad}));
 for(const price of [275,1100])assert(E.assertState(E.setProductPrice(s,0,price)));
 assert.throws(()=>R.apply(s,{op:'productPrice',args:[0,600,999]}));
});
test('forecasts and recommended replenishment use the individual selling price',()=>{
 let s=E.next(E.run(E.createState(),E.PRODUCTS.map(()=>0),'list','tend',{noise:1,payment:'cash'}).state);
 const prior=E.recommend(s,'tend','list','cash');s=E.setProductPrice(s,0,605);const q=E.recommend(s,'tend','list','cash');assert(q[0]<prior[0]);
 const forecast=E.forecast(s,q,'list','tend','cash'),actual=E.run(s,q,'list','tend',{noise:1,payment:'cash'});assert.equal(forecast.expected,actual.state.balances.預金);assert.deepEqual(forecast.products,actual.report.productResults);
});
test('inventory icon opens price editor; save persists in backups and reload without spending or consuming the action',()=>{
 let ui=start();try{
  const money=ui.run('JSON.stringify(state.balances)'),stock=ui.run('JSON.stringify(state.inventory)');ui.click('[data-stock="0"]');assert(ui.document.getElementById('productPriceForm'));assert.equal(ui.document.getElementById('productSalePrice').value,'550');
  ui.click('[data-product-price-preset="605"]');assert.equal(ui.document.getElementById('productSalePrice').value,'605');ui.click('#productPriceForm [type="submit"]');
  assert.equal(ui.run('state.productPrices[0]'),605);assert.equal(ui.run('JSON.stringify(state.balances)'),money);assert.equal(ui.run('JSON.stringify(state.inventory)'),stock);assert.equal(ui.run('state.actionLocked'),null);
  assert.match(ui.document.querySelector('[data-stock="0"] .inventory-price').textContent,/605円/);assert.match(ui.document.querySelector('[data-stock="1"] .inventory-price').textContent,/550円/);
  const backup=ui.run('ShopBackup.encode(captureSave())');assert.equal(ui.run('ShopBackup.decode('+JSON.stringify(backup)+').state.productPrices[0]'),605);
  const save=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',save]]);ui.click('#welcomeStart');ui.click('[data-stock="0"]');assert.equal(ui.document.getElementById('productSalePrice').value,'605');
  ui.click('#resetProductPrice');assert.equal(ui.run('state.productPrices'),undefined);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('invalid drafts do not save; unavailable and closed stock details cannot change prices',()=>{
 const ui=start();try{
  ui.click('[data-stock="0"]');const input=ui.document.getElementById('productSalePrice');input.value='-1';ui.click('#productPriceForm [type="submit"]');assert.equal(ui.run('state.productPrices'),undefined);assert(ui.document.getElementById('shopDialog').open);
  ui.click('#closeShopDialog');ui.click('[data-stock="5"]');assert.equal(ui.document.getElementById('productPriceForm'),null);ui.click('#closeShopDialog');
  ui.click('#commit');ui.finishEntries();ui.run('closeStatements()');ui.click('[data-stock="0"]');assert(ui.document.querySelector('#productPriceForm fieldset').disabled);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('recorded individual prices replay on server through month close and persist after next month',()=>{
 const ui=start();try{
  ui.run("state=ShopReplay.create(42);state.replay={id:'12345678-1234-1234-1234-123456789012',seed:42,scenario:'2026-10',engine:ShopReplay.VERSION,ops:[]};renderPlanning()");
  ui.click('[data-stock="0"]');ui.click('[data-product-price-preset="605"]');ui.click('#productPriceForm [type="submit"]');
  ui.run("state=E.run(state,choice.quantities,choice.price,currentAction(),{payment:'cash'}).state;state=E.next(state)");
  const ops=JSON.parse(ui.run('JSON.stringify(state.replay.ops)'));assert.deepEqual(ops[0],{op:'productPrice',args:[0,605]});let server=R.create(42);for(const op of ops)server=R.apply(server,op).state;
  assert.deepEqual(server.balances,JSON.parse(ui.run('JSON.stringify(state.balances)')));assert.equal(server.productPrices[0],605);assert(E.assertState(server));assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
