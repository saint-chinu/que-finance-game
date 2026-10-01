const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),R=require('../dist/js/replay.js'),B=require('../dist/js/backup.js');
const q=(i,n)=>E.PRODUCTS.map((p,j)=>j===i?n:0),zero=q(0,0);
test('cash discount includes correct VAT and actual FIFO costs, without changing opening inventory',()=>{
 const s=E.createState(),before=E.inventoryValue(s,0),quantities=q(0,3),quote=E.purchaseQuote(s,quantities,'cash');
 assert.deepEqual(quote,{net:970,tax:97,total:1067,discount:20,cash:1067});
 const r=E.run(s,quantities,'list','tend',{payment:'cash',noise:1});
 assert.equal(r.report.spend,1067);assert.equal(r.state.balances.買掛金,0);
 assert.equal(E.inventoryValue(r.state,0)+r.report.productResults[0].cost,before+970);assert(E.assertState(r.state));
 // Discounted lots must retain their cost through partial sales and manual disposal.
 const n=E.createState();const cost=E.take(n,0,n.inventory[0]);E.entry(n,'商品廃棄損','商品',cost,'test');E.add(n,0,3,n.turn,970);E.entry(n,'商品','預金',970,'test');
 assert.equal(E.take(n,0,1),323);E.entry(n,'商品廃棄損','商品',323,'test');assert.equal(E.inventoryValue(n,0),647);
 const disposed=E.extension.disposeStock(n,0,1);assert.equal(E.inventoryValue(disposed,0),324);assert(E.assertState(disposed));
});
test('credit is received now, paid once next month, and switching to cash does not lose the debt',()=>{
 const s=E.createState(),r=E.run(s,q(0,10),'list','tend',{payment:'credit',noise:1});
 assert.equal(r.report.spend,0);assert.equal(r.state.balances.買掛金,3630);assert.deepEqual(r.state.payables,[{due:2,amount:3630}]);
 assert.equal(r.report.entries.filter(e=>e.type==='purchaseCredit')[0].credit,'買掛金');
 const n=E.next(r.state);assert.equal(E.scheduled(n).payables,3630);
 const f=E.forecast(n,q(0,3),'list','tend','cash'),paid=E.run(n,q(0,3),'list','tend',{payment:'cash',noise:1});
 assert.equal(paid.report.payablePaid,3630);assert.equal(paid.state.balances.買掛金,0);assert.equal(paid.state.payables.length,0);assert.equal(paid.state.balances.預金,f.expected);
 assert.equal(paid.report.opening+paid.report.inflow-paid.report.outflow,paid.state.balances.預金);
 const third=E.run(E.next(paid.state),zero,'list','tend',{payment:'credit'});assert.equal(third.report.payablePaid,0);assert(E.assertState(third.state));
});
test('credit bypasses upfront payment only, not capacity or end of month insolvency',()=>{
 const s=E.createState();E.entry(s,'役員報酬','預金',s.balances.預金-1,'test');
 assert.match(E.validation(s,q(0,10),'tend','cash'),/預金/);assert.equal(E.validation(s,q(0,10),'tend','credit'),'');
 assert.match(E.validation(s,q(0,100000),'tend','credit'),/上限/);assert.match(E.validation(s,zero,'tend','invalid'),/支払/);
 const r=E.run(s,q(0,10),'list','hire',{payment:'credit'});assert(r.state.ended);assert.equal(r.state.balances.買掛金,3630);
});
test('legacy replay remains full price and new replay validates and records payment without accepting noise',()=>{
 let s=R.create(42),old=R.apply(s,{op:'run',args:[q(0,10),'list','tend']});assert.equal(old.report.spend,3630);
 const command={op:'run',args:[q(0,10),'list','tend',{payment:'cash'}]},r=R.apply(s,command);assert.equal(r.report.spend,3557);
 assert.throws(()=>R.apply(s,{op:'run',args:[zero,'list','tend',{payment:'cash',noise:10}]}));
 assert.throws(()=>R.apply(s,{op:'run',args:[zero,'list','tend',{payment:'legacy'}]}));
 const direct=E.run(s,q(0,10),'list','tend',{payment:'cash'});assert.deepEqual(r.state.balances,direct.state.balances);
});
test('mixed payment choices balance over year ends, spoilage, and saves',()=>{
 let s=E.createState();for(let t=1;t<=25;t++){
 const payment=t%2?'cash':'credit',quantities=E.recommend(s,'tend','list',payment),r=E.run(s,quantities,'list','tend',{payment});s=r.state;
 assert(E.assertState(s));assert.equal(r.report.opening+r.report.inflow-r.report.outflow,s.balances.預金);
 const save={version:7,state:s,choice:{quantities,price:'list',action:'tend',payment,creditExplained:true},seen:[],introComplete:true,lastReport:r.report};
 const loaded=B.decode(B.encode(save));assert.deepEqual(loaded.state.payables,s.payables);
 if(s.payables.length){const bad=structuredClone(save);bad.state.payables[0].amount++;assert.throws(()=>B.validate(bad));}
 if(s.ended)break;s=E.next(s);
 }
 assert(s.turn>=13,'exercise fiscal year boundary');
});
test('old saves without payable or lot cost fields migrate safely',()=>{
 const s=E.createState();delete s.payables;delete s.balances.買掛金;s.lots.forEach(lots=>lots.forEach(l=>delete l.amount));E.migrate(s);assert(E.assertState(s));assert.deepEqual(s.payables,[]);
});

test('discounted perishables expire at their actual remaining cost',()=>{
 let s=E.createState();const r=E.run(s,q(1,20),'list','hire',{payment:'cash',noise:1});s=r.state;
 for(let t=2;t<=6;t++)s=E.run(E.next(s),zero,'list','hire',{payment:'cash',noise:1}).state;
 const remaining=E.inventoryValue(s,1),next=E.next(s);assert.equal(next.inventory[1],0);assert.equal(next.pendingEntries.filter(e=>e.type==='waste.bait').reduce((v,e)=>v+e.amount,0),remaining);assert(E.assertState(next));
});
test('new payment operations are recorded and replayed through the same server engine',()=>{
 const {bootDOM}=require('./helpers/dom.cjs'),ui=bootDOM();try{
  ui.click('#welcomeStart');ui.click('#skipIntro');
  ui.run("state=ShopReplay.create(42);state.replay={id:'12345678-1234-1234-1234-123456789012',seed:42,scenario:'2026-10',engine:ShopReplay.VERSION,ops:[]};choice.quantities=E.PRODUCTS.map((p,i)=>i===0?10:0);choice.payment='credit';renderPlanning();");
  ui.click('#commit');ui.finishEntries();const command=JSON.parse(ui.run('JSON.stringify(state.replay.ops.at(-1))'));
  assert.deepEqual(command,{op:'run',args:[q(0,10),'list','tend',{payment:'credit'}]});
  assert.deepEqual(R.apply(R.create(42),command).state.balances,JSON.parse(ui.run('JSON.stringify(state.balances)')));
 }finally{ui.close();}
});

test('cruise replays the selected payment method instead of silently using legacy cash',()=>{
 for(const payment of ['cash','credit']){
 const s=R.create(42),quantities=q(0,10),command={op:'cruise',args:[quantities,'list',12,payment]};
 const direct=E.extension.cruise(s,quantities,'list',12,payment),replayed=R.apply(s,command);
 assert.deepEqual(replayed.state.balances,direct.state.balances);assert.equal(replayed.report.payment,payment);assert.deepEqual(replayed.state.payables,direct.state.payables);
 }
});
