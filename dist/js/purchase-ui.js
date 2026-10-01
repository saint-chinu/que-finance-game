/* One visible purchase plan, one quantity editor, and one monthly confirmation. */
(()=>{
 const summary=document.createElement('section');summary.id='purchasePlan';summary.className='panel purchase-plan';
 summary.innerHTML='<div class="purchase-heading"><h2>今月の仕入れ</h2><div><small>追加購入の支払予定（税込）</small><strong id="purchasePlanTotal"></strong></div></div><p id="purchasePlanStatus"></p><div class="purchase-buttons"><button id="recommendOrder" class="recommend-button">おすすめで補充</button><button id="editPurchase">数量を変更</button></div><p class="purchase-timing">仕入れは、社長の行動を選んだ後の「今月を確定する」で実行します。</p><p id="purchaseWarning" role="status" hidden></p>';
 document.getElementById('staffAdvice').previousElementSibling.before(summary);
 const dialog=document.createElement('dialog');dialog.id='purchaseDialog';dialog.className='purchase-dialog';dialog.setAttribute('aria-labelledby','purchaseTitle');
 dialog.innerHTML='<header><h2 id="purchaseTitle">今月、追加で買う数量</h2><button type="button" data-close-purchase aria-label="仕入れの数量変更を閉じる">✕</button></header><p class="purchase-intro">「今ある在庫」に追加する数量です。0なら買い足しません。数字を入力するか、＋・−で調整してください。</p><div class="purchase-tools"><button id="recommendInPurchase">おすすめで補充</button><button id="clearPurchase">すべて0にする</button></div><div id="purchaseEditor"></div><p id="purchaseDialogWarning" role="status" hidden></p><footer><p>変更は自動保存されます。購入・支払いは「今月を確定する」まで行われません。</p><button type="button" class="confirm" data-close-purchase>この数量で戻る</button></footer>';
 document.body.append(dialog);
 const oldDetail=document.querySelector('.planning-detail'),orderPanel=oldDetail.querySelector('.order-panel'),pricePanel=oldDetail.querySelector('.decision:not(.order-panel)');
 orderPanel.querySelector('h3').textContent='商品ごとの追加購入';orderPanel.querySelector('.order-total span').textContent='今月の仕入合計';
 orderPanel.querySelector(':scope > p').textContent='この金額は今月の預金から支払います。商品の販売代金とは別です。';
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
 function updateSummary(){
  const locked=state.closed||state.ended,zero=choice.quantities.every(q=>!q),error=locked?'':E.validation(state,choice.quantities,currentAction());
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
  const row=input.closest('.product-order');row.querySelector('.order-subtotal').textContent='支払予定：'+yen(E.gross(state,q*E.PRODUCTS[i].cost));row.querySelector('button[data-step^="-"]').disabled=q===0;
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
