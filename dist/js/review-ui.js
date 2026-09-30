/* v14: cash planning, period reporting and backward-compatible UI additions. */
const basePersonal=renderPersonal;
renderPersonal=function(){basePersonal();el('officerSalary').value=String(state.officerSalary||300000);el('officerSalary').disabled=month(state.turn)!==4||state.closed;};
el('officerSalary').addEventListener('change',()=>{if(month(state.turn)!==4||state.closed)return;const value=Number(el('officerSalary').value);if([180000,200000,300000,400000].includes(value)){state=E.extension.setSalary(state,value);renderPlanning();saveGame();}});
descriptions.法人税等='決算で概算計上する税金です。ゲーム設定：利益800万円以下25％、超過分35％、赤字でも均等割7万円。２か月後の５月に納付します。';
descriptions.未払法人税等='決算で費用計上済みで、まだ納付していない法人税等です。';
descriptions['1年内返済予定長期借入金']='設備借入のうち翌12か月に返済する元金。流動負債に区分し、当座比率にも含めます。';
formalPL=function(b,prior,label,animate=false,cumulative=null,highlightAccounts=null){
 const fields=['売上高','売上原価','売上総利益',...expenseAccounts.filter(a=>!['売上原価','支払利息','法人税等','固定資産売却損'].includes(a)),'営業利益','受取利息','支払利息','経常利益','固定資産売却益','固定資産売却損','法人税等','当期純利益'];
 const val=(x,a)=>a==='当期純利益'?E.profit(x):a==='経常利益'?E.ordinary(x):a==='営業利益'?(x.売上高||0)-expenseAccounts.filter(k=>!['支払利息','法人税等','固定資産売却損'].includes(k)).reduce((n,k)=>n+(x[k]||0),0):a==='売上総利益'?(x.売上高||0)-(x.売上原価||0):x[a]||0;
 const rows=fields.filter(a=>val(b,a)||(prior&&val(prior,a))||(cumulative&&val(cumulative,a))||['売上総利益','経常利益','固定資産売却益','固定資産売却損','法人税等','当期純利益'].includes(a)).map(a=>{const d=prior?val(b,a)-val(prior,a):null,direct=animate&&highlightAccounts?.has(a)&&d!==null&&d!==0;return `<tr class="${['売上総利益','営業利益','経常利益','当期純利益'].includes(a)?'subtotal':''} ${direct?'ledger-highlight':''}"><th>${a}</th><td>${amountText(val(b,a))}</td><td class="${animate&&!direct?'neutral':d<0?'negative':d>0?'positive':'neutral'}">${changeText(d)}</td>${cumulative?`<td>${amountText(val(cumulative,a))}</td>`:''}</tr>`;}).join('');
 return `<div class="formal-caption"><h2>損益計算書</h2><span>単位：千円</span></div><div class="pl-scroll"><table class="formal-table formal-pl"><thead><tr><th>科目</th><th>${cumulative?'当月':'金額'}</th><th>増減<small>${label}</small></th>${cumulative?'<th>期首からの累計</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>`;
};
rowsForPL=function(r){const t=r.turn||1,start=Math.floor((t-1)/12)*12+1;if(!r.annual)return formalPL(plForTurns(t,t),t>1?plForTurns(t-1,t-1):null,'前月比',false,plForTurns(start,t));const prior=state.history.find(h=>h.turn===t-12),ending=state.history.find(h=>h.turn===t);const purchases=state.entries.filter(e=>e.turn>=start&&e.turn<=t&&e.debit==='商品').reduce((n,e)=>n+e.amount,0),returns=state.entries.filter(e=>e.turn>=start&&e.turn<=t&&e.credit==='商品'&&e.type==='retireStock').reduce((n,e)=>n+e.amount,0),netPurchases=purchases-returns;return formalPL(plForTurns(start,t),r.fy>1?plForTurns(t-23,t-12):null,'前期比')+`<div class="cost-bridge"><h3>売上原価のつながり</h3><p>期首商品棚卸高 ${fmt(prior?.balances.商品||0)} ＋ 純仕入高 ${fmt(netPurchases)} − 商品廃棄損 ${fmt(plForTurns(start,t).商品廃棄損||0)} − 期末商品棚卸高 ${fmt(ending?.balances.商品||0)} ＝ 売上原価 ${fmt((prior?.balances.商品||0)+netPurchases-(plForTurns(start,t).商品廃棄損||0)-(ending?.balances.商品||0))}</p><p>純仕入高は仕入から返品を差し引いた金額です。期限切れ・陳腐化・死亡ロスは商品廃棄損として分けています。初年度の開業仕入は当期仕入に含めています。</p></div>`;};
rowsForTB=function(r){return '<p class="formal-foot">試算表は仕訳を科目ごとに集計し、残高や借方・貸方の一致を確認する表です。この画面ではB/S・P/Lの形で表示し、P/Lは当月と期首からの累計を確認できます。</p>'+formalBalance(r.after,r.previousClose||r.before,r.turn===1?'開店時比':'前月末比').replace('貸借対照表','月次残高試算表')+rowsForPL(r);};
// Keep monthly controls usable when returning from bank/trend views.
document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if((id==='monthlyMode'||id==='annualMode')&&(tab==='bank'||tab==='trend')){tab='tb';if(id==='annualMode')tab='bs';renderTable();}},true);
renderPlanning();

const reportBeforeQue=renderReport;
renderReport=function(){
 reportBeforeQue();
 const remark=E.queComment(state,statementReport);
 let box=document.getElementById('queRemark');
 if(!box){box=document.createElement('aside');box.id='queRemark';box.className='que-remark';el('resultChips').before(box);}
 box.hidden=!remark;
 box.innerHTML=remark?`<img src="assets/characters/que.png" alt="クエ"><div><b>クエのぼやき · ${statementReport.month}月</b><p>${remark.text}</p></div>`:'';
 el('runway').textContent=`預金は固定費・返済等の約${Math.max(0,cash()/(E.fixedCosts(state)+E.scheduled(state).principal+E.scheduled(state).interest+E.scheduled(state).tax)).toFixed(1)}か月`;
};
