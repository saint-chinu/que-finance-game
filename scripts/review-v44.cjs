// Release verification: seeded ten-year policies exercising the v44 rules.
const fs=require('node:fs'),path=require('node:path');
const E=require('../dist/js/engine.js'),X=E.extension,R=require('../dist/js/replay.js'),U=require('../dist/js/underwriting.js'),B=require('../dist/js/bank.js');
require('../dist/js/rescue.js');
const Y=[5,8,11];
const P=[
 {id:'R01',name:'店番だけ（営業しない）',effort:[]},
 {id:'R02',name:'標準：年3回改善',effort:Y},
 {id:'R03',name:'毎月改善',effort:'monthly'},
 {id:'R04',name:'年3回の大会協賛',effort:Y,sales:true},
 {id:'R05',name:'報酬12万・生活費は会社から借りる',effort:Y,salary:120000},
 {id:'R06',name:'報酬18万（節約）＋年3回',effort:Y,salary:180000},
 {id:'R07',name:'役員報酬50万で個人に抜く＋年3回',effort:Y,salary:500000},
 {id:'R08',name:'創業からバイト＋年3回',effort:Y,hire:'parttime',hireAt:1,promote:true},
 {id:'R09',name:'3年目バイト→内部登用',effort:Y,hire:'parttime',hireAt:25,promote:true},
 {id:'R10',name:'夏秋の仕入を倍増',effort:Y,overstock:true},
 {id:'R11',name:'常時1割値引き',effort:Y,price:'minus10'},
 {id:'R12',name:'常時1割値上げ',effort:Y,price:'plus10'},
 {id:'R13',name:'設備拡大（融資）＋バイト',effort:Y,equipment:true,hire:'parttime',hireAt:25,promote:true},
 {id:'R14',name:'漁業へ多角化',effort:Y,fish:true},
 {id:'R15',name:'漁業＋冬は休業・船員を店へ',effort:Y,fish:true,rest:true,transfer:true},
 {id:'R16',name:'漁業＋資金が細ったら撤退',effort:Y,fish:true,exit:true},
 
 {id:'R17',name:'釣船',effort:Y,fish:true,charter:true},
 {id:'R18',name:'釣船＋冬は休業・船員を店へ',effort:Y,fish:true,charter:true,rest:true,transfer:true},
 {id:'R19',name:'不動産（最高利回り）',effort:Y,property:'yield'},
 {id:'R20',name:'不動産（最高利回り）＋資金が細ったら撤退',effort:Y,property:'yield',exit:true},
 {id:'R21',name:'毎年ごまかし（売上抜き・期ズレ）',effort:Y,cheat:['skim','defer']},
 {id:'R22',name:'設備拡大＋漁業＋報酬18万',effort:Y,equipment:true,fish:true,salary:180000},
];
const log=(ops,t,type,x={})=>ops.push({turn:t,type,...x});
function fixedNeed(s){const sc=E.scheduled({...s,turn:s.turn});return E.fixedCosts?0:0}
function simulate(seed,p){
 let s=R.create(seed);const annual=[],ops=[],monthly=[];let bankMonths=0,rescues=0,lostShop=0,shortBuy=0;
 for(let t=1;t<=120;t++){
  const m=(t-1)%12+1,price=p.price||'list';
  if(m===1){try{if(p.salary)s=X.setSalary(s,p.salary);}catch(e){}
   
   if(p.cheat){try{s=X.chooseTaxPolicy(s,p.cheat,false);log(ops,t,'cheat');}catch(e){}}}
  let action=(p.effort==='monthly'||p.effort.includes(m))?(p.sales&&E.sponsorEvent(s)?'sales':'improve'):'tend';
  for(const e of s.staffEvents||[])if(p.promote&&e.type==='offer'&&e.status==='pending'){s=E.promoteStaff(s,e.staffId);log(ops,t,'promotion');}
  // 短期の期日：同額更新、だめなら枠まで減額
  (s.loans||[]).forEach((l,i)=>{if(l.kind==='short'&&l.balance>0&&t>=(l.due||l.start+l.months)-1&&t<=(l.due||l.start+l.months)&&!s.expansion._renewed?.[i+':'+t]){
    try{const a=U.assess(s);let n=B.renew(s,a,i,l.balance);if(n.renewalDecision?.status!=='approved'){const lim=Math.max(0,Math.floor(((a.short.limit??0)-((s.balances.短期借入金||0)-l.balance))/10000)*10000);if(lim<l.balance&&s.balances.預金>=l.balance-lim){n=B.renew(s,a,i,lim);log(ops,t,'renewCut',{from:l.balance,to:lim});}else log(ops,t,'renewDenied',{bal:l.balance});}else log(ops,t,'renew');s=n;}catch(e){log(ops,t,'renewErr',{msg:e.message});}}});
  try{
   if(p.hire&&t>=p.hireAt&&!s.staff.length&&E.recruitment(s).open){s=E.hire(s,p.hire,E.staffCandidates(s)[0]);log(ops,t,'hire');}
   else if(p.equipment&&t>=25&&['freezer','tank','warehouse'].some(id=>!s.equipment[id])){const id=['freezer','tank','warehouse'].find(id=>!s.equipment[id]);const q=B.quote(s,U.assess(s),id),amount=Math.floor(q.limit/10000)*10000;if(s.balances.預金+amount>E.gross(s,E.EQUIPMENT[id].cost)+3000000){s=amount>0?B.execute(s,U.assess(s),id,amount):E.buy(s,id);log(ops,t,'equipment',{id,loan:amount});}}
   else if(p.fish&&t>=25&&!s.expansion.fishery){const q=X.finance(s,X.boatOffer(),U.assess(s),'fishery');if(s.balances.預金+q.limit>5280000+4000000){s=X.buyFishery(s,q.limit,U.assess(s));s=X.hireCrew(X.hireCrew(s,'captain'),'crew');log(ops,t,'boat',{loan:q.limit});}}
   else if(p.fish&&s.expansion.fishery&&s.expansion.fishery.crew.length<2&&E.recruitment(s).open){s=X.hireCrew(s,s.expansion.fishery.crew.length?'crew':'captain');log(ops,t,'crew');}
   else if(p.property&&t>=49&&m===4&&X.propertyUnlocked(s)&&s.expansion.properties.length<3){const list=X.market(s).sort(p.property==='cheap'?(a,b)=>a.price-b.price:(a,b)=>(b.rent/b.price)-(a.rent/a.price));const property=list[0],q=X.finance(s,property,U.assess(s));if(s.balances.預金+q.limit>X.totalCost(s,property)+4000000){s=X.buyProperty(s,property.id,q.limit,U.assess(s));log(ops,t,'property',{price:property.price,type:property.type,age:property.age,loan:q.limit,months:q.months});}}
  }catch(e){log(ops,t,'rejected',{reason:e.message});}
  if(p.fish&&p.rest&&s.expansion.fishery){try{s=X.setFishing(s,[9,10,11].includes(m)?'rest':'normal');}catch(e){}}
  if(p.fish&&s.expansion.fishery){const f=s.expansion.fishery;
   if(m===1&&p.charter){try{s=X.setBoatUse(s,'charter');}catch(e){}}
   if(p.rest){try{s=X.setFishing(s,[9,10,11].includes(m)?'rest':'normal');}catch(e){}
    if(p.transfer){const winter=[9,10,11].includes(m);try{if(winter){for(const c of [...s.expansion.fishery.crew])if(c.role==='crew'&&s.staff.length<3){s=X.transferStaff(s,c.id,'store');log(ops,t,'toStore');break;}}else if(m===12||m===1){const c=s.staff.find(x=>x.movedTurn!==undefined&&x.homeRole!=='parttime'||x.captainQualified===false&&x.movedTurn!==undefined);if(c&&s.expansion.fishery.crew.length<3){s=X.transferStaff(s,c.id,'boat');log(ops,t,'toBoat');}}}catch(e){}}}
  }
  if(p.exit==='dismiss'&&s.expansion.fishery&&s.balances.預金<1500000&&s.expansion.fishery.crew.some(c=>!c.leavesTurn)){for(const c of s.expansion.fishery.crew)if(!c.leavesTurn){try{s=X.dismissCrew(s,c.id);log(ops,t,'dismiss');}catch(e){}}}
  else if(p.exit&&!s.actionLocked&&s.balances.預金<(p.exit==='dismiss'?1500000:1000000)){const ids=[...(s.expansion.fishery?['fishery-boat']:[]),...s.expansion.properties.map(x=>x.id)];for(const id of ids){try{const q=X.exitQuote(s,id);s=X.exitBusiness(s,id);log(ops,t,'exit',{id,price:q.price,gain:q.gain,net:q.net});break;}catch(e){log(ops,t,'exitFail',{msg:e.message.slice(0,40)});}}}
  // 運転資金：預金が固定費の2か月分を切りそうなら銀行へ（1行動）
  if(!p.noBank&&!s.actionLocked){
   const sc=E.scheduled({...s,turn:s.turn+1}),need=2*(E.fixedCosts?Object.values(E.fixedCosts(s)).reduce?0:0:0);
   const burn=(s.history.slice(-3).reduce((n,h)=>n+Math.max(0,-(h.monthProfit||0)),0)/3)+sc.principal+sc.interest+sc.tax+600000;
   if(s.balances.預金<burn*1.5){
    try{const a=U.assess(s);let purpose='short';let q=B.quote(s,a,'startup');if(t>=13&&t<=24&&q.limit>0)purpose='startup';else q=B.quote(s,a,'short');
     const amt=Math.floor(q.limit/10000)*10000;if(amt>=100000){s=B.execute(s,U.assess(s),purpose,amt);bankMonths++;log(ops,t,'borrow',{purpose,amt});}}catch(e){log(ops,t,'bankDenied',{msg:e.message.slice(0,60)});}
   }
  }
  action=s.actionLocked||action;if(action!=='tend'&&action!=='improve')lostShop++;
  let quantities=E.recommend(s,action,price);
  if(p.overstock&&m>=3&&m<=8){const target=quantities.map(n=>n*2);for(let i=0;i<target.length;i++){let low=quantities[i],high=target[i];while(low<high){const mid=Math.ceil((low+high)/2),q=quantities.slice();q[i]=mid;if(E.validation(s,q,action))high=mid-1;else low=mid;}quantities[i]=low;}}
  if(E.validation(s,quantities,action)){let lo=0,hi=1;for(let k=0;k<20;k++){const mid=(lo+hi)/2,q=quantities.map(n=>Math.floor(n*mid));if(E.validation(s,q,action))hi=mid;else lo=mid;}quantities=quantities.map(n=>Math.floor(n*lo));if(E.validation(s,quantities,action)){quantities=quantities.map(()=>0);}shortBuy++;}
  if(E.validation(s,quantities,action)&&action!=='tend'){action='tend';}
  const result=E.run(s,quantities,price,action);s=result.state;const r=result.report;
  E.assertState(s);
  monthly.push({turn:t,profit:r.monthProfit,cash:s.balances.預金,owner:s.owner,action,staff:s.staff.length,waste:r.waste});
  // 最後の資金繰り
  if(s.ended&&s.cashCrisis?.status==='pending'){
   rescues++;log(ops,t,'crisis',{need:E.crisisInfo(s).needed});
   for(const purpose of ['short','startup']){if(!E.crisisInfo(s).needed)break;try{const o=E.rescueOffer(s,purpose);if(o.status==='approved'){s=E.rescueBank(s,purpose,o.requested);log(ops,t,'rescueBank',{purpose,amt:o.requested});}}catch(e){}}
   if(s.cashCrisis?.status==='pending'&&E.crisisInfo(s).needed>0&&s.owner>0){try{s=E.rescueOwner(s,Math.min(s.owner,E.crisisInfo(s).needed));log(ops,t,'rescueOwner');}catch(e){log(ops,t,'rescueOwnerErr',{msg:e.message});}}
   if(s.cashCrisis?.status==='pending'){try{s=E.abandonRescue(s);}catch(e){}}
  }
  if(t%12===0)annual.push({profit:E.profit(s.balances),cash:s.balances.預金,owner:s.owner,debt:(s.balances.短期借入金||0)+(s.balances.長期借入金||0),officerLoan:s.balances.役員貸付金||0,ownerLoan:s.balances.役員借入金||0});
  if(s.ended||t===120)break;s=E.next(E.compact(s));
 }
 const scoreBeforeMA=X.score(s);
 if(s.expansion.ma?.phase==='offer'){s=X.negotiate(s,'discuss');s=X.negotiate(s,'offer',4);if(s.expansion.ma.phase==='negotiate')s=X.negotiate(s,'offer',3);if(s.expansion.ma.phase==='confirm')s=X.negotiate(s,'confirm');log(ops,s.turn,'ma',{phase:s.expansion.ma.phase});}
 const sc=X.score(s);
 return {seed,id:p.id,name:p.name,turn:s.turn,ended:!!s.ended,crisis:s.cashCrisis?.status||null,scoreBeforeMA:scoreBeforeMA?.total??null,score:sc?.total??null,parts:sc,annual,cash:s.balances.預金,owner:s.owner,equity:E.managementRatios(s.balances).equity,ma:s.expansion.ma?.phase||null,bankMonths,rescues,lostShop,shortBuy,audits:(s.taxAudits||[]).map(a=>({turn:a.turn,status:a.status,add:a.additionalTax})),waste:monthly.reduce((n,x)=>n+(x.waste||0),0),ops};
}
if(require.main===module){const seeds=[73129,91,202609,5,777];const only=process.argv[2];const results=[];for(const p of P){if(only&&!only.split(',').includes(p.id))continue;for(const seed of seeds){let r;try{r=simulate(seed,p);}catch(e){r={seed,id:p.id,name:p.name,error:e.stack.split('\n').slice(0,3).join(' | ')};}results.push(r);console.log(JSON.stringify({id:r.id,seed,turn:r.turn,score:r.score,ma:r.ma,bank:r.bankMonths,rescue:r.rescues,err:r.error}));}}
 fs.writeFileSync(process.env.OUT||path.join(__dirname,'../docs/review-v44-release.json'),JSON.stringify({seeds,policies:P.map(({id,name})=>({id,name})),results},null,1));}
module.exports={simulate,P};
