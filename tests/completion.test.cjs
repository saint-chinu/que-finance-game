const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/js/engine.js'),P=require('../dist/js/progress.js'),B=require('../dist/js/backup.js'),{boot}=require('./helpers/ui.cjs');
function play(months){let s=E.createState(),report;for(let t=1;t<=months;t++){const action=[8,11].includes((t-1)%12+1)?'improve':'tend';const r=E.run(s,E.recommend(s,action),'list',action,{noise:1});s=r.state;report=r.report;if(s.ended||t===months)break;s=E.next(E.compact(s));}return {s,report};}
function payload(s,report){return {version:7,introComplete:true,state:s,lastReport:report,choice:{quantities:E.PRODUCTS.map(()=>0),price:'list',action:'tend'},seen:[],animationQueue:[],entryStage:0,animationReturn:null};}
test('losses are used oldest first, limited to income, expire after ten following years, and exclude taxes',()=>{
 let l=E.applyTaxLosses([],1,-1500000);assert.equal(l.added,1500000);
 l=E.applyTaxLosses(l.lots,2,-500000);assert.equal(l.remaining,2000000);
 l=E.applyTaxLosses(l.lots,3,300000);assert.equal(l.taxable,0);assert.equal(l.used,300000);assert.equal(l.lots[0].remaining,1200000);
 const last=E.applyTaxLosses([{year:1,remaining:100}],11,150);assert.equal(last.used,100);assert.equal(last.taxable,50);
 const expired=E.applyTaxLosses([{year:1,remaining:100}],12,150);assert.equal(expired.used,0);assert.equal(expired.expired,100);
 const {s}=play(36);assert(s.taxAnnual[0].added>0);assert.equal(s.taxAnnual[0].added,-E.ordinary(s.history[11].balances));assert.equal(s.taxAnnual[2].taxable,0);assert.equal(s.taxAnnual[2].assessed,70000);assert.equal(s.taxAnnual[2].used,E.ordinary(s.balances)+(s.taxAnnual[2].addBack||0));
 const original=JSON.stringify(s.balances),count=s.entries.length;E.settleTaxes(s);assert.equal(JSON.stringify(s.balances),original);assert.equal(s.entries.length,count);E.assertState(s);
});
test('legacy carry migration preserves all past balances, taxes and cash and is idempotent',()=>{
 const {s}=play(24);const expected=s.taxLosses;delete s.taxLosses;delete s.taxAnnual;
 const before={balances:structuredClone(s.balances),taxes:structuredClone(s.taxes),history:structuredClone(s.history)};
 E.migrate(s);assert.deepEqual(s.taxLosses,expected);assert.deepEqual(s.balances,before.balances);assert.deepEqual(s.taxes,before.taxes);assert.deepEqual(s.history,before.history);
 const once=JSON.stringify(s);E.migrate(s);assert.equal(JSON.stringify(s),once);
});
test('reviews reconcile annual cash, include partial final years and separate borrowing from profit',()=>{
 let {s}=play(30);const snapshot=JSON.stringify(s),years=P.allReviews(s);
 assert.equal(years.length,3);assert.equal(years[2].months,6);assert.equal(years[2].complete,false);
 for(const r of years)assert.equal(r.openingCash+r.receipts-r.payments,r.cash);
 assert.equal(P.summary(s).profit,s.history.reduce((n,h)=>n+h.monthProfit,0));assert.equal(JSON.stringify(s),snapshot);
 s=E.next(s);s=E.fundLoan(s,{amount:500000,rate:2,months:60,kind:'equipment'});s=E.run(s,E.recommend(s),'list','tend',{noise:1}).state;
 const r=P.review(s,3);assert.equal(r.openingCash+r.receipts-r.payments,r.cash);assert.equal(r.debt,500000);assert.equal(r.profit,E.profit(s.balances));
 s.ended=true;assert.equal(P.summary(s).ended,true);assert.equal(P.summary(s).months,31);
});
test('milestones come from completed records, persist as history and never add funds',()=>{
 const {s}=play(36),snapshot=JSON.stringify(s),a=P.milestones(s);
 assert.equal(a.find(g=>g.id==='winter').turn,12);assert.equal(a.find(g=>g.id==='annualProfit').turn,36);assert.equal(a.find(g=>g.id==='decade').turn,null);
 assert.deepEqual(P.milestones(JSON.parse(snapshot)),a);assert.equal(JSON.stringify(s),snapshot);
});
test('backup roundtrip retains loans, pending choices and first-entry replay; corrupt imports cannot overwrite',()=>{
 const {s,report}=play(14),p=payload(s,report),e=s.entries.findLast(e=>e.before&&e.after);
 p.animationQueue=[e];p.animationReturn='journal';p.entryStage=1;
 const copy=B.decode(B.encode(p));assert.deepEqual(copy.state.balances,s.balances);assert.equal(copy.animationReturn,'journal');assert.deepEqual(copy.lastReport,report);
 const data=new Map([['game','current']]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const bad=structuredClone(p);bad.state.balances.預金++;assert.throws(()=>B.restore(storage,'game',bad));assert.equal(data.get('game'),'current');
 assert.throws(()=>B.decode('{bad'));assert.throws(()=>B.decode(JSON.stringify({...p,version:99})));
 const xss=structuredClone(p);xss.state.entries[0].memo='<img onerror=bad>';assert.throws(()=>B.validate(xss));
 B.restore(storage,'game',copy);assert.equal(data.get('game-before-restore'),'current');assert.equal(B.decode(data.get('game')).state.turn,14);
 const quota={getItem:()=> 'current',setItem:()=>{throw Error('quota');}};assert.throws(()=>B.restore(quota,'game',p),/容量/);
});
test('backup resumed execution is identical to uninterrupted execution',()=>{
 let {s,report}=play(24);const resumed=B.decode(B.encode(payload(s,report))).state;
 const a=E.next(E.compact(s)),b=E.next(resumed);const q=E.recommend(a,'improve');assert.deepEqual(E.run(a,q,'list','improve'),E.run(b,q,'list','improve'));
});
test('full ten-year accounts, final milestone and backup remain complete and balanced',()=>{
 const {s,report}=play(120),summary=P.summary(s);assert.equal(summary.completed,true);assert.equal(summary.months,120);
 assert.equal(summary.profit,(s.balances.繰越利益剰余金||0)+E.profit(s.balances));
 for(const r of summary.years)assert.equal(r.openingCash+r.receipts-r.payments,r.cash);
 assert.equal(P.milestones(s).find(g=>g.id==='decade').turn,120);
 const text=B.encode(payload(s,report));assert(Buffer.byteLength(text)<B.MAX_BYTES);assert.equal(B.decode(text).state.history.length,120);
 const app=boot();app.run('skipIntro();state='+JSON.stringify(s)+';lastReport='+JSON.stringify(report)+';state.taxAudits.forEach(a=>a.notified=true);monthClosed=true;openStatements()');
 assert.match(app.get('shopDialogTitle').textContent,/10年間/);assert.equal(app.run('state.finalReviewSeen'),true);
});
test('year-end review, goals and restore preview work without applying data before confirmation',()=>{
 const {s,report}=play(12),app=boot();app.run('skipIntro()');
 app.run('state='+JSON.stringify(s)+';lastReport='+JSON.stringify(report)+';monthClosed=true;openStatements()');
 assert.match(app.get('shopDialogTitle').textContent,/決算を振り返る/);assert.match(app.get('shopDialogBody').innerHTML,/繰越欠損金/);
 assert.equal(app.run('state.reviewSeen[0]'),1);app.run('showGoals()');assert.match(app.get('shopDialogBody').innerHTML,/最初の冬を越える/);
 const before=app.storage.get('finance-game-v4');app.run('showBackup();stageRestore('+JSON.stringify(B.encode(payload(s,report)))+')');
 assert.match(app.get('restorePreview').innerHTML,/このセーブを復元/);assert.equal(app.storage.get('finance-game-v4'),before);
 app.run('confirmRestore()');assert.equal(app.storage.get('finance-game-v4-before-restore'),before);
 const reload=boot(app.storage);assert.equal(reload.run('state.turn'),12);reload.run('showYearReview(1)');assert.match(reload.get('shopDialogBody').innerHTML,/１年間の確定決算/);
});
