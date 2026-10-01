/* Monthly review: optional commentary, then optional financial views. */
let reportTableExpanded=false,renderingCompactReport=false;
function syncReportDisclosure(){
 el('reportStatementContent').hidden=!reportTableExpanded;
 el('reportQuickSummary').hidden=reportTableExpanded&&(financialMode==='year'||['bank','trend'].includes(tab));
 el('reportCashDetails').hidden=el('monthlyDetails').hidden;
 for(const button of document.querySelectorAll('#report [data-tab]')){
  const selected=reportTableExpanded&&button.dataset.tab===tab;
  button.setAttribute('aria-expanded',String(selected));
  button.setAttribute('aria-controls','reportStatementContent');
  button.classList.toggle('active',selected);
 }
}
const reportTableBeforeDisclosure=renderTable;
renderTable=function(){
 reportTableBeforeDisclosure();
 if(!renderingCompactReport){reportTableExpanded=true;el('reportFinancialDetails').open=true;}
 syncReportDisclosure();
};
const reportBeforeDisclosure=renderReport;
renderReport=function(){
 renderingCompactReport=true;
 try{reportBeforeDisclosure();}finally{renderingCompactReport=false;}
 const r=statementReport;
 const sales=r.productResults?r.productResults.reduce((n,p)=>n+(p?.sales||0),0):(r.entries||[]).filter(e=>e.credit==='売上高'&&(!e.segmentId||e.segmentId==='retail')).reduce((n,e)=>n+e.amount,0);
 el('reportQuickSummary').innerHTML=r.provisional?'<p>今月は未確定です。試算表・決算書から現在の帳簿を確認できます。</p>':`<span>釣具店売上（税抜）<b>${fmt(sales)}</b></span><span>今月の損益<b>${fmt(r.monthProfit)}</b></span><span>月末預金<b>${fmt(r.after.預金)}</b></span>`;
 if(!r.provisional){
  const b=plForTurns(r.turn,r.turn),revenue=b.売上高||0,cost=b.売上原価||0,gross=revenue-cost,profit=E.profit(b);
  el('reportQuickSummary').innerHTML+='<section class="monthly-pl-summary"><h2>今月のP/L要約 <small>全社・単位：千円</small></h2><dl>'+[['売上高',revenue],['売上原価',cost],['売上総利益（粗利）',gross],['その他の費用等（収益差引）',gross-profit],['当期純利益',profit]].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+amountText(value)+'</dd></div>').join('')+'</dl><p>その他の費用等は、給与・家賃・利息・税金などから、売上以外の収益を差し引いた額です。詳細は下のP/Lで確認できます。</p></section>';
  el('reportTitle').textContent='第'+r.fy+'期 '+r.month+'月の月次報告';
 }
 if(!r.provisional&&sales===0){
  const reason=r.served===0?'店番による接客がなく、今月は販売していません。':'接客はできましたが、在庫と商品ごとの需要が合わず、販売数量が０でした。仕入内容を確認してください。';
  el('reportQuickSummary').innerHTML+=`<p class="sales-zero-note">${reason}</p>`;
 }
 syncReportDisclosure();
};
const statementsBeforeDisclosure=openStatements;
openStatements=function(){
 reportTableExpanded=false;
 for(const id of ['reportCommentDetails','reportFinancialDetails','reportCashDetails'])el(id).open=false;
 for(const detail of document.querySelectorAll('#report details'))detail.open=false;
 statementsBeforeDisclosure();
 syncReportDisclosure();
};
// A second click closes the selected statement; choosing another shows only that one.
document.addEventListener('click',event=>{
 const button=event.target.closest('button[data-tab]');
 if(!button||!button.closest('#report'))return;
 event.stopImmediatePropagation();
 reportTableExpanded=!(reportTableExpanded&&tab===button.dataset.tab);
 tab=button.dataset.tab;
 reportTableBeforeDisclosure();
 syncReportDisclosure();
},true);

function sellingExplanation(action,forecast){
 const service=E.limits(state,action).service;
 const sales=forecast?.products.reduce((n,p)=>n+(p?.sales||0),0);
 const operator=action==='tend'?'クエが店番':action==='improve'?'クエが短縮営業で接客・改善':['bank','investment'].includes(action)?'クエが手続きの合間に短縮営業（接客力65％）':state.staff.length?'従業員が店番':'店番なし・休業';
 let text=`${operator}。接客力目安 ${service.toLocaleString()}人／月（需要・在庫により販売人数は変わります）。`;
 if(forecast)text+=` 売上見込み（税抜）${yen(sales)}。`;
 if(state.storeDutyTurn===state.turn)text+=' 船と店の配置で店員が0人のため、クエは店番に固定されています。船員を1人店に回すと、採用・集客投資・銀行相談を選べます。';
 if(service===0)text+=' 社長が店外へ出る月は、店番のスタッフが必要です。';
 else if(forecast&&sales===0)text+=' 店番はできますが、販売できる在庫・需要がありません。仕入内容を確認してください。';
 else if(action==='sales')text+=' 大会の準備でクエの接客は８割です。協賛の集客効果は翌月から４か月維持、その後減衰して６か月で消えます。';
 return text;
}
const planningBeforeSalesCheck=renderPlanning;
renderPlanning=function(){
 planningBeforeSalesCheck();
 if(state.closed)return;
 const action=currentAction(),forecast=E.forecast(state,choice.quantities,choice.price,action,choice.payment||'cash');
 el('staffAdvice').textContent=`経営者１人・従業員${state.staff.length}人。`+sellingExplanation(action,forecast);
};
const monthBeforeSalesCheck=closeMonth;
closeMonth=function(confirmed=false,allowZeroSales=false){
 if(!confirmed&&!allowZeroSales&&!state.closed&&!state.ended){
  const action=currentAction(),forecast=E.forecast(state,choice.quantities,choice.price,action,choice.payment||'cash');
  if(forecast&&forecast.products.every(p=>!p?.quantity)){
   openShop('この内容では販売が見込めません',`<p>${sellingExplanation(action,forecast)}</p><p>このまま確定すると１か月進み、給与・家賃・販促費などの支払いは発生します。</p><button id="replanCash">仕入・人員・行動を見直す</button><button id="confirmZeroSalesMonth">確認して、この内容で月を確定する</button>`);
   return;
  }
 }
 monthBeforeSalesCheck(confirmed);
};
document.addEventListener('click',event=>{
 if(event.target.closest('button')?.id==='confirmZeroSalesMonth'){closeShop();closeMonth(false,true);}
});
renderPlanning();
