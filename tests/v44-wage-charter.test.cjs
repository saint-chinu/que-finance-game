const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),X=E.extension,R=require('../dist/js/replay.js'),B=require('../dist/js/bank.js'),{boot}=require('./helpers/ui.cjs');
const bank={eligible:true,grade:'A',rate:2,short:{limit:50000}};
function withStaff(seed){let s=R.create(seed);s=E.hire(s,'parttime',E.staffCandidates(s)[0]);const r=E.run(s,E.recommend(s,s.actionLocked,'list'),'list',s.actionLocked);return E.next(E.compact(r.state));}
function month(s){const r=E.run(s,E.recommend(s,s.actionLocked||'tend','list'),'list',s.actionLocked||'tend');E.assertState(r.state);return r.state;}

test('dismissal is gone; a pay cut lowers wage by 20% without using the action',()=>{
 assert.equal(X.dismissCrew,undefined);
 let s=withStaff(3);const id=s.staff[0].id,before=E.payroll(s);
 s=X.cutWage(s,id);assert.equal(s.staff[0].wage,Math.floor(before*.8/1000)*1000);assert.equal(E.payroll(s),96000);assert.equal(s.actionLocked,null);
 assert.throws(()=>X.cutWage(s,id));
 s=X.restoreWage(s,id);assert.equal(E.payroll(s),before);assert.equal(s.staff[0].wageCut,undefined);
});

test('after a cut each month-end resigns with about 20%; resignation works one more month then leaves',()=>{
 let first=0,n=300;
 for(let seed=1;seed<=n;seed++){let s=X.cutWage(withStaff(seed),withStaff(seed).staff[0].id);s=month(s);if(s.staff[0].leavesTurn)first++;}
 assert(first>n*.14&&first<n*.26,String(first));
 let s=withStaff(3);const id=s.staff[0].id;s=X.cutWage(s,id);let noticeTurn=null;
 for(let k=0;k<40&&s.staff.some(x=>x.id===id);k++){s=month(s);const p=s.staff.find(x=>x.id===id);if(p?.leavesTurn&&noticeTurn===null){noticeTurn=s.turn;assert.throws(()=>X.restoreWage(E.next(E.compact(s)),id));assert(s.staffEvents.some(e=>e.type==='resign'&&e.staffId===id));}s=E.next(E.compact(s));if(noticeTurn!==null&&s.turn===noticeTurn+1)assert(s.staff.some(x=>x.id===id),'works during notice month');}
 assert(noticeTurn!==null);assert(!s.staff.some(x=>x.id===id));
});

test('restoring pay stops resignations; promotion clears a cut',()=>{
 let s=withStaff(5);const id=s.staff[0].id;s=X.restoreWage(X.cutWage(s,id),id);
 for(let k=0;k<30;k++){s=E.next(E.compact(month(s)));}
 assert(s.staff.some(x=>x.id===id&&!x.leavesTurn));
});

test('boat crew can be cut and replayed; pay-cut ops are recorded',()=>{
 let s=E.createState();s.turn=25;s.owner=80000000;s=E.lendByOwner(s,60000000);s.history=[12,24].map(turn=>({turn,balances:{売上高:20000000,売上原価:10000000,減価償却費:1000000}}));s.opening={...s.balances};s.pendingEntries=[];s.pendingBorrowing=0;
 s=X.buyFishery(s,0,bank);s.actionLocked=null;s.expansion.fishery.crew=[{id:'crew-1',role:'captain',characterId:'madai',wage:350000,hiredTurn:24},{id:'crew-2',role:'crew',characterId:null,wage:180000,hiredTurn:24}];
 const r=R.apply(s,{op:'cutWage',args:['crew-1']});assert.equal(r.state.expansion.fishery.crew[0].wage,280000);
 assert.equal(R.apply(r.state,{op:'restoreWage',args:['crew-1']}).state.expansion.fishery.crew[0].wage,350000);
 assert.throws(()=>R.apply(s,{op:'dismissCrew',args:['crew-1']}));
});

