/* User-triggered public geocoding and routing. No autocomplete or automatic bulk routing. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id),esc=escapeHtml;
 let originOptions=[],destinationOptions=[],base=null,start=null,end=null,rows=[],routeMap=null,routeLayer=null,lastRequest=0,revision=0,valuesRevision=0,requestQueue=Promise.resolve();
 const cache=new Map();
 function json(url){const task=requestQueue.then(()=>requestJson(url));requestQueue=task.catch(()=>{});return task;}
 async function requestJson(url){
  if(cache.has(url))return cache.get(url);
  const wait=Math.max(0,1100-(Date.now()-lastRequest));if(wait)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
  const response=await fetch(url,{signal:AbortSignal.timeout(25000),referrerPolicy:'strict-origin-when-cross-origin'});
  if(!response.ok)throw Error('Servizio esterno non disponibile ('+response.status+'). Riprova più tardi.');
  const value=await response.json();cache.set(url,value);return value;
 }
 function message(text){get('routeStatus').textContent=text;}
 async function find(which){
  const input=get(which==='origin'?'routeOrigin':'routeDestination'),choice=get(which==='origin'?'originChoice':'destinationChoice'),button=get(which==='origin'?'findOrigin':'findDestination'),query=input.value.trim();
  if(query.length<3){message('Scrivi almeno 3 caratteri per la località.');return;}
  button.disabled=true;choice.innerHTML='<option value="">Ricerca…</option>';
  try{
   const data=await json('https://photon.komoot.io/api/?q='+encodeURIComponent(query)+'&limit=8&bbox=6,35,19,48');
   if(input.value.trim()!==query)return;
   const options=(data.features||[]).filter(f=>f.geometry?.type==='Point'&&f.properties?.countrycode?.toUpperCase()==='IT');
   if(which==='origin')originOptions=options;else destinationOptions=options;
   choice.innerHTML='<option value="">Seleziona una località</option>'+options.map((f,i)=>'<option value="'+i+'">'+esc([...new Set([f.properties.name,f.properties.street,f.properties.city,f.properties.state].filter(Boolean))].join(', '))+'</option>').join('');
   message(options.length?'Scegli la località trovata nel menu.':'Nessuna località italiana trovata. Prova con il comune e la provincia.');
  }catch(e){choice.innerHTML='<option value="">Ricerca non disponibile</option>';message(e.message);}finally{button.disabled=false;}
 }
 async function route(points){
  const coords=points.map(p=>p[0]+','+p[1]).join(';'),radiuses=points.map((_,i)=>points.length===3&&i===1?'100':'1000').join(';');
  const d=await json('https://routing.openstreetmap.de/routed-car/route/v1/driving/'+coords+'?overview=full&geometries=geojson&steps=false&radiuses='+radiuses);
  const r=d.routes?.[0];if(d.code!=='Ok'||!r?.geometry?.coordinates?.length||!Number.isFinite(r.distance)||!Number.isFinite(r.duration))throw Error('Percorso stradale non trovato. Prova altre località.');return r;
 }
 function paint(r,station){
  if(!window.L){get('routeMap').textContent='Mappa non disponibile. I risultati restano consultabili.';return;}
  if(!routeMap){get('routeMap').textContent='';routeMap=L.map('routeMap',{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors · OSRM / FOSSGIS'}).addTo(routeMap);}
  if(routeLayer)routeMap.removeLayer(routeLayer);routeLayer=L.layerGroup().addTo(routeMap);
  const line=L.polyline(r.geometry.coordinates.map(p=>[p[1],p[0]]),{color:station?'#cf7927':'#176c43',weight:5}).addTo(routeLayer);
  L.marker([start[1],start[0]]).addTo(routeLayer).bindPopup('Partenza');L.marker([end[1],end[0]]).addTo(routeLayer).bindPopup('Arrivo');
  if(station)L.marker([station.lat,station.lng]).addTo(routeLayer).bindPopup(esc(station.name));
  routeMap.invalidateSize();routeMap.fitBounds(line.getBounds(),{padding:[20,20]});
 }
 function number(id,min,max){const n=Number(get(id).value);if(!get(id).value.trim()||!Number.isFinite(n)||n<min||n>max)throw Error('Controlla i valori numerici del confronto.');return n;}
 async function plan(){
  const token=++revision;get('planRoute').disabled=true;base=null;rows=[];get('routeResults').innerHTML='';
  try{
   const a=get('originChoice').value,b=get('destinationChoice').value;
   if(a===''||b===''||!originOptions[+a]||!destinationOptions[+b])throw Error('Cerca e seleziona partenza e arrivo.');
   start=originOptions[+a].geometry.coordinates;end=destinationOptions[+b].geometry.coordinates;
   if(distance(start[1],start[0],end[1],end[0])<.2)throw Error('Scegli due località diverse.');
   if(!joined.length)throw Error('Attendi il caricamento dei prezzi MIMIT prima di cercare.');
   const corridor=number('routeCorridor',.2,10);message('Calcolo del percorso stradale…');
   const computed=await route([start,end]);if(token!==revision)return;base=computed;
   rows=RouteTools.candidates(joined,base.geometry.coordinates,get('routeFuel').value,get('routeService').value,corridor);
   paint(base);message('Percorso: '+fmt(base.distance/1000,1)+' km · circa '+fmt(base.duration/60,0)+' minuti. '+rows.length+' impianti nel corridoio; mostriamo i primi 20 per prezzo. Distanza dal tracciato in linea d’aria: non è ancora la deviazione stradale.');
   get('routeResults').innerHTML=rows.slice(0,20).map((s,i)=>'<article class="station route-station"><div><h4>'+esc(s.name)+'</h4><p>'+esc(s.address)+'</p><p>'+esc(s.fuel)+' · '+(s.self?'Self':'Servito')+' · '+fmt(s.offset,1)+' km dal tracciato</p><small>Impianto: '+esc(s.stationDate||s.date||'data non fornita')+'</small><p><button class="btn outline" type="button" data-route-station="'+i+'">Calcola deviazione e risparmio</button></p><div id="routeSaving'+i+'" role="status"></div></div><div class="price">'+fmt(s.price,3)+' €/L</div></article>').join('')||'<p>Nessun impianto con questi filtri. Prova un corridoio più ampio.</p>';
   get('routeResults').querySelectorAll('[data-route-station]').forEach(button=>button.addEventListener('click',()=>compare(+button.dataset.routeStation,button)));
  }catch(e){message(e.message);}finally{get('planRoute').disabled=false;}
 }
 async function compare(index,button){
  const station=rows[index],token=revision,valueToken=valuesRevision;if(!base||!station)return;
  try{
   const liters=number('routeLiters',1,200),consumption=number('routeConsumption',.1,40),reference=number('routeReference',.2,5),value=number('routeTimeValue',0,500);
   get('routeResults').querySelectorAll('button').forEach(b=>b.disabled=true);message('Calcolo della deviazione sulle strade…');
   const via=await route([start,[station.lng,station.lat],end]);if(token!==revision)return;if(valueToken!==valuesRevision){message('Valori modificati: ricalcola il confronto.');return;}
   const s=RouteTools.savings(base,via,liters,consumption,reference,station.price,value);paint(via,station);
   get('routeSaving'+index).innerHTML='<b>Risparmio netto stimato: '+eur(s.net)+'</b><p>Extra strada: '+fmt(s.km,1)+' km · tempo di guida extra: '+fmt(s.minutes,0)+' min</p><p>Alla pompa: '+eur(s.pump)+' − carburante extra: '+eur(s.detour)+' − valore tempo: '+eur(s.time)+'</p><small>Confronto con '+fmt(reference,3)+' €/L inseriti da te. Esclusi pedaggi aggiuntivi, attesa e tempo di rifornimento. Stima OSM senza traffico; accesso al piazzale e lato della strada da verificare.</small>';
   message('Deviazione calcolata per '+station.name+'. Il risultato è una stima, non una garanzia di risparmio.');
  }catch(e){message(e.message);}finally{get('routeResults').querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 function invalidate(){revision++;base=null;rows=[];if(routeMap&&routeLayer){routeMap.removeLayer(routeLayer);routeLayer=null;}get('routeResults').innerHTML='';message('Selezione modificata: ricalcola il percorso.');}
 get('findOrigin').onclick=()=>find('origin');get('findDestination').onclick=()=>find('destination');get('planRoute').onclick=plan;
 ['originChoice','destinationChoice','routeFuel','routeService','routeCorridor'].forEach(id=>get(id).addEventListener('change',invalidate));
 ['routeOrigin','routeDestination'].forEach((id,i)=>get(id).addEventListener('input',()=>{get(i===0?'originChoice':'destinationChoice').value='';invalidate();}));
 ['routeLiters','routeConsumption','routeReference','routeTimeValue'].forEach(id=>get(id).addEventListener('input',()=>{valuesRevision++;get('routeResults').querySelectorAll('[id^="routeSaving"]').forEach(x=>x.textContent='Valori modificati: ricalcola il confronto.');}));
})();
