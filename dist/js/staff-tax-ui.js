/* Staff lifecycle, owner-debt repayment and evidence-based tax reassessments. */
for(const list of [debitAccounts,expenseAccounts])if(!list.includes('租税公課'))list.push('租税公課');
descriptions.租税公課='このゲームでは調査で否認された消費税や加算税を計上します。費用ですが、ゲームの法人税計算では損金に算入しません。';
function wageButtons(p,disabled=state.closed||state.ended?'disabled':''){if(p.leavesTurn)return ` <small>退職予定（${turnName(p.leavesTurn-1)}まで勤務）</small>`;return p.wageCut?` <small>減給中 月給${yen(p.wage)}（元${yen(p.baseWage)}）・毎月２割の確率で退職届</small><button data-wage-restore="${p.id}" ${disabled}>元の給与に戻す</button>`:`<button data-wage-cut="${p.id}" ${disabled}>給与を２割下げる</button>`;}
function staffLabel(id){const x=state.staff.find(x=>x.id===id)||state.expansion?.fishery?.crew.find(x=>x.id===id);if(x?.characterId==='madai')return 'マダイ';return E.STAFF_CHARACTERS[x?.characterId]?.name||'スタッフ'+id.split('-').at(-1);}
function staffManagementBody(){
 return `${(state.staffEvents||[]).filter(e=>e.type==='departure'&&(!e.notified||e.turn===state.turn)).map(e=>`<div class="audit-notice"><b>${staffLabel(e.staffId)}が退職しました</b><p>勤続４年の期限までに正社員に登用されなかったため、${turnName(e.turn)}の月初で退職。今月からこの人の接客力と給与はなくなります。</p></div>`).join('')}${(state.staffEvents||[]).filter(e=>e.type==='resign'&&(!e.notified||e.turn===state.turn-1)).map(e=>`<div class="audit-notice"><b>${staffLabel(e.staffId)}が退職届を出しました</b><p>減給に納得できず、${turnName(e.leavesTurn-1)}の勤務を最後に退職します。一度出た退職届は取り消せません。</p></div>`).join('')}<p>このゲームでは会社の都合で解雇できません。給与を２割下げることはできますが、下げた人は毎月２割の確率で退職届を出します。防ぐには元の給与に戻すしかありません。</p><p>バイトは勤続２〜４年の間に正社員への登用を相談します。登用を見送ったまま４年を迎えると退職します。期限はこのゲームの設定です。</p>${state.staff.length?state.staff.map(x=>{
 const offer=state.staffEvents?.find(e=>e.staffId===x.id&&e.type==='offer'),eligible=x.role==='parttime'&&offer&&['pending','deferred'].includes(offer.status)&&state.turn<x.departTurn;
 return `<article class="staff-career">${E.STAFF_CHARACTERS[x.characterId]?`<div class="career-heading"><img src="assets/characters/${E.STAFF_CHARACTERS[x.characterId].image}" alt="${staffLabel(x.id)}"></div>`:''}<h3>${staffLabel(x.id)} · ${E.ROLES[x.role].name}${x.origin==='internal'?'（バイトから登用）':''}</h3><p>勤続 ${Math.floor((state.turn-x.hiredTurn)/12)}年${(state.turn-x.hiredTurn)%12}か月 ／ 月給 ${yen(x.wage??E.ROLES[x.role].wage)} ／ 接客力目安 ${E.ROLES[x.role].service}人／月 ${wageButtons(x)}</p>${x.abilityHintTurn?`<p>クエの気づき：${(state.history.flatMap(h=>h.staffHints||[]).find(h=>h.staffId===x.id)||{}).text||'得意分野が分かってきたで。'}</p>`:''}${x.role==='parttime'?`<p>登用しない場合の退職時期：<strong>${turnName(x.departTurn)}の月初</strong></p>`:''}${x.role==='parttime'?`<button data-staff-compare="${x.id}" ${state.ended?'disabled':''}>登用・継続・外部採用を比較</button>`:''}${eligible?`<div class="audit-notice"><p>「この店で、正社員として働きたいです。」</p><p>登用後は月給25万円＋会社負担社会保険3万7,500円。今月から満額、接客力目安は800人／月（人物・営業状況により変動）。採用枠は増えません。</p><button data-promote-preview="${x.id}" ${state.closed||state.ended?'disabled':''}>登用条件を確認する</button><button data-staff-defer="${x.id}" ${state.closed||state.ended?'disabled':''}>今回は保留する</button></div>`:x.origin==='internal'?'<p>クエ「常連さんの好みも、店の段取りも分かってくれてる。頼りになるで。」</p>':''}</article>`;
 }).join(''):'<p>従業員はいません。</p>'}<details><summary>人員の記録</summary>${(state.staffEvents||[]).filter(e=>e.type!=='offer').map(e=>`<p>${turnName(e.turn)} · ${staffLabel(e.staffId)} ${e.type==='departure'?'登用を見送り退職':e.type==='resign'?'減給により退職届':'正社員に登用'}</p>`).join('')||'<p>まだ記録はありません。</p>'}</details>`;
}
function showStaffManagement(){
 openShop('スタッフの相談と登用',staffManagementBody());
 for(const e of state.staffEvents||[])e.notified=true;saveGame();
}
function previewPromotion(id){
 const candidate=E.promoteStaff(state,id),increase=E.payroll(candidate)+E.staffSocial(candidate)-E.payroll(state)-E.staffSocial(state);
 openShop('正社員登用の確認',`<p>${staffLabel(id)}を今月から正社員に登用します。月給25万円、会社負担社会保険3万7,500円です。</p><p>給与・社会保険の月額増加：<strong>${yen(increase)}</strong>。今月は満額支給します。</p><p>勤続期間と店での経験を引き継ぎます。人数と今月の社長の行動は変わりません。</p><button data-staff-compare="${id}">12か月の比較試算を見る</button><button data-promote-confirm="${id}">この条件で登用する</button><button id="staffMenuReturn">戻って考える</button>`);
}
const staffPlanNames={promote:'正社員に登用',keep:'期限までバイト・補充なし',external:'退職後に外部社員を採用'};
let staffPlanTarget=null;
function showStaffComparison(id){
 const x=state.staff.find(x=>x.id===id&&x.role==='parttime');if(!x||state.ended)throw Error('在籍中のバイトを選んでください。');
 staffPlanTarget=id;
 openShop('社員登用の比較試算',`<p><b>${staffLabel(id)}の今後12か月</b>。${state.closed?'次の未確定月':'今月'}から、同じ営業方針・価格・推奨仕入で３案を比較します。会社の預金・人員・ターンは動きません。</p><div class="staff-plan-controls"><label>社長の営業方針<select id="staffPlanEffort"><option value="maintain">11月・２月は接客改善、ほかは店番</option><option value="tend">毎月店番</option><option value="sales">毎月集客投資（協賛募集の月は協賛）</option></select></label><label>販売価格<select id="staffPlanPrice"><option value="list">定価</option><option value="plus10">10％値上げ</option><option value="minus10">10％値下げ</option><option value="sale">セール</option></select></label><label>次の事業用に残したい預金（円）<input id="staffPlanReserve" type="number" min="0" step="10000" value="0"></label><button id="recalculateStaffPlan">この条件で比較する</button></div><p>確保したい金額は目安です。資金を別口座へ移したり、新事業へ投資したりする処理はありません。保有済みの不動産・漁業の収支は含みます。新規の多角化投資は「多角化」で別に試算してください。</p><div id="staffPlanResults" aria-live="polite"></div><button id="staffMenuReturn">スタッフ画面へ戻る</button>`);
 el('staffPlanEffort').value='maintain';el('staffPlanPrice').value=choice.price||'list';el('staffPlanReserve').value='0';renderStaffComparison();
}
function staffScenarioCard(r,reserve){
 const valid=r.status!=='invalidPlan',complete=r.status==='completed',minimum=r.minimumCash;
 const warning=r.status==='insolvent'?`${turnName(r.stopTurn)}に支払不能：${r.reason}`:r.status==='horizon'?`経営終了までの${r.rows.length}か月のみ` :r.status==='invalidPlan'?r.reason:'12か月継続';
 const events=r.events.map(e=>`${turnName(e.turn)}：${{promotion:'正社員へ登用',departure:'バイト退職',externalHire:'外部社員を採用',hireDelayed:'採用イベント待ち・行動・採用枠の制約で外部採用を延期'}[e.type]}`).join(' ／ ')||'この期間に人員変更なし';
 return `<article class="staff-plan-card"><h3>${staffPlanNames[r.policy]}</h3><p class="${complete?'':'negative'}"><b>${warning}</b></p>${valid?`<dl><div><dt>税引後損益（${r.rows.length}か月分）</dt><dd>${signedYen(r.profit)}</dd></div><div><dt>従業員給与＋会社負担社保</dt><dd>${yen(r.payroll)}</dd></div><div><dt>最低月末預金</dt><dd>${minimum===null?'—':yen(minimum)}</dd></div><div><dt>試算終了時の預金</dt><dd>${yen(r.endCash)}</dd></div>${reserve>0?`<div><dt>希望確保額との差（最低月末）</dt><dd class="${minimum<reserve?'negative':''}">${minimum===null?'—':signedYen(minimum-reserve)}</dd></div>`:''}</dl><p>${events}</p>${!complete?'<p>期間が短い案の利益や人件費は、12か月継続した案と単純比較できません。</p>':''}<details><summary>月ごとの売上・損益・預金</summary><div class="staff-plan-table" tabindex="0" role="region" aria-label="人員案ごとの月次試算"><table><thead><tr><th>年月</th><th>売上高</th><th>税引後損益</th><th>従業員人件費</th><th>月末預金</th><th>接客／来店</th></tr></thead><tbody>${r.rows.map(m=>`<tr><th>${turnName(m.turn)}</th><td>${yen(m.sales)}</td><td>${signedYen(m.profit)}</td><td>${yen(m.payroll)}</td><td>${yen(m.cash)}</td><td>${m.served}／${m.visitors}人</td></tr>`).join('')}</tbody></table></div></details>`:''}</article>`;
}
function renderStaffComparison(){
 const reserve=Number(el('staffPlanReserve').value);if(!Number.isSafeInteger(reserve)||reserve<0)throw Error('確保したい預金は０以上の整数で入力してください。');
 const plan={effort:el('staffPlanEffort').value,price:el('staffPlanPrice').value},comparison=InvestmentPlanner.compareStaff(state,staffPlanTarget,plan),x=state.staff.find(x=>x.id===staffPlanTarget);
 const eligible=!state.closed&&!state.ended&&x?.role==='parttime'&&state.staffEvents?.some(e=>e.staffId===x.id&&e.type==='offer'&&['pending','deferred'].includes(e.status));
 el('staffPlanResults').innerHTML=`<p>登用案は相談済みなら試算初月、相談前なら相談が発生する月に登用。未登用の退職は${x?turnName(x.departTurn):'期限'}の月初。外部採用案は人物未指定の標準社員（接客力目安800人・人物固有の効果なし）を仮定しています。将来の月替わり候補を保証するものではなく、実際の採用結果とは異なります。外部採用は退職後の採用イベントで行動・人数枠が空く最初の月に行い、その月の社長の行動を使います。ほかのバイトの登用は自動で行いません。</p><h3>通常の需要で比較</h3><div class="staff-plan-grid">${comparison.normal.map(r=>staffScenarioCard(r,reserve)).join('')}</div><details class="staff-downside"><summary>需要が通常より15％低い場合も確認する</summary><div class="staff-plan-grid">${comparison.downside.map(r=>staffScenarioCard(r,reserve)).join('')}</div></details><p>最低預金は月末残高の比較です。月中の入出金順序は判定しません。利益には減価償却・税金を含み、預金にはカード代金の回収時期・納税・借入返済も反映します。人件費欄は全従業員の合計で、社長の役員報酬は含みません。</p><p>新規設備・追加融資・資料不備の解消は自動実行しません。今月すでに確定した採用や投資の行動は優先します。営業方針により来店数が変わり、採用しても売上増が給与増を上回るとは限りません。</p><div class="que-accounting-lesson"><img src="assets/characters/que.png" alt="クエ"><div><b>クエ「次の事業に進む余裕はあるか？」</b><p>「人に店を任せたら、ワイが外で動けるようになるな。せやけど給料は毎月いる。利益だけやなく、冬と納税を越えて会社にいくら残るか見とこ！」</p></div></div>${eligible?`<button data-promote-preview="${x.id}">今月の登用条件を確認する</button>`:'<p>登用の実行は、相談が来た後の未確定月にスタッフ画面から行えます。</p>'}`;
}

