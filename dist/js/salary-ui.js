/* Decide officer pay once after each March close, before the new April is finalized. */
function annualSalaryDue(){return introComplete&&!state.closed&&!state.ended&&state.turn>1&&month(state.turn)===4&&state.expansion?.salarySetYear!==fy(state.turn);}
function offerAnnualSalaryReview(){
 if(!annualSalaryDue())return false;
 const dialog=el('annualSalaryDialog');if(dialog.open)return true;
 el('annualSalaryTitle').textContent=`第${fy(state.turn)}期の役員報酬を決める`;
 el('annualSalaryCurrent').textContent=`前期は月${yen(state.officerSalary||300000)}。決算を終えたので、今期の報酬を年1回見直せます。`;
 el('annualSalaryAmount').value=String(state.officerSalary||300000);el('annualSalaryError').textContent='';updateAnnualSalaryPreview();
 dialog.showModal();el('annualSalaryAmount').focus();return true;
}
function updateAnnualSalaryPreview(){
 const amount=Number(el('annualSalaryAmount').value),valid=Number.isSafeInteger(amount)&&amount>=120000&&amount<=1000000&&amount%1000===0;
 el('confirmAnnualSalary').disabled=!valid;
 el('annualSalaryPreview').textContent=valid?`会社の毎月の支出：${yen(amount+Math.floor(amount*.15))}（報酬＋社保）。社長の手取り：${yen(Math.floor(amount*.8))}。`:'月12万〜100万円の範囲で、1,000円単位で入力してください。';
 el('confirmAnnualSalary').textContent=valid?`月${yen(amount)}で今期を始める`:'金額を確認してください';
 document.querySelectorAll('[data-annual-salary]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.annualSalary)===amount)));
}
(()=>{
 const dialog=document.createElement('dialog');dialog.id='annualSalaryDialog';dialog.className='annual-salary-dialog';dialog.setAttribute('aria-labelledby','annualSalaryTitle');
 dialog.innerHTML='<header><h2 id="annualSalaryTitle"></h2><button type="button" id="laterAnnualSalary">あとで決める</button></header><p id="annualSalaryCurrent"></p><div class="annual-salary-presets" role="group" aria-label="役員報酬の候補"><button type="button" data-annual-salary="200000">20万円</button><button type="button" data-annual-salary="250000">25万円</button><button type="button" data-annual-salary="300000">30万円</button></div><label class="annual-salary-input" for="annualSalaryAmount">月額の役員報酬（円）<input id="annualSalaryAmount" type="number" inputmode="numeric" min="120000" max="1000000" step="1000"></label><p id="annualSalaryPreview" aria-live="polite"></p><p class="note">同じ金額のままでも大丈夫です。決めた報酬は今期の4月から翌3月まで適用し、次に変えられるのは翌年の決算後です。</p><p class="note">ゲーム内の手取りは報酬の80%、生活費は月20万円です。不足分は会社から借りる形になります。</p><p id="annualSalaryError" role="alert"></p><button type="button" class="confirm" id="confirmAnnualSalary"></button>';
 document.body.append(dialog);
 const reminder=document.createElement('section');reminder.id='annualSalaryReminder';reminder.className='panel annual-salary-reminder';reminder.hidden=true;
 reminder.innerHTML='<b>決算後の役員報酬の見直し</b><p>4月を確定する前に、今期の報酬を決めましょう。同じ金額を続けることもできます。</p><button id="reviewAnnualSalary">今期の役員報酬を決める</button>';
 el('purchasePlan').before(reminder);
 el('annualSalaryAmount').addEventListener('input',updateAnnualSalaryPreview);
 el('reviewAnnualSalary').addEventListener('click',offerAnnualSalaryReview);
 el('laterAnnualSalary').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{const b=event.target.closest('[data-annual-salary]');if(b){el('annualSalaryAmount').value=b.dataset.annualSalary;updateAnnualSalaryPreview();}});
 el('confirmAnnualSalary').addEventListener('click',()=>{
  if(!annualSalaryDue()){dialog.close();return;}
  try{state=E.extension.setSalary(state,Number(el('annualSalaryAmount').value));dialog.close();renderPlanning();saveGame();toast(`今期の役員報酬を月${yen(state.officerSalary)}に決めました。`);(el('shopDialog').open?el('closeShopDialog'):el('commit')).focus();}catch(error){el('annualSalaryError').textContent=error.message;}
 });
 const previousAdvance=advanceMonth;advanceMonth=function(){const turn=state.turn;previousAdvance();if(turn!==state.turn)offerAnnualSalaryReview();};
 const previousRender=renderPlanning;renderPlanning=function(){previousRender();reminder.hidden=!annualSalaryDue();};
 const previousClose=closeMonth;closeMonth=function(...args){if(offerAnnualSalaryReview())return;return previousClose(...args);};
 const previousCruise=showCruise;showCruise=function(){if(offerAnnualSalaryReview())return;return previousCruise();};
 renderPlanning();
})();
