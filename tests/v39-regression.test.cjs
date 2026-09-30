const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),P=require('../dist/js/planning.js');
const {bootDOM}=require('./helpers/dom.cjs');
test('investment screen labels the shortened period',()=>{
 const ui=bootDOM();try{ui.run("state=E.createState();state.turn=119;investmentPlan={equipment:'none',months:24,delay:0,hire:'none',effort:'none',price:'list'};calculateInvestmentPlan()");assert.match(ui.document.getElementById('investmentPlanResults').textContent,/実際の試算期間：2か月（希望 24か月）/);assert.match(ui.document.getElementById('investmentPlanResults').textContent,/120か月の経営終了/);}finally{ui.close();}
});
test('capacity loss permits existing stock sales but not additional stock in that storage',()=>{
 let s=E.createState();s.staff=[{id:'staff-1',characterId:'danball',role:'parttime',origin:'external',hiredTurn:1,offerTurn:25,departTurn:49}];s.staffSerial=1;
 const n=8400-E.usage(s).dry;E.add(s,0,n);E.entry(s,'商品','預金',n*E.PRODUCTS[0].cost,'検証用仕入');s.turn=49;E.processStaffEvents(s);
 assert.equal(E.capacities(s).dry,8000);const q=E.PRODUCTS.map(()=>0);assert.equal(E.validation(s,q),'');q[0]=1;assert.match(E.validation(s,q),/上限/);q[0]=0;
 const result=E.run(s,q,'list','tend',{noise:1});assert(result.state.closed);E.assertState(result.state);
});
test('investment forecast exposes actual horizon and rejects investment after its end',()=>{
 const s=E.createState();s.turn=119;const before=JSON.stringify(s);
 const r=P.simulate(s,{months:24,equipment:'freezer',delay:0});assert.equal(r.status,'horizon');assert.equal(r.actualMonths,2);assert.equal(r.requestedMonths,24);assert.equal(r.endTurn,120);
 const invalid=P.simulate(s,{months:24,equipment:'freezer',delay:3});assert.equal(invalid.status,'invalidPlan');assert.equal(invalid.rows.length,0);
 assert.equal(JSON.stringify(s),before);
});