let ownerRepaymentQuote=null;
function showOwnerRepayment(){
 ownerRepaymentQuote=null;const balance=state.balances.役員借入金||0;
 openShop('会社から社長へ返済する',`<p>役員借入金の残高：<strong>${yen(balance)}</strong> ／ 会社預金 ${yen(cash())}</p><p>現在の残高の３割・５割・全額から選びます。ターンや社長の行動は消費しません。確定済みの月は変更しないため、未確定の月に操作してください。</p><div class="loan-options">${[.3,.5,1].map(r=>{const amount=r===1?balance:Math.floor(balance*r);return `<button data-owner-repay-ratio="${r}" ${state.closed||state.ended||amount<=0||amount>cash()?'disabled':''}><span>${r===1?'全額':r===.3?'３割':'５割'}</span><strong>${yen(amount)}</strong><small>返済後の会社預金 ${yen(cash()-amount)}</small></button>`;}).join('')}</div><p>仕訳は「役員借入金 ／ 預金」。会社の借金と預金が減り、社長の個人預金が増えます。利益は変わりません。銀行審査で自己資本に加算している役員借入金も減るので、運転資金の余裕を残しましょう。</p>`);
}
function previewOwnerRepayment(ratio){
 const next=E.repayToOwner(state,ratio),amount=state.balances.役員借入金-next.balances.役員借入金;
 ownerRepaymentQuote={ratio,turn:state.turn,cash:cash(),balance:state.balances.役員借入金,entries:state.entries.length};
 openShop('役員借入金の返済を確認',`<p>返済額 <strong>${yen(amount)}</strong></p><p>会社預金 ${yen(cash())} → ${yen(next.balances.預金)}<br>役員借入金 ${yen(state.balances.役員借入金)} → ${yen(next.balances.役員借入金)}<br>個人預金 ${yen(state.owner)} → ${yen(next.owner)}</p><p>ターン・社長の行動・利益は変わりません。今月の仕入・給与・納税を払えるか確認してください。</p><button id="confirmOwnerRepayment">この金額を返済する</button><button id="ownerRepaymentReturn">戻る</button>`);
}
function confirmOwnerRepayment(){
 const q=ownerRepaymentQuote;if(!q||q.turn!==state.turn||q.cash!==cash()||q.balance!==state.balances.役員借入金||q.entries!==state.entries.length)throw Error('残高が変わりました。もう一度返済額を確認してください。');
 state=E.repayToOwner(state,q.ratio);ownerRepaymentQuote=null;const e=state.entries.at(-1);closeShop();renderPlanning();saveGame();showNewEntries([e]);
}
function showEvidence(){
 const pending=(state.taxEvidence||[]).filter(e=>e.status==='open');
 openShop('税務調査に備える資料確認',`<p>記帳と、取引を裏付ける資料の保存は別です。資料不足のまま調査を迎えると、経費や仕入税額控除の否認、繰越欠損金の減額、追徴につながります。</p>${pending.map(e=>`<article class="staff-career"><h3>${turnName(e.turn)} · 店舗雑費の証憑確認</h3><p>${e.reason}。対象は税抜 ${yen(e.base)}、消費税 ${yen(e.vat)}。</p><button data-evidence-resolve="${e.id}">再発行資料と事業用途メモをそろえる</button></article>`).join('')||'<p>未解決の資料不備はありません。</p>'}<p>この操作は、ゲーム内で実際に事業用途の資料をそろえる処理です。現実には資料を取得・保存する必要があります。調査で既に否認されたものをこのボタンで取り消すことはできません。</p>`);
}
const auditBeforeReassessment=showTaxAudit;
showTaxAudit=function(turn){
 auditBeforeReassessment(turn);const a=(state.taxAudits||[]).find(a=>a.turn===turn)||state.taxAudits?.at(-1);if(!a)return;
 const old='このゲームの自動記帳の範囲では申告漏れは検出されていないため、この調査で追加の税金や罰金は発生しません。';
 el('shopDialogBody').innerHTML=el('shopDialogBody').innerHTML.replace(old,a.findings?.length?'未解消の証憑不備について、経費・仕入税額控除を否認したゲーム上の調査結果です。未収利息を計上しただけで自動的に追徴する扱いではありません。':'今回、追徴の原因となる未解消の証憑不備はありません。');
 if(a.findings?.length)el('shopDialogBody').innerHTML+=`<section class="audit-assessment"><h3>調査結果と追徴税額</h3>${a.findings.map(e=>`<p>${turnName(e.turn)}の雑費：税抜 ${yen(e.base)}、消費税 ${yen(e.vat)}。事業用途・請求書を確認できず否認。</p>`).join('')}<dl class="equipment-facts"><div><dt>追加法人税等</dt><dd>${yen(a.corporateAdditional)}</dd></div><div><dt>追加消費税等</dt><dd>${yen(a.vatAdditional)}</dd></div><div><dt>加算税（ゲーム10％）</dt><dd>${yen(a.penalty)}</dd></div><div><dt>追徴合計</dt><dd>${yen(a.additionalTax)}</dd></div><div><dt>納付予定</dt><dd>${turnName(a.due)}</dd></div><div><dt>補正後の繰越欠損金</dt><dd>${yen(a.lossRemaining)}</dd></div></dl><p>過去の確定帳簿は書き換えず、今回の追加税額を今月に費用・未払税金として計上しました。納付月に預金と未払税金が減ります。赤字で法人税等の追徴が０でも、繰越欠損金が減ることがあります。</p><p>税額はゲームの概算率、加算税は一律10％、納付は翌月。実務の税目別税率・加算税の軽減や加重・延滞税・納期限・不服申立手続は省略しています。</p><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2026.htm" target="_blank" rel="noopener">参考：国税庁・申告の訂正</a></section>`;
};
const lessonBeforeStaffTax=transactionAccountingLesson;
transactionAccountingLesson=function(entries,b){
 if(entries.some(e=>e.type==='repayOwnerFunding'))return paymentLesson('会社からワイへ借りたお金を返すんや', ['「役員借入金 ／ 預金」で会社の借金と預金が減る。ワイの個人預金は増えるけど、会社の経費やワイへの給与ではないで。ターンも社長の行動も使わへん。']);
 if(entries.some(e=>['auditCorpAccrual','auditVATAccrual','auditPenalty'].includes(e.type)))return paymentLesson('資料不足が追加の税金になってもうた', ['事業用途や請求書を確認できへん経費・消費税が否認されたんや。法人税等や租税公課を費用にして、未払税金を増やす。繰越欠損金も計算し直すで。払うときにはもう一度費用にせえへん。']);
 if(entries.some(e=>['auditCorpPay','auditVATPay'].includes(e.type)))return paymentLesson('追徴された税金を納めたで',entries.filter(e=>['auditCorpPay','auditVATPay'].includes(e.type)).map(e=>`${yen(e.amount)} を納付。「${e.debit} ／ 預金」で未払税金と預金が減ったんや。前の月に費用計上済みやから、今月は二重に費用にせえへん。`));
 return lessonBeforeStaffTax(entries,b);
};
const tutorialBeforeStaffTax=renderTutorialReport;
renderTutorialReport=function(){
 tutorialBeforeStaffTax();const r=statementReport;if(!r||r.provisional)return;
 const due=(r.entries||[]).filter(e=>['auditCorpPay','auditVATPay'].includes(e.type));if(due.length)el('tutorialReport').innerHTML+=transactionAccountingLesson(due,r.after);
 const pending=(state.taxEvidence||[]).filter(e=>e.status==='open');if(pending.length)el('tutorialReport').innerHTML+=`<div class="audit-notice"><b>資料確認が必要です · ${pending.length}件</b><p>店舗雑費の事業用途・請求書を確認できていません。調査前に資料をそろえましょう。</p><button id="evidenceFromReport">資料を確認する</button></div>`;
};
const overviewBeforeStaffTax=renderOverview;
renderOverview=function(){overviewBeforeStaffTax();const waiting=(state.staffEvents||[]).filter(e=>e.type==='offer'&&['pending','deferred'].includes(e.status));if(waiting.length)el('shopOverview').innerHTML+=`<div class="audit-notice"><b>スタッフから登用の相談 ${waiting.length}件</b><button id="staffFromOverview">相談を開く</button></div>`;};
const advanceBeforeStaffTax=advanceMonth;
advanceMonth=function(){const turn=state.turn;advanceBeforeStaffTax();if(state.turn!==turn&&(state.staffEvents||[]).some(e=>!e.notified))showStaffManagement();};
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;try{
  if(['staffMenu','staffFromOverview','staffMenuReturn'].includes(b.id))showStaffManagement();
  else if(b.dataset.staffCompare)showStaffComparison(b.dataset.staffCompare);
  else if(b.id==='recalculateStaffPlan')renderStaffComparison();
  else if(b.dataset.promotePreview)previewPromotion(b.dataset.promotePreview);
  else if(b.dataset.promoteConfirm){state=E.promoteStaff(state,b.dataset.promoteConfirm);saveGame();renderPlanning();showStaffManagement();}
  else if(b.dataset.wageCut||b.dataset.wageRestore){const inBoat=!!document.querySelector('#shopDialogBody [data-boat-use]');state=b.dataset.wageCut?E.extension.cutWage(state,b.dataset.wageCut):E.extension.restoreWage(state,b.dataset.wageRestore);saveGame();renderPlanning();if(inBoat&&typeof showDiversification==='function')showDiversification();else showStaffManagement();}
  else if(b.dataset.staffDefer){state=E.deferStaff(state,b.dataset.staffDefer);saveGame();showStaffManagement();}
  else if(['ownerRepaymentMenu','ownerRepaymentReturn'].includes(b.id))showOwnerRepayment();
  else if(b.dataset.ownerRepayRatio)previewOwnerRepayment(Number(b.dataset.ownerRepayRatio));
  else if(b.id==='confirmOwnerRepayment')confirmOwnerRepayment();
  else if(['evidenceMenu','evidenceFromReport'].includes(b.id))showEvidence();
  else if(b.dataset.evidenceResolve){state=E.resolveTaxEvidence(state,b.dataset.evidenceResolve);saveGame();showEvidence();}
 }catch(err){toast(err.message);}
});
for(const [id,label] of [['staffMenu','スタッフ'],['ownerRepaymentMenu','社長へ返済'],['evidenceMenu','資料確認']]){const b=document.createElement('button');b.id=id;b.className='help-top';b.textContent=label;document.querySelector('.top').append(b);}
renderPlanning();