test('charter demand follows the calendar table and seat limit',()=>{
 let s=E.createState();s.turn=25;s.owner=80000000;s=E.lendByOwner(s,60000000);s.history=[12,24].map(turn=>({turn,balances:{売上高:20000000,売上原価:10000000,減価償却費:1000000}}));s.opening={...s.balances};s.pendingEntries=[];s.pendingBorrowing=0;
 s=X.buyFishery(s,0,bank);s.expansion.fishery.crew=[{id:'crew-1',role:'captain',characterId:'madai',wage:350000,hiredTurn:1},{id:'crew-2',role:'crew',characterId:null,wage:180000,hiredTurn:1}];s.expansion.fishery.use='charter';
 const byMonth={};for(let t=25;t<=48;t++){s.turn=t;const c=X.charterPlan(s);if(c.days){const m=(t+2)%12+1;assert(c.passengers<=c.days*X.RULES.charterSeats);(byMonth[m]=byMonth[m]||[]).push(c.passengers);}}
 const avg=m=>byMonth[m].reduce((a,b)=>a+b,0)/byMonth[m].length;
 if(byMonth[1]&&byMonth[4])assert(avg(4)>avg(1));
});

test('staff screen explains no dismissal and shows cut/restore buttons',()=>{
 const app=boot();app.run('skipIntro();state='+JSON.stringify(withStaff(3))+';showStaffManagement()');
 assert.match(app.get('shopDialogBody').innerHTML,/給与を２割下げる/);assert.match(app.get('shopDialogBody').innerHTML,/解雇できません/);
 app.run("state=E.extension.cutWage(state,state.staff[0].id);showStaffManagement()");
 assert.match(app.get('shopDialogBody').innerHTML,/元の給与に戻す/);
});

test('catch scales with people aboard: captain alone 40%, +1 crew 100%, +2 crew 130%',()=>{
 let s=E.createState();s.turn=25;s.owner=80000000;s=E.lendByOwner(s,60000000);s.history=[12,24].map(turn=>({turn,balances:{売上高:20000000,売上原価:10000000,減価償却費:1000000}}));s.opening={...s.balances};s.pendingEntries=[];s.pendingBorrowing=0;
 s=X.buyFishery(s,0,bank);s.actionLocked=null;
 const people=[{id:'crew-1',role:'captain',characterId:null,wage:350000,hiredTurn:1},{id:'crew-2',role:'crew',characterId:null,wage:180000,hiredTurn:1},{id:'crew-3',role:'crew',characterId:null,wage:180000,hiredTurn:1}];
 const q=n=>{for(let t=26;t<60;t++){const x=structuredClone(s);x.turn=t;x.expansion.fishery.crew=structuredClone(people.slice(0,n));X.monthly(x);if(x.expansion.fishery.last.days)return x.expansion.fishery.last.quantity;}};
 const [one,two,three]=[1,2,3].map(q);
 assert(Math.abs(one/two-.4)<.01,String(one/two));assert(Math.abs(three/two-1.3)<.01,String(three/two));
});

