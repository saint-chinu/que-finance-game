/* Only these commands may change a ranked game. No client balances or scores are accepted. */
(function(root){'use strict';
const E=root.ShopEngine||(typeof require==='function'?require('./engine.js'):null),X=E.extension,B=root.BankLoans||(typeof require==='function'?require('./bank.js'):null),U=root.ShopUnderwriting||(typeof require==='function'?require('./underwriting.js'):null);
const VERSION='v44-release';
function create(seed){if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw Error('シードが不正です');const s=E.createState();s.rng=seed;s.expansion.seed=seed;return s;}
function settings(source,values){const s=structuredClone(source);if(!values||Object.keys(values).some(k=>!['livingCost','payInterest','repayOwner'].includes(k)))throw Error('設定が不正です');if(values.livingCost!==undefined){if(values.livingCost!==200)throw Error('生活費は月20万円固定です');s.livingCost=200;}for(const k of ['payInterest','repayOwner'])if(values[k]!==undefined){if(typeof values[k]!=='boolean')throw Error('設定が不正です');s[k]=values[k];}return s;}
E.playerSettings=settings;
function apply(s,command){if(!command||typeof command!=='object'||!Array.isArray(command.args)||command.args.length>5)throw Error('操作記録が不正です');const a=command.args,assessment=()=>U.assess(s);let state=s,report=null;
 switch(command.op){
 case 'run':if(!['list','plus10','minus10','sale'].includes(a[1])||!['tend','improve','sales',s.actionLocked].includes(a[2])||![3,4].includes(a.length)||a.length===4&&(!a[3]||Object.keys(a[3]).length!==1||!['cash','credit'].includes(a[3].payment)))throw Error('月次の条件が不正です');({state,report}=E.run(s,...a));break;
 case 'next':if(!s.closed||s.ended||s.turn>=120)throw Error('翌月へ進めません');state=E.next(E.compact(s));break;
 case 'rescueOwner':state=E.rescueOwner(s,a[0]);break;
 case 'rescueBank':state=E.rescueBank(s,a[0],a[1]);break;
 case 'rescueAbandon':state=E.abandonRescue(s);break;
 case 'settings':state=settings(s,a[0]);break;
 case 'buy':state=E.buy(s,a[0]);break;
 case 'hire':state=E.hire(s,a[0],a[1]??null);break;
 case 'consultBank':state=E.consultBank(s);break;
 case 'promote':state=E.promoteStaff(s,a[0]);break;
 case 'deferStaff':state=E.deferStaff(s,a[0]);break;
 case 'ownerFund':state=E.lendByOwner(s,a[0]);break;
 case 'ownerRepay':state=E.repayToOwner(s,a[0]);break;
 case 'evidence':state=E.resolveTaxEvidence(s,a[0]);break;
 case 'bankLoan':state=B.execute(s,assessment(),a[0],a[1]);break;
 case 'renew':state=B.renew(s,assessment(),a[0],a[1]);break;
 case 'property':state=X.buyProperty(s,a[0],a[1],assessment());break;
 case 'fishery':state=X.buyFishery(s,a[0],assessment());break;
 case 'promoteCaptain':state=X.promoteCaptain(s,a[0]);break;
 case 'boatUse':state=X.setBoatUse(s,a[0]);break;
 case 'transfer':state=X.transferStaff(s,a[0],a[1]);break;
 case 'cutWage':state=X.cutWage(s,a[0]);break;
 case 'restoreWage':state=X.restoreWage(s,a[0]);break;
 case 'exitBusiness':state=X.exitBusiness(s,a[0]);break;
 case 'crew':state=X.hireCrew(s,a[0]);break;
 case 'fishing':state=X.setFishing(s,a[0]);break;
 case 'supply':state=X.setSupply(s,a[0]);break;
 case 'taxPolicy':state=X.chooseTaxPolicy(s,a[0],a[1]);break;
 case 'salary':state=X.setSalary(s,a[0]);break;
 case 'dispose':state=X.disposeStock(s,a[0],a[1]);break;
 case 'living':state=X.livingCharge(s);break;
 case 'finding':state=X.resolveFinding(s,a[0],a[1]);break;
 case 'ma':state=X.negotiate(s,a[0],a[1]);break;
 case 'cruise':if(![3,4].includes(a.length)||a.length===4&&!['cash','credit'].includes(a[3])||!['list','plus10','minus10','sale'].includes(a[1]))throw Error('巡航条件が不正です');({state,report}=X.cruise(s,...a));break;
 default:throw Error('対応していない操作です');
 }
 E.assertState(state);return {state,report};
}
function installRecording(){let depth=0;const wrap=(object,key,op,map=a=>a,resultState=r=>r)=>{const fn=object[key];object[key]=function(source,...args){const outer=depth===0;depth++;let r;try{r=fn(source,...args);}finally{depth--;}const n=resultState(r);if(outer&&source?.replay&&n&&n!==source){n.replay={...source.replay,ops:[...source.replay.ops,{op,args:structuredClone(map(args))}]};}return r;};};
 for(const [key,op] of [['rescueOwner','rescueOwner'],['rescueBank','rescueBank'],['abandonRescue','rescueAbandon'],['next','next'],['playerSettings','settings'],['buy','buy'],['hire','hire'],['consultBank','consultBank'],['promoteStaff','promote'],['deferStaff','deferStaff'],['lendByOwner','ownerFund'],['repayToOwner','ownerRepay'],['resolveTaxEvidence','evidence']])wrap(E,key,op);
 wrap(E,'run','run',a=>a[3]?.payment? [...a.slice(0,3),{payment:a[3].payment}]:a.slice(0,3),r=>r.state);
 wrap(B,'execute','bankLoan',a=>a.slice(1,3));wrap(B,'renew','renew',a=>a[2]===undefined?[a[1]]:[a[1],a[2]]);
 for(const [key,op] of [['promoteCaptain','promoteCaptain'],['setBoatUse','boatUse'],['transferStaff','transfer'],['cutWage','cutWage'],['restoreWage','restoreWage'],['exitBusiness','exitBusiness'],['hireCrew','crew'],['setFishing','fishing'],['setSupply','supply'],['chooseTaxPolicy','taxPolicy'],['setSalary','salary'],['disposeStock','dispose'],['livingCharge','living'],['resolveFinding','finding'],['negotiate','ma']])wrap(X,key,op);
 wrap(X,'buyProperty','property',a=>a.slice(0,2));wrap(X,'buyFishery','fishery',a=>a.slice(0,1));wrap(X,'cruise','cruise',a=>a.slice(0,4),r=>r.state);
}
function snapshot(s){const score=X.score(s);return {score,balances:s.balances,segments:X.segments(s,109,120).rows,years:s.history.filter(h=>h.turn%12===0).slice(-3).map(h=>({year:h.turn/12,balances:h.balances})),business:{properties:s.expansion.properties.map(p=>({name:p.name,age:p.age,price:p.price})),fishery:!!s.expansion.fishery,staff:s.staff.length},ma:s.expansion.ma?.phase||'ineligible'};}
// Old published snapshots retain the inputs needed to apply the current scoring rubric.
function rescoreSnapshot(source){const snapshot=structuredClone(source),score=snapshot.score;if(!score)return snapshot;const years=snapshot.years||[],sales=Number.isFinite(score.sales)?score.sales:years.reduce((n,y)=>n+(y.balances.売上高||0),0)/(years.length||1);const profitability=X.profitabilityScore({...score,sales});snapshot.score={...score,model:X.SCORE_MODEL,sales,profitability,total:profitability+score.health+score.wealth};return snapshot;}
const api={VERSION,create,apply,installRecording,snapshot,rescoreSnapshot};root.ShopReplay=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
