const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/js/engine.js');
const {bootDOM}=require('./helpers/dom.cjs');
function start(){const ui=bootDOM();ui.click('#welcomeStart');ui.click('#skipIntro');return ui;}
function months(count){let s=E.createState(),reports=[];for(let i=0;i<count;i++){const result=E.run(s,E.recommend(s,'tend','list','cash'),'list','tend',{payment:'cash',noise:1});reports.push(result.report);s=i===count-1?result.state:E.next(result.state);}return {state:s,reports};}
function load(ui,f){ui.run(`state=${JSON.stringify(f.state)};lastReport=${JSON.stringify(f.reports.at(-1))};monthClosed=true;renderPlanning();openStatements();`);}
function salesCell(ui){return [...ui.document.querySelectorAll('#reportTable tbody tr')].find(row=>row.querySelector('th')?.textContent==='売上高').querySelector('td').textContent;}
test('three statement tabs show distinct month and fiscal cumulative amounts, resetting in April',()=>{
 const ui=start();try{const f=months(14);load(ui,f);const before=ui.run('JSON.stringify(state)');
  assert.deepEqual([...ui.document.querySelectorAll('.report-tabs [data-tab]')].map(b=>b.textContent),['B/S','P/L（累計）','P/L（単月）']);
  ui.click('#report [data-tab="pl"]');
  const sales=r=>r.productResults.reduce((n,p)=>n+p.sales,0);
  assert.equal(salesCell(ui),ui.run(`amountText(${sales(f.reports[12])+sales(f.reports[13])})`));
  assert.match(ui.document.getElementById('reportTable').textContent,/第2期 4月〜5月/);
  assert.match(ui.document.getElementById('reportTable').textContent,/前年同期比/);
  ui.click('#report [data-tab="pl-month"]');assert.equal(salesCell(ui),ui.run(`amountText(${sales(f.reports[13])})`));
  assert.match(ui.document.getElementById('reportTable').textContent,/第2期 5月/);
  assert.equal(ui.document.querySelectorAll('#reportTable thead th').length,3);
  ui.click('#annualMode');assert.match(ui.document.getElementById('reportTable').textContent,/第1期 3月/);
  assert.equal(salesCell(ui),ui.run(`amountText(${sales(f.reports[11])})`));
  ui.click('#report [data-tab="pl"]');assert.equal(salesCell(ui),ui.run(`amountText(${f.reports.slice(0,12).reduce((n,r)=>n+sales(r),0)})`));
  assert.equal(ui.run('JSON.stringify(state)'),before);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('automatic replenishment replaces the freezer initial fill using remaining stock, with manual opt-out',()=>{
 let ui=start();try{
  ui.run("state=E.buy(state,'freezer');choice.quantities=E.PRODUCTS.map(()=>0);choice.quantities[5]=600;const result=E.run(state,choice.quantities,'list',currentAction(),{payment:'cash',noise:1});state=result.state;lastReport=result.report;monthClosed=true;advanceMonth()");
  assert(ui.run('state.inventory[5]')>0);assert(ui.run('choice.quantities[5]')<600);
  assert.equal(ui.run('JSON.stringify(choice.quantities)'),ui.run("JSON.stringify(E.recommend(state,currentAction(),'list','cash'))"));
  assert.equal(ui.run("E.validation(state,choice.quantities,currentAction(),'cash')"),'');
  ui.run('setQuantity(5,0);renderPlanning()');assert.equal(ui.run('choice.quantities[5]'),0);
  ui.click('#autoOrder');assert.equal(ui.run('choice.autoOrder'),false);
  ui.run("const result2=E.run(state,choice.quantities,'list','tend',{payment:'cash',noise:1});state=result2.state;lastReport=result2.report;monthClosed=true;advanceMonth()");
  assert.equal(ui.run('choice.quantities[5]'),0);assert.equal(ui.run('choice.orderSource'),'prior');
  const saved=ui.window.localStorage.getItem('finance-game-v4');ui.close();ui=bootDOM([['finance-game-v4',saved]]);assert.equal(ui.document.getElementById('autoOrder').checked,false);
  assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('KPI records actual capped visitors and retail net sales, shows month comparison and survives save reload',()=>{
 let ui=start();try{
  assert.match(ui.document.getElementById('retailKpi').textContent,/初月の確定後/);
  ui.run("state.attraction=1.5;const result=E.run(state,E.recommend(state),'list','tend',{noise:1,season:2});state=result.state;lastReport=result.report;monthClosed=true;renderPlanning();openStatements();saveGame()");
  assert(ui.run('lastReport.customers')>ui.run('lastReport.visitors'));
  assert.equal(ui.run('state.history.at(-1).visitors'),ui.run('lastReport.visitors'));
  assert.equal(ui.run('retailKpi(1,lastReport).ticket'),ui.run('lastReport.averageSpend'));
  assert.match(ui.document.querySelector('.report-retail-kpi').textContent,/来店客数（実績）/);
  const f=months(2);load(ui,f);assert.match(ui.document.getElementById('retailKpi').textContent,/前月比 [+-]?\d/);
  const saved=ui.run('saveGame();localStorage.getItem("finance-game-v4")'),expected=ui.run('JSON.stringify(retailKpi(2,lastReport))');ui.close();ui=bootDOM([['finance-game-v4',saved]]);
  assert.equal(ui.run('JSON.stringify(retailKpi(2,lastReport))'),expected);assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
test('KPI handles old history and no-service months without fabricated visitors or division by zero',()=>{
 const ui=start();try{
  load(ui,months(2));ui.run("delete state.history[0].visitors;delete state.history[0].retailSales;state.entries.push({turn:1,credit:'売上高',debit:'預金',amount:99999999,segmentId:'fishery'});renderPlanning()");
  assert.equal(ui.run('retailKpi(1).visitors'),null);assert.match(ui.document.getElementById('retailKpi').textContent,/記録なし/);
  const expected=ui.run("state.entries.filter(e=>e.turn===1&&e.credit==='売上高'&&(!e.segmentId||e.segmentId==='retail')).reduce((n,e)=>n+e.amount,0)");assert.equal(ui.run('retailKpi(1).sales'),expected);
  ui.run("state=E.next(state);const r=E.run(state,E.PRODUCTS.map(()=>0),'list','hire',{payment:'cash',noise:1});state=r.state;lastReport=r.report;renderPlanning();openStatements()");
  assert.equal(ui.run('retailKpi(3,lastReport).ticket'),null);assert.doesNotMatch(ui.document.getElementById('retailKpi').textContent,/NaN|Infinity/);
  ui.run('advanceMonth();openStatements()');assert.equal(ui.document.querySelector('.report-retail-kpi'),null);
  assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});
