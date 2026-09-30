/* rev2 expansion: deterministic, journal-backed company departments. */
(function(root){'use strict';
function install(E){
 const year=t=>Math.ceil(t/12),month=t=>(t+2)%12+1,clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),sum=(xs,f=x=>x)=>xs.reduce((n,x)=>n+f(x),0);
 const clone=s=>structuredClone(s),money=n=>Math.round(n),fail=m=>{throw Error(m);};
 const RULES={maIncome:3000000,maEquity:20000000,personalTarget:100000000,boatCost:4800000,boatLife:96,captainWage:350000,crewWage:280000,boardingAllowance:30000,fishSeason:{1:1.36,2:1.36,3:.89,4:.88,5:.74,6:.84,7:.83,8:.83,9:.86,10:.96,11:.975,12:1.36},wageCutRate:.2,wageQuitChance:.2,charterFare:9000,charterSeats:8,charterMonthly:{1:107,2:105,3:131,4:139,5:129,6:143,7:158,8:158,9:138,10:141,11:147,12:101}};
 function init(s){
  s.taxEvidence=s.taxEvidence||[];
  s.expansion=s.expansion||{version:1,seed:s.rng||73129,properties:[],fishery:null,actions:[],events:[],segmentSeen:[]};
  for(const e of s.entries||[])if(!e.segmentId)e.segmentId=segmentFor(s,e);
  for(const a of s.assets||[])a.segmentId=a.segmentId||'retail';
 }
 function segmentFor(s,e){if(s._segment)return s._segment;if(e.loanKind==='short'||e.loanKind==='startup'||e.type==='bankBorrow.short'||e.type==='bankBorrow.startup')return 'hq';if(['法人税等','租税公課'].includes(e.debit)||e.type?.startsWith('audit')||['役員報酬','受取利息'].includes(e.debit)||e.credit==='受取利息'||e.type==='officerSocial'||/owner/i.test(e.type||''))return 'hq';return 'retail';}
 function post(s,dr,cr,n,memo,type,segment='hq',extra={}){if(!n)return null;s._segment=segment;const e=E.entry(s,dr,cr,money(n),memo,type);delete s._segment;if(e)Object.assign(e,extra);return e;}
 function input(s,n,memo,seg){if(s.vatEnabled)post(s,'仮払消費税等','預金',E.vat(n),memo+'の消費税','vatInput',seg);}
 function expense(s,account,n,memo,seg,taxable=true){post(s,account,'預金',n,memo,'segmentExpense',seg);if(taxable)input(s,n,memo,seg);}
 function draw(s,key,turn=s.turn,index=0){let h=(s.expansion?.seed||s.rng||73129)>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h=(h^Math.imul(turn,2654435761)^Math.imul(index+1,2246822519))>>>0;h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;return (h>>>0)/4294967296;}
 function log(s,type,data={}){s.expansion.actions.push({turn:s.turn,type,...data});}
 function available(s){if(s.closed||s.ended||s.turn>=120)fail('未確定の経営月に操作してください。');}
 function propertyUnlocked(s){const h=s.history.filter(x=>x.turn%12===0).sort((a,b)=>a.turn-b.turn);return h.some((x,i)=>i>0&&x.turn-h[i-1].turn===12&&E.profit(x.balances)>0&&E.profit(h[i-1].balances)>0);}
 function market(s){const epoch=Math.floor((s.turn-1)/3),result=[];for(let i=0;i<3;i++){
  const rand=j=>draw(s,'property',epoch,i*20+j),type=['room','house','building'][Math.floor(rand(0)*3)],ageBand=Math.floor(rand(1)*3),age=ageBand===0?1+Math.floor(rand(2)*10):ageBand===1?11+Math.floor(rand(2)*15):26+Math.floor(rand(2)*20);
  const spec={room:{name:'中古ワンルーム',low:5000000,high:25000000,rentLow:30000,rentHigh:120000,land:[.15,.35],life:47,units:1},house:{name:'木造一軒家',low:3000000,high:20000000,rentLow:40000,rentHigh:150000,land:[.4,.8],life:22,units:1},building:{name:'小規模ビル',low:30000000,high:90000000,rentLow:200000,rentHigh:800000,land:[.25,.55],life:50,units:3+Math.floor(rand(8)*4)}}[type];
  const yieldRate=([.04,.06,.09][ageBand]+rand(3)*[.02,.03,.05][ageBand]),floorPrice=Math.max(spec.low,spec.rentLow*12/yieldRate),ceilPrice=Math.min(spec.high,spec.rentHigh*12/yieldRate);
  const price=Math.round((floorPrice+(ceilPrice-floorPrice)*rand(4))/10000)*10000,rent=Math.round(price*yieldRate/12/100)*100,land=Math.round(price*(spec.land[0]+rand(5)*(spec.land[1]-spec.land[0]))/10000)*10000;
  const taxLife=Math.max(2,Math.floor(age>=spec.life?spec.life*.2:spec.life-age*.8)),occupancy=[.96,.90,.80][ageBand],costRate=[.20,.25,.34][ageBand],annualRent=rent*12;
  result.push({id:`property-${epoch}-${i}`,name:spec.name,type,age,ageBand,price,land,building:price-land,rent,annualRent,yieldRate:annualRent/price,occupancy,costRate,noi:Math.round(annualRent*(occupancy*.95-costRate*.7)-(price-land)*[.005,.01,.025][ageBand]*[.015,.03,.06][ageBand]*12),taxLife,financeLife:Math.max(5,taxLife),units:spec.units,fees:Math.round(price*.07),expires:(epoch+1)*3,segmentId:`realestate:property-${epoch}-${i}`});
 }return result.filter(p=>!s.expansion?.properties.some(x=>x.id===p.id));}
 function annualCapacity(s){const hs=s.history.filter(h=>h.turn%12===0).slice(-2);return hs.length?sum(hs,h=>E.ordinary(h.balances)+(h.balances.減価償却費||0))/hs.length:0;}
 function finance(s,p,a,kind='property'){
  const grade=a?.grade,years=({A:25,B:20,C:15})[grade]||0,capacity=annualCapacity(s),existing=sum(s.loans||[],l=>Math.min(l.balance,l.kind==='short'?l.balance:l.payment*12));
  const months=kind==='property'?Math.min(p.financeLife,years)*12:Math.min(120,p.life||96,({A:120,B:84,C:60})[grade]||0);
  const ltv=({A:.9,B:.8,C:.7})[grade]||0,rate=(a?.rate||5)+(kind==='property'?.5:0);
  const allowance=kind==='property'?Math.max(0,capacity-existing+p.noi*.8)*months/12:Math.max(0,capacity*months/12-sum((s.loans||[]).filter(l=>l.kind!=='property'&&l.kind!=='short'),l=>l.balance));
  const limit=months&&(kind!=='property'||propertyUnlocked(s))&&a?.eligible&&s.turn>=25&&!s.ended&&E.managementRatios(s.balances,true).equity>0?Math.floor(Math.min(p.price*ltv,allowance)/10000)*10000:0;
  return {kind,months,rate,limit,capacity,existing,noi:p.noi||0,ltv,grade:grade||'—'};
 }
 function totalCost(s,p){return p.land+E.gross(s,p.building)+E.gross(s,p.fees);}
 function buyProperty(source,id,amount,a){
  let s=clone(source);init(s);available(s);if(s.actionLocked||s.turn<25||!propertyUnlocked(s)||s.expansion.propertyExitYear===year(s.turn))fail('不動産取得は２期連続の税引後黒字決算を達成後、行動を残した月に行います。');const p=market(s).find(p=>p.id===id);if(!p)fail('掲載期限が切れた物件です。');
  const q=finance(s,p,a);if(!Number.isSafeInteger(amount)||amount<0||amount>q.limit||s.balances.預金+amount<totalCost(s,p))fail('融資枠または自己資金が不足しています。');
  const begin=s.entries.length;if(amount){s=E.fundLoan(s,{amount,rate:q.rate,months:q.months,kind:'property'});Object.assign(s.loans.at(-1),{segmentId:p.segmentId,assetId:p.id});for(const e of s.entries.slice(begin))e.segmentId=p.segmentId;}
  post(s,'土地','預金',p.land,p.name+'の土地取得','propertyPurchase',p.segmentId);post(s,'賃貸建物','預金',p.type==='building'?p.building:E.gross(s,p.building),p.name+'の建物取得','propertyPurchase',p.segmentId);if(p.type==='building')input(s,p.building,'建物取得',p.segmentId);expense(s,'雑費',p.type==='building'?p.fees:E.gross(s,p.fees),'取得諸費用（ゲームでは一括費用）',p.segmentId,p.type==='building');
  s.assets.push({id:p.id,cost:p.type==='building'?p.building:E.gross(s,p.building),life:p.taxLife*12,depreciation:0,segmentId:p.segmentId});s.expansion.properties.push({...p,acquired:s.turn,deposit:0});s.pendingInvestment+=totalCost(s,p);s.pendingEntries=[...source.pendingEntries,...s.entries.slice(begin)];s.actionLocked='investment';log(s,'buyProperty',{id,amount});E.assertState(s);return s;
 }
 function boatOffer(){return {id:'fishery-boat',name:'沿岸漁船・漁具',price:RULES.boatCost,life:RULES.boatLife,noi:0};}
 function buyFishery(source,amount,a){let s=clone(source);init(s);available(s);if(s.expansion.fishery||s.actionLocked||s.turn<25||s.expansion.boatExitYear===year(s.turn))fail('漁業参入は３年目以降、行動を残した月に１拠点まで行えます。');const p=boatOffer(),q=finance(s,p,a,'fishery'),cost=E.gross(s,p.price);if(!Number.isSafeInteger(amount)||amount<0||amount>q.limit||s.balances.預金+amount<cost)fail('融資枠または自己資金が不足しています。');
  const begin=s.entries.length;if(amount){s=E.fundLoan(s,{amount,rate:q.rate,months:q.months,kind:'fishery'});s.loans.at(-1).segmentId='fishery';for(const e of s.entries.slice(begin))e.segmentId='fishery';}
  post(s,'船舶','預金',p.price,'漁船・漁具の取得','fisheryPurchase','fishery');input(s,p.price,'漁船取得','fishery');s.assets.push({id:p.id,cost:p.price,life:p.life,depreciation:0,segmentId:'fishery'});s.expansion.fishery={acquired:s.turn,crew:[],policy:'normal',serial:0};s.pendingInvestment+=cost;s.pendingEntries=[...source.pendingEntries,...s.entries.slice(begin)];s.actionLocked='investment';log(s,'buyFishery',{amount});E.assertState(s);return s;}
 // In the month the boat is bought, the fishing cooperative introduces captain and crew: no applicant month and no action needed. Later vacancies wait for applicants.
 function coopHiring(s){return s.expansion?.fishery?.acquired===s.turn;}
 function hireCrew(source,role){const s=clone(source);init(s);available(s);const f=s.expansion.fishery,coop=coopHiring(s);if(!f||role==='captain'&&s.staff.some(p=>p.characterId==='madai')||!coop&&(!E.recruitment(s).open||s.actionLocked)||!['captain','crew'].includes(role)||f.crew.filter(x=>x.role===role).length>=(role==='captain'?1:2))fail('船長１人・船員２人まで、行動を残した月に採用できます。');E.recordHire(s);s.boatStaffSerial=Math.max(s.boatStaffSerial||0,f.serial||0)+1;f.serial=s.boatStaffSerial;f.crew.push({id:'crew-'+f.serial,role,characterId:role==='captain'?'madai':null,hiredTurn:s.turn,wage:role==='captain'?RULES.captainWage:RULES.crewWage});if(!coop)s.actionLocked='hire';log(s,'hireCrew',{role,coop});return s;}
 function setSupply(source,target){const s=clone(source);available(s);if(!s.expansion?.fishery||!Number.isInteger(target)||target<0||target>300||target>0&&!s.equipment.tank)fail('生け簀を設置し、供給上限を０〜300匹で選びます。');s.expansion.fishery.supplyTarget=target;log(s,'supply',{target});return s;}
 function setFishing(source,policy){const s=clone(source);available(s);if(!s.expansion?.fishery||!['normal','cautious','rest'].includes(policy))fail('出漁方針を選んでください。');s.expansion.fishery.policy=policy;log(s,'fishingPolicy',{policy});return s;}
 // Catch by people aboard: captain alone 40%, +1 crew 100%, +2 crew 130% (half-month crew interpolate). Fuel, ice and bait scale with it,
 // and crew pay 28万 makes the third hand cost more than the 30% it adds on average, so two aboard is the sweet spot; winter (Dec-Feb) is the catch season.
 function crewScale(crew){return crew<=1?.4+.6*crew:1+.3*Math.min(1,crew-1);}
 function monthly(s){wageResignations(s);const f0=s.expansion.fishery;if(f0&&f0.policy!=='rest')for(const p of f0.crew)p.boatMonths=(p.boatMonths||0)+1;const holding=Math.floor(Math.max(0,(s.balances.商品||0)-500000)*.0025);expense(s,'雑費',holding,'在庫保管費（50万円超過分・年率３％の月割）','retail');const departures=sum(s.expansion.departing||[],p=>p.wage);expense(s,'給料手当',departures,'退職予定者の当月給与','fishery',false);expense(s,'法定福利費',Math.floor(departures*.15),'退職予定者の社会保険','fishery',false);
  for(const p of s.expansion.properties){if(p.acquired>=s.turn)continue;const seg=p.segmentId,occupied=Array.from({length:p.units},(_,i)=>draw(s,p.id,s.turn,i)<p.occupancy).filter(Boolean).length,netRent=Math.round(p.rent*occupied/p.units);
   const requiredDeposit=Math.round(p.rent*2*occupied/p.units);if(requiredDeposit>p.deposit)post(s,'預金','預り敷金',requiredDeposit-p.deposit,'入居者の預り敷金','tenantDeposit',seg);else if(requiredDeposit<p.deposit)post(s,'預り敷金','預金',p.deposit-requiredDeposit,'退去に伴う敷金返還','tenantRefund',seg);p.deposit=requiredDeposit;
   post(s,'預金','売上高',netRent,p.name+'の家賃','rentIncome',seg);if(s.vatEnabled&&p.type==='building')post(s,'預金','仮受消費税等',E.vat(netRent),'事務所家賃の消費税','vatOutput',seg);
   const base=Math.round(p.rent*p.costRate*.55),management=Math.round(netRent*.05);expense(s,'雑費',p.type==='building'?base+management:E.gross(s,base+management),'物件の管理・経常修繕',seg,p.type==='building');expense(s,'租税公課',Math.round(p.rent*p.costRate*.15),'物件税・保険の月割（ゲーム）',seg,false);
   let repair=0;if(draw(s,p.id+'repair')<[.015,.03,.06][p.ageBand]){repair=Math.round(p.building*[.005,.01,.025][p.ageBand]);expense(s,'雑費',p.type==='building'?repair:E.gross(s,repair),'物件の臨時修繕',seg,p.type==='building');s.expansion.events.push({turn:s.turn,type:'repair',assetId:p.id,amount:repair});}
   p.last={turn:s.turn,rent:netRent,occupied,noi:netRent-base-management-Math.round(p.rent*p.costRate*.15)-repair,repair};
  }
  const f=s.expansion.fishery;if(f){f.restMonths=f.policy==='rest'?(f.restMonths||0)+1:0;const wages=sum(f.crew,x=>x.wage);expense(s,'給料手当',wages,'船長・船員の給与','fishery',false);expense(s,'法定福利費',Math.floor(sum(f.crew.filter(x=>x.homeRole!=='parttime'),x=>x.wage)*.15),'漁業の会社負担社保','fishery',false);const allowance=f.policy==='rest'?0:RULES.boardingAllowance*f.crew.filter(x=>['employee','manager'].includes(x.homeRole)).length;if(allowance){expense(s,'給料手当',allowance,'乗船手当（店の社員・店長が船に乗った月）','fishery',false);expense(s,'法定福利費',Math.floor(allowance*.15),'乗船手当の社保','fishery',false);}expense(s,'雑費',f.policy==='rest'?40000:80000,'船の維持・修繕','fishery');
   if(f.use==='charter'){const c=charterPlan(s),sales=c.passengers*RULES.charterFare;expense(s,'売上原価',c.days*12000+c.passengers*500,'釣船の燃料・乗船準備','fishery');post(s,'預金','売上高',sales,'釣船の乗船料','charterSale','fishery');if(s.vatEnabled)post(s,'預金','仮受消費税等',E.vat(sales),'乗船料の消費税','vatOutput','fishery');f.last={turn:s.turn,...c,quantity:0,lost:0,sold:0,transfer:0};return;}
   const captain=f.crew.find(x=>x.role==='captain'),crew=sum(f.crew.filter(x=>x.role==='crew'),x=>x.hiredTurn===s.turn||x.transferHalf?.5:1),storm=draw(s,'fisheryWeather')<.08;
   const days=!captain||f.policy==='rest'||storm?0:f.policy==='cautious'?12:20,experience=captain?.hiredTurn===s.turn||captain?.transferHalf?.5:1,scale=crewScale(crew),quantity=Math.floor(days*90*scale*RULES.fishSeason[month(s.turn)]*experience*(.85+.3*draw(s,'catch'))*(f.forecastCatchScale||1)*(captain?.characterId==='madai'?1.08:1)),lost=Math.floor(quantity*.05),transfer=s.equipment.tank?Math.min(f.supplyTarget||0,Math.max(0,E.capacities(s).water-E.usage(s).water),(quantity-lost)*10):0,sold=(quantity-lost)-transfer/10,price=600+Math.round(draw(s,'fishPrice')*200);
   const fuel=Math.round(days*12000*scale);expense(s,'売上原価',fuel,'漁業の燃料・氷・餌（乗る人数に比例）','fishery');post(s,'預金','売上高',Math.round(sold*price),'当月漁獲の市場販売','fisherySale','fishery');if(s.vatEnabled)post(s,'預金','仮受消費税等',E.vat(Math.round(sold*price)),'漁獲物の消費税（ゲーム10％）','vatOutput','fishery');
   const supplyCost=transfer*80,allocatedFuel=quantity?Math.min(supplyCost,Math.floor(fuel*(transfer/10)/quantity)):0,conditioning=supplyCost-allocatedFuel;if(transfer){expense(s,'売上原価',conditioning,'自店供給用の活きアジの選別・輸送・飼育準備','fishery');const e=post(s,'商品','売上原価',supplyCost,'漁業から釣具店へ活きアジ'+transfer+'匹を原価振替（社内取引）','fisheryTransfer','fishery',{inventorySegment:'retail',quantity:transfer});E.add(s,6,transfer);}
   f.last={turn:s.turn,days,quantity,lost,sold,price,fuel,storm,transfer,supplyCost,conditioning};if(storm)s.expansion.events.push({turn:s.turn,type:'storm'});
  }
 }
 function next(s){init(s);taxNext(s);delete s.storeDutyTurn;for(const p of [...s.staff,...(s.expansion.fishery?.crew||[])])p.transferHalf=false;if(s.expansion.fishery)s.expansion.fishery.crew=s.expansion.fishery.crew.filter(p=>!p.leavesTurn||p.leavesTurn>s.turn);s.staff=s.staff.filter(p=>!p.leavesTurn||p.leavesTurn>s.turn);s.expansion.departing=(s.expansion.departing||[]).filter(p=>p.leavesTurn>s.turn);}
 function segments(s,start=1,end=s.turn){const result={};const row=id=>result[id]||(result[id]={id,sales:0,cost:0,direct:0,interest:0,other:0,tax:0,special:0,assets:0,debt:0,transferIn:0,transferOut:0});
  for(const e of s.entries){if(e.turn>end||e.type?.startsWith('yearClose.'))continue;const r=row(e.segmentId||segmentFor(s,e)),inPeriod=e.turn>=start;if(inPeriod&&e.type==='fisheryTransfer'){r.transferOut+=e.amount;row('retail').transferIn+=e.amount;}
   for(const [a,sign] of [[e.debit,1],[e.credit,-1]]){
    if(['商品','土地','賃貸建物','船舶','車両','什器','建物附属設備','差入保証金','売掛金'].includes(a))row(e.inventorySegment||r.id).assets+=sign*e.amount;if(a==='減価償却累計額')r.assets+=sign*e.amount;
    if(['短期借入金','長期借入金','1年内返済予定長期借入金'].includes(a))r.debt-=sign*e.amount;
    if(!inPeriod)continue;if(a==='売上高')r.sales-=sign*e.amount;else if(a==='売上原価'||a==='商品廃棄損')r.cost+=sign*e.amount;else if(a==='支払利息')r.interest+=sign*e.amount;else if(a==='法人税等')r.tax+=sign*e.amount;else if(a==='固定資産売却損')r.special-=sign*e.amount;else if(a==='固定資産売却益')r.special-=sign*e.amount;else if(E.EXPENSES.includes(a))r.direct+=sign*e.amount;else if(a==='受取利息')r.other-=sign*e.amount;
   }
  }
  row('retail');row('hq');for(const r of Object.values(result)){r.gross=r.sales-r.cost;r.contribution=r.gross-r.direct;r.profit=r.contribution-r.interest+r.other;}
  const totalSales=sum(Object.values(result).filter(x=>x.id!=='hq'),x=>x.sales),hqCost=Math.max(0,-result.hq.profit);let assigned=0;const departments=Object.values(result).filter(x=>x.id!=='hq');departments.forEach((r,i)=>{r.allocation=totalSales?(i===departments.length-1?hqCost-assigned:Math.floor(hqCost*r.sales/totalSales)):0;assigned+=r.allocation;r.afterAllocation=r.profit-r.allocation;});
  return {rows:Object.values(result),ordinary:sum(Object.values(result),r=>r.profit),profit:sum(Object.values(result),r=>r.profit+r.special-r.tax)};
 }
 function assert(s){if(!s.expansion)return;const deposits=sum(s.expansion.properties,p=>p.deposit);if(deposits!==(s.balances.預り敷金||0))fail('預り敷金台帳不一致');const f=s.expansion.fishery;if(f&&(f.crew.filter(x=>x.role==='captain').length>1||f.crew.filter(x=>x.role==='crew').length>2))fail('漁業の人員上限不一致');}
 function closed(s,r){r.segments=segments(s,s.turn,s.turn);if(r.segments.ordinary!==E.ordinary(r.after)-E.ordinary(r.before))fail('部門利益と全社利益が一致しません');r.expansionEvents=s.expansion.events.filter(e=>e.turn===s.turn);s.history.at(-1).segments=r.segments;const years=s.history.filter(h=>h.turn%12===0).slice(-2);if(years.length===2){const first=segments(s,years[0].turn-11,years[0].turn),second=segments(s,years[1].turn-11,years[1].turn);s.expansion.reviewHint=second.rows.some(x=>x.id!=='hq'&&x.profit<0&&first.rows.some(y=>y.id===x.id&&y.profit<0));}prepareMA(s);}
 function taxEstimate(s){const income=E.profit(s.balances)+(s.balances.法人税等||0)-(s.taxEvidence||[]).filter(e=>e.status==='assessed'&&['inventory','defer'].includes(e.kind)&&year(e.turn)===year(s.turn)-1).reduce((n,e)=>n+e.base,0)+sum(s.entries.filter(e=>e.turn>Math.floor((s.turn-1)/12)*12&&['auditVATAccrual','auditPenalty'].includes(e.type)),e=>e.amount);const annual=s.taxAnnual?.find(x=>x.turn===s.turn);if(s.closed&&s.turn%12===0&&annual)return {income:annual.income,taxable:annual.taxable,amount:annual.assessed};const lots=(s.taxLosses||[]).filter(l=>l.year<year(s.turn)),loss=E.applyTaxLosses(lots,year(s.turn),income);return {income,taxable:loss.taxable,amount:Math.floor(Math.min(8000000,loss.taxable)*.25+Math.max(0,loss.taxable-8000000)*.35)+70000};}
 function prepareMA(s){if(s.expansion.ma||!s.closed||s.turn!==120||s.ended)return;const years=s.history.filter(h=>[96,108,120].includes(h.turn));if(years.length!==3)return;const values=years.map(h=>E.ordinary(h.balances)-(h.balances.受取利息||0)-sum(s.entries.filter(e=>e.turn>h.turn-12&&e.turn<=h.turn&&e.debit==='役員貸付金'),e=>e.amount)+(h.balances.支払利息||0)+(h.balances.減価償却費||0)),average=sum(values)/3,net=E.managementRatios(s.balances,true).equity;
  if(average<RULES.maIncome||net<RULES.maEquity){s.expansion.ma={phase:'ineligible',average,net,values,attempts:[]};return;}
  const growing=values[2]>=values[1]&&values[1]>=values[0],stable=Math.min(...values)>average*.65,multiple=3+(growing?1:0)+(stable?1:0),initialMultiple=multiple*(.75+.15*draw(s,'maOffer',120));
  s.expansion.ma={phase:'offer',average,net,values,multiple,initial:Math.floor((net+average*initialMultiple)/10000)*10000,ceiling:Math.floor((net+average*multiple)/10000)*10000,attempts:[],sale:0};
 }
 function negotiate(source,choice,multiple){const s=clone(source);init(s);prepareMA(s);const a=s.expansion.ma;if(!a||['sold','failed','declined','ineligible'].includes(a.phase))fail('交渉は終了しています。');
  if(choice==='decline'){a.phase='declined';return s;}
  if(choice==='accept'&&a.phase==='offer'){a.pending=a.initial;a.phase='confirm';return s;}
  if((choice==='reject'||choice==='discuss')&&a.phase==='offer'){a.phase='negotiate';a.response=choice;return s;}
  if(choice==='offer'){if(a.phase!=='negotiate'||a.attempts.length>=2||!Number.isFinite(multiple)||multiple<.5||multiple>10||multiple*2%1)fail('希望年数を0.5〜10年、0.5年刻みで入力してください。');const price=Math.floor((a.net+a.average*multiple)/10000)*10000;a.attempts.push({multiple,price,accepted:price<=a.ceiling});if(price<=a.ceiling){a.pending=price;a.phase='confirm';}else a.phase=a.attempts.length===2?'failed':'negotiate';return s;}
  if(choice==='confirm'&&a.phase==='confirm'){a.sale=a.pending;a.phase='sold';s.owner+=a.sale;log(s,'maSale',{amount:a.sale});return s;}
  fail('交渉の段階が変わりました。もう一度確認してください。');
 }
 function score(s){if(!s.closed||s.turn!==120||s.ended||s.cashCrisis?.status==='pending')return null;const b=s.balances,m=E.managementRatios(b,true),recent=s.history.filter(h=>h.turn%12===0).slice(-3),periods=recent.length?recent:[{turn:s.turn,balances:b}],adjusted=h=>{const start=h.turn-11,drawn=sum(s.entries.filter(e=>e.turn>=start&&e.turn<=h.turn&&e.debit==='役員貸付金'),e=>e.amount);return E.ordinary(h.balances)-(h.balances.受取利息||0)-drawn;},ordinary=sum(periods,adjusted)/periods.length,sales=sum(periods,h=>h.balances.売上高||0)/periods.length,debt=sum(s.loans||[],l=>l.balance),capacity=ordinary+sum(periods,h=>h.balances.減価償却費||0)/periods.length,debtYears=debt===0?0:capacity>0?debt/capacity:15;
  const years=s.history.filter(h=>h.turn%12===0),totalOrdinary=sum(years,adjusted),fundingYears=new Set([...s.entries.filter(e=>e.type==='ownerFunding').map(e=>year(e.turn)),...(s.rescueBankYears||[])]).size,c=x=>clamp(x,0,1),profitability=100*(.4*c(m.assets>0?ordinary/m.assets/.1:0)+.3*c(sales>0?ordinary/sales/.08:0)+.3*c(totalOrdinary/100000000)),health=clamp(100*(.5*c((m.equityRatio||0)/.5)+.5*(1-c(debtYears/15)))-5*fundingYears-((b.役員貸付金||0)>0?((b.役員貸付金||0)/Math.max(1,m.equity)<.05?10:(b.役員貸付金||0)/Math.max(1,m.equity)<.2?25:40):0)-((b.未収利息||0)>0?10:0),0,100),personal=s.owner+(b.役員借入金||0)-(b.役員貸付金||0)-(b.未収利息||0),sale=s.expansion?.ma?.sale||0,wealth=100*c(personal/RULES.personalTarget),before=100*c((personal-sale)/RULES.personalTarget);
  return {profitability:Math.round(profitability),health:Math.round(health),wealth:Math.round(wealth),wealthBefore:Math.round(before),total:Math.round(profitability)+Math.round(health)+Math.round(wealth),personal,sale,ordinary,totalOrdinary,assets:m.assets,equity:m.equity,debtYears,fundingYears};
 }
 function forecastExpansion(source,plan,a,months=12,stress=false){let s=clone(source);init(s);if(s.closed)s=E.next(s);const rows=[];try{if(plan.kind==='property')s=buyProperty(s,plan.id,plan.amount,a);if(plan.kind==='fishery')s=buyFishery(s,plan.amount,a);if(stress){for(const p of s.expansion.properties)p.occupancy=Math.max(.3,p.occupancy-.2);if(s.expansion.fishery)s.expansion.fishery.forecastCatchScale=.75;for(const l of s.loans||[])l.rate+=1;}for(let i=0;i<months&&!s.ended&&s.turn<=120;i++){if(plan.kind==='fishery'&&i>0&&s.expansion.fishery.crew.length<3&&!s.actionLocked&&E.recruitment(s).open)s=hireCrew(s,s.expansion.fishery.crew.some(x=>x.role==='captain')?'crew':'captain');const action=s.actionLocked||'tend',r=E.run(s,E.recommend(s,action),'list',action,{noise:1});s=r.state;rows.push({turn:s.turn,cash:s.balances.預金,profit:r.report.monthProfit,segments:r.report.segments});if(s.ended||s.turn===120)break;s=E.next(E.compact(s));}return {rows,ended:s.ended,profit:sum(rows,r=>r.profit),minimumCash:rows.length?Math.min(...rows.map(r=>r.cash)):s.balances.預金,endCash:rows.at(-1)?.cash};}catch(e){return {rows,error:e.message};}}
 function cruise(source,quantities,price,months){let s=clone(source);init(s);available(s);if(month(s.turn)!==4||![12,24,36].includes(months))fail('巡航は４月に12・24・36か月から選びます。');const rows=[],start=s.turn;let report=null,reason='指定期間を終了';
  for(let i=0;i<months;i++){
   // Exact fixed order quantities, same engine; no manual tax commands carried forward.
   if(s.expansion.taxPolicy)s.expansion.taxPolicy={year:year(s.turn),careful:!!s.expansion.taxPolicy.careful,commands:[]};
   const action=s.actionLocked||'tend',validation=E.validation(s,quantities,action);if(validation){reason=validation;break;}
   const r=E.run(s,quantities,price,action);s=r.state;report=r.report;rows.push({turn:s.turn,cash:s.balances.預金,profit:report.monthProfit});
   if(s.ended){reason='資金不足';break;}if(s.turn===120){reason='第10期決算・M&A判定';break;}if(report.audit){reason='税務調査';break;}if(report.expansionEvents?.some(e=>e.type==='storm'||e.type==='repair')){reason='天候・修繕イベント';break;}
   if(report.staffHints?.length){reason='クエがスタッフの得意分野に気づいた';break;}
   const n=E.next(E.compact(s));if(!E.recruitment(n).first&&E.recruitment(n).open){reason='翌月は採用イベント';break;}if(n.staffEvents?.some(e=>!e.notified)){reason='スタッフの相談・退職';break;}if(n.turn>=25&&(n.turn-25)%6===0){reason='新しい物件の案内';break;}
   if(n.loans?.some(l=>l.kind==='short'&&l.balance>0&&l.due-n.turn<=1)){reason='短期借入の書換判断';break;}
   let look=clone(n),danger=false;for(let j=0;j<2;j++){try{const lookAction=look.actionLocked||'tend',lr=E.run(look,quantities,price,lookAction,{noise:1});if(lr.state.ended||lr.state.balances.預金<E.fixedCosts(look)*2+extraFixed(look)*2){danger=true;break;}if(look.turn===120)break;look=E.next(E.compact(lr.state));}catch{danger=true;break;}}
   if(danger){reason='２か月以内の資金余力を確認';break;}if(i===months-1)break;s=n;
  }
  return {state:s,report,rows,start,reason};
 }
 function extraFixed(s){return (s.expansion?.taxPolicy?.careful?22000:0)+ sum(s.expansion?.properties||[],p=>Math.round(p.rent*p.costRate*.7))+(s.expansion?.fishery?(s.expansion.fishery.policy==='rest'?44000:88000)+Math.floor(sum(s.expansion.fishery.crew,x=>x.wage)*1.15):0);}


 // Fictional bookkeeping choices: outcomes only, no real-world procedure guidance.
 const TAX_COMMANDS=['skim','privateGear','privateCar','fiction','inventory','privateBoat','defer'];
 function evidence(s,kind,base,vat=0,privateBenefit=0,severe=false){if(!base&&!vat)return;s.taxEvidence.push({id:`tax-${s.turn}-${s.taxEvidence.length}`,turn:s.turn,kind,base,vat,privateBenefit,severe,status:'open',careful:!!s.expansion.taxPolicy?.careful,reason:kind});}
 function chooseTaxPolicy(source,commands,careful=false){const s=clone(source);init(s);available(s);if(month(s.turn)!==4||s.expansion.taxPolicy?.year===year(s.turn)||!Array.isArray(commands)||new Set(commands).size!==commands.length||commands.some(c=>!TAX_COMMANDS.includes(c)))fail('期首に１回、今期の方針を選びます。');if(commands.includes('privateBoat')&&!s.expansion.fishery)fail('漁船を保有していません。');if(commands.includes('privateCar')&&s.assets.some(a=>a.id==='private-car'))fail('私用車は取得済みです。');if(commands.includes('privateGear')&&commands.includes('privateCar'))fail('私物は道具か車のどちらかを選びます。');
  const cost=(commands.includes('privateGear')?E.gross(s,300000):0)+(commands.includes('privateCar')?E.gross(s,6000000):0)+(commands.includes('fiction')?500000:0);if(cost>s.balances.預金)fail('会社預金が不足しています。');const begin=s.entries.length;s.expansion.taxPolicy={year:year(s.turn),commands,careful};s.expansion.cheatUses=(s.expansion.cheatUses||0)+commands.length;
  if(commands.includes('privateGear')){expense(s,'雑費',300000,'私物の釣具（ゲームの選択）','hq');evidence(s,'privateGear',300000,s.vatEnabled?30000:0,330000);}
  if(commands.includes('privateCar')){post(s,'車両','預金',6000000,'私用車の取得（ゲームの選択）','taxChoice');input(s,6000000,'私用車','hq');s.assets.push({id:'private-car',cost:6000000,life:72,depreciation:0,segmentId:'hq'});evidence(s,'privateCar',0,s.vatEnabled?600000:0,6600000);}
  if(commands.includes('fiction')){expense(s,'雑費',500000,'実体のない支出（ゲームの選択）','hq',false);s.owner+=500000;evidence(s,'fiction',500000,0,500000,true);}
  s.pendingEntries.push(...s.entries.slice(begin));log(s,'taxPolicy',{commands,careful});E.assertState(s);return s;
 }
 function setSalary(source,amount){const s=clone(source);available(s);if(month(s.turn)!==4||!Number.isSafeInteger(amount)||amount%1000!==0||amount<120000||amount>1000000||s.expansion.salarySetYear===year(s.turn))fail('役員報酬は期首に１回、月12万〜100万円、千円単位で選びます。');s.officerSalary=amount;s.expansion.salarySetYear=year(s.turn);log(s,'salary',{amount});return s;}
 function disposeStock(source,index,quantity){const s=clone(source);available(s);const p=E.PRODUCTS[index];if(!p||!Number.isSafeInteger(quantity)||quantity<=0||quantity>s.inventory[index])fail('実在する商品の処分数量を選んでください。');E.take(s,index,quantity);const e=post(s,'商品廃棄損','商品',quantity*p.cost,p.name+'の売れ残り処分','waste.manual','retail');s.pendingEntries.push(e);log(s,'dispose',{index,quantity});E.assertState(s);return s;}
 function livingCharge(source){const s=clone(source);available(s);if(s.owner>=200000||s.expansion.livingTurn===s.turn||s.balances.預金<100000)fail('個人預金が生活費１か月未満の月に１回選べます。');const e=post(s,'雑費','預金',100000,'生活費の会社負担（ゲームの選択）','taxChoice');s.owner+=100000;s.pendingEntries.push(e);s.expansion.livingTurn=s.turn;s.expansion.cheatUses=(s.expansion.cheatUses||0)+1;evidence(s,'living',100000,0,100000);log(s,'livingCharge');E.assertState(s);return s;}
 function taxMonthly(s){
  const x=s.expansion,policy=x.taxPolicy,commands=policy?.year===year(s.turn)?policy.commands:[];
  if(policy?.careful)expense(s,'雑費',20000,'丁寧な経理の月額費用','hq');
  if(commands.includes('skim')){const sold=sum(s.entries.filter(e=>e.turn===s.turn&&e.type==='saleCash'),e=>e.amount);const n=Math.floor(sold*.05);post(s,'売上高','預金',n,'現金売上の計上不足（ゲーム）','taxChoice','retail');const v=s.vatEnabled?E.vat(n):0;if(v)post(s,'仮受消費税等','預金',v,'計上不足分の消費税（ゲーム）','taxChoice','retail');s.owner+=n+v;evidence(s,'skim',n,v,n+v,true);}
  if(commands.includes('privateBoat')){expense(s,'雑費',50000,'船の私的利用による支出（ゲーム）','fishery',false);expense(s,'売上原価',10000,'私的出漁の燃料（ゲーム）','fishery');s.owner+=50000;evidence(s,'privateBoat',60000,s.vatEnabled?1000:0,60000);}
  for(const e of s.entries.filter(e=>e.turn===s.turn&&e.assetId==='private-car'&&e.type==='depreciation'))evidence(s,'privateCar',e.amount,0,0);
  if(s.expansion.fishery?.last?.days===0)for(const e of s.entries.filter(e=>e.turn===s.turn&&e.assetId==='fishery-boat'&&e.type==='depreciation')){if((s.expansion.fishery.restMonths||0)>=7)evidence(s,'idleBoat',e.amount,0,0);}
  if(month(s.turn)===3&&commands.includes('inventory')){const n=Math.floor(s.balances.商品*.2);post(s,'売上原価','商品',n,'棚卸の過少計上（ゲーム）','taxChoice','retail');x.concealedInventory=n;evidence(s,'inventory',n,0,0,true);}
  if(month(s.turn)===3&&commands.includes('defer')){const n=Math.floor(sum(s.entries.filter(e=>e.turn===s.turn&&e.credit==='売上高'&&e.segmentId==='retail'),e=>e.amount)*.5);post(s,'売上高','繰延売上',n,'売上の時期ずれ（ゲーム上の仮受処理）','taxChoice','retail');x.deferredSales=n;evidence(s,'defer',n,0,0,true);}
 }
 function taxNext(s){const x=s.expansion;
  if(month(s.turn)===4){if(x.concealedInventory){post(s,'商品','売上原価',x.concealedInventory,'前期棚卸差額の戻し','taxReversal','retail');x.concealedInventory=0;}if(x.deferredSales){post(s,'繰延売上','売上高',x.deferredSales,'前期売上の時期ずれの戻し','taxReversal','retail');x.deferredSales=0;}}
  // Resolve outstanding choices in the new, unclosed period, never rewrite closed books.
  const audit=s.taxAudits?.find(a=>a.rev2&&a.status==='pending');if(!audit)return;const targets=s.taxEvidence.filter(e=>e.auditTurn===audit.turn&&e.status==='auditPending');
  let personal=0;for(const e of targets){const explain=e.response==='explain',eligible=['privateGear','living','privateBoat','idleBoat'].includes(e.kind),accepted=explain&&eligible&&e.careful&&draw(s,e.id+'explain',audit.turn)<.65;if(accepted){e.status='documented';e.explained=true;}else {e.status='open';personal+=Math.floor((e.privateBenefit||0)*.2);}}
  const protectedEvidence=s.taxEvidence.filter(e=>e.status==='open'&&!targets.includes(e));protectedEvidence.forEach(e=>e.status='later');E.assessTaxEvidence(s,audit);for(const e of targets)e.auditTurn=audit.turn;protectedEvidence.forEach(e=>e.status='open');s.owner-=personal;audit.personalTax=personal;audit.status='reviewed';audit.settledTurn=s.turn;audit.notified=true;if(audit.penaltyRate===.35)x.heavyAudit=true;if(!audit.findings?.length)x.normalUntil=s.turn+36;
 }
 function resolveFinding(source,id,response){const s=clone(source);const e=s.taxEvidence?.find(e=>e.id===id&&e.status==='auditPending');if(!e||!['admit','explain'].includes(response))fail('この指摘は処理済みです。');e.response=response;return s;}
 function audit(s){if(s.turn===120)return finalTax(s);const x=s.expansion;s.taxAudits=s.taxAudits||[];const prior=s.taxAudits.at(-1),gap=prior?s.turn-prior.turn:Infinity;
  if(s.turn%12===0&&s.turn<120){const normal=s.turn<(x.normalUntil||0),chance=normal?.25:x.heavyAudit?.70:(x.cheatUses||0)>=2?.50:.25;const scheduled=s.turn+1+Math.floor(draw(s,'auditMonth')*12);if(scheduled>=36&&(!prior||scheduled-prior.turn>=36)&&(draw(s,'auditSchedule')<chance||s.turn-(prior?.turn||0)>=48))x.auditScheduled=scheduled;}
  if(s.turn!==x.auditScheduled||s.turn<36||gap<36||s.taxAudits.some(a=>a.turn===s.turn))return null;
  const targets=s.taxEvidence.filter(e=>e.status==='open'&&Math.ceil(e.turn/12)*12<s.turn);const a={rev2:true,turn:s.turn,status:'pending',notified:false,reason:(s.balances.未収利息||0)>0?'役員貸付利息の未回収と帳簿・支出・計上時期の確認':'帳簿・支出・計上時期の確認',findings:[],candidates:targets.map(e=>e.id),ownerLoan:s.balances.役員貸付金||0,unpaidInterest:s.balances.未収利息||0,additionalTax:0};
  targets.forEach(e=>{e.status='auditPending';e.auditTurn=s.turn;});if(!targets.length){a.status='reviewed';x.normalUntil=s.turn+36;}s.taxAudits.push(a);delete x.auditScheduled;return {...a};
 }

 function finalTax(s){
  if(s.expansion.finalTaxSettled)return null;
  // Resolve existing cases first, then assess every remaining closed-year item.
  while(s.taxAudits.some(a=>a.rev2&&a.status==='pending'))taxNext(s);
  const targets=s.taxEvidence.filter(e=>e.status==='open'||e.status==='auditPending');
  const a={rev2:true,final:true,turn:s.turn,status:'reviewed',notified:false,reason:'10期終了時の最終税務精算',findings:[],personalTax:0};
  for(const e of targets){e.status='open';a.personalTax+=Math.floor((e.privateBenefit||0)*.2);}
  E.assessTaxEvidence(s,a);s.owner-=a.personalTax;
  // Correct concealed assets/revenue; their extra tax was already assessed above.
  const x=s.expansion;
  if(x.concealedInventory){post(s,'商品','売上原価',x.concealedInventory,'最終精算：棚卸の訂正','taxFinalRestatement','retail');x.concealedInventory=0;}
  if(x.deferredSales){post(s,'繰延売上','売上高',x.deferredSales,'最終精算：売上時期の訂正','taxFinalRestatement','retail');x.deferredSales=0;}
  // Final liabilities remain in B/S; audit additions are paid now so rescue still applies.
  for(const t of s.taxes.filter(t=>t.audit)){post(s,'未払法人税等','預金',t.amount,'最終精算：追加法人税等の納付','auditCorpPay');}
  s.taxes=s.taxes.filter(t=>!t.audit);
  for(const t of s.vatDue.filter(t=>t.audit)){post(s,'未払消費税等','預金',t.amount,'最終精算：追加消費税等の納付','auditVATPay');}
  s.vatDue=s.vatDue.filter(t=>!t.audit);
  s.taxAudits.push(a);x.finalTaxSettled=true;return a;
 }
 function promoteCaptain(source,id){const s=clone(source);available(s);const f=s.expansion.fishery,p=f?.crew.find(p=>p.id===id);if(!p||p.role!=='crew'||(p.boatMonths||0)<24||f.crew.some(p=>p.role==='captain'))fail('船員経験24か月以上、船長の空席が必要です。');p.role='captain';p.homeRole='captain';p.captainQualified=true;p.wage=RULES.captainWage;delete p.wageCut;delete p.baseWage;delete p.wageCutTurn;log(s,'promoteCaptain',{id});return s;}
 function charterPlan(s){const f=s.expansion?.fishery;if(!f||f.use!=='charter')return {days:0,passengers:0};const captain=f.crew.find(p=>p.role==='captain'),crew=f.crew.filter(p=>p.role==='crew');const days=!captain||!crew.length||f.policy==='rest'||draw(s,'fisheryWeather')<.08?0:f.policy==='cautious'?12:20;const ramp=captain?.hiredTurn===s.turn||captain?.transferHalf||crew.every(p=>p.hiredTurn===s.turn||p.transferHalf)?.5:1;// Calendar-month demand at 20 sailing days: spring beats fishing slightly, May loses, June breaks even, summer is thin, autumn half of fishing, winter loses.
  const store=Math.min(1.15,Math.max(.7,E.effectiveAttraction(s)/1.45)),passengers=Math.min(days*RULES.charterSeats,Math.floor(RULES.charterMonthly[month(s.turn)]*days/20*store*(.9+.2*draw(s,'charterCustomers'))*ramp));return {days,passengers};}
 function setBoatUse(source,use){const s=clone(source);available(s);const f=s.expansion.fishery;if(!f||!['fishery','charter'].includes(use)||month(s.turn)!==4||f.useYear===year(s.turn))fail('船の用途は４月に１回選べます。');f.use=use;f.useYear=year(s.turn);log(s,'boatUse',{use});return s;}
 // Boat/store assignment is chosen every month before sailing; it costs no action and no half-month penalty. Pay stays with the person;
 // store staff (社員・店長) who sail get a boarding allowance. Part-timers stay ashore. If everyone is aboard, クエ must mind the store (action fixed to tend).
 function storeUnmanned(s){const f=s.expansion?.fishery;return !!f&&f.crew.length>0&&!s.staff.length;}
 function storeDuty(s){if(storeUnmanned(s)){if(!s.actionLocked){s.actionLocked='tend';s.storeDutyTurn=s.turn;}}else if(s.actionLocked==='tend'&&s.storeDutyTurn===s.turn){s.actionLocked=null;delete s.storeDutyTurn;}}
 function transferStaff(source,id,to){const s=clone(source);available(s);const f=s.expansion.fishery;if(!f||!['store','boat'].includes(to))fail('配置先を選んでください。');const from=to==='boat'?s.staff:f.crew,target=to==='boat'?f.crew:s.staff,p=from.find(x=>x.id===id);if(!p||p.leavesTurn||target.length>=3)fail('この人は今月配置を変えられません。');
  if(to==='boat'&&(p.homeRole||p.role)==='parttime')fail('バイトは船に乗れません。');
  if(to==='boat'&&s.staff.length===1&&s.actionLocked&&s.storeDutyTurn!==s.turn)fail('今月のクエの行動は使用済みです。店を無人にすると店番ができないため、全員を船に出すことはできません。');
  const captain=p.captainQualified||p.role==='captain',boatRole=captain&&!f.crew.some(x=>x.role==='captain')?'captain':'crew';if(to==='boat'&&boatRole==='crew'&&f.crew.filter(x=>x.role==='crew').length>=2)fail('船員は２人までです。');
  p.homeRole=p.homeRole||p.role;p.wage=p.wage||E.ROLES[p.role]?.wage;p.captainQualified=!!captain;p.role=to==='boat'?boatRole:(E.ROLES[p.homeRole]?p.homeRole:'employee');p.movedTurn=s.turn;p.transferHalf=false;from.splice(from.indexOf(p),1);target.push(p);storeDuty(s);log(s,'transfer',{id,to});E.assertState(s);return s;
 }
 function staffPerson(s,id){return [...s.staff,...(s.expansion.fishery?.crew||[])].find(x=>x.id===id);}
 // Pay cuts replace dismissal: each month-end after a cut the person resigns with 20% probability; only restoring pay stops it.
 function cutWage(source,id){const s=clone(source);init(s);available(s);const p=staffPerson(s,id);if(!p||p.leavesTurn||p.wageCut)fail('この人の給与は下げられません。');p.baseWage=p.wage??E.ROLES[p.role]?.wage;p.wage=Math.floor(p.baseWage*(1-RULES.wageCutRate)/1000)*1000;p.wageCut=true;p.wageCutTurn=s.turn;log(s,'cutWage',{id,wage:p.wage});return s;}
 function restoreWage(source,id){const s=clone(source);init(s);available(s);const p=staffPerson(s,id);if(!p||p.leavesTurn||!p.wageCut)fail('元の給与に戻す対象ではありません。');p.wage=p.baseWage;delete p.baseWage;delete p.wageCut;delete p.wageCutTurn;log(s,'restoreWage',{id,wage:p.wage});return s;}
 function wageResignations(s){for(const p of [...s.staff,...(s.expansion.fishery?.crew||[])]){if(!p.wageCut||p.leavesTurn||draw(s,'wageQuit'+p.id)>=RULES.wageQuitChance)continue;p.leavesTurn=s.turn+2;s.staffEvents=s.staffEvents||[];s.staffEvents.push({id:'resign-'+p.id+'-'+s.turn,staffId:p.id,type:'resign',reason:'wageCut',turn:s.turn,leavesTurn:p.leavesTurn,status:'completed',notified:false});}}
 function exitQuote(s,id){const boat=id==='fishery-boat',p=boat?s.expansion.fishery:s.expansion.properties.find(x=>x.id===id),a=s.assets.find(x=>x.id===id);if(!p||!a)fail('売却対象がありません。');const age=(s.turn-p.acquired)/12,book=a.cost-a.depreciation,land=boat?0:p.land,segment=boat?'fishery':p.segmentId;
  const price=Math.floor((boat?book*Math.max(.4,.7-.02*age-.15*draw(s,id+'exit')):p.price*Math.max(.2,1-age*(.01+.01*draw(s,id+'decay')))*(.85+.25*draw(s,id+'exit')))/1000)*1000;
  const landPrice=boat?0:Math.round(price*p.land/p.price),buildingPrice=price-landPrice,output=s.vatEnabled?E.vat(buildingPrice):0,fee=boat?0:Math.round(price*.03)+60000,feeCash=E.gross(s,fee),debt=sum((s.loans||[]).filter(l=>l.segmentId===segment),l=>l.balance),deposit=boat?0:p.deposit||0;
  return {id,boat,segment,price,landPrice,buildingPrice,output,fee,feeCash,debt,deposit,book:book+land,gain:price-book-land-fee,net:price+output-feeCash-debt-deposit};
 }
 function exitBusiness(source,id){const s=clone(source);available(s);if(s.actionLocked||s.cashCrisis?.status==='pending')fail('行動を残した月に撤退してください。');const q=exitQuote(s,id);if(s.balances.預金+q.net<0)fail('売却代金と預金では借入・敷金・費用を精算できません。');const begin=s.entries.length,a=s.assets.find(x=>x.id===id),p=q.boat?s.expansion.fishery:s.expansion.properties.find(x=>x.id===id),account=q.boat?'船舶':'賃貸建物';
  // Remove gross asset cost and accumulated depreciation, then recognize disposal gain/loss.
  post(s,'減価償却累計額',account,a.depreciation,'売却資産の減価償却累計額を除去','assetExit',q.segment);
  post(s,'預金',account,Math.min(q.buildingPrice,a.cost-a.depreciation),'建物・船の売却代金','assetExit',q.segment);
  const buildingGap=q.buildingPrice-(a.cost-a.depreciation);if(buildingGap>0)post(s,'預金','固定資産売却益',buildingGap,'固定資産売却益','assetExit',q.segment);else if(buildingGap<0)post(s,'固定資産売却損',account,-buildingGap,'固定資産売却損','assetExit',q.segment);
  if(!q.boat){post(s,'預金','土地',Math.min(q.landPrice,p.land),'土地売却（非課税）','assetExit',q.segment);const gap=q.landPrice-p.land;if(gap>0)post(s,'預金','固定資産売却益',gap,'土地売却益','assetExit',q.segment);else if(gap<0)post(s,'固定資産売却損','土地',-gap,'土地売却損','assetExit',q.segment);}
  post(s,'預金','仮受消費税等',q.output,'建物・船の売却消費税','vatOutput',q.segment);expense(s,'固定資産売却損',q.fee,'売却仲介手数料',q.segment);post(s,'預り敷金','預金',q.deposit,'撤退時の敷金返還','tenantRefund',q.segment);
  // Reclassify loans first so the repayment clears the correct liability accounts.
  for(const l of s.loans||[]){if(l.segmentId!==q.segment||!l.balance)continue;let left=l.balance;for(const account of ['1年内返済予定長期借入金','長期借入金']){const amount=Math.min(left,s.balances[account]||0);post(s,account,'預金',amount,'売却時の関連借入一括返済','bankRepay.exit',q.segment);left-=amount;}l.balance=0;}
  E.reclassify(s);s.assets=s.assets.filter(x=>x.id!==id);s.expansion.exits=s.expansion.exits||[];s.expansion.exits.push({turn:s.turn,id,name:p.name||'船事業',quote:q});
  if(q.boat){for(const person of p.crew){person.homeRole=person.homeRole||person.role;person.captainQualified=person.role==='captain'||person.captainQualified;person.role=E.ROLES[person.homeRole]?person.homeRole:'employee';person.movedTurn=s.turn;person.transferHalf=false;if(s.staff.length<3)s.staff.push(person);else{s.expansion.departing=s.expansion.departing||[];s.expansion.departing.push({...person,leavesTurn:s.turn+1});}}s.expansion.fishery=null;s.expansion.boatExitYear=year(s.turn);}else {s.expansion.properties=s.expansion.properties.filter(x=>x.id!==id);if(!s.expansion.properties.length)s.expansion.propertyExitYear=year(s.turn);}
  s.pendingEntries.push(...s.entries.slice(begin));s.actionLocked='investment';log(s,'exitBusiness',{id});E.assertState(s);return s;
 }

 function validWage(p){const base=[120000,180000,250000,280000,350000];return p.wageCut===true?base.includes(p.baseWage)&&p.wage===Math.floor(p.baseWage*(1-RULES.wageCutRate)/1000)*1000:base.includes(p.wage);}
 function validateSave(s){const x=s.expansion;if(!x)return;const num=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(x.version!==1||!num(x.seed,0,4294967295)||!Array.isArray(x.properties)||!Array.isArray(x.actions)||!Array.isArray(x.events)||!Array.isArray(x.segmentSeen))fail('部門データが不正です');
 if(new Set(x.properties.map(p=>p.id)).size!==x.properties.length)fail('物件IDが重複しています');
 for(const p of x.properties){if(typeof p.id!=='string'||p.segmentId!=='realestate:'+p.id||!['room','house','building'].includes(p.type)||!num(p.price,1)||!num(p.land)||!num(p.building,1)||p.land+p.building!==p.price||!num(p.rent,1)||!num(p.taxLife,2,50)||!num(p.acquired,1,s.turn)||!num(p.deposit)||!num(p.units,1,6)||!num(p.ageBand,0,2)||!Number.isFinite(p.costRate)||p.costRate<0||p.costRate>1||!Number.isFinite(p.occupancy)||p.occupancy<0||p.occupancy>1)fail('物件データが不正です');}
 if(x.fishery){if(x.fishery.supplyTarget!==undefined&&(!num(x.fishery.supplyTarget,0,300)||x.fishery.supplyTarget&&!s.equipment.tank))fail('供給設定が不正です');if(!Array.isArray(x.fishery.crew)||!['normal','cautious','rest'].includes(x.fishery.policy)||x.fishery.crew.some(c=>!['captain','crew'].includes(c.role)||!num(c.hiredTurn,1,s.turn)||!validWage(c)))fail('漁業データが不正です');}
 if(x.ma&&(!['ineligible','offer','negotiate','confirm','sold','failed','declined'].includes(x.ma.phase)||!Array.isArray(x.ma.attempts)||x.ma.attempts.length>2||x.ma.phase==='sold'&&!num(x.ma.sale,1)))fail('商談データが不正です');
 if(x.taxPolicy&&(!Array.isArray(x.taxPolicy.commands)||x.taxPolicy.commands.some(c=>!TAX_COMMANDS.includes(c))))fail('経理方針が不正です');
 }
 const X={coopHiring,storeUnmanned,storeDuty,promoteCaptain,charterPlan,setBoatUse,transferStaff,cutWage,restoreWage,exitQuote,exitBusiness,propertyUnlocked,livingCharge,taxMonthly,audit,resolveFinding,chooseTaxPolicy,setSalary,disposeStock,taxEstimate,prepareMA,negotiate,score,forecastExpansion,cruise,extraFixed,validateSave,RULES,init,post,input,draw,segmentFor,market,finance,totalCost,buyProperty,boatOffer,buyFishery,hireCrew,setFishing,setSupply,monthly,next,segments,assert,closed,annualCapacity};E.extension=X;
}
const api={install};if(typeof module!=='undefined')module.exports=api;root.ShopExpansion=api;
})(globalThis);
