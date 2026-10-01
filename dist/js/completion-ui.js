/* Year-end reflection, goals, tax-loss disclosure, and portable local saves. */
const P=ShopProgress,Backup=ShopBackup;
const signedYen=n=>(n<0?'▲':n>0?'＋':'±')+yen(Math.abs(n));
const turnName=t=>`第${Math.ceil(t/12)}期 ${(t+2)%12+1}月`;
function taxLossView(detail=null){
 const remaining=detail?detail.remaining:(state.taxLosses||[]).reduce((n,l)=>n+l.remaining,0);
 return `<section class="tax-loss-panel"><h3>Qの税金メモ · 繰越欠損金</h3>${detail?`<dl class="equipment-facts"><div><dt>税務上の所得（欠損金控除前）</dt><dd>${signedYen(detail.income)}</dd></div><div><dt>過去の欠損金から今回控除</dt><dd>${yen(detail.used)}</dd></div><div><dt>控除後の課税所得</dt><dd>${yen(detail.taxable)}</dd></div><div><dt>今回生じた欠損金</dt><dd>${yen(detail.added)}</dd></div></dl>`:''}<p>今後に繰り越す欠損金：<b>${yen(remaining)}</b></p><p>クエ「創業期の赤字は、あとで黒字になった年の税金計算に使えるんやな。でも、預金が戻るわけでも、P/Lの赤字が消えるわけでもないで。均等割の７万円は残るんや！」</p><details><summary>このゲームの税金計算</summary><p>青色申告を継続する独立した中小法人を想定。税引前損益を基礎に、追徴消費税・加算税の損金不算入を加算して所得を計算し、欠損金は翌期から10年間、古いものから所得の範囲で全額控除します。法人税等そのものは欠損金に含めません。</p><p>税額は控除後所得800万円以下25％、超過分35％に均等割７万円を加える従来のゲーム概算です。実際の税率や地方税の計算とは異なり、申告調整・繰戻し還付・税効果会計は省略。決算で計上し、２か月後に納付します。</p>${state.taxCarryMigratedTurn?'<p>旧セーブは、過去の税引前損益から未使用の繰越残高を引き継いでいます。確定済みの利益・税額・納付額は変更せず、過去分の還付は発生しません。</p>':''}<a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5762.htm" target="_blank" rel="noopener">国税庁：欠損金の繰越控除</a></details></section>`;
}
function reviewAdvice(r){
 const lines=[];
 if(r.priorProfit!==null)lines.push(`前年の損益 ${signedYen(r.priorProfit)} から、今年は ${signedYen(r.profit)}。差は ${signedYen(r.profit-r.priorProfit)} です。`);
 if(r.profit>0&&r.cashDelta<0)lines.push('黒字でも預金は減っています。下の入出金と、設備・借入返済・在庫・売掛金を照合しましょう。');
 else if(r.profit<0)lines.push(`赤字で自己資本が減っています。粗利 ${yen(r.gross)} に対して、固定費・利息・税金を負担できたか確認しましょう。`);
 if(r.waste>0)lines.push(`在庫廃棄で ${yen(r.waste)} を失いました。繁忙期の数量を冬まで持ち越していないか、商品別の回転を見直しましょう。`);
 if(r.ownerLoan>0)lines.push(`会社から社長への貸付が ${yen(r.ownerLoan)} 残っています。生活費・役員報酬・返済を見直す必要があります。`);
 if(r.effortMonths===0)lines.push('この期間は営業努力を選んだ月がありません。集客力と常連の定着を確認しましょう。');
 if(!lines.length)lines.push('利益だけでなく、納税と返済を終えたあとの預金を残しながら、営業と品揃えを続けましょう。');
 return `<div class="que-accounting-lesson"><img src="assets/characters/que.png" alt="クエ"><div><b>数字から次の一手を考えるで</b>${lines.map(t=>`<p>${t}</p>`).join('')}</div></div>`;
}
function yearReviewView(r){
 if(!r)return '<p>最初の月を確定すると、実際の数字で振り返れます。</p>';
 return `<p><strong>第${r.year}期 ４月〜${(r.end+2)%12+1}月</strong> · ${r.complete?'１年間の確定決算':`${r.months}か月分・期中の成績（年換算しません）`}</p><div class="review-grid"><article><small>売上高</small><b>${yen(r.sales)}</b></article><article><small>売上総利益 / 粗利率</small><b>${yen(r.gross)} / ${r.margin===null?'—':(r.margin*100).toFixed(1)+'％'}</b></article><article><small>税引後損益</small><b class="${r.profit<0?'negative':'positive'}">${signedYen(r.profit)}</b></article><article><small>${r.capitalPaid?'払込後からの預金増減':'預金の増減'}</small><b>${signedYen(r.capitalPaid?r.cashChangeAfterFunding:r.cashDelta)}</b></article></div><dl class="equipment-facts"><div><dt>会社預金 / 期間中の最低月末預金</dt><dd>${yen(r.cash)} / ${yen(r.minimumCash)}</dd></div><div><dt>銀行借入残高 / 自己資本</dt><dd>${yen(r.debt)} / ${yen(r.equity)}</dd></div><div><dt>商品在庫 / 未回収のカード売上</dt><dd>${yen(r.inventory)} / ${yen(r.receivables)}</dd></div><div><dt>商品廃棄損 / 営業努力した月数</dt><dd>${yen(r.waste)} / ${r.effortMonths}か月</dd></div></dl>${r.capitalPaid?`<p><b>設立時の払込後 ${fmt(r.capitalPaid)} → 期末 ${fmt(r.cash)}</b>。払込後の増減は ${fmt(r.cashChangeAfterFunding)} です。資本金の払込は売上・利益ではありません。</p>`:''}<details><summary>${r.year===1?'設立前から':'期首から'}の入出金を確認</summary><p>期間初めの預金 ${yen(r.openingCash)} ＋ 入金 ${yen(r.receipts)} − 出金 ${yen(r.payments)} ＝ 期間末預金 <b>${yen(r.cash)}</b>${r.year===1?'。初年度は設立前の０円から、株式払込・開業支出も含めて集計':''}。</p></details><p>最も利益が出た月：${turnName(r.best.turn)} ${signedYen(r.best.profit)} ／ 最も厳しかった月：${turnName(r.worst.turn)} ${signedYen(r.worst.profit)}。３月には決算税額も含みます。</p>${reviewAdvice(r)}${r.taxDetail?taxLossView(r.taxDetail):r.complete?'<p>この期間の欠損金控除明細はありません。旧バージョンの確定税額はそのまま表示します。</p>':'<p>期中の成績です。欠損金控除と法人税等の精算は、３月決算で計算します。</p>'}`;
}
function showYearReview(year){
 const all=P.allReviews(state),r=all.find(r=>r.year===Number(year))||all.at(-1);
 openShop('決算を振り返る',`<label>振り返る期 <select id="reviewYear">${all.map(y=>`<option value="${y.year}" ${r?.year===y.year?'selected':''}>第${y.year}期${y.complete?' 決算':' 期中'}</option>`).join('')}</select></label>${yearReviewView(r)}<button id="showGoals">目標と達成記録を見る</button><button id="showCareerResult">ここまでの経営を振り返る</button>`);
 if(r?.complete){state.reviewSeen=Array.from(new Set([...(state.reviewSeen||[]),r.year]));saveGame();}
}
showFinalResult=function(){
 const r=P.summary(state),years=r.years,score=currentBankAssessment().score;
 const title=r.ended?'経営終了 · 数字から振り返る':r.completed?'10年間の経営を完了':'ここまでの経営記録';
 openShop(title,`<div class="career-heading"><img src="assets/characters/que.png" alt="クエ"><p>${r.ended?'クエ「ここで資金が尽きてもうた。何が原因やったか、数字で確かめて次に活かすで。」':r.completed?'クエ「10年続けられたで！ 預金だけやなく、残った借金と自己資本も確かめよか。」':'クエ「今までの積み重ねを見て、次の経営を考えるで。」'}</p></div>${r.ended?`<p class="negative">${state.balances.預金<0?'会社預金が '+yen(state.balances.預金)+' になりました。':''}${state.owner<0?'個人生活費の不足 '+yen(-state.owner)+' を賄えませんでした。':''}</p>`:''}<p>財務スコア：<b>${score??'未確定'}</b>${score===null?'':' / 100'}</p><p>確定済み ${r.months}か月 ／ 初めて年間黒字になった期：${r.firstProfitYear?'第'+r.firstProfitYear+'期':'まだありません'}</p><div class="review-grid"><article><small>累計税引後損益</small><b>${signedYen(r.profit)}</b></article><article><small>自己資本</small><b>${yen(r.equity)}</b></article><article><small>会社預金 / 銀行借入</small><b>${yen(r.cash)} / ${yen(r.debt)}</b></article><article><small>個人預金 / 会社から借りた元金</small><b>${yen(r.ownerCash)} / ${yen(r.ownerLoan)}</b></article></div><p>個人預金は会社預金に加算しません。累計損益には終了した期の途中までを含み、借入入金を利益に数えません。</p><div class="review-table"><table><thead><tr><th>期</th><th>売上</th><th>税引後損益</th><th>末預金</th><th>銀行借入</th></tr></thead><tbody>${years.map(y=>`<tr><th><button data-review-year="${y.year}">第${y.year}期${y.complete?'':'（途中）'}</button></th><td>${yen(y.sales)}</td><td>${signedYen(y.profit)}</td><td>${yen(y.cash)}</td><td>${yen(y.debt)}</td></tr>`).join('')}</tbody></table></div>${years.length?reviewAdvice(years.at(-1)):''}<button id="showGoals">目標と達成記録を見る</button><button id="backupMenuInResult">この経営記録を保存する</button>`);
};
function showGoals(){
 openShop('経営の目標と達成記録',`<p>目標は学習の道しるべです。達成してもお金や集客力は自動で増えません。</p><ol class="goal-list">${P.milestones(state).map(g=>`<li class="${g.turn?'achieved':''}"><b>${g.turn?'✓':'○'} ${g.title}</b><p>${g.description}</p><small>${g.turn?turnName(g.turn)+'に達成':'これからの目標'}</small></li>`).join('')}</ol>${taxLossView()}`);
}
let pendingRestore=null,restoreReadId=0;
function priorRestoreData(){try{return localStorage.getItem(SAVE_KEY+'-before-restore');}catch{return null;}}
function downloadBackup(payload){
 const text=Backup.encode(payload),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`que-finance-turn-${payload.state.turn}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showBackup(){
 pendingRestore=null;restoreReadId++;
 openShop('セーブのバックアップ・復元',`<p>自動セーブはこのブラウザに保存されます。JSONファイルをダウンロードして保管すれば、別の端末でも続きを再開できます。</p><button id="downloadBackup" ${introComplete?'':'disabled'}>現在のセーブをダウンロード</button><p>ファイルには帳簿・仕訳・在庫・借入・選択中の仕入・学習の進み具合が入ります。</p><label class="backup-picker">バックアップから復元 <input id="restoreFile" type="file" accept=".json,application/json"></label><div id="restorePreview" role="status" aria-live="polite"></div>${priorRestoreData()?'<button id="downloadRollback">前回のやり直し・復元前のセーブをダウンロード</button>':''}<p>復元前に年月と残高を確認します。やり直し・復元直前のセーブも、このブラウザに１世代保管します。</p>`);
}
function stageRestore(text){
 pendingRestore=null;const payload=Backup.decode(text);pendingRestore=payload;
 el('restorePreview').innerHTML=`<h3>このセーブを復元しますか？</h3><p>${turnName(payload.state.turn)} · ${payload.state.closed?'月次確定済み':'経営判断中'}<br>会社預金 ${yen(payload.state.balances.預金)} ／ 個人預金 ${yen(payload.state.owner)} ／ 確定済み ${payload.state.history.length}か月</p><p>今の経営は、このデータに置き換わります。</p><button id="confirmRestore">内容を確認して復元する</button><button id="cancelRestore">取り消す</button>`;
 return payload;
}
function confirmRestore(){
 if(!pendingRestore)throw Error('先にバックアップを選んでください。');
 Backup.restore(localStorage,SAVE_KEY,pendingRestore);pendingRestore=null;location.reload();
}
document.addEventListener('change',async e=>{
 if(e.target.id==='reviewYear')showYearReview(Number(e.target.value));
 if(e.target.id!=='restoreFile')return;
 const request=++restoreReadId,preview=el('restorePreview');pendingRestore=null;preview.textContent='ファイルを確認しています…';
 try{const file=e.target.files?.[0];if(!file){preview.textContent='';return;}if(file.size>Backup.MAX_BYTES)throw Error('16MB以下のバックアップを選んでください。');const text=await file.text();if(request!==restoreReadId||!el('shopDialog').open||el('restorePreview')!==preview)return;stageRestore(text);}catch(err){if(request===restoreReadId&&el('restorePreview')===preview){pendingRestore=null;preview.textContent=err.message;}}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 try{
  if(['backupMenu','backupMenuInResult','introRestore'].includes(b.id))showBackup();
  else if(b.id==='downloadBackup')downloadBackup(captureSave());
  else if(b.id==='downloadRollback')downloadBackup(Backup.decode(priorRestoreData()));
  else if(b.id==='confirmRestore')confirmRestore();
  else if(b.id==='cancelRestore'){pendingRestore=null;restoreReadId++;el('restorePreview').textContent='復元を取り消しました。';}
  else if(b.id==='reviewMenu'||b.dataset.reviewYear)showYearReview(Number(b.dataset.reviewYear));
  else if(b.id==='showGoals'||b.id==='goalMenu')showGoals();
  else if(b.id==='showCareerResult')showFinalResult();
 }catch(err){toast(err.message);}
});
const renderBeforeCompletion=renderReport;
renderReport=function(){
 renderBeforeCompletion();const r=statementReport;if(!r||r.provisional)return;
 const goals=P.milestones(state),fresh=goals.filter(g=>g.turn&&!(state.milestoneSeen||[]).includes(g.id));
 if(fresh.length){el('tutorialReport').innerHTML+=`<aside class="milestone-celebration" role="status"><b>目標達成！</b>${fresh.map(g=>`<p>✓ ${g.title} · ${turnName(g.turn)}</p>`).join('')}<button id="showGoals">達成記録を見る</button></aside>`;state.milestoneSeen=[...(state.milestoneSeen||[]),...fresh.map(g=>g.id)];saveGame();}
 if(state.closed&&(state.turn%12===0||state.ended))el('tutorialReport').innerHTML+=`<button data-review-year="${Math.ceil(state.turn/12)}">この期の数字を振り返る</button>${state.ended||state.turn===120?'<button id="showCareerResult">経営結果を見る</button>':''}`;
};
const openBeforeCompletion=openStatements;
openStatements=function(){
 openBeforeCompletion();if(el('shopDialog').open||!state.closed)return;
 if(state.cashCrisis?.status!=='pending'&&(state.ended||state.turn===120&&state.closed)&&!state.finalReviewSeen){state.finalReviewSeen=true;saveGame();showFinalResult();}
 else if(state.turn%12===0&&!(state.reviewSeen||[]).includes(state.turn/12))showYearReview(state.turn/12);
};
descriptions.法人税等='決算で繰越欠損金を控除して概算計上。ゲーム設定：控除後所得800万円以下25％、超過分35％＋均等割７万円。５月納付。欠損金は翌期から10年間、所得の範囲で控除します。';
for(const [id,label] of [['reviewMenu','決算の振り返り'],['goalMenu','目標'],['backupMenu','セーブ']]){const b=document.createElement('button');b.id=id;b.className='help-top';b.textContent=label;document.querySelector('.top').append(b);}
const introRestore=document.createElement('button');introRestore.id='introRestore';introRestore.className='skip-intro';introRestore.textContent='保存したファイルから再開';el('introNext').after(introRestore);
