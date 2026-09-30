const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),{boot}=require('./helpers/ui.cjs');

test('full assortment prevents stock-related decay but age amplifies prolonged neglect after year two',()=>{
 const losses=[];
 for(const turn of [1,13,25,61,109]){
  const s=E.createState();s.turn=turn;
  const {report}=E.run(s,E.PRODUCTS.map(()=>0),'list','hire',{noise:1});
  assert.equal(report.assortment.ratio,1);assert.equal(report.naturalLoss,0);
  losses.push(report.growth.neglectLoss);
 }
 assert.equal(losses[0],0);assert.equal(losses[1],0);
 assert(losses[2]>0&&losses[3]>losses[2]&&losses[4]>losses[3]);
 const kept=E.createState();kept.turn=61;kept.growth.lastEffortTurn=58;
 assert.equal(E.growthStatus(kept).neglectRate,0);
});

test('loyalty needs mature past effort and stocked selling months; present effort does not instantly mature it',()=>{
 const s=E.createState();s.turn=25;s.growth.lastEffortTurn=22;
 const healthy={ratio:1};
 let r=E.advanceGrowth(s,'improve','list',700,[100],healthy,0);
 assert.equal(r.loyaltyGain,0);assert.equal(s.growth.loyalty,0);
 r=E.advanceGrowth(s,'tend','list',700,[100],healthy,.03);
 assert(r.loyaltyGain>0);assert(s.growth.loyalty>0);
 const before=s.growth.loyalty;r=E.advanceGrowth(s,'tend','list',700,[100],{ratio:.4},.03);
 assert.equal(r.loyaltyGain,0);assert(s.growth.loyalty<before);
 const shortageLoss=r.loyaltyLoss;
 r=E.advanceGrowth(s,'tend','list',700,[100],{ratio:.7},.03);
 assert(r.loyaltyLoss>0&&r.loyaltyLoss<shortageLoss);
});

test('loyalty steadies random demand and raises purchase mix while keeping posted prices and forecast accounting consistent',()=>{
 const s=E.createState();s.turn=49;s.growth={loyalty:.8,lastEffortTurn:47,startedTurn:1};
 assert(E.growthStatus(s).noiseRange<.1);
 assert(E.basketFactor(s,E.PRODUCTS[2])>E.basketFactor(s,E.PRODUCTS[0]));
 const q=E.recommend(s),snapshot=JSON.stringify(s),f=E.forecast(s,q,'list','tend'),r=E.run(s,q,'list','tend',{noise:1});
 assert.deepEqual(f.products,r.report.productResults);assert.equal(JSON.stringify(s),snapshot);
 assert.equal(r.report.productResults[2].unitPrice,30000);
 assert.equal(r.report.productResults[4].unitPrice,50000);
 assert.equal(r.report.opening+r.report.inflow-r.report.outflow,r.state.balances.預金);E.assertState(r.state);
});

test('tax audit records findings without inventing extra tax, duplicates or retroactive cash movements',()=>{
 let s=E.createState();s.turn=30;s.payInterest=false;
 s.balances.預金-=300000;s.balances.役員貸付金=300000;
 s.balances.未収利息=3000;s.balances.受取利息=3000;
 const balances=structuredClone(s.balances),rng=s.rng,a=E.taxAuditEvent(s);
 assert.equal(a.unpaidInterest,3000);assert.equal(a.additionalTax,0);assert.equal(E.taxAuditEvent(s),null);
 assert.deepEqual(s.balances,balances);assert.equal(s.rng,rng);
 s=E.reviewTaxAudit(s,30,true);assert.equal(s.payInterest,true);assert.equal(s.taxAudits[0].followup,true);
 assert.deepEqual(s.balances,balances);E.assertState(s);
 const restored=E.migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.taxAudits,s.taxAudits);assert.deepEqual(restored.growth,s.growth);
 s.turn=42;s.history=Array.from({length:5},(_,i)=>({turn:37+i,balances:{未収利息:3000}}));
 assert.match(E.taxAuditEvent(s).reason,/役員貸付利息/);
 delete s.growth;delete s.taxAudits;
 const legacy=E.migrate(s);assert.equal(E.growthStatus(legacy).neglectRate,0);
 assert.equal(legacy.growth.startedTurn,42);
});

test('equipment banker explains the requested cash flow and tax findings can be reopened after reload',()=>{
 let app=boot();app.run('skipIntro()');
 app.run("currentBankAssessment=()=>({score:90,grade:'A',eligible:true,rate:2,years:10,capacity:500000,workingNeed:1000000,short:{balance:0,available:1000000},equipment:{balance:0,available:5000000}});bankPurpose='freezer';requestBankLoan(500000)");
 assert.match(app.get('shopDialogBody').innerHTML,/キャッシュフロー/);
 assert.match(app.get('shopDialogBody').innerHTML,/▲1,150,000円/);
 assert.match(app.get('shopDialogBody').innerHTML,/経常利益＋減価償却費/);
 app.run('state.turn=30;E.taxAuditEvent(state);openStatements()');
 assert.match(app.get('shopDialogBody').innerHTML,/税務署から帳簿/);
 assert.equal(app.run('state.taxAudits[0].notified'),true);
 const storage=app.storage;app=boot(storage);app.run('showTaxAudit(30)');
 assert.match(app.get('shopDialogTitle').textContent,/第3期 9月/);
 assert.equal(app.run('state.taxAudits.length'),1);
});
