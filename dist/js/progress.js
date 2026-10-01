/* Pure, ledger-backed retrospectives and milestones. */
(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.ShopEngine;
const debt=b=>['短期借入金','長期借入金','1年内返済予定長期借入金'].reduce((n,k)=>n+(b[k]||0),0);
function review(s,year){
 const start=(year-1)*12+1,rows=s.history.filter(h=>h.turn>=start&&h.turn<=year*12);
 if(!rows.length)return null;
 const end=rows.at(-1),prior=s.history.find(h=>h.turn===start-1),b=end.balances;
 const entries=s.entries.filter(e=>e.turn>=start&&e.turn<=end.turn&&!e.type?.startsWith('yearClose.'));
 const receipts=entries.filter(e=>e.debit==='預金').reduce((n,e)=>n+e.amount,0),payments=entries.filter(e=>e.credit==='預金').reduce((n,e)=>n+e.amount,0);
 const sales=b.売上高||0,gross=sales-(b.売上原価||0),cash=b.預金||0;
 const contributed=year===1?entries.filter(e=>e.debit==='預金'&&e.credit==='資本金').reduce((n,e)=>n+e.amount,0):0;
 const monthly=rows.map(h=>({turn:h.turn,month:(h.turn+2)%12+1,profit:h.monthProfit??E.profit(h.balances)-E.profit(rows.find(x=>x.turn===h.turn-1)?.balances||{}),cash:h.balances.預金}));
 const best=monthly.reduce((a,b)=>a.profit>b.profit?a:b),worst=monthly.reduce((a,b)=>a.profit<b.profit?a:b);
 return {year,start,end:end.turn,complete:end.turn===year*12,months:rows.length,sales,gross,margin:sales?gross/sales:null,ordinary:E.ordinary(b),profit:E.profit(b),tax:b.法人税等||0,
  capitalPaid:contributed,cashChangeAfterFunding:cash-(prior?.balances.預金||contributed),cash,openingCash:prior?.balances.預金||0,receipts,payments,cashDelta:cash-(prior?.balances.預金||0),inventory:b.商品||0,receivables:b.売掛金||0,waste:b.商品廃棄損||0,
  debt:debt(b),equity:E.managementRatios(b).equity,ownerLoan:b.役員貸付金||0,ownerInterest:b.未収利息||0,
  priorProfit:prior?E.profit(prior.balances):null,priorSales:prior?.balances.売上高??null,
  minimumCash:Math.min(...rows.map(h=>h.balances.預金)),best,worst,monthly,
  effortMonths:rows.filter(h=>['improve','sales'].includes(h.choice?.action)||h.choice?.price==='sale'&&(h.served||0)>0).length,
  taxDetail:(s.taxAnnual||[]).find(t=>t.turn===end.turn)||null};
}
function allReviews(s){return [...new Set(s.history.map(h=>Math.ceil(h.turn/12)))].map(y=>review(s,y));}
function summary(s){
 const years=allReviews(s),last=years.at(-1),b=last?s.history.find(h=>h.turn===last.end).balances:s.balances;
 return {years,profit:years.reduce((n,y)=>n+y.profit,0),cash:b.預金||0,equity:E.managementRatios(b).equity,debt:debt(b),ownerCash:s.owner,ownerLoan:b.役員貸付金||0,
  months:s.history.length,ended:!!s.ended,completed:!s.ended&&s.turn===120&&s.closed,
  firstProfitYear:years.find(y=>y.complete&&y.profit>0)?.year||null,minimumCash:years.length?Math.min(...years.map(y=>y.minimumCash)):s.balances.預金};
}
function milestones(s){
 const years=allReviews(s),first=(rows,p)=>rows.find(p)?.turn||null;
 const firstYear=years.find(y=>y.complete&&y.profit>0),two=years.find((y,i)=>i&&y.complete&&y.profit>0&&years[i-1].profit>0);
 let cumulative=0,hadLoss=false,recovered=null;for(const y of years.filter(y=>y.complete)){cumulative+=y.profit;if(cumulative<0)hadLoss=true;else if(hadLoss&&!recovered)recovered=y.end;}
 return [
  {id:'collection',title:'売上と入金をつなぐ',description:'カード売上を初めて回収する',turn:first(s.entries,e=>e.type==='collectCard')},
  {id:'winter',title:'最初の冬を越える',description:'支払不能にならず最初の３月決算を迎える',turn:first(s.history,h=>h.turn===12&&h.balances.預金>=0&&!(s.ended&&s.turn===12))},
  {id:'annualProfit',title:'年間黒字をつかむ',description:'税引後の年間損益を黒字にする',turn:firstYear?.end||null},
  {id:'stable',title:'黒字を続ける',description:'２期続けて年間黒字を達成する',turn:two?.end||null},
  {id:'recovered',title:'創業赤字を取り戻す',description:'累計赤字を年間利益の積み重ねで解消する',turn:recovered},
  {id:'loyal',title:'常連が育つ店',description:'常連の定着度50％に到達する',turn:first(s.history,h=>(h.customerGrowth?.loyaltyAfter||0)>=.5)},
  {id:'decade',title:'10年続く店',description:'支払不能にならず120か月を完了する',turn:s.turn===120&&s.closed&&!s.ended?120:null}
 ];
}
const api={review,allReviews,summary,milestones};if(typeof module!=='undefined')module.exports=api;root.ShopProgress=api;
})(globalThis);