test('monthly boat assignment: empty store fixes クエ to tend, moving someone back frees the action, next month re-locks',()=>{
 let s=E.createState();s.turn=25;s.owner=80000000;s=E.lendByOwner(s,60000000);s.history=[12,24].map(turn=>({turn,balances:{売上高:20000000,売上原価:10000000,減価償却費:1000000}}));s.opening={...s.balances};s.pendingEntries=[];s.pendingBorrowing=0;
 s=X.buyFishery(s,0,bank);s.actionLocked=null;s.expansion.fishery.crew=[{id:'crew-1',role:'captain',characterId:null,wage:350000,hiredTurn:1}];s.staff=[{id:'staff-2',role:'employee',wage:250000,hiredTurn:1}];
 const idle=structuredClone(s);idle.actionLocked='bank';assert.throws(()=>X.transferStaff(idle,'staff-2','boat'),/使用済み/);
 s=X.transferStaff(s,'staff-2','boat');assert.equal(s.actionLocked,'tend');assert(X.storeUnmanned(s));assert.throws(()=>E.consultBank(s));
 const back=X.transferStaff(s,'staff-2','store');assert.equal(back.actionLocked,null);assert.equal(E.staffService(back.staff[0]),800);
 const r=E.run(s,E.recommend(s,'tend','list'),'list','improve');E.assertState(r.state);assert.equal(r.report.action,'tend');assert(r.report.entries.some(e=>e.memo.startsWith('乗船手当')));
 const n=E.next(E.compact(r.state));assert.equal(n.actionLocked,'tend');assert.equal(n.storeDutyTurn,n.turn);
 const app=boot();app.run('skipIntro();state='+JSON.stringify(n)+';renderPlanning()');assert.match(app.get('staffAdvice').textContent,/店番がいない/);assert.match(app.get('actions').innerHTML,/data-value="(improve|sales)" disabled/);assert.doesNotMatch(app.get('actions').innerHTML,/data-value="tend" disabled/);
});

test('銀行員Aは語尾が「ゆ」',()=>{
 const app=boot();app.run('skipIntro()');
 app.run("el('yuProbe').innerHTML=bankerSpeech('流れです。増えますが、利益にはなりません。いかがでしょうか？')");
 assert.match(app.get('yuProbe').innerHTML,/流れゆ。増えますが、利益にはなりませんゆ。いかがゆ？/);
});

test('after the first hire, applicants come every 4-6 months (about five) and only in that month',()=>{
 const gaps=[];for(let seed=1;seed<=40;seed++){const s=R.create(seed);s.staff=[{id:'staff-1',role:'parttime',wage:120000,hiredTurn:1}];const open=[];for(let t=1;t<=120;t++){s.turn=t;if(E.recruitment(s).open)open.push(t);}for(let i=1;i<open.length;i++)gaps.push(open[i]-open[i-1]);}
 assert(gaps.every(g=>g>=4&&g<=6));const avg=gaps.reduce((a,b)=>a+b,0)/gaps.length;assert(avg>4.7&&avg<5.3,String(avg));
 assert(E.recruitment(E.createState()).open,'first hire is always possible');
});

test('集客投資: a tournament sponsorship is offered in about one month in five',()=>{
 let n=0,total=0;for(let seed=1;seed<=20;seed++){const s=R.create(seed);for(let t=2;t<=120;t++){s.turn=t;total++;if(E.sponsorEvent(s))n++;}}
 assert(n/total>.17&&n/total<.23,String(n/total));
});

test('the month a boat is bought, the co-op supplies captain and crew without an applicant month or action',()=>{
 let s=E.createState();s.turn=25;s.owner=80000000;s=E.lendByOwner(s,60000000);s.history=[12,24].map(turn=>({turn,balances:{売上高:20000000,売上原価:10000000,減価償却費:1000000}}));s.opening={...s.balances};s.pendingEntries=[];s.pendingBorrowing=0;s.staff=[{id:'staff-1',role:'parttime',wage:120000,hiredTurn:1}];
 while(E.recruitment(s).open)s.turn++;s=X.buyFishery(s,0,bank);assert(X.coopHiring(s));const locked=s.actionLocked;
 s=X.hireCrew(X.hireCrew(s,'captain'),'crew');assert.equal(s.expansion.fishery.crew.length,2);assert.equal(s.actionLocked,locked);
 const r=E.run(s,E.recommend(s,s.actionLocked,'list'),'list',s.actionLocked);const n=E.next(E.compact(r.state));
 if(!E.recruitment(n).open)assert.throws(()=>X.hireCrew(n,'crew'));
});
