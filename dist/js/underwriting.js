/* Shared underwriting: browser and server use the same scoring rules. */
(function(root){'use strict';const ShopEngine=root.ShopEngine||(typeof require==='function'?require('./engine.js'):null),expenseAccounts=ShopEngine.EXPENSES;
const fmt=n=>Math.round(n/1000).toLocaleString('ja-JP')+'千円';
function bsValues(b){const m=ShopEngine.managementRatios(b);return {assets:m.assets,equity:m.equity,liabilities:m.currentLiabilities+m.fixedLiabilities};}
function bankAssessment(series,b,rescue=false){
 const bookEquity=bsValues(b).equity,ownerDebt=b.役員借入金||0,ownerLoss=b.役員貸付金||0;
 b={...b,役員借入金:0,役員貸付金:0,繰越利益剰余金:(b.繰越利益剰余金||0)+ownerDebt-ownerLoss};

 const latest=series.at(-1),p=latest?.p||{},v=bsValues(b),sales=p.売上高||0;
 const operating=sales-ownerLoss-expenseAccounts.filter(k=>!['支払利息','法人税等','固定資産売却損'].includes(k)).reduce((n,k)=>n+(p[k]||0),0),ordinary=ShopEngine.ordinary(p)-ownerLoss,dep=p.減価償却費||0;
 const capacity=latest?Math.floor(series.slice(-2).reduce((n,y)=>n+ShopEngine.ordinary(y.p)+(y.p.減価償却費||0),0)/Math.min(2,series.length))-ownerLoss:null;
 const debt=Math.max(0,b.短期借入金||0)+Math.max(0,b.長期借入金||0)+Math.max(0,b['1年内返済予定長期借入金']||0)+Math.max(0,b.役員借入金||0);
 const currentDebt=['仮受消費税等','未払消費税等','買掛金','短期借入金','1年内返済予定長期借入金','未払法人税等'].reduce((n,k)=>n+Math.max(0,b[k]||0),0);
 const liquid=Math.max(0,b.預金||0)+Math.max(0,b.売掛金||0),working=Math.max(0,(b.売掛金||0)+(b.商品||0)-(b.買掛金||0));
 const equityRatio=v.assets>0?v.equity/v.assets:null,margin=latest&&sales>0?operating/sales:null;
 const debtYears=!latest?null:debt===0?0:capacity>0?Math.max(0,debt-Math.min(b.短期借入金||0,working))/capacity:Infinity;
 const netDebtYears=!latest?null:operating+dep>0?(debt-(b.預金||0))/(operating+dep):null;
 const quick=currentDebt>0?liquid/currentDebt:liquid>0?Infinity:null;
 const cycle=latest&&sales>0?working/(sales/12):null;
 const recent=series.slice(-3),growths=recent.slice(1).map((y,i)=>{const prev=recent[i].p.売上高||0;return prev>0?(y.p.売上高||0)/prev-1:null}).filter(x=>x!==null);
 const growth=growths.length?growths.reduce((n,x)=>n+x,0)/growths.length:null;
 const high=(x,bands)=>x===null?null:bands.find(([threshold])=>x>=threshold)?.[1]??0;
 const low=(x,bands)=>x===null?null:bands.find(([threshold])=>x<=threshold)?.[1]??0;
 const percent=x=>x===null?'算定不可':(x*100).toFixed(1)+'％';
 const multiple=x=>x===null?'算定不可':x===Infinity?'返済原資不足':x.toFixed(1)+'年';
 const safety=ShopEngine.managementRatios(b);
 const metrics=[
 {name:'自己資本比率',value:percent(equityRatio),formula:'（帳簿純資産＋役員借入金−役員貸付金）÷（帳簿総資産−役員貸付金）',max:20,points:high(equityRatio,[[.4,20],[.2,16],[.1,10],[0,4]]),rule:'40％以上20点／20％以上16点／10％以上10点／0％以上4点／負数0点'},
 {name:'債務償還年数',value:multiple(debtYears),formula:'（借入金−正常運転資金に対応する短期借入）÷ 直近最大２期平均の年間弁済可能額',max:20,points:latest?(capacity<=0?0:low(debtYears,[[3,20],[5,16],[10,10],[15,4]])):null,rule:'3年以下20点／5年以下16点／10年以下10点／15年以下4点／超過・返済原資不足0点'},
 {name:'営業利益率',value:percent(margin),formula:'（営業利益−役員貸付金残高の損失補正）÷ 売上高',max:15,points:high(margin,[[.05,15],[.03,12],[.01,9],[0,4]]),rule:'5％以上15点／3％以上12点／1％以上9点／0％以上4点／赤字0点'},
 {name:'流動比率',value:safety.currentRatio===Infinity?'流動負債なし':percent(safety.currentRatio),formula:'流動資産 ÷ 流動負債。審査時は役員貸付金を除外',max:10,points:high(safety.currentRatio,[[2,10],[1.5,8],[1,5],[.8,2]]),rule:'200％以上10点／150％以上8点／100％以上5点／80％以上2点／未満0点'},
 {name:'固定長期適合率',value:percent(safety.fixedLongRatio),formula:'固定資産 ÷（自己資本＋固定負債）。審査用補正後の数値',max:10,points:safety.fixedLongRatio===null?0:low(safety.fixedLongRatio,[[.7,10],[1,8],[1.2,4]]),rule:'70％以下10点／100％以下8点／120％以下4点／超過・長期資金が０以下は0点'},
 {name:'当座比率',value:quick===Infinity?'流動負債なし':percent(quick),formula:'（預金＋売掛金）÷ 流動負債。商品・役員貸付金は除外',max:10,points:high(quick,[[1.5,10],[1,8],[.7,4]]),rule:'150％以上10点／100％以上8点／70％以上4点／未満0点'},
 {name:'営業運転資本回転期間',value:cycle===null?'算定不可':cycle.toFixed(1)+'か月',formula:'（売掛金＋商品−買掛金）÷ 月商。負の運転資本は0として採点',max:5,points:low(cycle,[[1,5],[2,4],[3,3],[6,1]]),rule:'1か月以下5点／2か月以下4点／3か月以下3点／6か月以下1点／超過0点'},
 {name:'売上高増加率',value:percent(growth),formula:'（当期売上÷前期売上−1）の直近最大2区間平均',max:10,points:high(growth,[[.1,10],[0,8],[-.05,5],[-.15,2]]),rule:'10％以上10点／0％以上8点／−5％以上5点／−15％以上2点／未満0点'}
 ];
 const scored=metrics.filter(m=>m.points!==null),possible=scored.reduce((n,m)=>n+m.max,0),raw=scored.reduce((n,m)=>n+m.points,0);
 const financialScore=latest&&possible?Math.round(raw/possible*100):null;let adjustment=0,reasons=[];
 const penalize=(points,reason)=>{adjustment-=points;reasons.push(reason+'：−'+points+'点（ゲーム内補正）')};
 if(recent.length>=3&&recent.slice(1).every((y,i)=>ShopEngine.ordinary(y.p)<ShopEngine.ordinary(recent[i].p)))penalize(10,'経常利益が２期連続で悪化');
 if(ownerLoss>0)penalize(bookEquity<=0||ownerLoss/bookEquity>=.2?40:ownerLoss/bookEquity>=.05?25:10,'役員貸付金の純資産比率に応じた資金分離の評価');
 if((b.未収利息||0)>0)penalize(10,'役員貸付利息の回収管理に問題');
 if(series.length<3)reasons.push('業歴３期未満の格付けはBが上限（ゲーム設定）');if(!reasons.length)reasons.push('定性・トレンド補正なし');
 reasons.push('審査上の自己資本に役員借入金を加算：'+fmt(ownerDebt)+'／役員貸付金の損失補正：'+fmt(ownerLoss)+'。帳簿の利益は変更しません。');
 const score=financialScore===null?null:Math.max(0,Math.min(100,financialScore+adjustment));
 const terms=bankTerms(score===null?null:series.length<3?Math.min(score,79):score,capacity,b,rescue);
 const latestCashFlow=latest?ordinary+dep:null;
 const workingEligible=terms.eligible&&(latestCashFlow>0||(working>0&&cycle!==null&&cycle<=3&&equityRatio>=.2&&safety.currentRatio>=1&&ownerLoss===0&&(b.未収利息||0)===0));
 if(!workingEligible)terms.short={limit:0,balance:terms.short.balance,available:0,excess:terms.short.balance};
 if(!(latestCashFlow>0))terms.equipment={limit:0,balance:terms.equipment.balance,available:0,excess:terms.equipment.balance};
 const verdict=score===null?'通期実績不足・創業計画の審査が必要':!terms.eligible?'ゲーム内判定：融資不可':terms.short.available>0||terms.equipment.available>0?'ゲーム内判定：融資可能':'追加融資余力なし';
 return {latestCashFlow,workingEligible,bookEquity,adjustedEquity:v.equity,ownerDebt,ownerLoss,adjustedOrdinary:ordinary,score,financialScore,raw,possible,adjustment,metrics,reasons,capacity,verdict,netDebtYears,period:latest?'直近確定年度のP/L ＋ 現在のB/S':'通期P/L未確定',...terms};
}
function bankTerms(score,capacity,b,rescue=false){
 const tier=score>=80?{grade:'A',rate:2,coverage:1,years:10}:score>=65?{grade:'B',rate:3,coverage:.8,years:7}:score>=50?{grade:'C',rate:5,coverage:.5,years:5}:{grade:'D',rate:null,coverage:0,years:0};
 const eligible=score!==null&&score>=50&&bsValues(b).equity>0&&((b.預金||0)>=0||rescue);
 const workingNeed=Math.max(0,(b.売掛金||0)+(b.商品||0)-(b.買掛金||0));
 const shortBalance=Math.max(0,b.短期借入金||0),equipmentBalance=Math.max(0,(b.長期借入金||0)+(b['1年内返済予定長期借入金']||0));
 const shortLimit=eligible?Math.floor(workingNeed*tier.coverage):0;
 const equipmentCeiling=Math.max(0,capacity||0)*10;
 const equipmentLimit=eligible?Math.floor(Math.max(0,capacity||0)*tier.years):0;
 const facility=(limit,balance)=>({limit,balance,available:Math.max(0,limit-balance),excess:Math.max(0,balance-limit)});
 return {eligible,grade:score===null?'未格付':tier.grade,rate:eligible?tier.rate:null,coverage:tier.coverage,years:tier.years,workingNeed,equipmentCeiling,short:facility(shortLimit,shortBalance),equipment:facility(equipmentLimit,equipmentBalance)};
}

const api={assess(s){return bankAssessment(s.history.filter(h=>h.turn%12===0).map(h=>({year:h.turn/12,b:h.balances,p:h.balances})),s.balances,s.closed&&s.ended&&s.cashCrisis?.status==='pending');},bankAssessment,bankTerms};root.ShopUnderwriting=api;if(typeof module!=='undefined')module.exports=api;})(globalThis);
