/* First borrowing lessons; acknowledgement uses the existing persisted tutorial set. */
function loanNatureLesson(kind){
 return kind==='short'?paymentLesson('短期借入は入金待ちをつなぐ資金や',[
  '仕入れの支払いが先で、売上代金の入金は後。この<strong>入金ギャップを立て替える</strong>のが短期運転資金なんやな。赤字の穴を借金で埋め続ける話とは違うで。',
  '普通は<strong>売上代金が入ったら一括返済</strong>するか、商売が続いて次の仕入れにも資金が要るなら<strong>書き換え（ロール）</strong>や。商取引が正常に回って、借入額が必要な運転資金に見合ってるなら、更新して残高が続くこと自体は問題ないんやな。',
  'このゲームは<strong>３か月ごとの更新</strong>。自動更新や借り放題とは違うし、利息も払うで。同額更新は行動なし、減額は差額を返して行動なし。増額は<strong>否決でも行動を使う</strong>から、申込み前に考えよ。'
 ]):paymentLesson('長期借入は設備が稼ぐお金で返すんや',[
  '長期借入は<strong>基本的に設備資金</strong>や。棚や冷凍庫、船みたいに長く使う設備は、先に大きなお金を払って、何年もかけて稼ぐんやな。',
  '借入も<strong>設備の耐用年数内に完済する</strong>のが基本。設備が使えんようになっても借金だけ残る、いう計画はしんどいで。',
  '返す原資は<strong>毎年のCF</strong>や。このゲームでは<strong>経常利益＋減価償却費</strong>を返済力の目安にする。減価償却費はその年の現金支出やないから足し戻すんやな。納税や在庫・売掛金の増加にもお金が要るし、CFの目安を全部返済に使えるとは限らへん。',
  '借りたお金は売上やないし、<strong>元金返済は費用やない</strong>。利益が出てても返済で預金が減ることはあるんや。なお、創業期の支援融資は設備以外の例外で、最長５年・CFで返せる範囲やで。'
 ]);
}
function pendingLoanLessons(){return ['short','long'].filter(kind=>(state.loans||[]).some(l=>kind==='short'?l.kind==='short':l.kind!=='short')&&!seenEntries.has('loanNature.'+kind));}
const planningBeforeLoanNature=renderPlanning;
renderPlanning=function(){
 planningBeforeLoanNature();let box=el('firstLoanLessons');if(!box){box=document.createElement('section');box.id='firstLoanLessons';el('cashPlan').before(box);}
 const kinds=pendingLoanLessons();box.hidden=!kinds.length;box.innerHTML=kinds.map(kind=>loanNatureLesson(kind)+`<button data-loan-lesson-read="${kind}">わかったで</button>`).join('');
};
const accountingBeforeLoanNature=transactionAccountingLesson;
transactionAccountingLesson=function(entries,b){
 const kinds=[...new Set(entries.filter(e=>e.type?.startsWith('bankBorrow.')).map(e=>e.type==='bankBorrow.short'?'short':'long'))];
 return kinds.filter(kind=>!seenEntries.has('loanNature.'+kind)||animationReturn==='journal').map(loanNatureLesson).join('')+accountingBeforeLoanNature(entries,b);
};
document.addEventListener('click',event=>{const button=event.target.closest('[data-loan-lesson-read]');if(!button)return;const kind=button.dataset.loanLessonRead;if(!['short','long'].includes(kind))return;seenEntries.add('loanNature.'+kind);saveGame();renderPlanning();});
renderPlanning();
