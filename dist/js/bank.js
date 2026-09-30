/* Game loan proposals. Financial score is supplied by the existing assessment. */
(function(root){
'use strict';
const E=root.ShopEngine||(typeof require==='function'?require('./engine.js'):null);
const money=n=>n.toLocaleString('ja-JP')+'円';
function startupSupport(s,a,purpose='short'){
 const first=s.history.find(h=>h.turn===12);
 if(purpose!=='startup'||s.turn<13||s.turn>24||!first||E.profit(first.balances)>=0)return a;
 const end=s.closed?s.turn:s.turn-1;
 const months=[end-1,end].map(t=>{const h=s.history.find(x=>x.turn===t),prev=s.history.find(x=>x.turn===t-1),profit=h?(h.monthProfit??E.profit(h.balances)-(t%12===1?0:E.profit(prev?.balances||{}))):null,interest=h?.interestExpense??s.entries.filter(e=>e.turn===t&&e.debit==='支払利息').reduce((n,e)=>n+e.amount,0);const base=t%12===1?{}:prev?.balances||{},cashFlow=h?E.ordinary(h.balances)-E.ordinary(base)+(h.balances.減価償却費||0)-(base.減価償却費||0):null;return {turn:t,profit,interest,cashFlow};});
 const equity=(s.balances.資本金||0)+(s.balances.繰越利益剰余金||0)+E.profit(s.balances)+(s.balances.役員借入金||0)-(s.balances.役員貸付金||0);
 const eligible=months.every(x=>x.cashFlow!==null&&x.cashFlow>0)&&equity>0&&(!s.ended||s.cashCrisis?.status==='pending')&&((s.balances.預金||0)>=0||s.cashCrisis?.status==='pending')&&!(s.balances.役員貸付金||0)&&!(s.balances.未収利息||0);
 const need=Math.min(1500000,Math.max(0,-E.profit(first.balances)));
 const rate=Math.max(3,a.rate||5),monthlyCashProfit=Math.max(0,Math.min(...months.map(x=>(x.cashFlow||0)+(x.interest||0))));const startupLoans=(s.loans||[]).filter(l=>l.kind==='startup'),balance=startupLoans.reduce((n,l)=>n+l.balance,0),executed=startupLoans.reduce((n,l)=>n+l.amount,0);const existingPayment=E.scheduled({...s,turn:s.turn+1});const affordable=Math.max(0,monthlyCashProfit-existingPayment.principal-existingPayment.interest),repaymentLimit=Math.floor(affordable/(1/60+rate/1200)/10000)*10000,additional=eligible?Math.max(0,Math.min(1500000-executed,need-executed,repaymentLimit)):0,limit=balance+additional;
 return {...a,startup:true,startupMonths:months,eligible,workingNeed:need,rate:Math.max(3,a.rate||5),short:{limit,balance,available:Math.max(0,limit-balance),excess:Math.max(0,balance-limit)}};
}
function quote(s,a,purpose='short'){
 a=startupSupport(s,a,purpose);
 const equipment=!['short','startup'].includes(purpose),spec=equipment?E.EQUIPMENT[purpose]:null;
 if(equipment&&!spec)throw Error('設備を選んでください');
 const facility=equipment?a.equipment:a.short;
 const need=equipment?spec.cost:Math.max(0,a.workingNeed-facility.balance);
 const months=purpose==='startup'?60:equipment?Math.min(Math.max(12,a.years*12),spec.life):3;const termLimit=equipment?Math.max(0,(a.capacity||0)*months/12-(facility.balance||0)):Infinity;const limit=Math.floor(Math.max(0,Math.min(facility.available,termLimit,equipment?spec.cost:Infinity)));
 const round=n=>Math.max(0,Math.floor(n/10000)*10000);const amounts=[round(need*.5),round(need),round(limit)];
 return {purpose,need,limit,amounts,months,rate:a.rate,equipment,spec};
}
function assess(s,a,purpose,amount){
 a=startupSupport(s,a,purpose);const q=quote(s,a,purpose),reasons=[];
 if(purpose==='startup'&&!a.startup)return {...q,status:'denied',reasons:['創業赤字補填融資は初年度決算が赤字の２年目のみ対象です。']};
 if(a.startup&&!a.eligible)return {...q,status:'denied',reasons:['創業赤字補填融資は、直近の確定２か月が連続で月次CF（経常利益＋減価償却費）が黒字であることが条件です。純資産がプラスで、役員貸付金・未収利息がなく、支払可能な状態も必要です。',...a.startupMonths.map(x=>'第'+x.turn+'月の月次CF：'+(x.cashFlow===null?'未確定':money(x.cashFlow)))]};
 if(!Number.isSafeInteger(amount)||amount<=0)return {...q,status:'invalid',reasons:['希望額を選び直してください。']};
 if(a.score===null)return {...q,status:'pending',reasons:['まだ通期決算がないため、実績に基づく審査を保留します。最初の３月決算を終えてからお越しください。']};
 if(!a.eligible){
 if(a.score<50)reasons.push('総合スコアが'+a.score+'点で、融資基準の50点に届いていません。');
 for(const m of (a.metrics||[]).filter(m=>m.points!==null&&m.points<m.max*.5))reasons.push(m.name+'が'+m.value+'で、評価を下げています。');
 for(const r of (a.reasons||[]).filter(r=>r.includes('２期連続')))reasons.push(r+'。利益の改善を確認したいです。');
 if((s.balances.役員貸付金||0)>0)reasons.push('役員貸付金が残り、会社と個人の資金分離で減点されています。会社への返済をご検討ください。');
 if((s.balances.未収利息||0)>0)reasons.push('役員貸付利息が未回収で10点減点されています。');
 if((s.balances.預金||0)<0)reasons.push('預金が不足し、支払不能の状態です。');
 const equity=(s.balances.資本金||0)+(s.balances.繰越利益剰余金||0)+E.profit(s.balances)+(s.balances.役員借入金||0)-(s.balances.役員貸付金||0);if(equity<=0)reasons.push('純資産が０以下で、財務基盤の改善が必要です。');if(!reasons.length)reasons.push('返済力と財務内容の改善が必要です。');
 return {...q,status:'denied',reasons};
 }
 if(purpose==='short'&&a.workingEligible===false)return {...q,status:'denied',reasons:['赤字の穴埋めだけの短期融資はできません。CFが赤字の場合は、運転資金回転３か月以内・自己資本比率20％以上・流動比率100％以上・役員貸付と未収利息なしを条件に、運転資金の範囲で判断します。']};
 if(q.equipment&&a.latestCashFlow!==undefined&&!(a.latestCashFlow>0))return {...q,status:'denied',reasons:['直近年度の経常利益＋減価償却費が０以下で、設備資金の返済原資を確認できません。']};
 if(q.limit===0)return {...q,status:'denied',reasons:[q.equipment&&a.capacity<=0?'年間弁済可能額が０以下なので、設備融資の返済原資を確認できません。':'既存借入を差し引くと、追加融資の余力がありません。']};
 if(amount>q.limit){
 reasons.push('希望額'+money(amount)+'は今回の上限'+money(q.limit)+'を'+money(amount-q.limit)+'上回っています。');
 reasons.push(purpose==='startup'?'創業赤字額・150万円の上限・直近月次CFによる５年間の元利返済余力で審査しています。':q.equipment?'設備代金と、年間弁済可能額に基づく設備枠の両方が上限です。':'売掛金＋商品−買掛金を基に、格付けの掛目と既存の短期借入を反映しています。');
 return {...q,status:'excess',reasons};
 }
 const upsell=a.grade==='A'&&q.limit-amount>=10000?q.limit:null;
 return {...q,status:'approved',amount,upsell,reasons:[(a.startup?'創業赤字ですが、直近２か月の月次CF黒字を確認しました。創業赤字補填は上限150万円・最長５年の長期借入です。直近２か月の低い方のCFに既存支払利息を戻し、翌月の既存元利返済を控除して、新規元利返済を賄える額に絞っています。':'')+'赤字額そのものの穴埋めではなく、CFによる返済原資または運転資金の裏付けを確認しています。この希望額で融資可能です。年利'+q.rate.toFixed(1)+'％です。']};
}
function execute(s,a,purpose,amount){
 const d=assess(s,a,purpose,amount);
 if(d.status!=='approved')throw Error(d.reasons.join(''));
 if(s.closed||s.ended||s.turn>=120)throw Error('次の月の経営画面でお申し込みください。');
 if(s.bankBorrowedTurn===s.turn)throw Error('今月の融資は実行済みです。');
 if(s.actionLocked&&!(s.actionLocked==='bank'&&s.bankConsultedTurn===s.turn))throw Error('今月の行動は使用済みです。銀行への申込みは次の月に行ってください。');
 if(d.equipment&&(s.equipment[purpose]||d.spec.requires&&!s.equipment[d.spec.requires]))throw Error('今月はこの設備を購入できません。');
 if(d.equipment&&s.balances.預金+amount<E.gross(s,d.spec.cost))throw Error('自己資金が不足しています。');
 let n=s.bankConsultedTurn===s.turn?s:E.consultBank(s);
 n=E.fundLoan(n,{amount,rate:d.rate,months:d.months,kind:purpose==='startup'?'startup':d.equipment?'equipment':'short'});
 // Consultation, funding and the linked purchase form one atomic owner action.
 if(d.equipment){n.actionLocked=null;n=E.buy(n,purpose);}
 E.assertState(n);return n;
}
function renew(s,a,index,target=s.loans?.[index]?.balance){
 const l=s.loans?.[index];if(s.closed||s.ended||!l||l.kind!=='short'||l.balance<=0||!Number.isSafeInteger(target)||target<0||s.turn<(l.due||l.start+l.months)-1||s.turn>(l.due||l.start+l.months))throw Error('更新の対象時期・金額ではありません');
 const increase=target>l.balance;
 if(increase&&(s.renewalAttemptTurn===s.turn||s.bankBorrowedTurn===s.turn||s.actionLocked&&!(s.actionLocked==='bank'&&s.bankConsultedTurn===s.turn)))throw Error('今月は増額更新の申込みができません');
 let n=structuredClone(s);
 if(increase){if(n.bankConsultedTurn!==n.turn)n=E.consultBank(n);n.renewalAttemptTurn=n.turn;}
 const total=(s.balances.短期借入金||0)-l.balance+target,limit=a.short.limit??a.short.available+a.short.balance;
 const approved=target<l.balance||target===0||(a.eligible&&a.workingEligible!==false&&total<=limit);
 if(!approved){n.renewalDecision={status:'denied',index,target,reason:'更新後の短期借入総額が審査上の枠を超えるか、融資条件を満たしません。元の期日は変わりません。'+(increase?'増額申込みのため今月の行動は消費しました。':'行動は消費していません。')};return n;}
 n=E.renewLoan(n,index,a.rate||l.rate,target);n.renewalDecision={status:'approved',index,target,reason:increase?'増額更新を承認しました。今月の行動を消費しました。':target<l.balance?'差額を返済して減額更新しました。行動消費はありません。':'同額更新しました。行動消費はありません。'};return n;
}
const api={startupSupport,quote,assess,execute,renew};root.BankLoans=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
