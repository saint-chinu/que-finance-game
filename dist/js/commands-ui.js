function hiringCapacityNote(){const capacity=E.limits(state,'tend');return '<p class="management-note">現在の集客上限は'+capacity.cap.toLocaleString()+'人／月、店番時の接客力は'+capacity.service.toLocaleString()+'人／月です。'+(capacity.service>=capacity.cap?'接客力は足りているので、採用だけで売上が増えるとは限りません。':'接客力の不足は採用で補えますが、来店数・在庫も必要です。')+'スタッフを置くと社長が集客投資などに動けます。毎月の給与を賄えるか、設備・販促と一緒に考えましょう。</p>';}
/* Named recruitment and an explicit, one-action bank consultation. */
showHiring=function(){
 const ids=E.staffCandidates(state);if(!E.recruitment(state).open){openShop('応募待ち','<p>追加採用は約５か月に１回の応募で行えます。最初の１人だけはいつでも採用できます。</p>');return;}
 openShop('今月の採用候補',`${hiringCapacityNote()}<p>最初の１人はいつでも募集可能。追加採用は約５か月に１回、応募があった月だけ採用できます。候補はランダムで、同じ月の開き直しでは変わりません。採用には今月の社長の行動を使います。クエの接客は０、新人は採用月から営業し、給与も満額発生します。人物ごとに得意分野があります。</p>${ids.map(id=>{const c=E.STAFF_CHARACTERS[id];return `<article class="staff-career"><div class="career-heading"><img src="assets/characters/${c.image}" alt="${c.name}"><h3>${c.name}</h3></div><div class="hiring-options">${Object.entries(E.ROLES).filter(([role])=>role!=='que').map(([role,r])=>`<button data-hire-preview="${role}" data-character-id="${id}"><b>${r.name}</b><span>接客力目安：${r.service}人／月</span><span>給与 ${yen(r.wage)}/月</span></button>`).join('')}</div></article>`;}).join('')||'<p>今月の候補はいません。</p>'}<p>社員・店長は給与に加え会社負担社保15％。店の集客・在庫が不足すれば、接客力が余っていても売上は増えません。</p>`);
};
let pendingBankRequest=null;
function showBankConsultation(){
 if(state.bankConsultedTurn===state.turn){openBankDesk();return;}
 openShop('銀行員Aに資金調達を相談',`${bankerSpeech('創業直後でもご相談いただけます。今の試算表と返済力を確認し、利用できる融資枠や審査上の課題をご説明します。')}<p>相談すると今月の社長の行動を１回使います。クエは短縮営業（接客力65％）になり、従業員も接客します。相談だけでは借入や利息は発生しません。承認された設備融資は、相談・融資・設備購入をまとめて行動１回で実行します。</p>${renewalPanel(currentBankAssessment())}<button id="confirmBankConsultation" ${state.closed||state.ended||state.actionLocked?'disabled':''}>今月の行動を使って相談する</button>${state.actionLocked?'<p>今月の社長の行動は使用済みです。次の月に相談できます。</p>':state.closed?'<p>今月は確定済みです。次の月に相談できます。</p>':''}<button id="viewBankAssessment">審査資料だけを見る（行動消費なし）</button>`);
}
function openBankDesk(){closeShop();bankPlanAssumptions=null;openStatements();tab='bank';renderTable();}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 const role=b.dataset.hirePreview,hire=b.dataset.confirmHire;
 if(!role&&!hire&&!['bankMenu','confirmBankConsultation','viewBankAssessment','propertyMenu'].includes(b.id))return;
 e.preventDefault();e.stopImmediatePropagation();
 try{
  if(role){const id=b.dataset.characterId,c=E.STAFF_CHARACTERS[id],r=E.ROLES[role];if(!c||!E.staffCandidates(state).includes(id))throw Error('今月の候補から選び直してください。');
   openShop('採用条件を確認',`<div class="career-heading"><img src="assets/characters/${c.image}" alt="${c.name}"><h3>${c.name} · ${r.name}</h3></div>${hiringCapacityNote()}<p>接客力目安：${r.service}人／月。人物・営業状況により変わります。</p><p>月給 ${yen(r.wage)}${role==='parttime'?'':' ＋ 会社負担社保 '+yen(Math.floor(r.wage*.15))}。今月から満額支給します。新人が店番し、クエは採用に専念します。</p><button data-confirm-hire="${role}" data-character-id="${id}">この条件で採用する</button><button id="cancelHire">戻る</button>`);
  }else if(hire){state=E.hire(state,hire,b.dataset.characterId);choice.action='hire';choice.quantities=E.recommend(state,'hire',choice.price);choice.orderSource='recommended';closeShop();renderPlanning();saveGame();}
  else if(b.id==='bankMenu'){pendingBankRequest=null;showBankConsultation();}
  else if(b.id==='confirmBankConsultation'){state=E.consultBank(state);choice.action='bank';choice.quantities=E.recommend(state,'bank',choice.price);choice.orderSource='recommended';renderPlanning();saveGame();if(pendingBankRequest){const resume=pendingBankRequest;pendingBankRequest=null;closeShop();resume();}else openBankDesk();}
  else if(b.id==='viewBankAssessment'){pendingBankRequest=null;openBankDesk();}
  else if(b.id==='propertyMenu')showDiversification();
 }catch(err){toast(err.message);}
},true);
const propertyCommand=document.createElement('button');propertyCommand.id='propertyMenu';propertyCommand.className='help-top';propertyCommand.textContent='サーティー不動産';propertyCommand.hidden=true;
el('diversificationMenu').after(propertyCommand);
const renderBeforeCommands=renderPlanning;
renderPlanning=function(){renderBeforeCommands();propertyCommand.hidden=!Expansion.propertyUnlocked(state);
 const hiring=el('hireStaff'),event=E.recruitment(state);
 if(hiring){hiring.disabled=hiring.disabled||!event.open;hiring.querySelector('small').textContent=event.first?'最初の１人はいつでも募集可能':event.open?'今月は応募あり！採用できるのは今月だけ':'応募待ち（約５か月に１回）';}
 let notice=el('recruitmentNotice');if(!notice){notice=document.createElement('p');notice.id='recruitmentNotice';el('commit').after(notice);}
 notice.textContent=event.first?'最初の１人はいつでも採用できます。候補はランダムです。':event.open?'今月は応募があります：店舗スタッフ・漁業人員を採用できるのは今月だけです。':'今月は応募なし。次の応募がいつ来るかはわかりません（約５か月に１回）。';
 let promotions=el('promotionSchedule');if(!promotions){promotions=document.createElement('details');promotions.id='promotionSchedule';el('commit').after(promotions);}
 const campaigns=(state.marketing||[]).filter(x=>x.end>=state.turn);
 promotions.innerHTML='<summary>販促の効果と残り期間</summary>'+ (campaigns.map(x=>{const age=state.turn-x.start,weight=x.kind==='campaign'?([1,1,2/3,1/3][age]||0):age>=0?1:0;return `<p>${x.kind==='seasonal'?'セールの再来店効果':x.kind==='gradual'?'旧セーブの販促':'販促・協賛'}：${age<0?`${x.start-state.turn}か月後から有効`:`現在 ${Math.round(weight*100)}％・今月を含め残り${x.end-state.turn+1}か月`} ／ ${turnName(x.start)}〜${turnName(x.end)}</p>`;}).join('')||'<p>予定・継続中の販促効果はありません。</p>')+'<p>割合は広告の最大効果に対する残り具合で、売上の増加率ではありません。実行月０、翌月・翌々月100％、３か月後67％、４か月後33％、５か月後０。接客で蓄積する認知・常連化は別です。</p>';
};
// Financial statements remain free to inspect, but applications require consultation.
const bankBeforeReadOnly=renderBank;
renderBank=function(){if(state.bankConsultedTurn===state.turn)return bankBeforeReadOnly();return `<h2>銀行審査の参考資料（閲覧のみ）</h2>${bankerSpeech('資料の閲覧は行動を使いません。新規融資・増額更新の申込みは行動を使います。同額・減額更新は行動不要です。')}<button id="bankMenu">資金調達を相談する</button>${renewalPanel(currentBankAssessment())}${detailedBank()}`;};
const requestBeforeConsultation=requestBankLoan;
requestBankLoan=function(amount){if(state.bankConsultedTurn!==state.turn){pendingBankRequest=()=>requestBeforeConsultation(amount);showBankConsultation();return;}requestBeforeConsultation(amount);};
renderPlanning();
