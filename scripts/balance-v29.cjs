const E=require('../dist/js/engine.js'),B=require('../dist/js/bank.js');
const {boot}=require('../tests/helpers/ui.cjs');
const fs=require('node:fs');
const app=boot();app.run('skipIntro()');
function assessment(s){return app.run('state='+JSON.stringify(s)+';currentBankAssessment()');}
function simulate(policy,seed=73129){
 let s=E.createState();s.rng=seed;const annual=[],investments=[];let minCash=s.balances.預金;
 for(let t=1;t<=120;t++){
  const improving=policy!=='neglect'&&!(policy==='stopAfter3'&&t>36)&&[8,11].includes((t-1)%12+1);
  let action=improving?'improve':'tend';
  if(policy==='expansion'||policy==='expansionPromote'){
   const equipment=({37:'freezer',49:'warehouse',73:'tank',85:'fixture'})[t];
   if(equipment){
    const a=assessment(s),q=B.quote(s,a,equipment),amount=Math.floor(Math.min(q.need,q.limit)/10000)*10000;
    const d=B.assess(s,a,equipment,amount);
    if(d.status==='approved'&&s.balances.預金+amount-E.gross(s,E.EQUIPMENT[equipment].cost)>E.fixedCosts(s)*3){
     s=B.execute(s,a,equipment,amount);investments.push({turn:t,equipment,loan:amount,rate:d.rate,months:d.months,score:a.score});
    }else investments.push({turn:t,equipment,status:d.status,limit:q.limit,score:a.score});
   }
   if(t===61&&s.equipment.freezer)s=E.hire(s,'parttime');
  }
  if(policy==='expansionPromote')for(const e of s.staffEvents||[])if(e.type==='offer'&&e.status==='pending')s=E.promoteStaff(s,e.staffId);
  action=s.actionLocked||action;
  const r=E.run(s,E.recommend(s,action),'list',action);s=r.state;
  E.assertState(s);
  if(r.report.opening+r.report.inflow-r.report.outflow!==s.balances.預金)throw Error('cash reconciliation');
  minCash=Math.min(minCash,s.balances.預金);
  if(t%12===0)annual.push({year:t/12,profit:E.profit(s.balances),cash:s.balances.預金,sales:s.balances.売上高,attraction:E.effectiveAttraction(s),loyalty:E.growthStatus(s).loyalty,averageSpend:r.report.averageSpend});
  if(s.ended||t===120)break;
  s=E.next(E.compact(s)||s);
 }
 return {policy,seed,stopTurn:s.turn,survived:!s.ended&&s.turn===120,minCash,annual,investments,loans:s.loans||[],audits:s.taxAudits.length,staffEvents:s.staffEvents,additionalTax:s.taxAudits.reduce((n,a)=>n+(a.additionalTax||0),0)};
}
if(require.main===module){
 const count=Number(process.argv[2]||20),results=[];
 for(const policy of ['steady','neglect','stopAfter3','expansion']){
  for(let i=0;i<count;i++)results.push(simulate(policy,(73129+i*982451653)>>>0));
  const selected=results.filter(r=>r.policy===policy),median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
  console.log(JSON.stringify({policy,survived:selected.filter(r=>r.survived).length,total:count,medianStop:median(selected.map(r=>r.stopTurn)),annualMedian:Array.from({length:10},(_,i)=>{const rows=selected.map(r=>r.annual[i]).filter(Boolean);return rows.length?{year:i+1,n:rows.length,profit:median(rows.map(r=>r.profit)),cash:median(rows.map(r=>r.cash)),loyalty:median(rows.map(r=>r.loyalty))}:null})}));
 }
 fs.writeFileSync(process.argv[3]||'/tmp/capital-v29-balance.json',JSON.stringify(results,null,2));
}
module.exports={simulate};
