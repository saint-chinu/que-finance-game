const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./helpers/ui.cjs');


test('April B/S and trial balance compare the same March closing balance',()=>{
  const {run}=boot();run('skipIntro()');
  for(let i=0;i<12;i++)run('state=E.run(state,E.PRODUCTS.map(()=>0),"list","tend").state;state=E.next(state)');
  run('lastReport=E.run(state,E.PRODUCTS.map(()=>0),"list","tend").report');
  const [bs,tb]=run('[renderBS(lastReport),rowsForTB(lastReport)]');
  const profit=/当期損益<\/button><\/th><td>([^<]+)<\/td><td[^>]*>([^<]+)/;
  assert.deepEqual(bs.match(profit)?.slice(1),tb.match(profit)?.slice(1));
  assert.match(bs,/前月末比/);
});

test('annual statement switches its title, period and cash to the selected March',()=>{
  const {run,get}=boot();run('skipIntro()');
  for(let i=0;i<13;i++)run('state=E.run(state,E.PRODUCTS.map(()=>0),"list","tend").state;lastReport={turn:state.turn};state=E.next(state)');
  run('lastReport={turn:12};statementReport=currentStatementReport();financialMode="year";financialYear=1;tab="bs";renderTable()');
  assert.match(get('reportTitle').textContent,/第1期 3月末/);
  assert.equal(get('reportCash').textContent,run('fmt(state.history.find(h=>h.turn===12).balances.預金)'));
  assert.match(get('statementPeriodSummary').innerHTML,/第1期末の会社預金/);
  assert.equal(get('statementPeriodSummary').hidden,false);
  assert.equal(get('monthlyDetails').hidden,true);
  run('financialMode="month";tab="tb";renderTable()');
  assert.equal(get('statementPeriodSummary').hidden,true);
  assert.match(get('reportTitle').textContent,/試算表/);
});

test('replayed journal survives reload and returns to the log without trapping scroll',()=>{
  let app=boot();app.run('skipIntro();openJournal();replayEntry(1)');
  assert.equal(JSON.parse(app.storage.get('finance-game-v4')).animationReturn,'journal');
  app=boot(app.storage);
  assert.equal(app.get('journalOverlay').hidden,false);
  assert.match(app.get('journalEntries').innerHTML,/株式|資本金|預金/);
  assert.equal(app.get('transactionOverlay').hidden,false);
  app.run('nextTransaction();nextTransaction()');
  assert.equal(app.get('transactionOverlay').hidden,true);
  assert.equal(app.get('journalOverlay').hidden,false);
  assert.equal(app.run('animationReturn'),null);
  app.run('closeJournal()');
  assert.equal(app.get('journalOverlay').hidden,true);
  assert.equal(app.run('document.body.style.overflow'),'');
});

test('normal introduction preserves entries and first month finishes in at most three advances',()=>{
  const {run,get}=boot();
  run('while(!introComplete)introAdvance()');
  assert(run('state.entries.some(e=>e.type==="vatInput")'));
  run('closeMonth(true)');
  assert(run('animationQueue.length')<=3);
  let clicks=0;while(run('animationQueue.length')){run('nextTransaction()');clicks++;assert(clicks<=3);}
  assert.equal(get('transactionOverlay').hidden,true);
  assert.equal(get('report').classList.contains('show'),true);
});

test('upsell requires a separate approval, fresh plan comparison and matching execution',()=>{
  const {run,get}=boot();run('skipIntro()');
  run(`currentBankAssessment=()=>({score:90,grade:'A',eligible:true,rate:2,years:10,capacity:500000,workingNeed:1000000,short:{balance:0,available:1000000},equipment:{balance:0,available:5000000}});
    bankPurpose='freezer';bankPlanAssumptions={equipment:'freezer',loan:500000,rate:5,term:120,delay:0,hire:'none',months:12,price:'list',effort:'quarterly'};
    planCalls=[];const originalCompare=InvestmentPlanner.compare;InvestmentPlanner.compare=(state,plan)=>{planCalls.push(plan.loan);return originalCompare(state,plan)};
    requestBankLoan(500000)`);
  assert.match(get('shopDialogBody').innerHTML,/data-loan-request="1500000"/);
  assert.doesNotMatch(get('shopDialogBody').innerHTML,/data-loan-confirm="1500000"/);
  run('confirmBankLoan(1500000)');
  assert.equal(run('(state.loans||[]).length'),0);
  assert.equal(run('bankRequest.amount'),1500000);
  assert.deepEqual(Array.from(run('planCalls')),[500000,1500000]);
  assert.match(get('shopDialogBody').innerHTML,/再試算/);
  run('confirmBankLoan(1500000)');
  assert.equal(run('state.loans.at(-1).principal||state.loans.at(-1).amount||state.loans.at(-1).balance'),1500000);
});

function highlightedNames(html){return [...html.matchAll(/<tr class="[^"]*ledger-highlight[^"]*"><th(?: scope="row")?>([^<]+)/g)].map(m=>m[1]);}

test('deposit journal highlights only cash and deposit, leaving category totals and profit neutral',()=>{
  const {run}=boot();run('skipIntro()');
  const html=run('transactionView(state.entries.find(e=>e.debit==="差入保証金"))');
  assert.deepEqual(highlightedNames(html).sort(),['差入保証金','預金']);
  assert.match(html,/<tr class="category "><th scope="row">流動資産<\/th><td>[^<]+<\/td><td class="neutral">▲300/);
  assert.match(html,/<tr class="subtotal "><th scope="row">固定資産合計<\/th><td>[^<]+<\/td><td class="neutral">＋300/);
});

test('VAT introduction highlights the extra VAT journal account and grouped scenes use journal account union',()=>{
  const {run}=boot();run('skipIntro()');
  const html=run(`(()=>{const e=state.entries.find(x=>x.debit==='什器'),vat=state.entries.find(x=>x.debit==='仮払消費税等');return transactionView({...e,after:vat.after,introVAT:vat.amount})})()`);
  assert.deepEqual(highlightedNames(html).sort(),['什器','仮払消費税等','預金'].sort());
  run('closeMonth(true)');
  const grouped=run('animationQueue.filter(g=>g.tutorialGroup).map(g=>({html:transactionGroupView(g),accounts:[...journalAccounts(g.entries)]}))');
  assert(grouped.length>0);
  for(const {html,accounts} of grouped){
    const highlighted=highlightedNames(html);
    assert(highlighted.length>0);
    assert(highlighted.every(a=>accounts.includes(a)),`unrelated highlighted row: ${highlighted}`);
    assert(!highlighted.some(a=>/合計|利益|資産の部|負債の部/.test(a)));
  }
});

test('sales journal highlights its B/S and P/L accounts, not gross or net profit',()=>{
  const {run}=boot();run('skipIntro();closeMonth(true)');
  const html=run('transactionView(lastReport.entries.find(e=>e.type==="saleCash"))');
  assert.deepEqual(highlightedNames(html).sort(),['売上高','預金']);
  assert.match(html,/<th>売上総利益<\/th><td>[^<]+<\/td><td class="neutral">/);
  assert.match(html,/<th>当期純利益<\/th><td>[^<]+<\/td><td class="neutral">/);
});
