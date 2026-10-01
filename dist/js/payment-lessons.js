/* Connect tax-exclusive sales, card receivables and tax settlement to real journals. */
function paymentLesson(title,lines){return `<aside class="que-accounting-lesson"><img src="assets/characters/que.png" alt="クエ"><div><b>クエのひとこと · ${title}</b>${lines.map(line=>`<p>${line}</p>`).join('')}</div></aside>`;}
function salesTaxLesson(entries){
 const sum=predicate=>entries.filter(predicate).reduce((n,e)=>n+e.amount,0),net=sum(e=>e.credit==='売上高'),tax=sum(e=>e.credit==='仮受消費税等'),card=sum(e=>e.debit==='売掛金'&&['売上高','仮受消費税等'].includes(e.credit));
 const hasSales=entries.some(e=>e.credit==='売上高'),bundled=sum(e=>e.bundled&&e.credit==='売上高');
 return paymentLesson('税抜売上・消費税・カード会計は分ける',[
  '売上高は<strong>税抜金額</strong>や。売上にかかる消費税は<strong>仮受消費税等</strong>に分けて、利益には含めへん。仕入や設備・課税経費の消費税は<strong>仮払消費税等</strong>に分けるんやな。「等」は地方消費税も含む名前やで。',
  hasSales?`この仕訳に含まれる売上高は ${yen(net)}${tax?'、仮受消費税等は '+yen(tax):'。消費税分は対応する仕訳で別に記録'}。税込の受取額を、そのまま全部売上にはせえへんで。`:'仮受消費税等は売上とは別の科目。カード売上なら、まだお金が入ってへん段階でも売上時に計上するんや。',
  card?`今回表示している仕訳で増える売掛金は ${yen(card)}。竿やリールと<strong>同じカード会計</strong>で買われた仕掛け・エサなども、消費税を含めて売掛金にするんや。${bundled?'この中の消耗品まとめ買いは税抜 '+yen(bundled)+' やで。':''} 今は預金に入らず、このゲームでは２か月後に入金や。`:'現金会計は税込で預金が増える。カード会計なら消耗品でも売掛金になって、入金まで預金は増えへんのや。',
  '例：税抜３万円の竿と550円の仕掛けをカードで一緒に販売。<strong>売掛金33,605円 ／ 売上高30,550円・仮受消費税等3,055円</strong>。入金時は「預金33,605円 ／ 売掛金33,605円」だけで、売上も消費税も二度は計上せえへん。'
 ]);
}
function taxPaymentLesson(e){
 const amount=yen(e.amount);
 if(e.type==='taxPayment')return paymentLesson('法人税等を納付したで',[
  `今回の納付は <strong>${amount}</strong>。「<strong>未払法人税等 ${amount} ／ 預金 ${amount}</strong>」や。B/Sの未払税金と預金が同じだけ減るんやな。`,
  '法人税等の費用は３月の決算で、繰越欠損金も計算して計上済みや。５月に払うときはP/Lにもう一度費用を出さへん。せやから納付だけでは今月の利益は減らんけど、預金は減るで。'
 ]);
 if(e.type==='vatPay'&&e.debit==='仮払消費税中間納付')return paymentLesson('消費税を先に一部納めるんやな',[
  `中間納付 ${amount} は「<strong>仮払消費税中間納付 ／ 預金</strong>」。預金は減るけど、仕入の仮払消費税等とは別に、先に納めた税金として資産に置くんや。`,
  '３月に年間の税額を計算して、この中間納付を差し引く。払った分をもう一回納めたり、P/Lの費用にしたりはせえへんで。'
 ]);
 if(e.type==='vatPay')return paymentLesson('消費税を納付したで',[
  `今回の納付は <strong>${amount}</strong>。「<strong>未払消費税等 ${amount} ／ 預金 ${amount}</strong>」。B/Sの未払消費税等と預金が減るんやな。`,
  '売上の仮受消費税等から、仕入・経費などの仮払消費税等を引いて、中間納付も精算した金額を納めるんや。このゲームの税抜経理では、今回の納付を売上原価や経費にもう一度入れへん。利益と支払うお金は別やで。'
 ]);
 if(e.type==='vatRefund')return paymentLesson('消費税が還付されたで',[
  `還付 ${amount} は「<strong>預金 ／ 未収消費税等</strong>」。預金が増えて、還付待ちの資産が減ったんや。新しい売上や利益ではないで。`
 ]);
 return '';
}
const transactionBeforePayments=transactionAccountingLesson;
transactionAccountingLesson=function(entries,b){
 const payments=entries.filter(e=>['taxPayment','vatPay','vatRefund'].includes(e.type));
 if(payments.length)return payments.map(taxPaymentLesson).join('');
 if(entries.some(e=>['saleCash','saleCard'].includes(e.type)))return salesTaxLesson(entries)+queAccountingLesson('pl',b);
 if(entries.some(e=>e.type==='vatOutput'))return salesTaxLesson(entries);
 if(entries.some(e=>e.type==='vatClose'))return paymentLesson('仮受と仮払を精算して納税額を決める',[
  '売上にかかる「仮受消費税等」と、仕入・設備・課税経費の「仮払消費税等」を相殺するんや。納付する分は「未払消費税等」、還付される分は「未収消費税等」にするで。',
  'これは納税額を確定する仕訳やから、この時点で預金は動かへん。中間納付があれば差し引いて、ゲームでは２か月後に納付・還付するんや。'
 ]);
 const base=transactionBeforePayments(entries,b);
 if(entries.some(e=>e.type==='purchaseCash'||e.introVAT&&e.debit==='商品'))return base+paymentLesson('仕入代金も税抜と消費税に分ける',[
  '仕入れた商品の本体は「商品」、その消費税は「仮払消費税等」や。預金から払うのは<strong>両方を合わせた税込額</strong>。商品は売れたときに税抜原価で費用になる。仮払消費税等は、あとで仮受消費税等と精算するんやな。'
 ]);
 return base;
};
const tutorialBeforePayments=renderTutorialReport;
renderTutorialReport=function(){
 tutorialBeforePayments();const r=statementReport;if(!r||r.provisional)return;
 const entries=r.entries||[],payments=entries.filter(e=>['taxPayment','vatPay','vatRefund'].includes(e.type));
 if(payments.length)el('tutorialReport').innerHTML+=`<section class="payment-reminder"><h3>今月の納税・還付を確認</h3>${payments.map(taxPaymentLesson).join('')}</section>`;
 if(r.productResults?.some(p=>p.cardNet!==undefined)){
  const net=r.productResults.reduce((n,p)=>n+p.sales,0),output=r.productResults.reduce((n,p)=>n+(p.cardTax||0)+(p.cashTax||0),0),cardNet=r.productResults.reduce((n,p)=>n+(p.cardNet||0),0),cardTax=r.productResults.reduce((n,p)=>n+(p.cardTax||0),0);
  el('tutorialReport').innerHTML+=`<details class="payment-breakdown" ${r.turn===1?'open':''}><summary>税抜売上と税込の現金・カード会計</summary><p>売上高 <b>${yen(net)}</b> ＋ 仮受消費税等 <b>${yen(output)}</b> ＝ 税込売上代金 <b>${yen(net+output)}</b>。</p><p>このうちカード会計は税抜 ${yen(cardNet)} ＋ 消費税 ${yen(cardTax)} ＝ <b>売掛金 ${yen(r.cardSales)}</b>。${turnName(r.turn+2)}に入金予定です。現金会計 ${yen(r.cashSales)} は今月の預金に入ります。</p><div class="review-table"><table><thead><tr><th>商品</th><th>カード点数</th><th>税抜額</th><th>消費税</th><th>売掛金</th></tr></thead><tbody>${r.productResults.filter(p=>p.cardQuantity>0).map(p=>`<tr><th>${E.PRODUCTS.find(x=>x.id===p.id).name}${E.PRODUCTS.find(x=>x.id===p.id).fixedPrice?'':'（まとめ買い）'}</th><td>${p.cardQuantity}</td><td>${yen(p.cardNet)}</td><td>${yen(p.cardTax)}</td><td>${yen(p.cardNet+p.cardTax)}</td></tr>`).join('')}</tbody></table></div><p>ゲームでは竿・リール１点につき、販売した消耗品を各種類最大１点まで同じカード会計に含めます。既存の販売数を振り分けるだけで、売上や販売数は増やしません。消耗品だけの会計は現金、カード手数料は省略しています。</p></details>`;
 }
};
const guideBeforePayments=renderAccountingGuide;
renderAccountingGuide=function(r){
 guideBeforePayments(r);el('accountingBasicsBody').innerHTML+=`<details><summary>カードのまとめ買いと税抜売上</summary>${salesTaxLesson([])}</details><details><summary>消費税・法人税を払うとき</summary>${paymentLesson('納付で費用を二度数えない',[
  '法人税等は決算で「法人税等 ／ 未払法人税等」、納付で「未払法人税等 ／ 預金」。消費税は仮受と仮払を精算してから、納付で「未払消費税等 ／ 預金」や。どちらも納付だけでP/Lの費用をもう一度増やすわけやないで。',
  '消費税の中間納付は「仮払消費税中間納付 ／ 預金」として別に記録し、年末ではなく会社の３月決算で年間税額から差し引くんや。'
 ])}<p>実制度を調べるための参考資料です。ゲームの計算を実際の申告に使わないでください。</p><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6901.htm" target="_blank" rel="noopener">国税庁：消費税の納付・還付の経理処理</a></details>`;
};
renderAccountingGuide(null);
