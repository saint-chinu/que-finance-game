// Reproducible player policies: no injected money, hidden-stat selection or future-demand access.
const fs=require('node:fs'),path=require('node:path');
const E=require('../dist/js/engine.js'),X=E.extension,R=require('../dist/js/replay.js'),U=require('../dist/js/underwriting.js'),B=require('../dist/js/bank.js');
const policies=[
 {id:'neglect',name:'店番だけ',effort:[]},
 {id:'steady',name:'標準報酬・年２回改善',effort:[8,11]},
 {id:'frugal',name:'節約だけ',frugal:true,effort:[]},
 {id:'balanced',name:'節約・年３回改善',frugal:true,effort:[5,8,11]},
 {id:'monthly',name:'毎月店舗改善',frugal:true,effort:'monthly'},
 {id:'campaign',name:'バイト＋年３回販促',frugal:true,effort:[5,8,11],sales:true,hire:'parttime',hireAt:1,promote:true},
 {id:'employee',name:'創業から正社員',frugal:true,effort:[5,8,11],hire:'employee',hireAt:1},
 {id:'promote',name:'３年目採用・内部登用',frugal:true,effort:[5,8,11],hire:'parttime',hireAt:25,promote:true},
 {id:'replace',name:'バイト登用なし・再採用',frugal:true,effort:[5,8,11],hire:'parttime',hireAt:25},
 {id:'overstock',name:'夏秋の仕入を倍増',frugal:true,effort:[5,8,11],overstock:true},
 {id:'discount',name:'常時１割値引き',frugal:true,effort:[5,8,11],price:'minus10'},
 {id:'premium',name:'常時１割値上げ',frugal:true,effort:[5,8,11],price:'plus10'},
 {id:'retail',name:'店舗設備拡大',frugal:true,effort:[5,8,11],equipment:true,hire:'parttime',hireAt:25,promote:true},
 {id:'fish',name:'漁業へ多角化',frugal:true,effort:[5,8,11],fish:true},
 {id:'property',name:'不動産へ多角化',frugal:true,effort:[5,8,11],property:true}
];
policies.push({id:'lowpay',name:'報酬12万・生活費20万',salary:120000,effort:[5,8,11]},{id:'highpay',name:'報酬50万',salary:500000,effort:[5,8,11]},{id:'earlybank',name:'早期に銀行相談',earlybank:true,effort:[5,8,11]},{id:'cheat',name:'毎年売上抜き',cheat:true,effort:[5,8,11]},{id:'charter',name:'釣船・冬季休業',charter:true,fish:true,frugal:true,effort:[5,8,11]});
function simulate(seed,p){
 let s=R.create(seed);const annual=[],operations=[],monthly=[];let summerQuantities=null;
 if(p.frugal){s=X.setSalary(s,180000);s=E.playerSettings(s,{livingCost:200});}
 if(p.salary)s=X.setSalary(s,p.salary);
 for(let t=1;t<=120;t++){
  const m=(t-1)%12+1,price=p.price||'list';let action=(p.effort==='monthly'||p.effort.includes(m))?(p.sales?'sales':'improve'):'tend';
  for(const e of s.staffEvents||[])if(p.promote&&e.type==='offer'&&e.status==='pending'){s=E.promoteStaff(s,e.staffId);operations.push({turn:t,type:'promotion'});}
  try{
   if(p.cheat&&(t-1)%12===0)s=X.chooseTaxPolicy(s,['skim','inventory','defer']);
   if(p.charter&&s.expansion.fishery){if((t-1)%12===0)s=X.setBoatUse(s,'charter');s=X.setFishing(s,[9,10,11].includes((t-1)%12)?'rest':'normal');}
   for(let i=0;i<(s.loans||[]).length;i++){const l=s.loans[i];if(l.kind!=='short'||!l.balance||t!==l.due)continue;const a=U.assess(s);let n=B.renew(s,a,i,l.balance);if(n.renewalDecision.status==='denied'){const target=Math.min(l.balance-1,Math.max(0,Math.floor(a.short.limit/10000)*10000));if(s.balances.預金>=l.balance-target)n=B.renew(s,a,i,target);}operations.push({turn:t,type:'renew',status:n.renewalDecision.status});s=n;}
   if(!s.actionLocked&&t>=13&&(s.balances.預金<1500000||p.earlybank&&t===13)){for(const kind of ['startup','short']){const a=U.assess(s),q=B.quote(s,a,kind),amount=Math.floor(q.limit/10000)*10000;if(amount>0&&B.assess(s,a,kind,amount).status==='approved'){s=B.execute(s,a,kind,amount);operations.push({turn:t,type:'bank',kind,amount});break;}}}
   if(s.actionLocked){}else 
   if(p.hire&&t>=p.hireAt&&!s.staff.length&&E.recruitment(s).open){s=E.hire(s,p.hire,E.staffCandidates(s)[0]);operations.push({turn:t,type:'hire'});}
   else if(p.equipment&&t>=25){const id=['freezer','tank','warehouse'].find(id=>!s.equipment[id]);if(id){const q=B.quote(s,U.assess(s),id),amount=Math.floor(q.limit/10000)*10000;if(s.balances.預金+amount>E.gross(s,E.EQUIPMENT[id].cost)+3000000){s=amount>0?B.execute(s,U.assess(s),id,amount):E.buy(s,id);operations.push({turn:t,type:'equipment',id});}}}
   else if(p.fish&&t>=25&&!s.expansion.fishery){const q=X.finance(s,X.boatOffer(),U.assess(s),'fishery');if(s.balances.預金+q.limit>5280000+4000000){s=X.buyFishery(s,q.limit,U.assess(s));if(p.charter&&(t-1)%12===0)s=X.setBoatUse(s,'charter');operations.push({turn:t,type:'boat'});}}
   else if(p.fish&&s.expansion.fishery&&s.expansion.fishery.crew.length<3&&E.recruitment(s).open){s=X.hireCrew(s,s.expansion.fishery.crew.length?'crew':'captain');operations.push({turn:t,type:'crew'});}
   else if(p.property&&t>=49&&m===4&&X.propertyUnlocked(s)&&s.expansion.properties.length<3){const property=X.market(s).sort((a,b)=>a.price-b.price)[0],q=X.finance(s,property,U.assess(s));if(s.balances.預金+q.limit>X.totalCost(s,property)+4000000){s=X.buyProperty(s,property.id,q.limit,U.assess(s));operations.push({turn:t,type:'property',id:property.id});}}
  }catch(e){operations.push({turn:t,type:'rejected',reason:e.message});}
  action=s.actionLocked||action;let quantities=E.recommend(s,action,price);
  if(p.holdSummer&&m===6)summerQuantities=quantities.slice();
  if(p.holdSummer&&m>=9&&summerQuantities){const target=summerQuantities;for(let i=0;i<target.length;i++){let low=quantities[i],high=Math.max(low,target[i]);while(low<high){const mid=Math.ceil((low+high)/2),q=quantities.slice();q[i]=mid;if(E.validation(s,q,action))high=mid-1;else low=mid;}quantities[i]=low;}}
  if(p.overstock&&m>=3&&m<=8){const target=quantities.map(n=>n*2);for(let i=0;i<target.length;i++){let low=quantities[i],high=target[i];while(low<high){const mid=Math.ceil((low+high)/2),q=quantities.slice();q[i]=mid;if(E.validation(s,q,action))high=mid-1;else low=mid;}quantities[i]=low;}}
  if(E.validation(s,quantities,action)){if(!s.actionLocked&&s.balances.預金<E.gross(s,E.promotionCost(action))){action='tend';quantities=E.recommend(s,action,price);}let budget=Math.max(0,s.balances.預金-E.gross(s,E.promotionCost(action))),cost=E.gross(s,E.cost(quantities));if(cost>budget)quantities=quantities.map(n=>Math.floor(n*budget/cost));while(E.validation(s,quantities,action)&&quantities.some(n=>n>0))quantities=quantities.map(n=>Math.max(0,n-1));}
  const result=E.run(s,quantities,price,action);s=result.state;const r=result.report;
  if(r.opening+r.inflow-r.outflow!==s.balances.預金)throw Error('cash mismatch');E.assertState(s);
  monthly.push({turn:t,profit:r.monthProfit,cash:s.balances.預金,sales:r.productResults.reduce((n,x)=>n+x.sales,0),action,staff:s.staff.length,waste:r.waste,inventory:s.balances.商品});
  if(s.cashCrisis?.status==='pending'){
   for(const kind of ['short','startup']){if(!E.crisisInfo(s).pending)break;const d=E.rescueOffer(s,kind);if(d.status==='approved'){s=E.rescueBank(s,kind,d.requested);operations.push({turn:t,type:'rescueBank',kind});}}
   if(E.crisisInfo(s).pending&&s.owner>0){s=E.rescueOwner(s,Math.min(s.owner,E.crisisInfo(s).needed));operations.push({turn:t,type:'rescueOwner'});}
   if(E.crisisInfo(s).pending)s=E.abandonRescue(s);
  }
  assertLedgers(s);
  if(t%12===0)annual.push(E.profit(s.balances));
  if(s.ended||t===120)break;s=E.next(E.compact(s));
 }
 const scoreBeforeMA=X.score(s);
 if(s.expansion.ma?.phase==='offer'){
  s=X.negotiate(s,'discuss');s=X.negotiate(s,'offer',4);
  if(s.expansion.ma.phase==='negotiate')s=X.negotiate(s,'offer',3);
  if(s.expansion.ma.phase==='confirm')s=X.negotiate(s,'confirm');
  operations.push({turn:s.turn,type:'ma',phase:s.expansion.ma.phase,attempts:s.expansion.ma.attempts});
 }
 return {seed,id:p.id,name:p.name,turn:s.turn,ended:!!s.ended,scoreBeforeMA,score:X.score(s),annual,cash:s.balances.預金,equity:E.managementRatios(s.balances).equity,personal:s.owner,properties:s.expansion.properties.length,fishery:!!s.expansion.fishery,ma:s.expansion.ma?.phase||null,operations,monthly};
}
function assertLedgers(s){const sum=(xs)=>xs.reduce((n,x)=>n+x.amount,0);for(const [account,value] of [['未払法人税等',sum(s.taxes||[])],['未払消費税等',sum((s.vatDue||[]).filter(t=>!t.refund&&!t.interim))],['未収消費税等',sum((s.vatDue||[]).filter(t=>t.refund))],['未収法人税等',sum(s.taxRefunds||[])],['減価償却累計額',s.assets.reduce((n,a)=>n+a.depreciation,0)]])if((s.balances[account]||0)!==value)throw Error(account+'台帳不一致');if(s.cashCrisis?.status==='pending'&&!s.ended)throw Error('救済と終了フラグ不一致');}
if(require.main===module){const results=[];for(const p of policies)for(const seed of [73129,91,202609,5,777]){const r=simulate(seed,p);results.push(r);console.log(JSON.stringify({id:r.id,seed,turn:r.turn,score:r.score?.total??null,cash:r.cash}));}const out=path.join(__dirname,'../docs/balance-v43.json');fs.writeFileSync(out,JSON.stringify({version:R.VERSION,policies,seeds:[73129,91,202609,5,777],results},null,2)+'\n');}
module.exports={simulate,policies};
