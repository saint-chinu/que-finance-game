/* Month-end liquidity workout: append funding, never rerun sales or payments. */
(function(root){
function install(E){
 const dependencies=()=>({B:typeof module!=='undefined'?require('./bank.js'):root.BankLoans,U:typeof module!=='undefined'?require('./underwriting.js'):root.ShopUnderwriting});
 const guard=s=>{if(!s.closed||!s.ended||s.cashCrisis?.status!=='pending'||s.cashCrisis.turn!==s.turn)throw Error('最後の資金繰り対応中ではありません。');};
 E.crisisInfo=s=>({pending:s.cashCrisis?.status==='pending',company:Math.max(0,-s.balances.預金),personal:Math.max(0,-s.owner),needed:Math.max(0,Math.max(0,-s.owner)-s.balances.預金),ownerAvailable:Math.max(0,s.owner)});
 E.refreshRescueReport=(s,r)=>{
  if(!r||r.turn!==s.turn)return r;const report=structuredClone(r);
  report.entries=s.entries.filter(e=>e.turn===s.turn&&!e.type?.startsWith('yearClose.'));
  report.after={...s.balances};report.inflow=report.entries.filter(e=>e.debit==='預金').reduce((n,e)=>n+e.amount,0);report.outflow=report.entries.filter(e=>e.credit==='預金').reduce((n,e)=>n+e.amount,0);
  report.borrowing=report.entries.filter(e=>e.type==='ownerFunding'||e.type?.startsWith('bankBorrow.')).reduce((n,e)=>n+e.amount,0);
  report.personal={...report.personal,lent:report.entries.filter(e=>e.type==='ownerLoan'||e.type==='rescuePersonal').reduce((n,e)=>n+e.amount,0),unfunded:Math.max(0,-s.owner)};
  report.cashCrisis=structuredClone(s.cashCrisis);return report;
 };
 function finish(n){
  // Pay the already-assessed personal shortfall once; this is an officer loan, not an expense.
  if(n.owner<0&&n.balances.預金>=-n.owner){const amount=-n.owner;E.entry(n,'役員貸付金','預金',amount,'生活費不足の最終資金繰り対応','rescuePersonal');n.owner=0;}
  n.ended=n.balances.預金<0||n.owner<0;
  if(!n.ended)n.cashCrisis.status='resolved';
  const h=n.history.find(h=>h.turn===n.turn);if(h)h.balances={...n.balances};
  E.assertState(n);
  if(!n.ended&&n.turn===120)E.extension.prepareMA?.(n);
  return n;
 }
 E.rescueOwner=(s,amount)=>{guard(s);if(amount===0&&E.crisisInfo(s).needed===0)return finish(structuredClone(s));if(!Number.isSafeInteger(amount)||amount<=0||amount>s.owner)throw Error('個人預金の範囲内で指定してください。');const n=structuredClone(s);E.entry(n,'預金','役員借入金',amount,'最後の資金繰り：社長から会社へ貸付','ownerFunding');n.owner-=amount;return finish(n);};
 E.rescueOffer=(s,purpose='short',amount)=>{guard(s);if(!['short','startup'].includes(purpose))throw Error('運転資金または創業赤字補填を選んでください。');const {B,U}=dependencies(),a=U.assess(s),q=B.quote(s,a,purpose);const ceiling=Math.ceil(E.crisisInfo(s).needed/10000)*10000,requested=amount??ceiling;if(!Number.isSafeInteger(requested)||requested<=0||requested>ceiling)return {status:'denied',requested,reasons:['救済融資は不足額を１万円単位に切り上げた金額までです。翌月の行動は銀行対応になります。'],amounts:[]};const decision=B.assess(s,a,purpose,requested);if(s.bankBorrowedTurn===s.turn)return {...decision,status:'denied',reasons:['今月は融資実行済みです。追加実行はできません。']};return {...decision,requested,amounts:[...new Set([Math.ceil(requested*.5/10000)*10000,requested,Math.min(ceiling,Math.floor(q.limit/10000)*10000)])].filter(x=>x>0)};};
 E.rescueBank=(s,purpose,amount)=>{const d=E.rescueOffer(s,purpose,amount);if(d.status!=='approved')throw Error(d.reasons.join(''));let n=structuredClone(s);n.closed=false;n.ended=false;n=E.fundLoan(n,{amount,rate:d.rate,months:d.months,kind:purpose});n.closed=true;n.pendingBorrowing=0;n.pendingEntries=[];n.bankConsultedTurn=n.turn;n.cashCrisis.bankUsed=true;n.rescueBankActionTurn=n.turn+1;n.rescueBankYears=[...new Set([...(n.rescueBankYears||[]),Math.ceil(n.turn/12)])];return finish(n);};
 E.abandonRescue=s=>{guard(s);const n=structuredClone(s);n.cashCrisis.status='failed';n.ended=true;return n;};
}
const api={install};if(typeof module!=='undefined')module.exports=api;root.ShopRescue=api;
})(globalThis);
