/* Explicit, reload-safe final funding opportunity. */
function showCashRescue(){
 const c=E.crisisInfo(state);if(!c.pending)return;
 if(c.needed===0){openShop('生活費不足の最終対応',`<p>月末の入金で会社預金から生活費不足 ${yen(c.personal)}を補填できます。役員貸付金となり、融資審査に影響します。</p><button id="rescueSettlePersonal">会社から借りて生活費の不足を解消</button><button id="rescueGiveUp">資金調達を断念する</button>`);return;}
 openShop('最後の資金繰り対応',`<p>クエ「このままやと支払いが足りへん……。銀行に相談するか、ワイの預金を入れられへんか考えよ。」</p><p>今月の営業・返済・納税の計算は完了しています。必要資金を確保するまで次の月へ進めません。個人預金の投入は行動を消費しません。銀行で救済融資を受けると、翌月の行動は銀行対応になります。融資額は不足額の１万円単位切上げまでです。</p><dl><dt>会社の不足</dt><dd>${yen(c.company)}</dd><dt>個人生活費の不足</dt><dd>${yen(c.personal)}</dd><dt>追加で必要な資金</dt><dd>${yen(c.needed)}</dd><dt>投入できる個人預金</dt><dd>${yen(c.ownerAvailable)}</dd></dl><button id="rescueConsult">銀行員Aに緊急相談</button><p>個人預金の投入は「役員借入金」。売上・利益は増えません。生活費に残す分も考えてください。個人資産の売却機能はありません。</p><label>会社に貸す金額（円）<input id="rescueOwnerAmount" type="number" min="1" max="${c.ownerAvailable}" step="1" value="${Math.min(c.needed,c.ownerAvailable)}"></label><button id="rescueOwnerSubmit" ${c.ownerAvailable?'':'disabled'}>個人預金を会社に貸し付ける</button><p>資金を確保できなければ、経営終了を選んでください。</p><button id="rescueGiveUp">資金調達を断念する</button>`);
}
function showRescueBank(){
 const cards=['short','startup'].map(p=>{const d=E.rescueOffer(state,p);return `<section><h3>${p==='short'?'短期運転資金':'創業赤字補填（２年目・最長５年）'}</h3><p>${d.reasons.join(' ')}</p><p>融資枠 ${yen(d.limit||0)}／年利 ${d.rate??'—'}％／返済期間 ${d.months}か月</p>${(d.amounts||[]).map(amount=>{const decision=E.rescueOffer(state,p,amount);return `<button data-rescue-loan="${p}" data-amount="${amount}" ${decision.status==='approved'?'':'disabled'}>${yen(amount)}を借りる</button>`;}).join('')}</section>`;}).join('');
 openShop('銀行員A・最後の資金繰り相談',`<p>銀行員A「一時的な資金不足でも、審査基準と融資枠は変わりませんゆ。返済力と足元の試算表を確認しますゆ。」</p><p>設備投資向け融資は使えません。会社から個人生活費を補填する分は役員貸付金となり、その後の審査に影響します。</p>${cards}<button id="rescueBack">個人預金の投入・終了判断へ戻る</button>`);
}
function applyCashRescue(operation){
 try{state=operation();lastReport=E.refreshRescueReport(state,lastReport);if(statementReport?.turn===state.turn)statementReport=lastReport;saveGame();closeShop();renderPlanning();if(el('report').classList.contains('show'))renderReport();if(E.crisisInfo(state).pending)showCashRescue();else if(state.ended)toast('資金調達を断念し、経営を終了しました。');else{toast('不足を解消しました。今月の売上や費用は再計算していません。');openStatements();}}catch(e){toast(e.message);}
}
const planningBeforeRescue=renderPlanning;
renderPlanning=function(){planningBeforeRescue();if(E.crisisInfo(state).pending){el('commit').disabled=false;el('commit').textContent='最後の資金繰り対応へ';el('forecast').textContent='資金不足・最終対応待ち';}};
const reportBeforeRescue=renderReport;
renderReport=function(){reportBeforeRescue();if(E.crisisInfo(state).pending){for(const chip of el('resultChips').querySelectorAll('.negative'))if(chip.textContent.includes('支払不能'))chip.remove();el('resultChips').insertAdjacentHTML('beforeend','<span class="chip negative">資金不足・最終対応待ち</span><button id="reopenCashRescue">最後の資金繰り対応へ</button>');}};
const statementsBeforeRescue=openStatements;
openStatements=function(){statementsBeforeRescue();if(E.crisisInfo(state).pending)showCashRescue();};
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.id==='commit'&&E.crisisInfo(state).pending){event.stopImmediatePropagation();showCashRescue();}
 else if(b.id==='reopenCashRescue'||b.id==='rescueBack')showCashRescue();
 else if(b.id==='rescueConsult')showRescueBank();
 else if(b.id==='rescueOwnerSubmit')applyCashRescue(()=>E.rescueOwner(state,Number(el('rescueOwnerAmount').value)));
 else if(b.id==='rescueSettlePersonal')applyCashRescue(()=>E.rescueOwner(state,0));
 else if(b.dataset.rescueLoan)applyCashRescue(()=>E.rescueBank(state,b.dataset.rescueLoan,Number(b.dataset.amount)));
 else if(b.id==='rescueGiveUp')openShop('経営終了の確認','<p>不足額を解消せず、経営を終了しますか？</p><button id="rescueBack">資金繰り対応へ戻る</button><button id="rescueConfirmEnd">経営を終了する</button>');
 else if(b.id==='rescueConfirmEnd')applyCashRescue(()=>E.abandonRescue(state));
},true);
renderPlanning();
