const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),{boot}=require('./helpers/ui.cjs');
// These tests use the sponsorship action to model a month the owner is away; make every month an offer month.
E.sponsorEvent=()=>true;
const zero=()=>E.PRODUCTS.map(()=>0);
function isolatedStock(quantities){const s=E.createState(),before=s.balances.商品;s.inventory=quantities;s.lots=quantities.map(quantity=>quantity?[{turn:1,quantity}]:[]);s.balances.商品=E.cost(quantities);s.balances.預金+=before-s.balances.商品;s.opening={...s.balances};E.assertState(s);return s;}
test('a rod and a consumable in the same card checkout book net sales, output VAT and full gross receivable',()=>{
 const s=isolatedStock([1,0,1,0,0,0,0,0]),r=E.run(s,zero(),'list','tend',{noise:1});
 assert.equal(r.report.cardSales,33605);assert.equal(r.report.cashSales,0);assert.equal(r.state.receivables[0].amount,33605);assert.equal(r.state.receivables[0].due,3);
 const entries=r.report.entries;assert.equal(entries.filter(e=>e.credit==='売上高').reduce((n,e)=>n+e.amount,0),30550);
 assert.equal(entries.filter(e=>e.credit==='仮受消費税等').reduce((n,e)=>n+e.amount,0),3055);
 assert(entries.some(e=>e.bundled&&e.debit==='売掛金'&&e.amount===550));
 assert.equal(r.report.productResults[0].cardQuantity,1);E.assertState(r.state);
});
test('consumable-only sales remain cash and payment splitting never duplicates sales, VAT or cost',()=>{
 const noDurables=isolatedStock([10,10,0,10,0,0,0,0]),cash=E.run(noDurables,zero(),'list','tend',{noise:1});assert.equal(cash.report.cardSales,0);
 for(const price of ['list','plus10','minus10','sale']){
  const r=E.run(E.createState(),zero(),price,'tend',{noise:1}),p=r.report.productResults;
  for(const x of p){assert.equal(x.cardNet+x.cashNet,x.sales);assert.equal(x.cardTax+x.cashTax,E.vat(x.sales));assert(x.cardQuantity<=x.quantity);}
  assert.equal(r.report.cardSales+r.report.cashSales,p.reduce((n,x)=>n+E.gross(r.state,x.sales),0));
  assert.equal(r.report.opening+r.report.inflow-r.report.outflow,r.state.balances.預金);E.assertState(r.state);
 }
});
test('bundled card receipts arrive two months later with no repeat sale or output VAT',()=>{
 let s=isolatedStock([1,0,1,0,0,0,0,0]);const first=E.run(s,zero(),'list','tend',{noise:1});s=E.next(first.state);
 const second=E.run(s,zero(),'list','sales',{noise:1});assert.equal(second.report.collected,0);s=E.next(second.state);
 const third=E.run(s,zero(),'list','sales',{noise:1});assert.equal(third.report.collected,33605);
 assert(!third.report.entries.some(e=>e.credit==='売上高'||e.credit==='仮受消費税等'));
 assert(third.report.entries.some(e=>e.debit==='預金'&&e.credit==='売掛金'&&e.amount===33605));
});
test('corporate and consumption tax payments reduce cash and liabilities, not profit again; explanations repeat on payment months',()=>{
 let s=E.createState();for(let t=1;t<14;t++){const action=[8,11].includes(t)?'improve':'tend';s=E.next(E.run(s,E.recommend(s,action),'list',action,{noise:1}).state);}
 const delayed=structuredClone(s);for(const d of [...delayed.taxes,...delayed.vatDue])if(d.due===14)d.due=15;
 const q=E.recommend(s),paid=E.run(s,q,'list','tend',{noise:1}),later=E.run(delayed,q,'list','tend',{noise:1});
 assert.equal(paid.report.tax.paid,70000);assert(paid.report.consumption.paid>0);assert.equal(paid.report.monthProfit,later.report.monthProfit);
 assert.equal(later.state.balances.預金-paid.state.balances.預金,paid.report.tax.paid+paid.report.consumption.paid);
 const app=boot();app.run('skipIntro();state='+JSON.stringify(paid.state)+';statementReport='+JSON.stringify(paid.report)+';renderTutorialReport()');
 const html=app.get('tutorialReport').innerHTML;assert.match(html,/法人税等を納付/);assert.match(html,/消費税を納付/);assert.match(html,/費用を出さへん/);assert.match(html,/未払消費税等/);
 app.run('seenEntries=new Set(state.entries.map(entryKey));renderTutorialReport()');assert.match(app.get('tutorialReport').innerHTML,/今月の納税・還付/);
});
test('first sales scene, tax-payment replay and guide explain card bundles and distinguish interim VAT',()=>{
 const app=boot();app.run('skipIntro();closeMonth();');
 const sale=app.run("transactionAccountingLesson(lastReport.entries.filter(e=>['saleCash','saleCard','vatOutput','costOfSales'].includes(e.type)),state.balances)");
 assert.match(sale,/33,605円/);assert.match(sale,/仮受消費税等3,055円/);assert.match(sale,/同じカード会計/);
 const interim=app.run("transactionAccountingLesson([{type:'vatPay',debit:'仮払消費税中間納付',credit:'預金',amount:50000}],state.balances)");
 assert.match(interim,/仕入の仮払消費税等とは別/);assert.match(interim,/先に納めた税金/);
 app.run('renderAccountingGuide(null)');assert.match(app.get('accountingBasicsBody').innerHTML,/法人税を払うとき/);
});
