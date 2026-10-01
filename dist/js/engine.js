/* Pure accounting and shop simulation. All money is integer yen. */
(function(root){
'use strict';
const PRODUCTS=[
 {id:'tackle',name:'仕掛け・糸',cost:330,price:550,demand:2100,unit:'パック',space:1,storage:'dry',icon:'🪝'},
 {id:'bait',name:'常温エサ',cost:275,price:550,demand:800,unit:'パック',space:4,storage:'dry',life:6,icon:'🥫'},
 {id:'rod',name:'竿',cost:22500,price:30000,fixedPrice:true,demand:1,unit:'本',space:320,storage:'dry',icon:'🎣'},
 {id:'lure',name:'ルアー',cost:780,price:1200,demand:12,unit:'個',space:1,storage:'dry',icon:'🐟'},
 {id:'reel',name:'リール',cost:40000,price:50000,fixedPrice:true,demand:1,unit:'台',space:40,storage:'dry',icon:'⚙️'},
 {id:'frozen',name:'冷凍エサ',cost:300,price:650,demand:360,unit:'パック',space:1,storage:'cold',life:3,requires:'freezer',icon:'🧊'},
 {id:'aji',name:'活きアジ',cost:80,price:220,demand:285,unit:'匹',space:1,storage:'water',requires:'tank',icon:'🐟'},
 {id:'wear',retired:true,name:'クーラー・ウェア',cost:5600,price:8000,demand:20,unit:'点',space:40,storage:'dry',year:2,icon:'🧥'}
];
const STOCK=[2000,1100,3,60,3,0,0,0];
const ROLES={que:{name:'クエ',service:1000,wage:0},manager:{name:'店長',service:900,wage:350000},employee:{name:'社員',service:800,wage:250000},parttime:{name:'バイト',service:400,wage:120000}};
const STAFF_CHARACTERS={
 oniku:{name:'お肉',image:'nikuchan-mosaic.png',service:1.08,attraction:.008,office:0},
 usagin:{name:'ウサギン',image:'usagin.webp',service:1,attraction:.02,office:1500},
 hofuku:{name:'ホフク',image:'hofuku.png',service:.95,attraction:.012,office:6000},
 danball:{name:'段ボール男',image:'danballman.png',service:1.02,attraction:.005,office:3500,storage:.1}
};
function staffCandidates(s){const ids=Object.keys(STAFF_CHARACTERS),cycle=Math.floor((s.turn-1)/4),ranked=ids.map((id,i)=>({id,rank:api.extension.draw(s,'recruit',cycle,i)})).sort((a,b)=>a.rank-b.rank).map(x=>x.id),start=(s.turn-1)%4;return Array.from({length:4},(_,i)=>ranked[(start+i)%4]).filter(id=>!s.staff.some(x=>x.characterId===id)).slice(0,2);}
function staffService(x){return Math.round(ROLES[x.role].service*(x.transferHalf?.5:1)*(STAFF_CHARACTERS[x.characterId]?.service||1));}
// Hiring: the first person any time; after that an applicant appears about every five months (gaps of 4-6 months), open only that month.
function firstHireTurn(s){if(s.firstHireTurn)return s.firstHireTurn;const turns=[...s.staff,...(s.expansion?.fishery?.crew||[])].map(p=>p.hiredTurn).concat((s.expansion?.actions||[]).filter(a=>a.type==='hireCrew').map(a=>a.turn),(s.staffEvents||[]).map(e=>e.turn)).filter(Number.isInteger);return turns.length?Math.min(...turns):(s.staffSerial||s.boatStaffSerial?1:Infinity);}
function recordHire(s){if(!s.firstHireTurn)s.firstHireTurn=Number.isFinite(firstHireTurn(s))?firstHireTurn(s):s.turn;}
function recruitmentTurns(s){const anchor=firstHireTurn(s),turns=[];for(let k=0,t=Number.isFinite(anchor)?anchor:1;t<=120;k++){t+=4+Math.floor(api.extension.draw(s,'recruit-gap',0,k)*3);if(t<=120)turns.push(t);}return turns;}
function recruitment(s){
 const year=Math.floor((s.turn-1)/12),all=recruitmentTurns(s),months=all.filter(t=>t>year*12&&t<=year*12+12);
 const first=!(s.firstHireTurn||s.staffSerial||s.boatStaffSerial||s.staff.length||s.expansion?.fishery?.serial||s.expansion?.fishery?.crew?.length||(s.staffEvents||[]).length||(s.expansion?.actions||[]).some(a=>a.type==='hireCrew'));
 return {first,open:first||all.includes(s.turn),count:months.length,months,next:all.find(t=>t>s.turn)||null};
}
function staffHints(s,turn=s.turn){
 const lines={oniku:'お肉さん、接客がうまいなあ。忙しいときもお客さんをようさばいてくれるわ。',usagin:'ウサギンさん、お客さんとの話がうまいな。店に来てくれる人が増えるのも納得や。',hofuku:'ホフクさんは事務能力が高いな……経理きっちりしてる。事務の無駄も減って助かるわ。',danball:'段ボール男は陳列が上手いな。スペースを有効利用して、常温の商品を前より置けるようになってるわ。',madai:'マダイは漁の手際がええな。同じ出漁日数でも、よう獲ってきてくれるわ。'};
 return [...s.staff,...(s.expansion?.fishery?.crew||[])].filter(x=>lines[x.characterId]&&turn-x.hiredTurn>=6&&!x.abilityHintTurn).map(x=>({staffId:x.id,characterId:x.characterId,text:lines[x.characterId],turn}));
}
function recordStaffHints(s,r){
 r.staffHints=staffHints(s);for(const hint of r.staffHints){const x=[...s.staff,...(s.expansion?.fishery?.crew||[])].find(x=>x.id===hint.staffId);x.abilityHintTurn=s.turn;}
 if(s.history.length)s.history.at(-1).staffHints=structuredClone(r.staffHints);
}
function consultBank(s){if(s.closed||s.ended||s.actionLocked)throw Error('今月の行動を残した未確定の月に相談できます。');const n=structuredClone(s);n.actionLocked='bank';n.bankConsultedTurn=n.turn;return n;}
const payroll=s=>s.staff.reduce((n,x)=>n+(x.wage??ROLES[x.role].wage),0);
PRODUCTS.forEach((p,i)=>Object.assign(p,{size:['最小','小','大','最小','中','冷凍','水槽','中'][i],obsolete:[18,0,24,12,30,0,0,12][i],turnover:['中','中','低','低','低','高','激高','低'][i],cover:[1.1,1.25,3,5,3,1.15,1/.95,2][i]}));
const EQUIPMENT={
 warehouse:{name:'倉庫',cost:3000000,upkeep:10000,life:120,account:'建物附属設備',cap:150,boost:.05,description:'常温商品の保管上限を2,000pt増設。品揃えを広げられます。'},
 freezer:{name:'冷凍庫',cost:1500000,upkeep:30000,life:60,account:'什器',cap:200,boost:.10,description:'冷凍エサを解放。600パックまで保管できます。'},
 tank:{name:'生け簀',cost:2500000,upkeep:30000,life:60,account:'什器',cap:300,boost:.15,requires:'freezer',description:'活きアジを解放。300匹まで保管。月次死亡ロス5%。'},
 fixture:{name:'接客什器',cost:1500000,upkeep:0,life:72,account:'什器',cap:0,boost:0,description:'店番がいる月の接客上限＋350人。集客上限は変わりません。'}
};
const STARTUP=[{debit:'預金',credit:'資本金',amount:10000000,memo:'株式の払込'}, {debit:'差入保証金',credit:'預金',amount:300000,memo:'店舗の保証金'}, {debit:'什器',credit:'預金',amount:1200000,memo:'開業備品を購入'}, {debit:'商品',credit:'預金',amount:STOCK.reduce((n,q,i)=>n+q*PRODUCTS[i].cost,0),memo:'開業商品の現金仕入'}];
const EXPENSES=['固定資産売却損','租税公課','商品廃棄損','法人税等','支払利息','売上原価','役員報酬','給料手当','法定福利費','地代家賃','広告宣伝費','減価償却費','雑費'];
const INCOME=['売上高','受取利息','固定資産売却益'];
const ASSETS=['未収法人税等','土地','賃貸建物','船舶','車両','仮払消費税等','未収消費税等','仮払消費税中間納付','預金','売掛金','商品','差入保証金','什器','建物附属設備','役員貸付金','未収利息'];
const DEBIT=[...ASSETS,...EXPENSES];const CREDIT=['買掛金','繰延売上','預り敷金','仮受消費税等','未払消費税等','資本金','繰越利益剰余金','減価償却累計額',...INCOME,'短期借入金','長期借入金','1年内返済予定長期借入金','役員借入金','未払法人税等'];
const SEASON={4:1.02,5:1.04,6:1.15,7:1.40,8:1.50,9:1.45,10:1.35,11:1.12,12:.55,1:.40,2:.48,3:.95};
const month=t=>((t+2)%12)+1;
const profit=b=>INCOME.reduce((n,k)=>n+(b[k]||0),0)-EXPENSES.reduce((n,k)=>n+(b[k]||0),0);
function blankState(){return {version:6,rulesVersion:'v23',taxLosses:[],taxAnnual:[],growth:{loyalty:0,lastEffortTurn:0,startedTurn:1},taxAudits:[],taxEvidence:[],staffEvents:[],vatEnabled:true,vatDue:[],vatAnnual:[],turn:1,balances:Object.fromEntries([...DEBIT,...CREDIT].map(k=>[k,0])),owner:0,staff:[],inventory:PRODUCTS.map(()=>0),lots:PRODUCTS.map(()=>[]),equipment:{},assets:[],receivables:[],payables:[],history:[],entries:[],attraction:1,tournament:0,fixture:false,pendingEntries:[],pendingInvestment:0,actionLocked:null,closed:false,rng:73129,livingCost:200,payInterest:true,repayOwner:false,taxes:[],events:[]};}
function entry(s,dr,cr,n,memo,type){if(!Number.isSafeInteger(n)||n<0||!DEBIT.concat(CREDIT).includes(dr)||!DEBIT.concat(CREDIT).includes(cr))throw Error('仕訳の入力が不正です');if(!n)return null;const before={...s.balances};s.balances[dr]=(s.balances[dr]||0)+(DEBIT.includes(dr)?n:-n);s.balances[cr]=(s.balances[cr]||0)+(CREDIT.includes(cr)?n:-n);const e={id:s.entries.length+1,turn:s.turn,debit:dr,credit:cr,amount:n,memo,type:type||dr+'|'+cr,before,after:{...s.balances}};e.segmentId=api.extension?.segmentFor(s,e)||'retail';s.entries.push(e);return e;}
function add(s,i,n,t=s.turn,amount=n*PRODUCTS[i].cost){if(!n)return;s.lots[i].push({turn:t,quantity:n,amount});s.inventory[i]+=n;}
function inventoryValue(s,i){return s.lots[i].reduce((v,l)=>v+(l.amount??l.quantity*PRODUCTS[i].cost),0);}
// Round each product line to whole yen; old operation records retain their original prices.
function purchaseLine(i,q,payment='cash'){return payment==='cash'?Math.floor(q*PRODUCTS[i].cost*98/100):q*PRODUCTS[i].cost;}
function purchaseQuote(s,q,payment='cash'){const net=q.reduce((n,x,i)=>n+purchaseLine(i,x,payment),0),total=gross(s,net);return {net,tax:total-net,total,discount:cost(q)-net,cash:payment==='credit'?0:total};}
function take(s,i,n){let left=n,amount=0;for(const lot of s.lots[i]){if(!left)break;const x=Math.min(left,lot.quantity),value=lot.amount??lot.quantity*PRODUCTS[i].cost,used=x===lot.quantity?value:Math.floor(value*x/lot.quantity);lot.amount=value-used;amount+=used;lot.quantity-=x;left-=x;}if(left)throw Error('在庫ロット不足');s.lots[i]=s.lots[i].filter(l=>l.quantity);s.inventory[i]-=n;return amount;}
function applyStartup(s,index){const e=STARTUP[index];entry(s,e.debit,e.credit,e.amount,e.memo,index===3?'purchaseCash':undefined);if(index>=2)inputVAT(s,e.amount,e.memo);if(index===2)s.assets.push({id:'opening',cost:1200000,life:60,depreciation:0});if(index===3)STOCK.forEach((n,i)=>add(s,i,n));}
function createState(){const s=blankState();STARTUP.forEach((_,i)=>applyStartup(s,i));s.opening={...s.balances};s.previousClose={...s.balances};api.extension?.init(s);return s;}
function unlocked(s,p){return !p.retired&&(!p.requires||s.equipment[p.requires])&&(!p.year||Math.floor((s.turn-1)/12)+1>=p.year);}
function capacities(s){const storageBonus=s.staff.reduce((n,x)=>n+(STAFF_CHARACTERS[x.characterId]?.storage||0),0);return {dry:Math.floor((2000+(s.equipment.warehouse?2000:0))*4*(1+storageBonus)),cold:s.equipment.freezer?600:0,water:s.equipment.tank?300:0};}
function usage(s,quantities=[]){return PRODUCTS.reduce((a,p,i)=>{if(!p.retired)a[p.storage]+=(s.inventory[i]+(quantities[i]||0))*p.space;return a;},{dry:0,cold:0,water:0});}
function upkeep(s){return Object.keys(s.equipment).reduce((n,k)=>n+EQUIPMENT[k].upkeep,0);}
function limits(s,action='tend'){const cap=950+Object.keys(s.equipment).reduce((n,k)=>n+EQUIPMENT[k].cap,0);let boost=1;if(s.equipment.warehouse&&usage(s).dry>8000)boost+=.05;if(s.equipment.freezer&&s.inventory[5]>0)boost+=.10;if(s.equipment.tank&&s.inventory[6]>0)boost+=.15;return {cap,boost,service:(action==='tend'?ROLES.que.service:['improve','sales'].includes(action)?ROLES.que.service*.8:['bank','investment'].includes(action)?ROLES.que.service*.65:0)+s.staff.reduce((n,x)=>n+staffService(x),0)+((action==='tend'||action==='improve'||['bank','investment','sales'].includes(action)||s.staff.length)&&s.equipment.fixture?350:0)};}
const vat=n=>Math.floor(n/10);
const gross=(s,n)=>n+(s.vatEnabled?vat(n):0);
function inputVAT(s,n,memo){if(s.vatEnabled)entry(s,'仮払消費税等','預金',vat(n),memo+'の消費税','vatInput');}
function cost(q){return PRODUCTS.reduce((n,p,i)=>n+(q[i]||0)*p.cost,0);}
function validation(s,q,action='tend',payment='legacy'){if(!['legacy','cash','credit'].includes(payment))return '支払方法を選んでください。';if(s.closed)return 'この月は確定済みです。次の月へ進んでください。';if(s.ended)return '支払不能のため、経営を終了しました。';if(action==='sales'&&!api.sponsorEvent(s))return '今月は釣り大会の協賛募集がありません。集客投資は販促・接客改善になります。';if(q.length!==PRODUCTS.length||q.some(n=>!Number.isSafeInteger(n)||n<0||n>100000))return '数量は0以上の整数で入力してください。';for(let i=0;i<PRODUCTS.length;i++)if(q[i]&&!unlocked(s,PRODUCTS[i]))return PRODUCTS[i].name+'に必要な設備がありません。';const u=usage(s,q),existing=usage(s),caps=capacities(s);for(const key of ['dry','cold','water'])if(u[key]>Math.max(caps[key],existing[key]))return ({dry:'常温商品の保管',cold:'冷凍庫',water:'生け簀'}[key])+'上限を超えています。仕入を減らしてください。';if(purchaseQuote(s,q,payment).cash+gross(s,promotionCost(action))>s.balances.預金)return '仕入・行動に使う預金が足りません。';return '';}
function recommend(s,action='tend',price='list',payment='legacy'){
 const q=PRODUCTS.map(()=>0);if(limits(s,action).service===0)return q;
 const cap=capacities(s),used=usage(s),info=limits(s,action);
 const people=Math.min(850*SEASON[month(s.turn)]*effectiveAttraction(s)*info.boost+(api.extension?.charterPlan(s).passengers||0),info.cap,info.service);
 const quantityFactor={list:1,plus10:.75,minus10:1.2,sale:1.5}[price]||1;const desired=PRODUCTS.map((p,i)=>unlocked(s,p)?Math.max(0,Math.ceil(people*p.demand/850*(p.fixedPrice?1:quantityFactor)*basketFactor(s,p)*p.cover)-s.inventory[i]):0);
 const schedule=scheduled(s);let available=Math.max(0,s.balances.預金-fixedCosts(s)-(api.extension?.extraFixed(s)||0)-schedule.principal-schedule.interest-schedule.tax-schedule.payables-gross(s,promotionCost(action)));
 // Proportional allocation prevents later products being squeezed out by list order.
 const requested=purchaseQuote(s,desired,payment).total,budgetRatio=requested?Math.min(1,available/requested):1;
 const ratios={};for(const k of ['dry','cold','water']){const need=PRODUCTS.reduce((n,p,i)=>n+(p.storage===k?desired[i]*p.space:0),0);ratios[k]=need?Math.min(1,Math.max(0,cap[k]-used[k])/need):1;}
 PRODUCTS.forEach((p,i)=>{q[i]=Math.floor(desired[i]*Math.min(budgetRatio,ratios[p.storage]));});return q;
}
function buy(s,id){const spec=EQUIPMENT[id];if(!spec)throw Error('設備がありません');if(s.closed||s.ended||s.actionLocked)throw Error('今月の投資は実行済みか、月が確定しています。');if(s.equipment[id])throw Error('購入済みです');if(spec.requires&&!s.equipment[spec.requires])throw Error('先に冷凍庫を導入してください');if(s.balances.預金<gross(s,spec.cost))throw Error('購入資金が足りません');const n=structuredClone(s);const e=entry(n,spec.account,'預金',spec.cost,spec.name+'を増設','equipment.'+id);inputVAT(n,spec.cost,spec.name);n.equipment[id]=true;n.assets.push({id,cost:spec.cost,life:spec.life,depreciation:0});n.pendingEntries.push(e,...n.entries.filter(x=>x.id>e.id));n.pendingInvestment+=gross(n,spec.cost);n.actionLocked='investment';n.fixture=!!n.equipment.fixture;return n;}
function hire(s,role='parttime',characterId=null){if(!recruitment(s).open)throw Error('採用イベントのある月に募集できます（最初の１人はいつでも可能）。');if(characterId!==null&&!staffCandidates(s).includes(characterId))throw Error('今月の採用候補から選んでください。');if(!ROLES[role]||role==='que')throw Error('職種が不正です');if(s.closed||s.ended||s.actionLocked||s.staff.length>=3)throw Error('今月は採用できません');const n=structuredClone(s);recordHire(n);n.staffSerial=Math.max(n.staffSerial||0,...n.staff.map(x=>Number(x.id.split('-').at(-1))||0))+1;n.staff.push({id:'staff-'+n.staffSerial,role,characterId,hiredTurn:s.turn,wage:ROLES[role].wage,origin:'external'});initializeStaff(n);n.actionLocked='hire';return n;}
function fundLoan(s,{amount,rate,months,kind}){if(kind==='short')months=3;if(s.closed||s.ended||s.bankBorrowedTurn===s.turn||!Number.isSafeInteger(amount)||amount<=0||!Number.isFinite(rate)||rate<=0||!Number.isInteger(months)||months<1||months>(kind==='property'?300:120)||!['short','equipment','startup','property','fishery'].includes(kind))throw Error('融資条件が不正です');const n=structuredClone(s),account=kind==='short'?'短期借入金':'長期借入金';const e=entry(n,'預金',account,amount,'銀行融資の入金','bankBorrow.'+kind);n.pendingEntries.push(e);n.pendingBorrowing=(n.pendingBorrowing||0)+amount;n.loans=n.loans||[];n.loans.push({kind,account,amount,balance:amount,rate,months,due:n.turn+months,start:n.turn,payment:Math.ceil(amount/months)});n.bankBorrowedTurn=n.turn;const classified=n.entries.length;reclassify(n);n.pendingEntries.push(...n.entries.slice(classified));return n;}
function settleLoans(s){let principal=0,interest=0;for(const l of s.loans||[]){const loanEntryStart=s.entries.length;if(l.balance<=0||l.start>=s.turn)continue;const fee=Math.floor((l.increaseTurn===s.turn?l.interestBase:l.balance)*l.rate/1200);const repayment=l.kind==='short'?(s.turn>=(l.due||l.start+l.months)?l.balance:0):Math.min(l.balance,l.payment);entry(s,'支払利息','預金',fee,'銀行借入の月次利息','bankInterest');if(l.kind!=='short'){const current=Math.min(repayment,s.balances['1年内返済予定長期借入金']||0);const loanLabel=l.kind==='startup'?'創業赤字補填借入':'設備借入',repayType='bankRepay.'+l.kind;entry(s,'1年内返済予定長期借入金','預金',current,loanLabel+'の元金返済',repayType);entry(s,'長期借入金','預金',repayment-current,loanLabel+'の元金返済',repayType);}else entry(s,l.account,'預金',repayment,'銀行借入の元金返済','bankRepay.short');l.balance-=repayment;principal+=repayment;interest+=fee;for(const e of s.entries.slice(loanEntryStart)){e.segmentId=l.segmentId||(l.kind==='short'||l.kind==='startup'?'hq':'retail');e.loanKind=l.kind;}}return {principal,interest};}
function expire(s){let waste=0;PRODUCTS.forEach((p,i)=>{const life=p.life||p.obsolete;if(!life||p.retired)return;const n=s.lots[i].filter(l=>s.turn-l.turn>=life).reduce((v,l)=>v+l.quantity,0);if(n){const amount=take(s,i,n);entry(s,'商品廃棄損','商品',amount,p.name+(p.life?'の期限切れ':'の陳腐化による廃棄'),'waste.'+p.id);waste+=amount;}});return waste;}
function next(s){if(!s.closed||s.ended||s.turn>=120)return s;const n=structuredClone(s),previousClose={...s.balances};n.turn++;const start=n.entries.length;if(month(n.turn)===4){for(const k of INCOME){const v=n.balances[k]||0;if(v>0)entry(n,k,'繰越利益剰余金',v,'決算：収益を繰越利益剰余金へ','yearClose.income');else if(v<0)entry(n,'繰越利益剰余金',k,-v,'決算：収益のマイナスを振替','yearClose.income');}for(const k of EXPENSES){const v=n.balances[k]||0;if(v>0)entry(n,'繰越利益剰余金',k,v,'決算：費用を繰越利益剰余金へ','yearClose.expense');else if(v<0)entry(n,k,'繰越利益剰余金',-v,'決算：費用のマイナスを振替','yearClose.expense');}}n.opening={...n.balances};api.extension?.next(n);n.previousClose=previousClose;n.closed=false;n.pendingInvestment=0;n.pendingBorrowing=0;n.pendingOwnerRepayment=0;n.actionLocked=n.rescueBankActionTurn===n.turn?'bank':null;if(n.actionLocked==='bank')n.bankConsultedTurn=n.turn;api.extension?.storeDuty?.(n);processStaffEvents(n);expire(n);n.pendingEntries=n.entries.slice(start);return n;}
function random(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
function run(s,q,price='list',action='tend',options={}){action=s.actionLocked||action;const payment=options.payment||'legacy',error=validation(s,q,action,payment);if(error)throw Error(error);const n=structuredClone(s);api.extension?.init(n);n.livingCost=200;const begin=n.entries.length,before={...(s.opening||s.balances)},opening=before.預金;let waste=s.pendingEntries.filter(e=>e.type?.startsWith('waste.')).reduce((v,e)=>v+e.amount,0);let retiredRefund=0;PRODUCTS.forEach((p,i)=>{if(p.retired&&n.inventory[i]){const amount=take(n,i,n.inventory[i]);entry(n,'預金','商品',amount,'旧ウェア在庫を原価で返品（商品種別の廃止）','retireStock');if(n.vatEnabled)entry(n,'預金','仮払消費税等',vat(amount),'旧ウェア返品の消費税調整','retireVAT');retiredRefund+=gross(n,amount);}});const purchase=purchaseQuote(n,q,payment),spend=purchase.net,credit=payment==='credit',account=credit?'買掛金':'預金';n.payables??=[];n.balances.買掛金??=0;entry(n,'商品',account,spend,credit?'今月の商品仕入（翌月払い）':payment==='cash'?'今月の商品仕入（現金2%割引）':'今月の商品仕入',credit?'purchaseCredit':'purchaseCash');if(n.vatEnabled)entry(n,'仮払消費税等',account,purchase.tax,'商品仕入の消費税',credit?'vatInputCredit':'vatInput');if(credit&&purchase.total)n.payables.push({due:n.turn+1,amount:purchase.total});q.forEach((x,i)=>add(n,i,x,n.turn,purchaseLine(i,x,payment)));if(promotionCost(action))entry(n,'広告宣伝費','預金',promotionCost(action),action==='sales'?'釣り大会の協賛':'販促・接客改善','promotion.'+action);if(promotionCost(action))inputVAT(n,promotionCost(action),'販促');const dead=Math.floor(n.inventory[6]*.05);const deadCost=take(n,6,dead);entry(n,'商品廃棄損','商品',deadCost,'活きアジの死亡','waste.aji');waste+=deadCost;
 const info=limits(n,action),customerGrowth=growthStatus(s);const noise=options.noise??(1-customerGrowth.noiseRange+random(n)*customerGrowth.noiseRange*2);const potential=Math.round(850*(options.season??SEASON[month(n.turn)])*effectiveAttraction(n)*info.boost*noise)+(api.extension?.charterPlan(n).passengers||0);const visitors=Math.min(potential,info.cap),served=Math.min(visitors,info.service);const factor={list:[1,1],plus10:[1.1,.75],minus10:[.9,1.2],sale:[.8,1.5]}[price]||[1,1];let cashSales=0,cardSales=0;const counts=[],productResults=[];
 const soldPlan=PRODUCTS.map((p,i)=>unlocked(n,p)?Math.min(n.inventory[i],Math.round(served*p.demand/850*(p.fixedPrice?1:factor[1])*basketFactor(s,p))):0);
 // One unit of each available consumable per high-price item joins its card checkout.
 // This allocates actual sales; it never creates extra demand or sales.
 const durableUnits=PRODUCTS.reduce((total,p,i)=>total+(p.fixedPrice?soldPlan[i]:0),0);
 PRODUCTS.forEach((p,i)=>{
  const sold=soldPlan[i];counts[i]=sold;const soldCost=take(n,i,sold);
  const revenue=Math.round(sold*p.price*(p.fixedPrice?1:factor[0])),cardQuantity=p.fixedPrice?sold:Math.min(sold,durableUnits),cardNet=sold?Math.round(revenue*cardQuantity/sold):0,cashNet=revenue-cardNet;
  const outputTax=n.vatEnabled?vat(revenue):0,cardTax=n.vatEnabled?vat(cardNet):0,cashTax=outputTax-cardTax;
  entry(n,'預金','売上高',cashNet,p.name+'の現金売上（税抜）','saleCash');
  const card=entry(n,'売掛金','売上高',cardNet,p.name+(p.fixedPrice?'のカード売上（税抜）':'のカードまとめ買い売上（税抜）'),'saleCard');if(card)card.bundled=!p.fixedPrice;
  entry(n,'売上原価','商品',soldCost,p.name+'の販売原価','costOfSales');
  entry(n,'預金','仮受消費税等',cashTax,p.name+'の現金売上に係る消費税','vatOutput');
  entry(n,'売掛金','仮受消費税等',cardTax,p.name+'のカード売上に係る消費税（入金前）','vatOutput');
  productResults[i]={id:p.id,quantity:sold,sales:revenue,cost:soldCost,grossProfit:revenue-soldCost,unitPrice:p.price*(p.fixedPrice?1:factor[0]),margin:revenue?(revenue-soldCost)/revenue:0,cardQuantity,cardNet,cardTax,cashNet,cashTax};
  cardSales+=cardNet+cardTax;cashSales+=cashNet+cashTax;
 });
 if(cardSales)n.receivables.push({due:n.turn+2,amount:cardSales});let collected=0;n.receivables=n.receivables.filter(r=>{if(r.due<=n.turn){entry(n,'預金','売掛金',r.amount,'２か月前のカード売上回収','collectCard');collected+=r.amount;return false;}return true;});
 const salary=n.officerSalary||300000,social=Math.floor(salary*.15)+staffSocial(n),wages=payroll(n),maintenance=upkeep(n),miscBase=(n.rulesVersion==='v23'?145000:130000)-officeSaving(n),taxableOperating=180000+miscBase;for(const [a,value] of [['役員報酬',salary],['法定福利費',staffSocial(n)],['給料手当',wages],['地代家賃',150000],['広告宣伝費',30000],['雑費',miscBase+maintenance]])entry(n,a,'預金',value,a+(a==='雑費'?'（設備維持費含む）':''));entry(n,'法定福利費','預金',Math.floor(salary*.15),'役員社会保険','officerSocial');inputVAT(n,taxableOperating+maintenance,'店舗運営費');let dep=0;for(const a of n.assets){a.months=(a.months||0)+1;const amount=a.months>=a.life?Math.max(0,a.cost-1-a.depreciation):Math.min(Math.floor(a.cost/a.life),Math.max(0,a.cost-1-a.depreciation));a.depreciation+=amount;dep+=amount;const de=entry(n,'減価償却費','減価償却累計額',amount,'設備の月割償却','depreciation');if(de){de.segmentId=a.segmentId||'retail';de.assetId=a.id;}}
 n.owner+=Math.floor((n.officerSalary||300000)*.8);const living=200000,needed=Math.max(0,living-n.owner);const lent=needed<=Math.max(0,n.balances.預金)?needed:0;entry(n,'役員貸付金','預金',lent,'個人生活費不足の貸付','ownerLoan');n.owner+=lent-living;const interest=Math.floor((before.役員貸付金||0)*.013/12);entry(n,'未収利息','受取利息',interest,'役員貸付利息（ゲーム年1.3％）','ownerInterest');const paid=n.payInterest===false?0:Math.min(Math.max(0,n.owner),n.balances.未収利息||0);entry(n,'預金','未収利息',paid,'役員利息の受領','collectInterest');n.owner-=paid;const principal=n.repayOwner?Math.min(Math.max(0,n.owner),n.balances.役員貸付金||0):0;entry(n,'預金','役員貸付金',principal,'役員貸付元金の回収','collectOwner');n.owner-=principal;
 let payablePaid=0;n.payables=n.payables.filter(p=>{if(p.due>n.turn)return true;entry(n,'買掛金','預金',p.amount,'前月仕入の買掛金を支払','paySupplier');payablePaid+=p.amount;return false;});api.extension?.monthly(n);api.extension?.taxMonthly?.(n);recordTaxEvidence(n);const debtService=settleLoans(n);debtService.principal+=n.pendingShortRepayment||0;n.pendingShortRepayment=0;reclassify(n);const tax=settleTaxes(n);const consumption=settleVAT(n);const audit=api.extension?.audit?api.extension.audit(n):taxAuditEvent(n);n.ended=n.balances.預金<0||n.owner<0;if(n.ended)n.cashCrisis={status:'pending',turn:n.turn};n.closed=true;const attractionBefore=n.attraction;const assortment=assortmentStatus(n);const naturalLoss=(n.attraction*(n.turn<=12?.004:.012)+Math.max(0,n.attraction-1)*.035)*(1-assortment.ratio);const effortGain=marketingGain(n);const seasonalGain=seasonalRecall(n);const growth=advanceGrowth(n,action,price,served,counts,assortment,effortGain);n.attraction=Math.min(1.5,Math.max(.2,n.attraction-naturalLoss-growth.neglectLoss+legacyMarketingGain(n)));n.marketing=n.marketing||[];let effortPlanned=0;if(action==='improve'||action==='sales'){effortPlanned=action==='improve'?(n.rulesVersion==='v23'?.12:.16):.3;n.marketing.push(action==='sales'?{kind:'campaign',start:n.turn+1,end:n.turn+6,gain:effortPlanned,profile:[1,1,1,1,2/3,1/3]}:{kind:'campaign',start:n.turn+1,end:n.turn+4,gain:effortPlanned});}if(price==='sale'&&counts.some(x=>x>0)){n.marketing.push({kind:'seasonal',start:n.turn+12,end:n.turn+14,gain:.16});effortPlanned+=.16;}n.marketing=n.marketing.filter(x=>x.end>n.turn);n.recognition=Math.min(1.4,awareness(n)+legacyMarketingGain(n)*.5+(served>0&&counts.some(x=>x>0)?(marketingGain(n)-legacyMarketingGain(n))*.35:0));n.tournament=0;n.history.push({turn:n.turn,rulesVersion:n.rulesVersion||'v22',balances:{...n.balances},previousClose:{...(s.previousClose||s.history.at(-1)?.balances||s.opening||before)},monthProfit:profit(n.balances)-profit(before),customerGrowth:growth,assortment:{...assortment},served,interestExpense:debtService.interest,principalPaid:debtService.principal,choice:{quantities:[...q],price,action,payment}});const entries=[...s.pendingEntries,...n.entries.slice(begin)];const fixedCash=fixedCosts(n),extra=s.pendingInvestment+gross(n,promotionCost(action)),personal={lent,received:paid+principal,interest,paid,unfunded:Math.max(0,-n.owner)};
 const borrowing=s.pendingBorrowing||0,ownerRepayment=s.pendingOwnerRepayment||0;const report={payment,purchaseTotal:purchase.total,payablePaid,rulesVersion:n.rulesVersion||'v22',growth,audit,averageSpend:served?Math.round(productResults.reduce((sum,p)=>sum+p.sales,0)/served):0,productResults,ownerRepayment,retiredRefund,assortment,consumption,effortPlanned,seasonalGain,attractionBefore,attractionAfter:n.attraction,naturalLoss,effortGain,tax,borrowing,debtService,previousClose:{...(s.previousClose||s.history.at(-1)?.balances||s.opening||before)},turn:n.turn,month:month(n.turn),fy:Math.floor((n.turn-1)/12)+1,before,after:{...n.balances},opening,entries,fixedCash,extra,spend:purchase.cash,cashSales,cardSales,collected,served,customers:potential,visitors,limit:info.cap,counts,waste,dep,action,personal,inflow:cashSales+collected+personal.received+borrowing+consumption.refund+retiredRefund,outflow:ownerRepayment+gross(n,spend)+extra+fixedCash+lent+debtService.principal+debtService.interest+tax.paid+consumption.paid,monthProfit:profit(n.balances)-profit(before)};report.inflow=entries.filter(e=>e.debit==='預金').reduce((v,e)=>v+e.amount,0);report.outflow=entries.filter(e=>e.credit==='預金').reduce((v,e)=>v+e.amount,0);api.extension?.closed(n,report);recordStaffHints(n,report);n.pendingEntries=[];assertState(n);return {state:n,report};}
function assertState(s){const assets=ASSETS.reduce((v,k)=>v+(s.balances[k]||0),0)-(s.balances.減価償却累計額||0);const liab=['買掛金','仮受消費税等','未払消費税等','短期借入金','長期借入金','1年内返済予定長期借入金','役員借入金','未払法人税等','繰延売上','預り敷金'].reduce((v,k)=>v+(s.balances[k]||0),0);if(assets!==liab+(s.balances.資本金||0)+(s.balances.繰越利益剰余金||0)+profit(s.balances))throw Error('貸借不一致');if(PRODUCTS.reduce((v,p,i)=>v+inventoryValue(s,i),0)!==s.balances.商品+(s.expansion?.concealedInventory||0))throw Error('在庫金額不一致');s.inventory.forEach((v,i)=>{if(!Number.isInteger(v)||v<0||v!==s.lots[i].reduce((n,l)=>n+l.quantity,0))throw Error('在庫数量不一致');});const loanBalance=(s.loans||[]).reduce((n,l)=>n+l.balance,0);if(loanBalance!==['短期借入金','長期借入金','1年内返済予定長期借入金'].reduce((n,k)=>n+(s.balances[k]||0),0))throw Error('借入台帳不一致');if(s.receivables.reduce((n,r)=>n+r.amount,0)!==s.balances.売掛金)throw Error('売掛残高不一致');if((s.payables||[]).some(p=>!Number.isSafeInteger(p.amount)||p.amount<=0||!Number.isInteger(p.due)||p.due<s.turn+(s.closed?1:0)||p.due>s.turn+1)||(s.payables||[]).reduce((v,p)=>v+p.amount,0)!==(s.balances.買掛金||0))throw Error('買掛残高不一致');s.lots.forEach(lots=>lots.forEach(l=>{if(l.amount!==undefined&&(!Number.isSafeInteger(l.amount)||l.amount<0))throw Error('在庫原価が不正');}));api.extension?.assert(s);return true;}
// 集客投資: normally in-store promotion; in about one month in five a fishing-tournament sponsorship is offered instead (bigger and longer effect).
function sponsorEvent(s){return !!api.extension&&s.turn>1&&api.extension.draw(s,'sponsorEvent')<.2;}
function promotionCost(action){return action==='sales'?100000:action==='improve'?30000:0;}
function staffSocial(s){return Math.floor(s.staff.filter(x=>x.role!=='parttime').reduce((n,x)=>n+(x.wage??ROLES[x.role].wage),0)*.15);}
function fixedCosts(s){const operating=(s.rulesVersion==='v23'?325000:310000)-officeSaving(s);return Math.floor((s.officerSalary||300000)*1.15)+gross(s,operating+upkeep(s))+payroll(s)+staffSocial(s);}
function scheduled(s,turn=s.turn){let principal=0,interest=0;for(const l of s.loans||[]){if(!l.balance||l.start>=turn)continue;interest+=Math.floor(l.balance*l.rate/1200);principal+=l.kind==='short'?(turn>=(l.due||l.start+l.months)?l.balance:0):Math.min(l.balance,l.payment);}return {principal,interest,payables:(s.payables||[]).filter(p=>p.due<=turn).reduce((v,p)=>v+p.amount,0),tax:(s.vatDue||[]).filter(t=>t.due<=turn&&!t.refund).reduce((n,t)=>n+t.amount,0)+(s.taxes||[]).filter(t=>t.due<=turn).reduce((n,t)=>n+t.amount,0)};}
function ordinary(b){return profit(b)+(b.法人税等||0)+(b.固定資産売却損||0)-(b.固定資産売却益||0);}
// Small blue-return corporation, with accounting pretax income used as taxable income.
function applyTaxLosses(lots,year,income){
 const expired=lots.filter(l=>year-l.year>10).reduce((n,l)=>n+l.remaining,0);
 lots=lots.filter(l=>year-l.year<=10&&l.remaining>0).map(l=>({...l})).sort((a,b)=>a.year-b.year);
 let taxable=Math.max(0,income),used=0;
 for(const l of lots){if(l.year>=year)continue;const n=Math.min(l.remaining,taxable);l.remaining-=n;taxable-=n;used+=n;}
 const added=Math.max(0,-income);if(added)lots.push({year,remaining:added});
 return {lots:lots.filter(l=>l.remaining>0),income,taxable,used,added,expired,remaining:lots.reduce((n,l)=>n+l.remaining,0)};
}
function initializeTaxLosses(s){
 if(Array.isArray(s.taxLosses)){s.taxAnnual=s.taxAnnual||[];return;}
 let lots=[];
 for(const h of s.history.filter(h=>h.turn%12===0).sort((a,b)=>a.turn-b.turn))lots=applyTaxLosses(lots,h.turn/12,ordinary(h.balances)).lots;
 s.taxLosses=lots;s.taxAnnual=[];s.taxCarryMigratedTurn=s.turn;
}
function settleTaxes(s){
 initializeTaxLosses(s);s.taxes=s.taxes||[];
 let paid=0;for(const t of (s.taxRefunds||[]).filter(t=>t.due<=s.turn)){entry(s,'預金','未収法人税等',t.amount,'時期ずれ補正に伴う法人税等の還付（ゲーム）','auditCorpRefund');paid-=t.amount;}s.taxRefunds=(s.taxRefunds||[]).filter(t=>t.due>s.turn);for(const t of s.taxes.filter(t=>t.due<=s.turn)){entry(s,'未払法人税等','預金',t.amount,t.audit?'税務調査による追加法人税等・加算税の納付':'決算２か月後の法人税等納付',t.audit?'auditCorpPay':'taxPayment');paid+=t.amount;}
 s.taxes=s.taxes.filter(t=>t.due>s.turn);
 let assessed=0,loss=null;
 if(month(s.turn)===3&&!s.taxAnnual.some(t=>t.turn===s.turn)){
  const addBack=s.entries.filter(e=>e.turn>s.turn-12&&['auditVATAccrual','auditPenalty'].includes(e.type)).reduce((n,e)=>n+e.amount,0);const timing=(s.taxEvidence||[]).filter(e=>e.status==='assessed'&&['inventory','defer'].includes(e.kind)&&Math.ceil(e.turn/12)===s.turn/12-1).reduce((n,e)=>n-e.base,0);loss=applyTaxLosses(s.taxLosses,s.turn/12,profit(s.balances)+(s.balances.法人税等||0)+addBack+timing);loss.auditTimingAdjustment=timing;loss.addBack=addBack;s.taxLosses=loss.lots;
  assessed=Math.floor(Math.min(8000000,loss.taxable)*.25+Math.max(0,loss.taxable-8000000)*.35)+70000;
  entry(s,'法人税等','未払法人税等',assessed,'決算の法人税等（繰越欠損金控除後・ゲーム概算）','taxAccrual');
  s.taxes.push({amount:assessed,due:s.turn+2});s.taxAnnual.push({turn:s.turn,...loss,assessed});
 }
 return {paid,assessed,loss};
}
function reclassify(s){const expected=(s.loans||[]).filter(l=>l.kind!=='short').reduce((n,l)=>n+Math.min(l.balance,l.payment*12),0);const current=s.balances['1年内返済予定長期借入金']||0;if(expected>current)entry(s,'長期借入金','1年内返済予定長期借入金',expected-current,'翌12か月の元金を流動負債へ振替','loanReclass');else if(current>expected)entry(s,'1年内返済予定長期借入金','長期借入金',current-expected,'長期借入金の区分調整','loanReclass');}
function renewLoan(s,index,rate,target=s.loans?.[index]?.balance){const n=structuredClone(s),l=n.loans?.[index];if(n.closed||n.ended||!l||l.kind!=='short'||l.balance<=0||!Number.isFinite(rate)||rate<=0||!Number.isSafeInteger(target)||target<0||n.turn<(l.due||l.start+l.months)-1||n.turn>(l.due||l.start+l.months))throw Error('更新の対象時期・金額ではありません');const delta=target-l.balance,old=l.due||l.start+l.months;if(delta<0&&n.balances.預金<-delta)throw Error('減額分の返済資金が足りません');if(delta){const e=entry(n,delta>0?'預金':'短期借入金',delta>0?'短期借入金':'預金',Math.abs(delta),'短期借入の'+(delta>0?'増額':'減額')+'更新','shortRenewal');n.pendingEntries.push(e);if(delta>0){n.pendingBorrowing=(n.pendingBorrowing||0)+delta;n.bankBorrowedTurn=n.turn;l.amount+=delta;l.increaseTurn=n.turn;l.interestBase=l.balance;}else n.pendingShortRepayment=(n.pendingShortRepayment||0)-delta;}l.balance=target;l.due=old+3;l.months=3;l.rate=rate;n.events=n.events||[];n.events.push({turn:n.turn,memo:'短期借入を３か月更新。元本 '+target+'円、期日 TURN '+l.due});assertState(n);return n;}
function compact(s){const cutoff=s.turn-5;for(const e of s.entries){if(e.turn<cutoff){delete e.before;delete e.after;}}return s;}
function migrate(s){s.payables??=[];api.extension?.init(s);if(Number.isFinite(firstHireTurn(s)))recordHire(s);for(const p of [...s.staff,...(s.expansion?.fishery?.crew||[])])if(p.transferHalf)p.transferHalf=false;processStaffEvents(s);s.taxEvidence=s.taxEvidence||[];initializeTaxLosses(s);if(s.vatEnabled===undefined){s.vatEnabled=true;s.vatStartTurn=s.closed?s.turn+1:s.turn;}s.version=6;s.rulesVersion=s.rulesVersion||'v22';if(!s.growth)s.growth={loyalty:0,lastEffortTurn:s.turn,startedTurn:s.turn};s.taxAudits=s.taxAudits||[];s.vatDue=s.vatDue||[];s.vatAnnual=s.vatAnnual||[];if((s.balances.仮払消費税等||0)<0)entry(s,'仮払消費税等','仮受消費税等',-s.balances.仮払消費税等,'返品超過に伴う消費税の振替','vatReturnAdjust');s.taxes=s.taxes||[];s.events=s.events||[];s.livingCost=200;const rename=b=>{if(!b)return;if('内装'in b){b.建物附属設備=(b.建物附属設備||0)+b.内装;delete b.内装;}};[s.balances,s.opening,...s.history.map(h=>h.balances)].forEach(rename);s.previousClose=s.previousClose||s.history.at(-1)?.balances||s.opening||{...s.balances};for(const e of s.entries){if(e.debit==='内装')e.debit='建物附属設備';if(e.credit==='内装')e.credit='建物附属設備';rename(e.before);rename(e.after);if(e.memo==='開業商品の現金仕入')e.type='purchaseCash';}for(const k of [...DEBIT,...CREDIT])s.balances[k]??=0;return s;}
function forecast(s,q,price,action,payment='legacy'){if(s.closed)return null;try{const base=run(s,q,price,action,{noise:1,payment}),low=run(s,q,price,action,{noise:.9,payment});return {expected:base.state.balances.預金,low:low.state.balances.預金,profit:base.report.monthProfit,products:base.report.productResults,service:scheduled(s)};}catch{return null;}}
function legacyMarketingGain(s){return (s.marketing||[]).filter(x=>x.kind==='gradual'&&x.start<=s.turn&&x.end>=s.turn).reduce((n,x)=>n+x.gain,0);}
function marketingGain(s){return legacyMarketingGain(s)+(s.marketing||[]).filter(x=>x.kind==='campaign'&&x.start<=s.turn&&x.end>=s.turn).reduce((n,x)=>n+x.gain*((x.profile||[1,1,2/3,1/3])[s.turn-x.start]||0),0);}
function seasonalRecall(s){return Math.min(.4,(s.marketing||[]).filter(x=>x.kind==='seasonal'&&x.start<=s.turn&&x.end>=s.turn).reduce((n,x)=>n+x.gain,0));}
function assortmentStatus(s){const available=PRODUCTS.filter(p=>unlocked(s,p)),stocked=available.filter(p=>s.inventory[PRODUCTS.indexOf(p)]>0).length;return {stocked,total:available.length,ratio:available.length?stocked/available.length:0};}
function awareness(s){return s.recognition??.78;}
function initializeStaff(s){
 s.staffEvents=s.staffEvents||[];
 s.staffSerial=Math.max(s.staffSerial||0,...(s.staff||[]).map(x=>Number(x.id.split('-').at(-1))||0),...s.staffEvents.map(e=>Number(e.staffId?.split('-').at(-1))||0));
 for(const x of [...(s.staff||[]),...(s.expansion?.fishery?.crew||[])]){
  x.origin=x.origin||'external';
  if((x.role==='parttime'||x.homeRole==='parttime')&&x.offerTurn===undefined){
   const serial=Number(x.id.split('-').at(-1))||1;
   x.offerTurn=Math.max(x.hiredTurn+24+(serial*7+x.hiredTurn*3)%24,s.turn);
   x.departTurn=Math.max(x.hiredTurn+48,s.turn+(s.closed?2:1));
  }
 }
}
function processStaffEvents(s){
 initializeStaff(s);
 for(const x of [...s.staff,...(s.expansion?.fishery?.crew||[])]){
  if(x.role!=='parttime'&&x.homeRole!=='parttime')continue;
  let offer=s.staffEvents.find(e=>e.staffId===x.id&&e.type==='offer');
  if(!offer&&s.turn>=x.offerTurn){offer={id:'offer-'+x.id,staffId:x.id,type:'offer',turn:s.turn,deadline:x.departTurn,status:'pending',notified:false};s.staffEvents.push(offer);}
  if(s.turn>=x.departTurn){if(offer)offer.status='expired';s.staff=s.staff.filter(y=>y.id!==x.id);if(s.expansion?.fishery)s.expansion.fishery.crew=s.expansion.fishery.crew.filter(y=>y.id!==x.id);s.staffEvents.push({id:'left-'+x.id,staffId:x.id,type:'departure',turn:s.turn,status:'completed',notified:false});}
 }
}
function staffAffinity(s){return Math.min(.15,s.staff.reduce((n,x)=>n+(x.role==='employee'?(x.origin==='internal'?.04:.01):0)+(STAFF_CHARACTERS[x.characterId]?.attraction||0),0));}
function officeSaving(s){return Math.min(24000,s.staff.filter(x=>x.role==='employee'&&x.origin==='internal').length*8000+s.staff.reduce((n,x)=>n+(STAFF_CHARACTERS[x.characterId]?.office||0),0));}
function promoteStaff(s,id){
 const n=structuredClone(s),x=[...n.staff,...(n.expansion?.fishery?.crew||[])].find(x=>x.id===id),offer=n.staffEvents?.find(e=>e.staffId===id&&e.type==='offer');
 if(n.closed||n.ended||!x||(x.role!=='parttime'&&x.homeRole!=='parttime')||!offer||!['pending','deferred'].includes(offer.status)||n.turn>=x.departTurn)throw Error('今は登用できません');
 if(n.staff.includes(x))x.role='employee';x.homeRole='employee';x.origin='internal';x.wage=ROLES.employee.wage;delete x.wageCut;delete x.baseWage;delete x.wageCutTurn;x.promotedTurn=n.turn;offer.status='accepted';offer.notified=true;
 n.staffEvents.push({id:'promoted-'+id,staffId:id,type:'promotion',turn:n.turn,status:'completed',notified:true});assertState(n);return n;
}
function deferStaff(s,id){const n=structuredClone(s),e=n.staffEvents?.find(e=>e.staffId===id&&e.type==='offer');if(n.closed||n.ended||!e||!['pending','deferred'].includes(e.status))throw Error('保留できる相談がありません');e.status='deferred';e.notified=true;return n;}
function repayToOwner(s,ratio){
 if(s.closed||s.ended||![.3,.5,1].includes(ratio))throw Error('未確定の月に３割・５割・全額から選んでください');
 const amount=ratio===1?(s.balances.役員借入金||0):Math.floor((s.balances.役員借入金||0)*ratio);
 if(amount<=0||amount>s.balances.預金)throw Error('返済残高または会社預金が足りません');
 const n=structuredClone(s),e=entry(n,'役員借入金','預金',amount,'会社から社長へ役員借入金を返済','repayOwnerFunding');
 n.owner+=amount;n.pendingEntries.push(e);n.pendingOwnerRepayment=(n.pendingOwnerRepayment||0)+amount;assertState(n);return n;
}
function recordTaxEvidence(s){
 s.taxEvidence=s.taxEvidence||[];if(s.turn<=12||s.taxEvidence.some(e=>e.turn===s.turn))return;
 const admin=s.staff.some(x=>x.role==='employee'&&x.origin==='internal')?.8:s.staff.some(x=>x.role==='employee'||x.role==='manager')?.3:0;
 // Separate deterministic draw: previews/reloads do not reroll demand or paperwork events.
 let hash=(Math.imul(s.turn,2654435761)^(s.rng||73129))>>>0;hash^=hash>>>16;
 if((hash>>>0)/4294967296>=.12*(1-admin))return;
 const expense=s.entries.find(e=>e.turn===s.turn&&e.debit==='雑費'&&e.credit==='預金');if(!expense)return;
 const base=Math.min(20000,expense.amount);
 s.taxEvidence.push({id:'evidence-'+s.turn,turn:s.turn,expenseId:expense.id,base,vat:s.vatEnabled?vat(base):0,status:'open',reason:'店舗雑費の一部で、事業用途と請求書を確認できる資料が不足'});
}
function resolveTaxEvidence(s,id){
 const n=structuredClone(s),e=n.taxEvidence?.find(e=>e.id===id);
 if(!e||e.status!=='open')throw Error('未解決の資料がありません');
 e.status='documented';e.resolvedTurn=n.turn;return n;
}
function assessTaxEvidence(s,audit){
 const targets=(s.taxEvidence||[]).filter(e=>e.status==='open'&&Math.ceil(e.turn/12)*12<=s.turn);
 if(!targets.length)return;
 for(const e of targets){e.status='assessed';e.auditTurn=s.turn;}
 // Recompute the tax-only loss schedule, including effects on later closed years.
 const corrected=s.taxAuditTaxByYear||{},changes=[];let lots=[],corporate=0,penaltyBase=0;
 const first=(s.taxAnnual||[]).reduce((n,y)=>Math.min(n,y.turn),Infinity);
 for(const h of s.history.filter(h=>h.turn%12===0&&h.turn<first).sort((a,b)=>a.turn-b.turn))lots=applyTaxLosses(lots,h.turn/12,ordinary(h.balances)).lots;
 for(const y of [...(s.taxAnnual||[])].sort((a,b)=>a.turn-b.turn)){
  const denied=(s.taxEvidence||[]).filter(e=>e.status==='assessed'&&Math.ceil(e.turn/12)*12===y.turn).reduce((n,e)=>n+e.base,0)-(s.taxEvidence||[]).filter(e=>e.status==='assessed'&&['inventory','defer'].includes(e.kind)&&Math.ceil(e.turn/12)*12===y.turn-12).reduce((n,e)=>n+e.base,0);
  const c=applyTaxLosses(lots,y.turn/12,y.income-(y.auditTimingAdjustment||0)+denied);lots=c.lots;
  const revised=Math.floor(Math.min(8000000,c.taxable)*.25+Math.max(0,c.taxable-8000000)*.35)+70000;
  const extra=revised-y.assessed-(corrected[y.turn]||0);corporate+=extra;penaltyBase+=Math.max(0,extra);corrected[y.turn]=(corrected[y.turn]||0)+extra;
  if(denied||extra)changes.push({year:y.turn/12,denied,additionalTax:extra});
 }
 if(s.taxAnnual?.length)s.taxLosses=lots;s.taxAuditTaxByYear=corrected;
 const penaltyRate=targets.some(e=>e.severe)?.35:.1,consumption=targets.reduce((n,e)=>n+e.vat,0),corporatePenalty=Math.floor(penaltyBase*penaltyRate),vatPenalty=targets.reduce((n,e)=>n+Math.floor(e.vat*(e.severe?.35:.1)),0),penalty=corporatePenalty+vatPenalty;
 if(corporate<0){entry(s,'未収法人税等','法人税等',-corporate,'時期ずれの税額を通算補正（ゲーム）','auditCorpCredit');s.taxRefunds=s.taxRefunds||[];s.taxRefunds.push({amount:-corporate,due:s.turn+1});}else entry(s,'法人税等','未払法人税等',corporate,'証憑不備の否認による追加法人税等','auditCorpAccrual');
 entry(s,'租税公課','未払消費税等',consumption,'仕入税額控除の否認による追加消費税等','auditVATAccrual');
 entry(s,'租税公課','未払法人税等',corporatePenalty,'追加法人税等に対する加算税（ゲーム'+(penaltyRate*100)+'％）','auditPenalty');
 entry(s,'租税公課','未払消費税等',vatPenalty,'追加消費税等に対する加算税（ゲームの指摘別率）','auditPenalty');
 if(Math.max(0,corporate)+corporatePenalty)s.taxes.push({amount:Math.max(0,corporate)+corporatePenalty,due:s.turn+1,audit:true});
 if(consumption+vatPenalty)s.vatDue.push({amount:consumption+vatPenalty,due:s.turn+1,audit:true});
 Object.assign(audit,{penaltyRate,findings:targets.map(e=>({...e})),taxChanges:changes,corporateAdditional:corporate,vatAdditional:consumption,penalty,additionalTax:corporate+consumption+penalty,due:s.turn+1,lossRemaining:s.taxLosses.reduce((n,l)=>n+l.remaining,0)});
}
function growthStatus(s){
 const active=s.turn>24,loyalty=active?Math.max(0,Math.min(1,s.growth?.loyalty||0)):0;
 const idleMonths=Math.max(0,s.turn-Math.max(s.growth?.lastEffortTurn||0,s.growth?.startedTurn||1));
 const ageYears=Math.floor((s.turn-1)/12);
 const neglectRate=active&&idleMonths>9?Math.min(.045,.003+ageYears*.002+(idleMonths-9)*.00025):0;
 return {loyalty,idleMonths,neglectRate,noiseRange:.1*(1-.6*loyalty),year:ageYears+1};
}
function basketFactor(s,p){return 1+growthStatus(s).loyalty*(p.fixedPrice ? .8 : .12);}
function advanceGrowth(s,action,price,served,counts,assortment,effortGain){
 const before=growthStatus(s);
 s.growth=s.growth||{loyalty:0,lastEffortTurn:0,startedTurn:1};
 // Current effort is recorded for future months; benefits require earlier effort to mature.
 const meaningful=served>0&&counts.some(n=>n>0);
 const cultivated=s.turn>24&&meaningful&&assortment.ratio>=.8&&effortGain>0;
 const gain=cultivated?.022*Math.min(1,effortGain/.03)*assortment.ratio:0;
 const erosion=s.turn<=24?0:!meaningful||before.idleMonths>9?.018:assortment.ratio<.8?.012*(1-assortment.ratio):0;
 const neglectLoss=s.attraction*before.neglectRate;
 s.growth.loyalty=Math.max(0,Math.min(1,before.loyalty+gain-erosion));
 if(action==='improve'||action==='sales'||price==='sale'&&meaningful)s.growth.lastEffortTurn=s.turn;
 return {...before,loyaltyAfter:s.growth.loyalty,loyaltyGain:gain,loyaltyLoss:erosion,neglectLoss};
}
function taxAuditEvent(s){
 s.taxAudits=s.taxAudits||[];
 if(s.turn<30||s.taxAudits.some(a=>a.turn===s.turn))return null;
 const prior=s.taxAudits.at(-1),interval=prior?s.turn-prior.turn:s.turn;
 const recent=s.history.slice(-5),overdue=(s.balances.未収利息||0)>0&&recent.length===5&&recent.every(h=>(h.balances.未収利息||0)>0);
 if((s.turn-30)%24!==0&&!(overdue&&interval>=12))return null;
 const since=prior?.turn||0;
 const entries=s.entries.filter(e=>e.turn>since&&e.turn<=s.turn);
 const audit={turn:s.turn,reason:overdue?'役員貸付利息の回収状況を確認':'帳簿・在庫・税金の定期確認',status:'pending',notified:false,
  ownerLoan:s.balances.役員貸付金||0,unpaidInterest:s.balances.未収利息||0,
  waste:entries.filter(e=>e.debit==='商品廃棄損').reduce((n,e)=>n+e.amount,0),
  interestBooked:entries.filter(e=>e.credit==='受取利息').reduce((n,e)=>n+e.amount,0),
  interestCollected:entries.filter(e=>e.debit==='預金'&&e.credit==='未収利息').reduce((n,e)=>n+e.amount,0),
  vatLiability:s.balances.未払消費税等||0,corporateTax:s.balances.未払法人税等||0,additionalTax:0};
 assessTaxEvidence(s,audit);s.taxAudits.push(audit);return {...audit};
}
function reviewTaxAudit(s,turn,collectInterest=false){
 const n=structuredClone(s),audit=n.taxAudits?.find(a=>a.turn===turn);
 if(!audit)throw Error('税務調査の記録がありません');
 assertState(n);
 audit.status='reviewed';audit.notified=true;
 audit.followup=(n.balances.未収利息||0)>0;
 if(collectInterest)n.payInterest=true;
 return n;
}
function effectiveAttraction(s){return (1+staffAffinity(s))*awareness(s)*Math.min(1.8,s.attraction+marketingGain(s)+seasonalRecall(s));}
function settleVAT(s){
 const result={paid:0,refund:0,assessed:0,interim:0};if(!s.vatEnabled)return result;
 s.vatDue=s.vatDue||[];s.vatAnnual=s.vatAnnual||[];if((s.balances.仮払消費税等||0)<0)entry(s,'仮払消費税等','仮受消費税等',-s.balances.仮払消費税等,'返品超過に伴う消費税の振替','vatReturnAdjust');
 for(const d of s.vatDue.filter(x=>x.due<=s.turn)){
  if(d.refund){entry(s,'預金','未収消費税等',d.amount,'消費税の還付（ゲームでは決算２か月後）','vatRefund');result.refund+=d.amount;}
  else {entry(s,d.interim?'仮払消費税中間納付':'未払消費税等','預金',d.amount,d.audit?'税務調査による追加消費税等・加算税の納付':d.interim?'消費税の中間納付':'消費税の確定納付',d.audit?'auditVATPay':'vatPay');result.paid+=d.amount;if(d.interim)result.interim+=d.amount;}
 }s.vatDue=s.vatDue.filter(x=>x.due>s.turn);
 if(month(s.turn)===3){const output=s.balances.仮受消費税等||0,input=s.balances.仮払消費税等||0,prepaid=s.balances.仮払消費税中間納付||0;
  const annual=output-input,net=annual-prepaid,offset=Math.min(input,output);
  entry(s,'仮受消費税等','仮払消費税等',offset,'消費税の決算相殺','vatClose');
  if(output>input)entry(s,'仮受消費税等','未払消費税等',output-input,'消費税の納付額確定','vatClose');
  if(input>output)entry(s,'未収消費税等','仮払消費税等',input-output,'消費税の還付額確定','vatClose');
  const applied=Math.min(Math.max(0,annual),prepaid);entry(s,'未払消費税等','仮払消費税中間納付',applied,'中間納付を確定税額から控除','vatClose');
  if(prepaid>applied)entry(s,'未収消費税等','仮払消費税中間納付',prepaid-applied,'中間納付超過分の還付','vatClose');
  if(net)s.vatDue.push({due:s.turn+2,amount:Math.abs(net),refund:net<0});result.assessed=net;s.vatAnnual.push({turn:s.turn,amount:annual});
  const national=Math.max(0,annual)*.78;const periods=national>4000000?[3,6,9]:national>480000?[6]:[];
  for(const period of periods)s.vatDue.push({due:s.turn+period+2,amount:Math.floor(Math.max(0,annual)*(periods.length===1?.5:.25)),interim:true});
 }return result;
}
function lendByOwner(s,amount){if(s.closed||s.ended||!Number.isSafeInteger(amount)||amount<=0||amount>s.owner)throw Error('個人預金の範囲で、未確定の月に貸してください');const n=structuredClone(s);const e=entry(n,'預金','役員借入金',amount,'社長個人から会社へ貸付（返済期限なし）','ownerFunding');n.owner-=amount;n.pendingEntries.push(e);n.pendingBorrowing=(n.pendingBorrowing||0)+amount;assertState(n);return n;}
function queComment(s,r){
 if(!r||r.provisional)return null;
 const annual=r.turn%12===0,previous=s.history.find(h=>h.turn===r.turn-12);
 const current=annual?profit(r.after):r.monthProfit;
 const prior=previous?(annual?profit(previous.balances):previous.monthProfit):null;
 const amount=n=>(Math.abs(n)/10000).toLocaleString('ja-JP',{maximumFractionDigits:1})+'万円';
 const period=annual?'今年':'今月',comparison=annual?'前年比':'前年同月比';
 let trend;
 if(!Number.isFinite(prior))trend=annual?`${r.turn===12?'最初の１年は':'前年の記録がないけど、今年は'}${current<0?'赤字':'黒字'}${amount(current)}や。来年はこの成績と比べてみよ。`:`今月は${current<0?'赤字':'黒字'}${amount(current)}や。まだ前年同月の記録はないし、季節の波も見ながら積み重ねよ。`;
 else {const delta=current-prior;
  trend=current<0?(prior>=0?`${period}は赤字に転じてもうた。${comparison}で${amount(delta)}悪化や。`:delta>0?`${period}はまだ赤字やけど、${comparison}では${amount(delta)}改善してるで。`:`${period}も赤字や。${comparison}では${delta<0?amount(delta)+'赤字が増えてもうた':'ほぼ横ばいや'}。`)
   :prior<0?`${period}は黒字に転じたで。${comparison}で${amount(delta)}改善や。`
   :`${period}は黒字やけど、${comparison}では${delta>0?amount(delta)+'増えたで':delta<0?amount(delta)+'減ってるな':'ほぼ横ばいや'}。`;
 }
 // Diagnose from the period's actual accounts. Hints suggest investigation, not invented causes.
 const b=r.after,periodValue=k=>annual?(b[k]||0):(b[k]||0)-(r.before?.[k]||0);
 const priorSales=previous?(annual?(previous.balances.売上高||0):(previous.balances.売上高||0)-(month(previous.turn)===4?0:previous.previousClose?.売上高||0)):null;
 const sales=periodValue('売上高'),grossProfit=sales-periodValue('売上原価'),wages=periodValue('給料手当');
 const cashFloor=fixedCosts(s)*2;
 let hint='利益だけやのうて、預金も一緒に見とこ。';
 if((b.預金||0)<cashFloor)hint='せやけど預金が心細いな……入金を待つ間の仕入れと返済、先に見とこ。';
 else if((b.役員貸付金||0)>0)hint='会社から生活費を借りた分、残ったままやな……ワイの財布も見直さな。';
 else if(periodValue('商品廃棄損')>Math.max(30000,sales*.03))hint='捨てた商品の分がもったいないな……売り切れる量やったやろか。';
 else if(wages>0&&wages>grossProfit*.4&&current<0)hint='人が増えて助かるけど、給料をまかなう売上まで育ってるやろか……登用や増員の前に試算を見よか。';
 else if((b.商品||0)>Math.max(500000,(b.売上原価||0)/(((r.turn-1)%12)+1)*3))hint='棚にはようけあるのに、財布は軽いな……寝かせてる商品、増えてへんやろか。';
 else if(r.growth?.neglectLoss>0)hint='最近、店を知ってもらう工夫が減ってたな……また顔を出してもらわな。';
 else if(priorSales>0&&sales<priorSales*.9)hint='去年の同じ時期より売上が細ってるな……品ぞろえと、お客さんへの声かけを見直そか。';
 else if(sales>0&&grossProfit/sales<.25)hint='売れてるわりに手元に残らんな……値引きと商品の利益率、見とこか。';
 const legacy=legacyQueComment(s,r);
 const twoYearsAgo=s.history.find(h=>h.turn===r.turn-24);
 if(annual&&current<0&&Number.isFinite(prior)&&prior<0&&current>prior&&twoYearsAgo&&prior>profit(twoYearsAgo.balances))trend+=' ２年続けて赤字が縮んでるな。';
 // Annual review always includes the financial trend; six-month staff hints remain visible.
 const details=annual?hint:(legacy?.text||hint);
 const staff=annual&&r.staffHints?.length?' '+r.staffHints.map(x=>x.text).join(' '):'';
 return {topic:annual?'annualTrend':legacy?.topic||'financialTrend',text:trend+' '+details+staff,turn:r.turn,comparison:{period:annual?'year':'month',current,prior:Number.isFinite(prior)?prior:null,delta:Number.isFinite(prior)?current-prior:null}};
}
function legacyQueComment(s,r){
 if(r?.staffHints?.length)return {topic:'staffAbility',text:r.staffHints.map(x=>x.text).join(' '),turn:r.turn};
 if(!r||r.turn%3!==0)return null;
 const previous=s.history.find(h=>h.turn===r.turn-12),older=s.history.find(h=>h.turn===r.turn-13);
 const sales=(r.after.売上高||0)-(r.before.売上高||0);
 const previousSales=previous?(previous.balances.売上高||0)-(month(r.turn-12)===4?0:older?.balances.売上高||0):null;
 let topic,text;
 if((r.after.預金||0)<fixedCosts(s)*2){topic='cash';text='帳簿の利益だけ見てたらアカンな。仕入れは先払い、カードの入金は２か月後や。預金がもつか、仕入れと金策を考えよ。';}
 else if([12,1,2].includes(r.month)&&r.monthProfit<0){topic='winter';text='冬はやっぱりお客さん減るなあ……。春夏に稼いでも、年間では赤字もあるんやな。仕入れを絞って、春までの資金を残しとこ。';}
 else if(r.growth?.neglectLoss>0){topic='neglect';text='長いこと営業をサボってもうたな……。品物を並べるだけやと忘れられてしまうんや。接客や販促を続けて、また来たい店にせな。';}
 else if(r.growth?.loyaltyAfter>=.3&&r.growth.loyaltyGain>0){topic='loyalty';text='いつものお客さんが、竿も仕掛けもまとめて買うてくれはったで！ コツコツ続けた接客と品揃えが、ようやく実ってきたんやな。冬に備えるのも忘れんとこ。';}
 else if(r.seasonalGain>0){topic='return';text='去年のセールで来てくれたお客さんが、また顔出してくれたで！ あの時の種まきが、やっと効いてきたんやな。';}
 else if(r.effortPlanned>0){topic='seed';text='今日は先のための種まきや。今すぐ売上は増えへんけど、忘れられん店にしていこ。夏のセールのお客さんも、来年また来てくれたらええな。';}
 else if(r.effortGain>0){topic='effort';text='店のこと考えて動いた分、集客力は持ち直せそうや。せやけど経費もかかるし、来月の売上まで見届けなアカンな。';}
 else if(s.attraction<.95||(previousSales>0&&sales<previousSales*.9)){topic='decline';text='最近お客さん減ってへん……？ 店番してるだけやったらアカンなあ。販促や接客の見直し、そろそろ手ぇ打たな。';}
 else if(r.visitors>r.served){topic='capacity';text='せっかく来てもろても、ワイ一人やと手ぇ回らんなあ。人を雇うか、接客を楽にする設備か……給料と返済も計算せな。';}
 else {topic='steady';text='今月もよう働いたわ。せやけど今のお客さんが、ずっと来てくれるとは限らん。次に何するか考えとこ。';}
 return {topic,text,turn:r.turn};
}
function managementRatios(b,adjusted=false){const sum=keys=>keys.reduce((n,k)=>n+(b[k]||0),0);const ownerDebt=b.役員借入金||0,ownerLoss=(b.役員貸付金||0)+(b.未収利息||0);const currentAssets=sum(['預金','売掛金','商品','役員貸付金','未収利息','仮払消費税等','未収消費税等','仮払消費税中間納付','未収法人税等'])-(adjusted?ownerLoss:0);const fixedAssets=sum(['差入保証金','什器','建物附属設備','土地','賃貸建物','船舶','車両'])-(b.減価償却累計額||0),assets=currentAssets+fixedAssets;const currentLiabilities=sum(['買掛金','短期借入金','1年内返済予定長期借入金','未払法人税等','未払消費税等','仮受消費税等','繰延売上']);const fixedLiabilities=sum(['長期借入金','役員借入金','預り敷金'])-(adjusted?ownerDebt:0),equity=sum(['資本金','繰越利益剰余金'])+profit(b)+(adjusted?ownerDebt-ownerLoss:0);const ratio=(n,d)=>d>0?n/d:d===0&&n>0?Infinity:null;return {currentAssets,fixedAssets,assets,currentLiabilities,fixedLiabilities,equity,equityRatio:assets>0?equity/assets:null,currentRatio:ratio(currentAssets,currentLiabilities),quickRatio:ratio(sum(['預金','売掛金']),currentLiabilities),fixedLongRatio:equity+fixedLiabilities>0?fixedAssets/(equity+fixedLiabilities):null};}
const api={purchaseLine,purchaseQuote,inventoryValue,recordHire,recruitment,sponsorEvent,staffHints,STAFF_CHARACTERS,staffCandidates,staffService,consultBank,assessTaxEvidence,entry,inputVAT,add,take,DEBIT,CREDIT,INCOME,initializeStaff,processStaffEvents,promoteStaff,deferStaff,staffAffinity,officeSaving,repayToOwner,recordTaxEvidence,resolveTaxEvidence,assessTaxEvidence,applyTaxLosses,initializeTaxLosses,settleTaxes,growthStatus,basketFactor,advanceGrowth,taxAuditEvent,reviewTaxAudit,managementRatios,assortmentStatus,vat,gross,settleVAT,lendByOwner,awareness,marketingGain,seasonalRecall,effectiveAttraction,queComment,migrate,compact,forecast,renewLoan,scheduled,fixedCosts,staffSocial,ordinary,promotionCost,reclassify,fundLoan,ROLES,payroll,PRODUCTS,EQUIPMENT,STARTUP,EXPENSES,ASSETS,SEASON,blankState,createState,applyStartup,unlocked,capacities,usage,upkeep,limits,cost,validation,recommend,buy,hire,next,run,assertState,profit};if(typeof module!=='undefined')module.exports=api;root.ShopEngine=api;const ext=typeof module!=='undefined'?require('./expansion-engine.js'):root.ShopExpansion;ext.install(api);const rescue=typeof module!=='undefined'?require('./rescue.js'):root.ShopRescue;rescue.install(api);
})(globalThis);
