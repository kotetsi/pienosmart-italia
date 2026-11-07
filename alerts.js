'use strict';
(function(){
 const get=id=>document.getElementById(id),STORE='pienosprint_price_alerts_v1';let candidate=null;
 function read(){try{const s=JSON.parse(localStorage.getItem(STORE)||'{}');return {watches:Array.isArray(s.watches)?s.watches.filter(w=>typeof w.key==='string'&&typeof w.fuel==='string'&&typeof w.name==='string'&&Number.isFinite(w.anchorPrice)&&Number.isFinite(w.drop)&&w.drop>0).slice(0,50):[],events:Array.isArray(s.events)?s.events.filter(e=>typeof e.name==='string'&&Number.isFinite(e.price)&&Number.isFinite(e.before)&&typeof e.snapshot==='string').slice(0,50):[],device:s.device===true};}catch{return {watches:[],events:[],device:false};}}
 function save(s){try{localStorage.setItem(STORE,JSON.stringify(s));return true;}catch{get('alertsMessage').textContent='Memoria del browser non disponibile: modifiche non salvate.';return false;}}
 const unit=fuel=>/metano|cng|gnl|lng/i.test(fuel)?'€/kg':'€/L';
 function draw(){
  const s=read(),unread=s.events.filter(e=>!e.read).length;get('alertBadge').textContent=unread?' ('+unread+')':'';
  get('alertWatches').innerHTML=s.watches.length?s.watches.map((w,i)=>'<article class="alert-row"><b>'+escapeHtml(w.name)+'</b><p>'+escapeHtml(w.fuel)+' · '+(w.mode==='1'?'Self':'Servito')+' · soglia '+fmt(w.drop*100,1)+' centesimi</p><small>Riferimento: '+fmt(w.anchorPrice,3)+' '+unit(w.fuel)+(w.lastSnapshot?' · snapshot controllato: '+escapeHtml(w.lastSnapshot):'')+(w.available===false?' · prezzo non trovato nell’ultimo snapshot':'')+'</small><p><button class="linkbtn" type="button" data-remove-alert="'+i+'">Rimuovi monitoraggio</button></p></article>').join(''):'<p>Nessun prezzo monitorato. Nei risultati scegli «Avvisa ribassi».</p>';
  get('alertEvents').innerHTML=s.events.length?s.events.map(e=>'<article class="alert-row"><b>'+escapeHtml(e.name)+'</b><p>'+escapeHtml(e.fuel)+' · '+(e.mode==='1'?'Self':'Servito')+': '+fmt(e.before,3)+' → '+fmt(e.price,3)+' '+unit(e.fuel)+'</p><small>Osservazione raccolta: '+escapeHtml(e.snapshot)+' · '+(e.read?'letto':'nuovo')+'</small></article>').join(''):'<p>Nessun ribasso rilevato dalla tua attivazione.</p>';
  get('alertWatches').querySelectorAll('[data-remove-alert]').forEach(b=>b.addEventListener('click',()=>{const state=read();state.watches.splice(+b.dataset.removeAlert,1);if(save(state))draw();}));
  get('toggleDeviceAlerts').textContent=s.device?'Disattiva notifiche dispositivo':'Attiva notifiche dispositivo (a sito aperto)';
 }
 function open(){draw();const dialog=get('priceAlertsDialog');if(!dialog.open)dialog.showModal();}
 function verified(){const m=publishedFeedInfo;return m?.sourceType==='official-api'&&m.verified===true&&Date.now()-Date.parse(m.generatedAt)<=172800000&&Date.now()-Date.parse(m.generatedAt)>=-300000;}
 window.configurePriceAlert=function(id,fuel,mode){
  open();candidate=null;get('alertSetup').hidden=true;
  if(!verified()){get('alertsMessage').textContent='Servono dati MIMIT verificati scaricati nelle ultime 48 ore. Gli import CSV manuali non attivano avvisi.';return;}
  const row=joined.find(r=>String(r.id)===String(id)&&r.fuel===fuel&&(r.self?'1':'0')===mode);if(!row){get('alertsMessage').textContent='Prezzo non disponibile.';return;}
  candidate=row;get('alertSetup').hidden=false;get('alertTarget').textContent=row.name+' · '+fuel+' · '+(row.self?'Self':'Servito')+' · '+fmt(row.price,3)+' '+unit(fuel);
  get('alertsMessage').textContent='La soglia parte da questo prezzo. Dopo un avviso il riferimento scende al nuovo prezzo; gli aumenti non lo alzano. Salvare di nuovo reimposta il riferimento.';
 };
 get('savePriceAlert').onclick=()=>{
  if(!candidate||!verified()){get('alertsMessage').textContent='Riapri il monitoraggio da un prezzo MIMIT verificato.';return;}
  const current=joined.find(r=>String(r.id)===String(candidate.id)&&r.fuel===candidate.fuel&&r.self===candidate.self);if(!current||current.price!==candidate.price){get('alertsMessage').textContent='Il prezzo è cambiato: riapri il monitoraggio dai risultati aggiornati.';return;}
  const cents=Number(get('alertDropCents').value);if(!get('alertDropCents').value.trim()||!Number.isFinite(cents)||cents<.1||cents>100){get('alertsMessage').textContent='Scegli una soglia tra 0,1 e 100 centesimi.';return;}
  const s=read(),mode=candidate.self?'1':'0',key=AlertTools.key(candidate.id,candidate.fuel,mode),existing=s.watches.findIndex(w=>w.key===key);
  if(existing<0&&s.watches.length>=50){get('alertsMessage').textContent='Limite di 50 monitoraggi su questo dispositivo.';return;}
  const watch={key,id:String(candidate.id),name:candidate.name,fuel:candidate.fuel,mode,drop:cents/100,anchorPrice:candidate.price,lastPrice:candidate.price,lastSnapshot:publishedFeedInfo.generatedAt,available:true};
  if(existing>=0)s.watches[existing]=watch;else s.watches.push(watch);
  if(save(s)){get('alertSetup').hidden=true;candidate=null;get('alertsMessage').textContent='Monitoraggio salvato su questo browser. Controlleremo i nuovi snapshot quando apri o aggiorni il sito.';draw();}
 };
 async function deviceNotification(event){
  if(!read().device||!('Notification' in window)||Notification.permission!=='granted')return;
  const body=event.name+': '+fmt(event.before,3)+' → '+fmt(event.price,3)+' '+unit(event.fuel)+' · '+event.fuel+' '+(event.mode==='1'?'Self':'Servito');
  try{const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification('PienoSprint · ribasso rilevato',{body,icon:'icons/icon-192.png',tag:'pienosprint-price-'+event.key,data:{type:'price-alert'}});else new Notification('PienoSprint · ribasso rilevato',{body});}catch{get('alertsMessage').textContent='Avviso salvato nel sito. Notifica dispositivo non disponibile.';}
 }
 async function check(){
  const run=async()=>{const s=read(),result=AlertTools.evaluate(s.watches,joined,publishedFeedInfo);if(result.status!=='ok'){get('alertsMessage').textContent='Controllo sospeso: dati ufficiali aggiornati non disponibili.';draw();return;}
   s.watches=result.watches;s.events=[...result.events.reverse(),...s.events].slice(0,50);if(!save(s))return;draw();
   for(const event of result.events.slice(0,3))await deviceNotification(event);
   get('alertsMessage').textContent=result.events.length?result.events.length+' ribassi rilevati. Prezzi osservati nello snapshot MIMIT; verifica prima di rifornirti.':'Controllo completato: nessun nuovo ribasso oltre le soglie impostate.';
  };
  if(navigator.locks)await navigator.locks.request('pienosprint-price-alerts',run);else await run();
 }
 get('openPriceAlerts').onclick=open;get('closePriceAlerts').onclick=()=>get('priceAlertsDialog').close();
 get('markAlertsRead').onclick=()=>{const s=read();s.events.forEach(e=>e.read=true);if(save(s))draw();};
 get('checkPriceAlerts').onclick=async()=>{get('checkPriceAlerts').disabled=true;get('alertsMessage').textContent='Aggiornamento dello snapshot MIMIT…';try{await loadPublishedFeed();}finally{get('checkPriceAlerts').disabled=false;}};
 get('toggleDeviceAlerts').onclick=async()=>{
  const s=read();if(s.device){s.device=false;if(save(s)){draw();get('alertsMessage').textContent='Notifiche dispositivo disattivate. Gli avvisi nel sito restano disponibili.';}return;}
  if(!('Notification' in window)){get('alertsMessage').textContent='Questo browser non supporta le notifiche dispositivo. Gli avvisi nel sito funzionano comunque.';return;}
  try{const permission=await Notification.requestPermission();if(permission==='granted'){s.device=true;if(save(s)){draw();get('alertsMessage').textContent='Notifiche abilitate per i ribassi rilevati mentre il sito è aperto. Nessun controllo a sito chiuso.';}}else get('alertsMessage').textContent='Permesso non concesso. Gli avvisi restano consultabili nel sito.';}catch{get('alertsMessage').textContent='Notifiche non disponibili in questo browser.';}
 };
 window.addEventListener('pienosprint:feed-ready',check);window.addEventListener('storage',e=>{if(e.key===STORE)draw();});navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='open-price-alerts')open();});
 draw();if(publishedFeedInfo)check();if(location.hash==='#avvisi')open();
})();
