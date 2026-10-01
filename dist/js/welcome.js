/* A readable entry screen; opening this guide never changes the saved game. */
(()=>{
 'use strict';
 const dialog=document.createElement('dialog');dialog.id='welcomeDialog';dialog.className='welcome-dialog';dialog.setAttribute('aria-labelledby','welcomeTitle');
 dialog.innerHTML=`<header class="welcome-heading"><div><p class="welcome-eyebrow">資本主義の権化 〜財務で遊ぼう〜</p><h1 id="welcomeTitle" tabindex="-1">クエ社長の、経営をはじめよう。</h1></div></header>
 <div class="welcome-content"><p class="welcome-lead">港町の釣具店を舞台に、10年間の経営に挑戦。仕入れ、採用、設備投資を通じて、<strong>「利益」と「手元のお金」の違い</strong>を体験する財務ゲームです。</p>
 <section aria-labelledby="welcomeHow"><h2 id="welcomeHow">遊び方 · １か月の流れ</h2><ol class="welcome-steps"><li><b>仕入れと行動を選ぶ</b><span>「おすすめで補充」または「数量を変更」で仕入れ予定を決め、社長の行動を１つ選びます。</span></li><li><b>今月を確定する</b><span>予定した仕入れ・営業・支払いをまとめて実行し、帳簿に反映します。</span></li><li><b>月次報告を読む</b><span>利益・預金・在庫を確認し、次の月の判断へ。銀行や事業拡大も活用しましょう。</span></li></ol></section>
 <p class="welcome-save">進行はこのブラウザーに自動保存されます。端末の変更やデータ消失への備えには「経営メニュー → セーブ」から保存ファイルをダウンロードしてください。</p>
 <section class="welcome-disclaimer" aria-labelledby="welcomeDisclaimer"><h2 id="welcomeDisclaimer">ご利用前に · 免責事項</h2><ul><li><strong>税務アドバイスではありません。</strong>本ゲームは学習・娯楽用です。税務・会計・法律・投資等に関する個別の助言を提供するものではありません。実際の申告や経営判断には、専門家や公的情報をご確認ください。</li><li><strong>実際の制度・取引とは異なります。</strong>税率、会計処理、融資審査、市場条件などはゲーム用に簡略化した架空の設定です。情報の正確性・完全性・最新性や、学習・経営上の成果を保証するものではありません。</li><li><strong>製作者の責任について。</strong>本ゲームの利用または利用できないことにより生じた損害・損失について、製作者は責任を負いません。ただし、法令により免責が認められない場合を除きます。</li></ul></section>
 <footer class="welcome-footer"><p id="welcomeResume"></p><button type="button" id="welcomeStart" class="confirm">ゲームを始める →</button><button type="button" id="welcomeNewGame" class="welcome-restart" hidden>最初から始める</button><small>遊び方・免責事項は、経営メニューと画面下部からいつでも確認できます。</small></footer></div>`;
 document.body.append(dialog);
 let opening=true,returnFocus=null;
 const start=document.getElementById('welcomeStart'),resume=document.getElementById('welcomeResume'),restart=document.getElementById('welcomeNewGame');
 restart.addEventListener('click',showNewGameConfirmation);
 function show(initial=false){
  opening=initial;returnFocus=document.activeElement;restart.hidden=!introComplete;
  start.textContent=initial?(introComplete?'続きから遊ぶ →':'ゲームを始める →'):'ゲームに戻る';
  resume.textContent=initial?(introComplete?'保存済みの経営データから再開します。':'まずは会社の設立と、開店までの流れを見てみましょう。'):'';
  dialog.showModal();dialog.scrollTop=0;document.getElementById('welcomeTitle').focus();
 }
 function restoreFocus(){
  if(!opening){const target=returnFocus?.closest('.command-menu')?.querySelector('summary')||returnFocus;if(target?.isConnected)target.focus();return;}
  const target=!document.getElementById('transactionOverlay').hidden?document.getElementById('transactionNext'):introComplete?document.querySelector('.command-menu summary'):document.getElementById('introNext');
  target?.focus();
 }
 start.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',restoreFocus);
 const menu=document.createElement('button');menu.type='button';menu.id='welcomeMenu';menu.className='help-top';menu.textContent='遊び方・免責事項';menu.addEventListener('click',()=>show());document.querySelector('.command-menu-list').append(menu);
 const footer=document.createElement('button');footer.type='button';footer.id='welcomeFooter';footer.className='welcome-link';footer.textContent='遊び方・免責事項';footer.addEventListener('click',()=>show());document.querySelector('.footer').append(footer);
 show(true);
})();
