const test=require('node:test'),assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');

test('monthly report has two collapsed levels and statements never require opening commentary',()=>{
 const app=bootDOM();try{
  app.run('skipIntro()');app.click('#commit');app.finishEntries();
  const get=id=>app.document.getElementById(id);
  assert.equal(get('reportCommentDetails').open,false);
  assert.equal(get('reportFinancialDetails').open,false);
  assert.equal(get('reportStatementContent').hidden,true);
  assert(get('reportCommentDetails').contains(get('tutorialReport')));
  assert(get('reportCommentDetails').contains(get('queRemark')));
  app.click('#reportFinancialDetails > summary');
  assert.equal(get('reportFinancialDetails').open,true);
  assert.equal(get('reportStatementContent').hidden,true);
  app.click('#report [data-tab="bs"]');
  assert.equal(get('reportStatementContent').hidden,false);
  assert.equal(get('reportCommentDetails').open,false);
  assert.match(get('reportTable').textContent,/貸借対照表/);
  assert.equal(app.document.querySelector('#report [data-tab="bs"]').getAttribute('aria-expanded'),'true');
  app.click('#report [data-tab="bs"]');assert.equal(get('reportStatementContent').hidden,true);
  app.click('#report [data-tab="tb"]');assert.match(get('reportTable').textContent,/月次残高試算表/);
  app.click('#report [data-tab="pl"]');assert.match(get('reportTable').textContent,/損益計算書/);
  app.click('#reportCommentDetails > summary');assert.equal(get('reportCommentDetails').open,true);
  app.click('#next');app.click('#commit');app.finishEntries();
  assert.equal(get('reportCommentDetails').open,false);
  assert.equal(get('reportFinancialDetails').open,false);
  assert.equal(get('reportStatementContent').hidden,true);
  app.click('#closeReport');app.click('#bankMenu');app.click('#viewBankAssessment');
  assert.equal(get('reportFinancialDetails').open,true);
  assert.equal(get('reportStatementContent').hidden,false);
  assert.match(get('reportTable').textContent,/銀行/);
  assert.deepEqual(app.errors,[]);
 }finally{app.close();}
});

for(const role of ['parttime','employee','manager'])for(const action of ['sales','improve']){
 test(`${role}: actual hiring and ${action} clicks keep store sales and matching journal entries`,()=>{
  let app=bootDOM();try{
   app.run('skipIntro()');app.click('#hireStaff');app.click(`[data-hire-preview="${role}"]`);app.click(`[data-confirm-hire="${role}"]`);
   app.click('#commit');app.finishEntries();app.click('#next');
   // Reload the real saved state: staffing must survive, not only an in-memory fixture.
   const saved=Array.from({length:app.window.localStorage.length},(_,i)=>{const key=app.window.localStorage.key(i);return [key,app.window.localStorage.getItem(key)];});
   app.close();app=bootDOM(saved);
   app.run(`E.sponsorEvent=()=>${action==='sales'};renderPlanning()`);
   app.click(`#actions [data-value="${action}"]`);
   assert.equal(app.run('state.staff.length'),1);
   assert.match(app.document.getElementById('staffAdvice').textContent,/売上見込み/);
   if(action==='sales')assert.match(app.document.getElementById('staffAdvice').textContent,/従業員が店番/);
   app.click('#commit');app.finishEntries();
   assert.equal(app.run('lastReport.action'),action);
   assert(app.run('lastReport.served')>0);
   const sales=app.run('lastReport.productResults.reduce((n,p)=>n+p.sales,0)');assert(sales>0);
   assert.equal(app.run('lastReport.entries.filter(e=>e.credit==="売上高").reduce((n,e)=>n+e.amount,0)'),sales);
   assert(app.run('lastReport.entries.some(e=>e.debit==="給料手当")'));
   assert(app.run('lastReport.entries.some(e=>e.type==="promotion."+lastReport.action)'));
   assert(app.run('E.assertState(state)'));
   assert.equal(app.run('state.turn'),2);assert.equal(app.run('state.history.length'),2);
   assert.match(app.document.getElementById('reportQuickSummary').textContent,/釣具店売上（税抜）/);
   assert.deepEqual(app.errors,[]);
  }finally{app.close();}
 });
}

test('zero-sales closure requires an explicit decision and cancelling spends no turn or cash',()=>{
 const app=bootDOM();try{
  app.run("skipIntro();choice.action='hire';renderPlanning()");
  const before=app.run('JSON.stringify(state)');app.click('#commit');
  assert.equal(app.run('JSON.stringify(state)'),before);
  assert.match(app.document.getElementById('shopDialogBody').textContent,/店番なし・休業/);
  app.click('#replanCash');assert.equal(app.run('JSON.stringify(state)'),before);
  app.click('#commit');app.click('#confirmZeroSalesMonth');app.finishEntries();
  assert.equal(app.run('state.closed'),true);assert.equal(app.run('lastReport.cashSales+lastReport.cardSales'),0);
  assert.equal(app.run('state.history.length'),1);
  assert.match(app.document.getElementById('reportQuickSummary').textContent,/店番による接客がなく/);
 }finally{app.close();}
});

test('empty inventory is explained separately even with a staff member tending the store',()=>{
 const app=bootDOM();try{
  app.run(`skipIntro();state=E.hire(state,'parttime');state=E.next(E.run(state,E.PRODUCTS.map(()=>0),'list','hire').state);for(let i=0;i<E.PRODUCTS.length;i++){const n=state.inventory[i];E.take(state,i,n);E.entry(state,'商品廃棄損','商品',n*E.PRODUCTS[i].cost,'在庫なしの検証');}choice.quantities=E.PRODUCTS.map(()=>0);E.sponsorEvent=()=>true;choice.action='sales';renderPlanning();`);
  const before=app.run('JSON.stringify(state)');app.click('#commit');
  assert.equal(app.run('JSON.stringify(state)'),before);
  assert.match(app.document.getElementById('shopDialogBody').textContent,/従業員が店番/);
  assert.match(app.document.getElementById('shopDialogBody').textContent,/在庫・需要がありません/);
  assert.equal(app.run('state.closed'),false);
 }finally{app.close();}
});
