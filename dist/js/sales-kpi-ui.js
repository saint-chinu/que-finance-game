/* Actual retail performance. Missing historic measurements are never inferred as zero. */
function retailKpi(turn,report=null){
 const h=state.history.find(row=>row.turn===turn);if(!h&&!report)return null;
 const r=report?.turn===turn&&!report.provisional?report:null;
 const visitors=Number.isFinite(r?.visitors)?r.visitors:Number.isFinite(h?.visitors)?h.visitors:null;
 const served=Number.isFinite(r?.served)?r.served:Number.isFinite(h?.served)?h.served:null;
 const sales=r?.productResults?r.productResults.reduce((sum,p)=>sum+p.sales,0):Number.isFinite(h?.retailSales)?h.retailSales:state.entries.filter(e=>e.turn===turn&&(!e.segmentId||e.segmentId==='retail')&&!e.type?.startsWith('yearClose.')).reduce((sum,e)=>sum+(e.credit==='売上高'?e.amount:0)-(e.debit==='売上高'?e.amount:0),0);
 return {turn,visitors,served,sales,ticket:served>0?Math.round(sales/served):null};
}
function retailKpiCards(kpi){
 const previous=kpi?retailKpi(kpi.turn-1):null;
 const number=(n,unit)=>n===null||n===undefined?'—':n.toLocaleString()+unit;
 const delta=(key,unit)=>{const now=kpi?.[key],prior=previous?.[key];if(!Number.isFinite(now)||!Number.isFinite(prior))return '前月比：比較対象なし';const d=now-prior;return '前月比 '+(d>0?'+':'')+number(d,unit)+(prior>0?'（'+(d>0?'+':'')+(d/prior*100).toFixed(1)+'%）':'');};
 return '<div class="retail-kpi-cards"><div><small>来店客数（実績）</small><strong>'+number(kpi?.visitors,'人')+'</strong><span>'+delta('visitors','人')+'</span><small>うち接客 '+number(kpi?.served,'人')+'</small></div><div><small>客単価（実績・税抜）</small><strong>'+number(kpi?.ticket,'円')+'</strong><span>'+delta('ticket','円')+'</span><small>釣具店の税抜売上 ÷ 接客人数</small></div></div>';
}
function retailKpiPeriod(turn){return '第'+(Math.floor((turn-1)/12)+1)+'期 '+month(turn)+'月';}
(()=>{
 const panel=document.createElement('section');panel.id='retailKpi';panel.className='panel retail-kpi';panel.setAttribute('aria-label','集客と客単価の実績');document.getElementById('shopOverview').after(panel);
 function renderKpi(){
  const opened=panel.querySelector('details')?.open,latest=state.history.at(-1),kpi=latest?retailKpi(latest.turn,lastReport):null;
  const history=state.history.slice(-12).reverse().map(h=>retailKpi(h.turn,lastReport));
  panel.innerHTML='<h2>集客・客単価 <small>'+(latest?retailKpiPeriod(latest.turn)+' 確定実績':'初月の確定後に表示')+'</small></h2>'+retailKpiCards(kpi)+(history.length?'<details'+(opened?' open':'')+'><summary>月別の実績を見る</summary><div class="retail-kpi-history"><table><caption>直近12か月・釣具店の実績</caption><thead><tr><th>月</th><th>来店</th><th>接客</th><th>客単価</th></tr></thead><tbody>'+history.map(h=>'<tr><th>'+retailKpiPeriod(h.turn)+'</th><td>'+(h.visitors===null?'記録なし':h.visitors.toLocaleString()+'人')+'</td><td>'+(h.served===null?'記録なし':h.served.toLocaleString()+'人')+'</td><td>'+(h.ticket===null?'—':h.ticket.toLocaleString()+'円')+'</td></tr>').join('')+'</tbody></table></div><p class="note">来店客数は接客できなかった人も含みます。接客0人の月は客単価を表示しません。古いセーブで人数の記録がない月は「記録なし」と表示します。</p></details>':'<p class="note">月を確定すると、実際の来店人数と客単価を確認できます。</p>');
 }
 const previousPlanning=renderPlanning;renderPlanning=function(){previousPlanning();renderKpi();};
 const previousReport=renderReport;renderReport=function(){previousReport();const r=statementReport;if(!r.provisional){const row=document.createElement('div');row.className='report-retail-kpi';row.innerHTML='<p>'+retailKpiPeriod(r.turn)+'・集客と客単価の実績</p>'+retailKpiCards(retailKpi(r.turn,r));document.getElementById('reportQuickSummary').append(row);}};
 renderKpi();
})();
