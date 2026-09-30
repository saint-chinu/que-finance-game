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
function simulate(seed,p){
 let s=R.create(seed);const annual=[],operations=[],monthly=[];let summerQuantities=null;
 if(p.frugal){s=X.setSalary(s,180000);s=E.playerSettings(s,{livingCost:120});}
 for(let t=1;t<=120;t++){
  const m=(t-1)%12+1,price=p.price||'list';let action=(p.effort==='monthly'||p.effort.includes(m))?(p.sales?'sales':'improve'):'tend';
  for(const e of s.staffEvents||[])if(p.promote&&e.type==='offer'&&e.status==='pending'){s=E.promoteStaff(s,e.staffId);operations.push({turn:t,type:'promotion'});}
  try{
   if(p.hire&&t>=p.hireAt&&!s.staff.length&&E.recruitment(s).open){s=E.hire(s,p.hire,E.staffCandidates(s)[0]);operations.push({turn:t,type:'hire'});}
   else if(p.equipment&&t>=25){const id=['freezer','tank','warehouse'].find(id=>!s.equipment[id]);if(id){const q=B.quote(s,U.assess(s),id),amount=Math.floor(q.limit/10000)*10000;if(s.balances.預金+amount>E.gross(s,E.EQUIPMENT[id].cost)+3000000){s=amount>0?B.execute(s,U.assess(s),id,amount):E.buy(s,id);operations.push({turn:t,type:'equipment',id});}}}
   else if(p.fish&&t>=25&&!s.expansion.fishery){const q=X.finance(s,X.boatOffer(),U.assess(s),'fishery');if(s.balances.預金+q.limit>5280000+4000000){s=X.buyFishery(s,q.limit,U.assess(s));operations.push({turn:t,type:'boat'});}}
   else if(p.fish&&s.expansion.fishery&&s.expansion.fishery.crew.length<3&&E.recruitment(s).open){s=X.hireCrew(s,s.expansion.fishery.crew.length?'crew':'captain');operations.push({turn:t,type:'crew'});}
   else if(p.property&&t>=49&&m===4&&X.propertyUnlocked(s)&&s.expansion.properties.length<3){const property=X.market(s).sort((a,b)=>a.price-b.price)[0],q=X.finance(s,property,U.assess(s));if(s.balances.預金+q.limit>X.totalCost(s,property)+4000000){s=X.buyProperty(s,property.id,q.limit,U.assess(s));operations.push({turn:t,type:'property',id:property.id});}}
  }catch(e){operations.push({turn:t,type:'rejected',reason:e.message});}
  action=s.actionLocked||action;let quantities=E.recommend(s,action,price);
  if(p.holdSummer&&m===6)summerQuantities=quantities.slice();
  if(p.holdSummer&&m>=9&&summerQuantities){const target=summerQuantities;for(let i=0;i<target.length;i++){let low=quantities[i],high=Math.max(low,target[i]);while(low<high){const mid=Math.ceil((low+high)/2),q=quantities.slice();q[i]=mid;if(E.validation(s,q,action))high=mid-1;else low=mid;}quantities[i]=low;}}
  if(p.overstock&&m>=3&&m<=8){const target=quantities.map(n=>n*2);for(let i=0;i<target.length;i++){let low=quantities[i],high=target[i];while(low<high){const mid=Math.ceil((low+high)/2),q=quantities.slice();q[i]=mid;if(E.validation(s,q,action))high=mid-1;else low=mid;}quantities[i]=low;}}
  const result=E.run(s,quantities,price,action);s=result.state;const r=result.report;
  if(r.opening+r.inflow-r.outflow!==s.balances.預金)throw Error('cash mismatch');E.assertState(s);
  monthly.push({turn:t,profit:r.monthProfit,cash:s.balances.預金,sales:r.productResults.reduce((n,x)=>n+x.sales,0),action,staff:s.staff.length,waste:r.waste,inventory:s.balances.商品});
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
if(require.main===module){const results=[];for(const p of policies)for(const seed of [73129,91,202609]){const r=simulate(seed,p);results.push(r);console.log(JSON.stringify({id:r.id,seed,turn:r.turn,score:r.score?.total??null,cash:r.cash}));}const out=path.join(__dirname,'../docs/balance-v39.json');fs.writeFileSync(out,JSON.stringify({version:R.VERSION,policies,seeds:[73129,91,202609],results},null,2)+'\n');}
module.exports={simulate,policies};
