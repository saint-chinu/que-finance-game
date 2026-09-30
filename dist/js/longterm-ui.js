/* Long-running shop relationships and record-based tax audit events. */
const overviewBeforeGrowth=renderOverview;
renderOverview=function(){
 overviewBeforeGrowth();const g=E.growthStatus(state),assortment=E.assortmentStatus(state);
 el('shopOverview').innerHTML+=`<section class="customer-growth"><h3>常連と店のこれから</h3><div class="growth-metrics"><span>常連の定着 <b>${Math.round(g.loyalty*100)}％</b></span><span>営業努力から <b>${g.idleMonths}か月</b></span><span>品揃え <b>${assortment.stocked}／${assortment.total}種類</b></span></div><p>${state.turn<=24?'創業２年間は店を知ってもらう時期。３年目から、過去の営業努力の効果と品揃え・販売の積み重ねが常連の定着につながります。':g.neglectRate>0?`長期の営業不足で忘れられ始めています。今月の集客力低下率は約${(g.neglectRate*100).toFixed(1)}％。品揃えだけではこの低下は止まりません。`:'過去の営業努力が実る月に、品揃えを保って販売できると常連が育ちます。'}</p><details><summary>売上の安定と客単価の仕組み</summary><p>常連が育つと、通常月の需要の振れ幅が小さくなり、買い合わせや竿・リールの購入が増えます。商品の売価は変わらず、１人あたりの購入点数で客単価が上がります。冬の閑散期は残ります。</p><p>全種類の在庫があれば、品揃え不足による自然減は０です。３年目以降、営業努力を９か月より長く怠ると別に集客が減り、年数と放置期間が長いほど減少が強くなります。販促・接客改善、協賛、販売実績のあるセールで営業を続けましょう。</p><p>常連の育成には月末の品揃え８割以上と販売実績、過去の販促効果が必要です。品揃え不足や休業、長期の営業不足が続くと常連も離れます。新しい販促の効果には従来どおり時間がかかります。</p></details></section>`;
};
const reportBeforeGrowth=renderReport;
renderReport=function(){
 reportBeforeGrowth();const r=statementReport;if(r.provisional)return;
 if(r.growth&&r.turn>24)el('tutorialReport').innerHTML+=`<p><b>常連の定着 ${Math.round(r.growth.loyalty*100)} → ${Math.round(r.growth.loyaltyAfter*100)}％</b> ／ 営業不足による集客減 −${r.growth.neglectLoss.toFixed(3)} ／ 販売客１人あたり売上（税抜） ${yen(r.averageSpend||0)}</p>`;
 if(r.audit)el('tutorialReport').innerHTML+=`<div class="audit-notice"><b>税務調査イベント</b><p>${r.audit.reason}。Qと帳簿・回収記録を確認しましょう。</p><button data-audit-turn="${r.audit.turn}">調査の内容を見る</button></div>`;
};
function showTaxAudit(turn){
 const audit=(state.taxAudits||[]).find(a=>a.turn===turn)||state.taxAudits?.at(-1);
 if(!audit){openShop('税務調査',`<p>まだ調査の連絡はありません。３年目以降、帳簿・在庫・税金の確認イベントが発生します。</p><p>売上・仕入・廃棄・消費税・社長との貸し借りは仕訳ログに残ります。役員貸付の元利金は、会社と個人を分けて管理しましょう。</p>`);return;}
 audit.notified=true;saveGame();
 const outstanding=state.balances.未収利息||0;
 openShop(`税務調査 · 第${fy(audit.turn)}期 ${month(audit.turn)}月`,`${audit.status==='pending'?'<p class="audit-notice"><b>税務署から帳簿の確認依頼が来ました。</b></p>':'<p>資料確認済みの調査記録です。</p>'}<div class="que-accounting-lesson"><img src="assets/characters/q.png" alt="顧問税理士Q"><div><b>Q：帳簿と実際の取引を照合しましょう</b><p>調査のきっかけ：${audit.reason}。調査が来ただけで、それだけで追徴が決まるわけではありません。売上・在庫・消費税と、会社から社長への貸付条件を確認します。</p></div></div><dl class="equipment-facts"><div><dt>調査時点の役員貸付金</dt><dd>${yen(audit.ownerLoan)}</dd></div><div><dt>調査時点の未収利息</dt><dd>${yen(audit.unpaidInterest)}</dd></div><div><dt>対象期間の利息計上額</dt><dd>${yen(audit.interestBooked)}</dd></div><div><dt>対象期間の利息回収額</dt><dd>${yen(audit.interestCollected)}</dd></div><div><dt>対象期間の在庫廃棄原価</dt><dd>${yen(audit.waste)}</dd></div><div><dt>調査時点の未払消費税／法人税等</dt><dd>${yen(audit.vatLiability)} ／ ${yen(audit.corporateTax)}</dd></div></dl><h3>Qの確認結果</h3><p>売上・在庫・消費税は自動記帳された帳簿と照合します。廃棄は現金支出の重複ではなく、在庫を損失へ振り替えた記録です。</p>${audit.unpaidInterest>0?'<p class="negative"><b>指摘：役員貸付利息の回収状況を確認してください。</b>利息を計上していても、長期間回収しない状態では、貸付条件と実際の回収・返済の確認が必要です。</p>':'<p>調査時点では未回収の役員貸付利息はありません。</p>'}<p>このゲームの自動記帳の範囲では申告漏れは検出されていないため、この調査で追加の税金や罰金は発生しません。実務では無利息・低利の貸付等が給与課税の対象になることがあり、個別の条件確認が必要です。</p><p>現在の未収利息：<b>${yen(outstanding)}</b>。利息を支払う設定でも、個人預金が足りなければ回収が残ります。生活費と役員報酬も確認しましょう。</p><div class="loan-decisions"><button data-review-audit="${audit.turn}">資料を照合して記録する</button>${outstanding>0?`<button data-review-audit="${audit.turn}" data-collect-interest="true">今後の利息支払いも有効にする</button>`:''}</div><p class="note">支払い設定の変更は次の月次処理から反映。確定済みの月を変更せず、支払うときに「預金／未収利息」を記帳します。調査時期はゲームの設定です。</p><p><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2606.htm" target="_blank" rel="noopener">参考：国税庁「金銭を貸し付けたとき」</a></p>`);
}
const statementsBeforeAudit=openStatements;
openStatements=function(){statementsBeforeAudit();const audit=(state.taxAudits||[]).find(a=>!a.notified);if(audit)showTaxAudit(audit.turn);};
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='taxAuditMenu'||b.dataset.auditTurn)showTaxAudit(Number(b.dataset.auditTurn));
 if(b.dataset.reviewAudit){try{state=E.reviewTaxAudit(state,Number(b.dataset.reviewAudit),b.dataset.collectInterest==='true');saveGame();closeShop();renderPlanning();toast(state.balances.未収利息>0?'資料確認を記録しました。利息の回収は引き続き確認しましょう。':'帳簿の確認を記録しました。');}catch(err){toast(err.message);}}
});
const auditMenu=document.createElement('button');auditMenu.id='taxAuditMenu';auditMenu.className='help-top';auditMenu.textContent='税務調査';document.querySelector('.top').append(auditMenu);
renderPlanning();
