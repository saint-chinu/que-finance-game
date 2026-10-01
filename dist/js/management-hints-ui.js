/* Decision cues drawn from the current game; these never execute purchases or change rules. */
function boatDutyMessage(){
 if(!Expansion.storeUnmanned(state))return '';
 let streak=0;for(const h of [...state.history].reverse()){if(!h.storeDuty)break;streak++;}
 return '<b>店員が0人のため、クエは店番に固定されています。</b> 集客投資・募集月の採用・銀行相談を行うには、多角化メニューで船員を1人「店に回す」にしてください。配置変更は行動を使わず、給与はそのままです。'+(streak>=3?' <strong>店番固定が'+streak+'か月続いています。</strong>３期目以降、販促を長く休むと集客力が下がります。漁業と店の利益を分けて確認しましょう。':'店員を確保するまでは、翌月も同じ制限になります。')+' 船の人数を減らすと漁獲も減るため、店と船の収支を比べて決めましょう。';
}
(()=>{
 const notes=document.createElement('section');notes.id='managementHints';notes.hidden=true;document.getElementById('staffAdvice').after(notes);
 function renderHints(){
  const boat=boatDutyMessage(),r=lastReport,nearCap=r&&!r.provisional&&r.visitors>=r.limit*.9;
  notes.innerHTML=boat?'<div class="management-note">'+boat+'<button type="button" data-review-boat>店と船の配置を見る</button></div>':nearCap?'<details class="management-note"><summary>来店数が店の受入上限に近づいています</summary><p>直近の来店は'+r.visitors.toLocaleString()+'人、集客上限は'+r.limit.toLocaleString()+'人です。採用で接客力だけ増やしても、店の上限は増えません。設備を増やす場合は維持費・返済も含めて試算しましょう。資金が足りなければ銀行の設備融資を相談できます。</p><button type="button" data-review-investment>設備と借入を試算する</button></details>':'';
  notes.hidden=!notes.innerHTML;
  if(boat){const recruitment=document.getElementById('recruitmentNotice');if(recruitment)recruitment.textContent='採用には先に店舗の人員配置が必要です。「店と船の配置を見る」から、船員を1人店に回してください。';}
 }
 const planning=renderPlanning;renderPlanning=function(){planning();renderHints();};
 const report=renderReport;renderReport=function(){report();const r=statementReport;if(!r.provisional&&boatDutyMessage()){const note=document.createElement('div');note.className='management-note report-management-note';note.innerHTML=boatDutyMessage()+'<button type="button" data-review-segments>店と漁業の収支を確認</button>';document.getElementById('reportQuickSummary').append(note);}};
 document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-review-boat')){showDiversification();const crew=state.expansion.fishery.crew.find(p=>p.role==='crew')||state.expansion.fishery.crew[0],target=crew&&[...document.querySelectorAll('[data-staff-transfer][data-to="store"]')].find(button=>button.dataset.staffTransfer===crew.id);target?.focus();target?.scrollIntoView?.({block:'center'});}else if(b.hasAttribute('data-review-investment'))showInvestmentPlan();else if(b.hasAttribute('data-review-segments'))showSegments();});
 renderHints();
})();
