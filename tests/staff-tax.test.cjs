const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),{boot}=require('./helpers/ui.cjs'),B=require('../dist/js/backup.js');
test('staff offer is fixed between 24 and 47 months, deferral remains promotable and departure occurs at 48',()=>{
 let s=E.hire(E.createState(),'parttime'),x=s.staff[0],offer=x.offerTurn;
 assert(offer-x.hiredTurn>=24&&offer-x.hiredTurn<48);assert.equal(x.departTurn,x.hiredTurn+48);
 s.turn=offer-1;E.processStaffEvents(s);assert.equal(s.staffEvents.length,0);
 s.turn=offer;E.processStaffEvents(s);E.processStaffEvents(s);assert.equal(s.staffEvents.length,1);
 s=E.deferStaff(s,x.id);s.turn=x.departTurn-1;
 const promoted=E.promoteStaff(s,x.id),external=structuredClone(promoted);external.staff[0].origin='external';
 assert.equal(promoted.staff[0].role,'employee');assert.equal(promoted.staff[0].hiredTurn,1);assert.equal(promoted.staff.length,1);
 assert(E.effectiveAttraction(promoted)>E.effectiveAttraction(external));assert.equal(E.fixedCosts(external)-E.fixedCosts(promoted),8800);
 promoted.turn=x.departTurn;E.processStaffEvents(promoted);assert.equal(promoted.staff.length,1);assert.throws(()=>E.promoteStaff(promoted,x.id));
 s.turn=x.departTurn;E.processStaffEvents(s);assert.equal(s.staff.length,0);assert(s.staffEvents.some(e=>e.type==='departure'));
 assert.throws(()=>E.promoteStaff(s,x.id));s.actionLocked=null;while(!E.recruitment(s).open)s.turn++;s=E.hire(s,'parttime');assert.notEqual(s.staff[0].id,x.id);
 const loaded=E.migrate(JSON.parse(JSON.stringify(s)));assert.equal(loaded.staff[0].offerTurn,s.staff[0].offerTurn);
});
test('owner debt repays 30%, 50% or all without consuming time/action and reconciles monthly cash',()=>{
 const s=E.createState();s.owner=1000000;const funded=E.lendByOwner(s,1000000);
 for(const [ratio,amount] of [[.3,300000],[.5,500000],[1,1000000]]){
  const n=E.repayToOwner(funded,ratio);assert.equal(n.turn,funded.turn);assert.equal(n.actionLocked,funded.actionLocked);
  assert.equal(n.owner,amount);assert.equal(n.balances.役員借入金,1000000-amount);assert.equal(E.profit(n.balances),E.profit(funded.balances));
  const r=E.run(n,E.recommend(n),'list','tend',{noise:1});assert.equal(r.report.ownerRepayment,amount);assert.equal(r.report.opening+r.report.inflow-r.report.outflow,r.state.balances.預金);E.assertState(r.state);
  assert.equal(E.next(r.state).pendingOwnerRepayment,0);
 }
 assert.throws(()=>E.repayToOwner(funded,.4));const broke=structuredClone(funded);broke.balances.預金=1;assert.throws(()=>E.repayToOwner(broke,1));
});
function taxFixture(){
 let s=E.blankState();E.applyStartup(s,0);s.opening={...s.balances};s.turn=12;s.balances.預金-=100000;s.balances.雑費=100000;
 E.settleTaxes(s);s.closed=true;s.history.push({turn:12,balances:{...s.balances}});s=E.next(s);
 s.turn=24;s.balances.預金+=100000;s.balances.売上高=100000;E.settleTaxes(s);s.closed=true;s.history.push({turn:24,balances:{...s.balances}});s=E.next(s);s.turn=30;E.settleTaxes(s);
 s.taxEvidence=[{id:'proof-1',turn:11,base:20000,vat:2000,status:'open',reason:'事業用途資料不足'}];return s;
}
test('audit recomputes carry losses across later years and books principal tax plus penalty only once',()=>{
 const s=taxFixture(),past=JSON.stringify(s.history),cash=s.balances.預金,a=E.taxAuditEvent(s);
 assert.equal(a.corporateAdditional,5000);assert.equal(a.vatAdditional,2000);assert.equal(a.penalty,700);assert.equal(a.additionalTax,7700);
 assert.equal(s.balances.預金,cash);assert.equal(JSON.stringify(s.history),past);assert.equal(s.balances.未払法人税等,5500);assert.equal(s.balances.未払消費税等,2200);
 E.assertState(s);assert.equal(E.taxAuditEvent(s),null);const repeat={};E.assessTaxEvidence(s,repeat);assert.equal(repeat.additionalTax,undefined);
 const balances=JSON.stringify(s.balances);E.reviewTaxAudit(s,30,true);assert.equal(JSON.stringify(s.balances),balances);
 s.turn=31;const corporate=E.settleTaxes(s),vat=E.settleVAT(s);assert.equal(corporate.paid+vat.paid,7700);assert.equal(s.balances.預金,cash-7700);E.assertState(s);
});
test('documented evidence and uncollected booked interest alone cause no invented extra tax',()=>{
 let s=taxFixture();s=E.resolveTaxEvidence(s,'proof-1');s.balances.未収利息=3000;s.balances.受取利息=3000;
 const a=E.taxAuditEvent(s);assert.equal(a.additionalTax,0);E.assertState(s);
});
test('old tax migration retains opening loss lots during later reassessment',()=>{
 const s=taxFixture();s.taxAnnual=s.taxAnnual.filter(y=>y.turn===24);s.taxEvidence[0].turn=13;
 const a=E.taxAuditEvent(s);assert.equal(a.corporateAdditional,5000);E.assertState(s);
});
test('promotion and repayments are reviewable and hidden abilities are not printed',()=>{
 const app=boot();app.run("skipIntro();state=E.hire(state,'parttime');state.turn=state.staff[0].offerTurn;E.processStaffEvents(state);state.actionLocked=null;showStaffManagement()");
 assert.match(app.get('shopDialogBody').innerHTML,/登用条件/);assert(!app.get('shopDialogBody').innerHTML.includes('0.04'));
 app.run('previewPromotion(state.staff[0].id)');assert.match(app.get('shopDialogBody').innerHTML,/167,500円/);
 app.run('state.owner=1000000;state=E.lendByOwner(state,1000000);showOwnerRepayment()');assert.match(app.get('shopDialogBody').innerHTML,/３割/);assert.match(app.get('shopDialogBody').innerHTML,/５割/);assert.match(app.get('shopDialogBody').innerHTML,/全額/);
 app.run('previewOwnerRepayment(.3)');assert.equal(app.run('state.balances.役員借入金'),1000000);app.run('confirmOwnerRepayment()');assert.equal(app.run('state.balances.役員借入金'),700000);
});
test('evidence risks, tax revisions and staff events survive a real saved game and the next turn',()=>{
 let s=E.createState(),report;
 for(let t=1;t<=36;t++){const action=[8,11].includes((t-1)%12+1)?'improve':'tend',r=E.run(s,E.recommend(s,action),'list',action,{noise:1});s=r.state;report=r.report;if(t<36)s=E.next(E.compact(s));}
 const payload={version:7,introComplete:true,state:s,lastReport:report,choice:{quantities:E.PRODUCTS.map(()=>0),action:'tend',price:'list'},seen:[],animationQueue:[],entryStage:0};
 const loaded=B.decode(B.encode(payload)).state;assert.deepEqual(loaded.taxEvidence,s.taxEvidence);assert.deepEqual(loaded.taxAuditTaxByYear,s.taxAuditTaxByYear);
 const a=E.next(E.compact(s)),b=E.next(loaded);assert.deepEqual(E.run(a,E.recommend(a)),E.run(b,E.recommend(b)));
});
test('legacy staff receive a playable promotion window and departed IDs stay unique',()=>{
 let s=E.hire(E.createState(),'parttime');s.turn=60;s.closed=true;delete s.staffSerial;delete s.staff[0].offerTurn;delete s.staff[0].departTurn;
 s=E.migrate(s);assert.equal(s.staff[0].departTurn,62);assert.equal(s.staffEvents[0].status,'pending');s=E.next(s);
 assert.equal(s.staff.length,1);const promoted=E.promoteStaff(s,s.staff[0].id);assert.equal(promoted.staff[0].origin,'internal');
 s.closed=true;s=E.next(s);assert.equal(s.staff.length,0);s.actionLocked=null;while(!E.recruitment(s).open)s.turn++;const hired=E.hire(s,'parttime');assert.equal(hired.staff[0].id,'staff-2');
});
test('audit display and payment explanations show the actual assessment and saved due date',()=>{
 const s=taxFixture();E.taxAuditEvent(s);const app=boot();app.run('skipIntro();state='+JSON.stringify(s)+';showTaxAudit(30)');
 const html=app.get('shopDialogBody').innerHTML;assert.match(html,/7,700円/);assert.match(html,/補正後の繰越欠損金/);assert(!html.includes('この調査で追加の税金や罰金は発生しません'));
 s.turn=31;E.settleTaxes(s);E.settleVAT(s);const due=s.entries.filter(e=>['auditCorpPay','auditVATPay'].includes(e.type));
 const lesson=app.run('transactionAccountingLesson('+JSON.stringify(due)+')');assert.match(lesson,/5,500円/);assert.match(lesson,/2,200円/);assert.match(lesson,/二重に費用にせえへん/);
});
