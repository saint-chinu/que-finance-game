const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),P=require('../dist/js/planning.js'),{boot}=require('./helpers/ui.cjs');
// These tests use the sponsorship action to model a month the owner is away; make every month an offer month.
E.sponsorEvent=()=>true;
function fixture(turn=45){const s=E.hire(E.createState(),'parttime');s.turn=turn;s.actionLocked=null;s.balances.預金+=20000000;s.balances.資本金+=20000000;s.opening={...s.balances};E.processStaffEvents(s);return s;}
test('three staffing policies preserve source and reflect promotion, departure and replacement costs',()=>{
 const s=fixture(),before=JSON.stringify(s),id=s.staff[0].id,r=P.compareStaff(s,id,{effort:'tend'});
 assert.equal(JSON.stringify(s),before);assert.equal(r.normal.length,3);assert.equal(r.downside.length,3);
 const [promote,keep,external]=r.normal;for(const x of r.normal){assert.equal(x.status,'completed');assert.equal(x.rows.length,12);assert.equal(x.minimumCash,Math.min(...x.rows.map(x=>x.cash)));}
 assert.equal(promote.payroll,287500*12);assert.equal(keep.payroll,120000*4);const hireTurn=external.events.find(e=>e.type==='externalHire').turn;assert(hireTurn>=49);assert(E.recruitment({...s,turn:hireTurn}).open);assert.equal(external.payroll,120000*4+287500*(57-hireTurn));
 assert.deepEqual(promote.events,[{turn:45,type:'promotion'}]);assert.equal(keep.rows.find(r=>r.turn===49).role,'departed');
 const hired=external.rows.find(r=>r.turn===hireTurn);assert.equal(hired.action,'hire');assert.equal(hired.service,800);assert.equal(external.rows.find(r=>r.turn===hireTurn+1).service,1800);
 assert.deepEqual(P.compareStaff(s,id,{effort:'tend'}),r);
});
test('promotion projection matches the actual first month including locked action and net profit',()=>{
 const s=fixture();s.actionLocked='investment';const plan={effort:'sales',price:'minus10'};
 const r=P.simulateStaff(s,s.staff[0].id,'promote',plan),n=E.promoteStaff(s,s.staff[0].id),actual=E.run(n,E.recommend(n,'investment','minus10'),'minus10','sales',{noise:1});
 assert.equal(r.rows[0].cash,actual.state.balances.預金);assert.equal(r.rows[0].profit,actual.report.monthProfit);assert.equal(r.rows[0].action,'investment');
});
test('pre-offer, month-close, final horizon and insolvency are reported without fictitious full-year totals',()=>{
 const young=fixture(10),p=P.simulateStaff(young,young.staff[0].id,'promote');assert(!p.events.some(e=>e.type==='promotion'));
 let s=fixture();s=E.run(s,E.recommend(s),'list','tend',{noise:1}).state;assert.equal(P.simulateStaff(s,s.staff[0].id,'keep').start,46);
 const late=fixture();late.turn=116;late.staff[0].departTurn=130;late.staff[0].offerTurn=115;assert.equal(P.simulateStaff(late,late.staff[0].id,'promote').status,'horizon');assert.equal(P.simulateStaff(late,late.staff[0].id,'promote').rows.length,5);
 const broke=fixture();broke.balances.資本金-=broke.balances.預金;broke.balances.預金=0;broke.opening={...broke.balances};broke.officerSalary=3000000;const fail=P.simulateStaff(broke,broke.staff[0].id,'promote',{effort:'tend'});assert.equal(fail.status,'insolvent');assert(fail.rows.length<12);
 assert.equal(P.simulateStaff(fixture(),'missing','promote').status,'invalidPlan');
});
test('external replacement retains other staff and their normal departure deadlines',()=>{
 const s=fixture();s.staff.push({id:'staff-2',role:'employee',origin:'external',hiredTurn:2});
 const r=P.simulateStaff(s,'staff-1','external',{effort:'sales'});const hired=r.rows.find(x=>x.action==='hire');assert(hired.turn>=49);assert.equal(hired.payroll,575000);assert.equal(hired.service,1600);assert.equal(s.staff.length,2);
});
test('UI comparison remains read-only, hides ability values and offers confirmation instead of executing',()=>{
 const app=boot(),s=fixture();app.run('skipIntro();state='+JSON.stringify(s)+';showStaffManagement()');assert.match(app.get('shopDialogBody').innerHTML,/登用・継続・外部採用を比較/);
 const before=app.run('JSON.stringify(state)'),saved=JSON.stringify([...app.storage]);app.run('showStaffComparison("staff-1")');
 const html=app.get('staffPlanResults').innerHTML;assert.match(html,/最低月末預金/);assert.match(html,/通常より15％/);assert.match(html,/今月の登用条件を確認する/);assert(!html.includes('0.04'));assert.equal(app.run('JSON.stringify(state)'),before);assert.equal(JSON.stringify([...app.storage]),saved);
 app.get('staffPlanReserve').value='5000000';app.run('renderStaffComparison()');assert.match(app.get('staffPlanResults').innerHTML,/希望確保額との差/);
 app.get('staffPlanReserve').value='-1';assert.throws(()=>app.run('renderStaffComparison()'));
 app.run('previewPromotion("staff-1")');assert.match(app.get('shopDialogBody').innerHTML,/この条件で登用する/);assert.equal(app.run('state.staff[0].role'),'parttime');
});
