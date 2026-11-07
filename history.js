'use strict';
const PriceHistory={
 points(snapshots,id,fuel,mode){return snapshots.filter(Boolean).map(s=>{const row=s.stations?.[id]?.find(p=>p[0]===fuel&&p[1]===mode);return row&&Number.isFinite(row[2])?{date:s.date,price:row[2],generatedAt:s.generatedAt}:null}).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));},
 change(points){return points.length>1?points[points.length-1].price-points[0].price:null;},
 chart(points){
  if(!points.length)return '';
  const unit=/metano|cng|gnl|lng/i.test(PriceHistory.fuel||'')?'€/kg':'€/L',min=Math.min(...points.map(p=>p.price)),max=Math.max(...points.map(p=>p.price)),span=Math.max(.02,max-min),first=Date.parse(points[0].date),last=Date.parse(points[points.length-1].date),range=last-first||86400000;
  const nodes=points.map(p=>({x:55+(Date.parse(p.date)-first)/range*530,y:170-(p.price-min+.01)/(span+.02)*135,p}));
  return '<svg viewBox="0 0 640 215" role="img" aria-label="Prezzi osservati nelle date disponibili"><line x1="55" y1="180" x2="600" y2="180" stroke="#bac7bd"/>'+nodes.map((n,i)=>{const previous=nodes[i-1],consecutive=previous&&Date.parse(n.p.date)-Date.parse(previous.p.date)===86400000;return (consecutive?'<line x1="'+previous.x+'" y1="'+previous.y+'" x2="'+n.x+'" y2="'+n.y+'" stroke="#176c43" stroke-width="3"/>':'')+'<circle cx="'+n.x+'" cy="'+n.y+'" r="5" fill="#176c43"><title>'+escapeHtml(n.p.date)+' · '+fmt(n.p.price,3)+' '+unit+'</title></circle>';}).join('')+'<text x="55" y="205" font-size="14">'+escapeHtml(points[0].date)+'</text>'+(points.length>1?'<text x="500" y="205" font-size="14">'+escapeHtml(points[points.length-1].date)+'</text>':'')+'</svg>';
 }
};
let historyToken=0;
const historicalCache=new Map();
async function showPriceHistory(id,fuel,mode){
 const token=++historyToken,dialog=document.getElementById('priceHistoryDialog'),body=document.getElementById('historyBody');
 document.getElementById('historyTitle').textContent='Storico · '+fuel+' · '+(mode==='1'?'Self':'Servito');
 body.textContent='Caricamento delle osservazioni registrate…';if(!dialog.open)dialog.showModal();
 const base='https://raw.githubusercontent.com/kotetsi/pienosmart-italia/main/data/history/';
 try{
  const response=await fetch(base+'index.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Archivio non ancora disponibile. Riprova dopo il prossimo aggiornamento.');
  const index=await response.json();if(index.schemaVersion!==1||!Array.isArray(index.days))throw Error('Archivio non valido');
  const days=index.days.filter(x=>/^\d{4}-\d{2}-\d{2}\.json\.gz$/.test(x.file)).slice(-30);let failures=0;const snapshots=[];
  if(!window.DecompressionStream)throw Error('Per visualizzare l’archivio serve un browser aggiornato con supporto gzip.');
  for(const day of days){
   if(token!==historyToken)return;
   const key=day.file+'@'+day.sha256+'@'+id;
   try{
    let snapshot=historicalCache.get(key);
    if(!snapshot){const result=await fetch(base+day.file,{signal:AbortSignal.timeout(20000)});if(!result.ok)throw Error('Download fallito');const buffer=await result.arrayBuffer();
     if(window.crypto?.subtle&&day.sha256){const hash=await crypto.subtle.digest('SHA-256',buffer);const actual=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');if(actual!==day.sha256)throw Error('Hash non valido');}
     snapshot=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
     if(snapshot.schemaVersion!==1||snapshot.date!==day.date||typeof snapshot.stations!=='object')throw Error('Snapshot non valido');
     snapshot={date:snapshot.date,generatedAt:snapshot.generatedAt,stations:{[id]:snapshot.stations[id]||[]}};
     historicalCache.set(key,snapshot);if(historicalCache.size>120)historicalCache.delete(historicalCache.keys().next().value);
    }snapshots.push(snapshot);
   }catch{failures++;}
  }
  if(token!==historyToken)return;
  PriceHistory.fuel=fuel;const points=PriceHistory.points(snapshots,String(id),fuel,mode),delta=PriceHistory.change(points),unit=/metano|cng|gnl|lng/i.test(fuel)?'€/kg':'€/L';
  const title=stations.find(s=>String(s.idImpianto)===String(id));
  body.innerHTML='<p><b>'+escapeHtml(title?.['Nome Impianto']||'Impianto '+id)+'</b></p><p>Registrazione iniziata il '+escapeHtml(index.startedOn)+'. Ultime 30 giornate registrate, in UTC. Ogni punto è l’ultima osservazione del giorno: non indica quando il gestore ha cambiato prezzo.</p>'+(failures?'<p class="history-warning">'+failures+' snapshot non disponibili: storico parziale.</p>':'')+(!points.length?'<p>Nessuna osservazione per questo carburante e servizio nelle giornate disponibili.</p>':'<p><b>'+points.length+' osservazioni</b> · '+(delta===null?'Prima osservazione: la variazione sarà disponibile da una seconda giornata.':'Variazione nel periodo: '+(delta>0?'+':'')+fmt(delta,3)+' '+unit)+'</p>'+PriceHistory.chart(points)+'<div class="history-table"><table><thead><tr><th>Giorno UTC</th><th>Prezzo</th><th>Ora di raccolta UTC</th></tr></thead><tbody>'+points.map(p=>'<tr><td>'+escapeHtml(p.date)+'</td><td>'+fmt(p.price,3)+' '+unit+'</td><td>'+escapeHtml(p.generatedAt)+'</td></tr>').join('')+'</tbody></table></div>')+'<p class="muted">Fonte: osservazioni PienoSprint del servizio ufficiale MIMIT. Giorni o prezzi mancanti non vengono ricostruiti. Le osservazioni disponibili non garantiscono una serie giornaliera continua.</p>';
 }catch(e){if(token===historyToken)body.textContent=e.message;}
}
document.getElementById('closePriceHistory').onclick=()=>document.getElementById('priceHistoryDialog').close();
document.getElementById('priceHistoryDialog').addEventListener('close',()=>{historyToken++;});
