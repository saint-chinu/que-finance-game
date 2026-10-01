/* One visible purchase plan, one quantity editor, and one monthly confirmation. */
(()=>{
 const summary=document.createElement('section');summary.id='purchasePlan';summary.className='panel purchase-plan';
 summary.innerHTML='<div class="purchase-heading"><h2>今月の仕入れ</h2><div><small>追加購入の支払予定（税込）</small><strong id="purchasePlanTotal"></strong></div></div><p id="purchasePlanStatus"></p><div class="purchase-buttons"><button id="recommendOrder" class="recommend-button">おすすめで補充</button><button id="editPurchase">数量を変更</button></div><label class="auto-order"><input id="autoOrder" type="checkbox"> 毎月おすすめ量に自動調整</label><p class="note">翌月に残り在庫・季節・資金から再計算します。今月の数量は自由に変更できます。</p><p class="purchase-timing">仕入れは、社長の行動を選んだ後の「今月を確定する」で実行します。</p><p id="purchaseWarning" role="status" hidden></p>';
 document.getElementById('staffAdvice').previousElementSibling.before(summary);
 const dialog=document.createElement('dialog');dialog.id='purchaseDialog';dialog.className='purchase-dialog';dialog.setAttribute('aria-labelledby','purchaseTitle');
 dialog.innerHTML='<header><h2 id="purchaseTitle">今月、追加で買う数量</h2><button type="button" data-close-purchase aria-label="仕入れの数量変更を閉じる">✕</button></header><p class="purchase-intro">「今ある在庫」に追加する数量です。0なら買い足しません。数字を入力するか、＋・−で調整してください。</p><div class="purchase-tools"><button id="recommendInPurchase">おすすめで補充</button><button id="clearPurchase">すべて0にする</button></div><div id="purchaseEditor"></div><p id="purchaseDialogWarning" role="status" hidden></p><footer><p>変更は自動保存されます。購入・支払いは「今月を確定する」まで行われません。</p><button type="button" class="confirm" data-close-purchase>この数量で戻る</button></footer>';
 document.body.append(dialog);
 const paymentPanel=document.createElement('section');paymentPanel.className='purchase-payment';
 paymentPanel.innerHTML='<h3>支払方法</h3><div class="purchase-payment-buttons" role="group" aria-label="仕入れの支払方法"><button type="button" data-payment="cash">現金払い <small>2%割引・今月支払う</small></button><button type="button" data-payment="credit">買い掛け <small>割引なし・翌月支払う</small></button></div><p id="purchasePaymentInfo" aria-live="polite"></p><div id="creditQueHint" class="credit-que-hint" role="status" hidden><img src="assets/characters/que.png" alt="クエ"><p>商品は今月届いて、代金は翌月に自動で払うで。未払い分は「買掛金」や。現金払いが苦しい月は、支払いを待ってもらって仕入れを続けられるんや。2%割引はないから、来月の預金も残しとこな！</p><button type="button" id="dismissCreditHint">わかった</button></div>';
 document.getElementById('purchaseEditor').before(paymentPanel);
 paymentPanel.addEventListener('click',event=>{const b=event.target.closest('[data-payment]');if(!b||state.closed||state.ended)return;choice.payment=b.dataset.payment;if(choice.payment==='credit'&&!choice.creditExplained){choice.creditExplained=true;document.getElementById('creditQueHint').hidden=false;}renderPlanning();saveGame();});
 document.getElementById('dismissCreditHint').addEventListener('click',()=>{document.getElementById('creditQueHint').hidden=true;});
 const oldDetail=document.querySelector('.planning-detail'),orderPanel=oldDetail.querySelector('.order-panel'),pricePanel=oldDetail.querySelector('.decision:not(.order-panel)');
 orderPanel.querySelector('h3').textContent='商品ごとの追加購入';orderPanel.querySelector('.order-total span').textContent='今月の仕入合計';
 orderPanel.querySelector(':scope > p').textContent='現金払いは商品ごとの税抜金額を2%割引（1円未満切捨て）。消費税は仕入合計で計算します。';
 document.getElementById('purchaseEditor').append(orderPanel);
 const priceDetail=document.createElement('details');priceDetail.className='purchase-price';priceDetail.innerHTML='<summary>販売価格を変える（任意）</summary>';priceDetail.append(pricePanel);document.getElementById('purchaseEditor').append(priceDetail);
 oldDetail.previousElementSibling.remove();oldDetail.remove();
 let returnFocus=null;
 const el=id=>document.getElementById(id);
 function openEditor(){returnFocus=document.activeElement;dialog.showModal();dialog.scrollTop=0;dialog.querySelector('[data-close-purchase]').focus();}
 el('editPurchase').addEventListener('click',openEditor);
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-close-purchase]'))dialog.close();});
 dialog.addEventListener('close',()=>{renderPlanning();returnFocus?.focus();});
 el('recommendInPurchase').addEventListener('click',()=>el('recommendOrder').click());
 el('clearPurchase').addEventListener('click',()=>{if(state.closed||state.ended)return;choice.quantities=E.PRODUCTS.map(()=>0);choice.orderSource='manual';renderPlanning();saveGame();});
 el('autoOrder').addEventListener('change',event=>{choice.autoOrder=event.target.checked;saveGame();});
 function updateSummary(){
  el('autoOrder').checked=choice.autoOrder!==false;
  const locked=state.closed||state.ended,zero=choice.quantities.every(q=>!q),error=locked?'':E.validation(state,choice.quantities,currentAction(),choice.payment||'cash');
  const payment=choice.payment||'cash',quote=E.purchaseQuote(state,choice.quantities,payment),due=E.scheduled(state).payables;
  paymentPanel.querySelectorAll('[data-payment]').forEach(b=>{b.disabled=locked;b.setAttribute('aria-pressed',String(b.dataset.payment===payment));});
  const info=payment==='credit'?`買い掛け：今回の ${yen(quote.total)} は翌月（${month(state.turn+1)}月）に自動支払い。`:`現金払い：今月 ${yen(quote.total)} を支払います。税抜 ${yen(quote.discount)} お得。`;
  el('purchasePaymentInfo').textContent=info+(due?` 前月分の買い掛け ${yen(due)} は今月支払います。`:'');
  summary.querySelector('.purchase-heading small').textContent=payment==='credit'?'追加購入・翌月の支払予定（税込）':'追加購入・今月の支払予定（税込）';
  summary.querySelector('.purchase-timing').textContent=info+' 仕入れは「今月を確定する」で実行します。';
  el('purchasePlanTotal').textContent=yen(orderCost());
  el('purchasePlanStatus').textContent=locked?'今月の仕入れは確定済みです。':(state.turn===1?'開店時の在庫は入荷済みです。':'')+(zero?'追加購入は0です。今ある在庫を確認して営業しましょう。':choice.orderSource==='prior'?'前月と同じ数量です。在庫を見て補充量を調整できます。':choice.orderSource==='manual'?'自分で変更した数量が仕入れ予定に反映されています。':'現在の在庫・販売見込みから、不足分を補充する案です。');
  for(const id of ['recommendOrder','recommendInPurchase','clearPurchase','editPurchase'])el(id).disabled=locked;
  for(const id of ['purchaseWarning','purchaseDialogWarning']){el(id).textContent=error?'仕入れ予定を見直してください：'+error:'';el(id).hidden=!error;}
 }
 // Save valid keystrokes without replacing the focused input or moving the cursor.
 el('orders').addEventListener('input',event=>{
  const input=event.target;if(!input.matches('input[data-product]')||state.closed||state.ended)return;
  const i=Number(input.dataset.product),q=Number(input.value);
  if(input.value===''||!Number.isSafeInteger(q)||q<0||q>100000)return;
  choice.quantities[i]=q;choice.orderSource='manual';saveGame();
  const row=input.closest('.product-order');row.querySelector('.order-subtotal').textContent='支払予定：'+yen(E.gross(state,E.purchaseLine(i,q,choice.payment||'cash')));row.querySelector('button[data-step^="-"]').disabled=q===0;
  el('orderTotal').textContent=yen(orderCost())+'（税込）';updateSummary();
 });
 dialog.addEventListener('click',event=>{if(event.target.closest('#prices button'))queueMicrotask(saveGame);});
 const previousRender=renderPlanning;
 renderPlanning=function(){previousRender();updateSummary();};
 // Re-rendered rows should keep keyboard focus on the quantity being edited.
 const previousSetQuantity=setQuantity;
 setQuantity=function(i,value){const active=document.activeElement,step=active?.dataset.step,focused=active?.dataset.product===String(i);const result=previousSetQuantity(i,value);if(focused){const selector=step!==undefined?`button[data-product="${i}"][data-step="${step}"]`:`input[data-product="${i}"]`;const next=el('orders').querySelector(selector);(next?.disabled?el('orders').querySelector(`input[data-product="${i}"]`):next)?.focus({preventScroll:true});}return result;};
 renderPlanning();
})();
