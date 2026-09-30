/* Read-only simulations use the same engine as actual play. */
(function(root){const E=root.ShopEngine||(typeof require==='function'?require('./engine.js'):null);
function simulate(source,plan={},noise=1){let s=structuredClone(source);if(s.closed)s=E.next(s);if(s.closed||s.ended)return {status:'invalidPlan',error:'次の経営月から試算してください。',reason:'次の経営月から試算してください。',rows:[]};const start=s.turn,rows=[],requestedMonths=Math.min(24,plan.months||12),horizon=Math.min(requestedMonths,121-start);if(plan.equipment&&plan.equipment!=='none'&&(plan.delay||0)>=horizon)return {status:'invalidPlan',error:'投資予定月が試算期間または120か月の経営期間を超えています。',reason:'投資予定月が試算期間または120か月の経営期間を超えています。',rows:[],requestedMonths,actualMonths:0};let hired=false;try{for(let i=0;i<Math.min(24,plan.months||12)&&s.turn<=120;i++){
 if(i===(plan.delay||0)&&plan.equipment&&plan.equipment!=='none'){
  const eq=E.EQUIPMENT[plan.equipment];if(plan.loan>0)s=E.fundLoan(s,{amount:plan.loan,rate:plan.rate||5,months:Math.min(plan.term||60,eq.life),kind:'equipment'});
  if(plan.loan>0&&s.actionLocked==='bank'&&s.bankConsultedTurn===s.turn)s.actionLocked=null;
  s=E.buy(s,plan.equipment);
 }
 if(plan.hire&&plan.hire!=='none'&&!hired&&i>=(plan.delay||0)+1&&!s.actionLocked&&E.recruitment(s).open){s=E.hire(s,plan.hire);hired=true;}
 const desiredAction=plan.effort==='quarterly'&&[8,11].includes((s.turn-1)%12+1)?'improve':'tend',action=s.actionLocked||desiredAction;
 const q=E.recommend(s,action,plan.price||'list');const result=E.run(s,q,plan.price||'list',action,{noise});s=result.state;const r=result.report;
 rows.push({turn:s.turn,cash:s.balances.預金,profit:r.monthProfit,sales:(r.after.売上高||0)-(r.before.売上高||0),inventory:s.balances.商品,waste:r.waste,repayment:r.debtService.principal,interest:r.debtService.interest,tax:r.tax.paid+r.consumption.paid,refund:r.consumption.refund,ended:!!s.ended});
 if(s.ended||s.turn===120)break;s=E.next(E.compact(s)||s);
 }return {status:rows.some(r=>r.ended)?'insolvent':rows.length<requestedMonths?'horizon':'completed',reason:rows.some(r=>r.ended)?(s.balances.預金<0?'会社預金が不足しました。':'個人生活費が不足しました。'):null,requestedMonths,actualMonths:rows.length,endTurn:rows.at(-1)?.turn??start,stopTurn:rows.some(r=>r.ended)?rows.at(-1).turn:null,start,rows,profit:rows.reduce((n,r)=>n+r.profit,0),minimumCash:rows.length?Math.min(...rows.map(r=>r.cash)):source.balances.預金,endCash:rows.at(-1)?.cash??source.balances.預金,ended:rows.some(r=>r.ended)};
 }catch(e){return {status:'invalidPlan',reason:e.message,error:e.message,rows,ended:false};}}
function compare(s,plan){const baseline={...plan,equipment:'none',loan:0};return {baseline:simulate(s,baseline,1),investment:simulate(s,plan,1),downside:simulate(s,plan,.85)};}
// Staffing comparisons are read-only branches of the actual monthly engine.
function simulateStaff(source,staffId,policy,plan={},noise=1){
 let s=structuredClone(source);E.initializeStaff(s);if(s.closed)s=E.next(s);
 const rows=[],events=[],target=s.staff.find(x=>x.id===staffId),start=s.turn;
 const result=(status,reason=null)=>({policy,status,reason,start,requestedMonths:12,rows,events,profit:rows.reduce((n,r)=>n+r.profit,0),sales:rows.reduce((n,r)=>n+r.sales,0),payroll:rows.reduce((n,r)=>n+r.payroll,0),minimumCash:rows.length?Math.min(...rows.map(r=>r.cash)):null,endCash:rows.at(-1)?.cash??s.balances.預金,stopTurn:status==='insolvent'?s.turn:null});
 if(s.closed||s.ended||!target||target.role!=='parttime'||!['promote','keep','external'].includes(policy))return result('invalidPlan','次の経営月に在籍するバイトを選んでください。');
 if(!['maintain','tend','sales'].includes(plan.effort||'maintain')||!['list','plus10','minus10','sale'].includes(plan.price||'list'))return result('invalidPlan','営業方針または価格が不正です。');
 const departure=target.departTurn;let replaced=false;
 try{
  E.compact(s);
  for(let i=0;i<12&&s.turn<=120;i++){
   E.processStaffEvents(s);
   const active=s.staff.find(x=>x.id===staffId),offer=s.staffEvents.find(e=>e.type==='offer'&&e.staffId===staffId);
   if(policy==='promote'&&active?.role==='parttime'&&offer&&['pending','deferred'].includes(offer.status)){
    s=E.promoteStaff(s,staffId);events.push({turn:s.turn,type:'promotion'});
   }
   if(!active&&s.turn===departure)events.push({turn:s.turn,type:'departure'});
   if(policy==='external'&&!active&&!replaced){
    if(!s.actionLocked&&s.staff.length<3&&E.recruitment(s).open){s=E.hire(s,'employee');replaced=true;events.push({turn:s.turn,type:'externalHire'});}
    else events.push({turn:s.turn,type:'hireDelayed'});
   }
   const desired=plan.effort==='sales'?(E.sponsorEvent(s)?'sales':'improve'):(plan.effort||'maintain')==='maintain'&&[8,11].includes((s.turn-1)%12+1)?'improve':'tend';
   const action=s.actionLocked||desired,payroll=E.payroll(s)+E.staffSocial(s),q=E.recommend(s,action,plan.price||'list');
   const r=E.run(s,q,plan.price||'list',action,{noise});s=r.state;
   rows.push({turn:s.turn,cash:s.balances.預金,profit:r.report.monthProfit,sales:r.report.productResults.reduce((n,p)=>n+p.sales,0),payroll,service:E.limits(s,action).service,served:r.report.served,visitors:r.report.visitors,action,tax:r.report.tax.paid+r.report.consumption.paid,principal:r.report.debtService.principal,role:s.staff.find(x=>x.id===staffId)?.role||(replaced?'external':'departed')});
   if(s.ended)return result('insolvent',s.balances.預金<0?'会社預金が不足':'個人の生活費が不足');
   if(i===11||s.turn===120)break;
   s=E.next(E.compact(s));
  }
  return result(rows.length===12?'completed':'horizon',rows.length===12?null:'120か月の経営終了までを試算');
 }catch(e){return result('invalidPlan',e.message);}
}
function compareStaff(source,staffId,plan={}){
 return {normal:['promote','keep','external'].map(p=>simulateStaff(source,staffId,p,plan,1)),downside:['promote','keep','external'].map(p=>simulateStaff(source,staffId,p,plan,.85))};
}
const api={simulate,compare,simulateStaff,compareStaff};root.InvestmentPlanner=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
