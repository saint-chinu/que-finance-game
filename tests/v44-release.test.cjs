const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),X=E.extension,R=require('../dist/js/replay.js'),Backup=require('../dist/js/backup.js');
const bank={eligible:true,grade:'A',rate:2,short:{limit:50000}};
function boat(){let s=R.create(91);s.owner=80000000;s=E.lendByOwner(s,60000000);for(let t=1;t<25;t++){const r=E.run(s,E.recommend(s,'tend'),'list','tend');s=E.next(E.compact(r.state));}s=X.buyFishery(s,0,bank);s=X.hireCrew(s,'captain');return X.hireCrew(s,'crew');}
const payload=state=>({version:7,introComplete:true,state,lastReport:null,choice:{quantities:E.PRODUCTS.map(()=>0),price:'list',action:'tend'},seen:[]});
test('new crew wages and reduced wages survive backup export/import without weakening validation',()=>{
 let s=boat();for(const cut of [false,true]){if(cut)s=X.cutWage(s,s.expansion.fishery.crew[1].id);const resumed=Backup.decode(Backup.encode(payload(s))).state;assert.deepEqual(resumed.expansion.fishery.crew,E.migrate(structuredClone(s)).expansion.fishery.crew);}
 const bad=structuredClone(s);bad.expansion.fishery.crew[1].wage=-1;assert.throws(()=>Backup.encode(payload(bad)));
});
test('first hire starts a stable 4–6 month wait, including a late first hire',()=>{
 for(let seed=1;seed<=30;seed++)for(const turn of [1,9,23]){let s=R.create(seed);s.turn=turn;s=E.hire(s,'parttime');const next=E.recruitment(s).next;assert(next-turn>=4&&next-turn<=6,`${seed}: ${turn} -> ${next}`);s.staff=[];s.turn=turn+1;assert.equal(E.recruitment(s).first,false);assert.equal(E.recruitment(s).next,next);}
});
test('returning a person to the store clears an obsolete transfer penalty',()=>{
 let s=boat();s.actionLocked=null;const p=s.expansion.fishery.crew[1];p.hiredTurn=1;p.transferHalf=true;s=X.transferStaff(s,p.id,'store');assert.equal(E.staffService(s.staff[0]),E.ROLES.employee.service);
});
test('captain promotion cancels pay cuts and cannot restore the former crew wage',()=>{
 let s=boat();s.actionLocked=null;s=X.transferStaff(s,s.expansion.fishery.crew[0].id,'store');const id=s.expansion.fishery.crew[0].id;s.expansion.fishery.crew[0].boatMonths=24;s=X.cutWage(s,id);s=X.promoteCaptain(s,id);const p=s.expansion.fishery.crew[0];assert.equal(p.wage,350000);assert(!p.wageCut);assert.throws(()=>X.restoreWage(s,id));
});
