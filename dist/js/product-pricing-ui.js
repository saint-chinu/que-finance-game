/* Product prices are persistent, individual overrides; bulk pricing stays optional. */
(()=>{
 const priorOverview=renderOverview;
 renderOverview=function(){priorOverview();document.querySelectorAll('.inventory-card[data-stock]').forEach(card=>{
  const i=Number(card.dataset.stock);if(!E.unlocked(state,E.PRODUCTS[i]))return;
  const label=document.createElement('small');label.className='inventory-price';label.textContent='売価 '+yen(E.sellingTerms(state,i,choice.price).unitPrice)+'（税抜） · 変更';card.append(label);
 });};
 const priorDetail=stockDetail;
 stockDetail=function(i){
  priorDetail(i);const p=E.PRODUCTS[i];if(!E.unlocked(state,p))return;
  const value=Math.round(E.sellingTerms(state,i,choice.price).unitPrice),bounds=E.productPriceBounds(i),locked=state.closed||state.ended;
  el('shopDialogBody').insertAdjacentHTML('afterbegin',`<form id="productPriceForm" data-product-index="${i}" class="product-price-form"><h3>この商品の販売価格</h3><p>${locked?'今月は確定済みです。次の月から変更できます。':'この商品だけ変更します。保存した価格は翌月も続きます。'}</p><fieldset ${locked?'disabled':''}><legend>販売価格（税抜・円）</legend><div class="product-price-presets">${[[1,'定価'],[1.1,'10％値上げ'],[.9,'10％値引き']].map(([factor,label])=>`<button type="button" data-product-price-preset="${Math.round(p.price*factor)}">${label}</button>`).join('')}</div><label for="productSalePrice">金額を直接入力<input id="productSalePrice" type="number" inputmode="numeric" min="${bounds.min}" max="${bounds.max}" step="1" value="${value}" required></label><p id="productPricePreview" class="note"></p><p class="note">標準価格 ${yen(p.price)} の50〜200％で設定できます。値上げすると売れる数量は減り、値下げすると増える見込みです。</p><p id="productPriceError" role="alert"></p><button type="submit" class="confirm">この価格を保存</button><button type="button" id="resetProductPrice">個別設定を解除する</button></fieldset><p class="note">${state.productPrices?.[i]!=null?'個別設定中。一括の値上げ・値引きより、この価格を優先します。':p.fixedPrice?'個別設定なし。標準価格で販売します。':'個別設定なし。今月の一括価格に従います。'}</p></form>`);
  updatePreview();
 };
 function updatePreview(){const form=el('productPriceForm');if(!form)return;const input=el('productSalePrice'),i=Number(form.dataset.productIndex),amount=Number(input.value);el('productPricePreview').textContent=input.value!==''&&E.validProductPrice(i,amount)?'税込 '+yen(E.gross(state,amount))+' ／ 標準価格との差 '+(amount>=E.PRODUCTS[i].price?'＋':'−')+yen(Math.abs(amount-E.PRODUCTS[i].price)):'';}
 function applyPrice(form,amount){try{const i=Number(form.dataset.productIndex);state=E.setProductPrice(state,i,amount);renderPlanning();saveGame();closeShop();toast(amount===null?'個別設定を解除しました。':'販売価格を保存しました。翌月もこの価格で販売します。');}catch(err){el('productPriceError').textContent=err.message;}}
 document.addEventListener('submit',event=>{if(event.target.id!=='productPriceForm')return;event.preventDefault();applyPrice(event.target,el('productSalePrice').value===''?NaN:Number(el('productSalePrice').value));});
 document.addEventListener('input',event=>{if(event.target.id==='productSalePrice')updatePreview();});
 document.addEventListener('click',event=>{const button=event.target.closest('button'),form=el('productPriceForm');if(!button||!form||state.closed||state.ended)return;if(button.dataset.productPricePreset){el('productSalePrice').value=button.dataset.productPricePreset;updatePreview();}else if(button.id==='resetProductPrice')applyPrice(form,null);});
 const bulk=document.querySelector('.purchase-price summary');if(bulk)bulk.textContent='個別設定のない商品の一括価格（今月のみ）';
 renderPlanning();
})();
