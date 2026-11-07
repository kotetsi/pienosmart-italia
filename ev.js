'use strict';
(function(){
 const get=id=>document.getElementById(id);let source=null;
 const ids=['evAnnualKm','evThermalConsumption','evFuelPrice','evConsumption','evLoss','evHomeShare','evHomePrice','evPublicPrice','evExtraPurchase'];
 function value(id,optional=false){const raw=get(id).value.trim();if(!raw){if(optional)return null;throw Error('Completa tutti i campi richiesti, comprese le tariffe usate.');}const n=Number(raw);if(!Number.isFinite(n))throw Error('Inserisci numeri validi.');return n;}
 function invalidate(){get('evResults').hidden=true;get('evMessage').textContent='Valori modificati: premi Confronta per aggiornare la stima.';}
 function mix(){const raw=get('evHomeShare').value,share=Number(raw);get('evHomePrice').disabled=raw!==''&&share===0;get('evPublicPrice').disabled=raw!==''&&share===100;get('evChargingMix').textContent=raw!==''&&Number.isFinite(share)&&share>=0&&share<=100?'Quota pubblica: '+fmt(100-share,0)+'%. Tariffe finali per kWh; esclusi quote fisse, abbonamenti e costi a tempo.':'Inserisci una quota domestica tra 0% e 100%.';}
 window.useFuelForEV=function(id,fuel,mode){
  const row=joined.find(r=>String(r.id)===String(id)&&r.fuel===fuel&&(r.self?'1':'0')===mode);if(!row||/metano|cng|gnl|lng/i.test(fuel))return;
  const kind=/gasolio|diesel/i.test(fuel)?'gasolio':/gpl/i.test(fuel)?'gpl':'benzina';get('evFuel').value=kind;get('evFuelPrice').value=row.price;
  source={price:row.price,name:row.name,fuel:row.fuel,mode,snapshot:publishedFeedInfo?.generatedAt||'',verified:publishedFeedInfo?.verified===true};
  get('evFuelSource').textContent=(source.verified?'Prezzo dallo snapshot ufficiale MIMIT: ':'Prezzo dai dati caricati (origine non verificata): ')+source.name+' Β· '+source.fuel+' Β· '+(mode==='1'?'Self':'Servito')+' Β· '+fmt(row.price,3)+' β‚¬/L'+(source.snapshot?' Β· raccolto '+source.snapshot:'')+'. Il valore non si aggiorna automaticamente nel confronto.';
  invalidate();switchPage('savings');get('evFuelPrice').focus();
 };
 get('calculateEV').onclick=()=>{
  try{
   const share=value('evHomeShare'),values={annualKm:value('evAnnualKm'),thermalConsumption:value('evThermalConsumption'),fuelPrice:value('evFuelPrice'),evConsumption:value('evConsumption'),lossPercent:value('evLoss'),homeShare:share,homePrice:value('evHomePrice',share===0),publicPrice:value('evPublicPrice',share===100),extraPurchase:value('evExtraPurchase',true)??0},r=EVTools.calculate(values),fuel=get('evFuel').selectedOptions[0].textContent;
   const width=Math.max(r.thermal100,r.ev100,.01),difference=r.saving>0?'Spesa energetica EV inferiore di '+eur(r.saving)+' allβ€™anno.':r.saving<0?'Spesa energetica termica inferiore di '+eur(-r.saving)+' allβ€™anno.':'Spesa energetica annuale equivalente con questi valori.';
   get('evResults').innerHTML='<h3>'+difference+'</h3><div class="ev-comparison"><div><h4>'+escapeHtml(fuel)+'</h4><b>'+eur(r.thermal100)+' / 100 km</b><div class="ev-bar thermal" style="width:'+Math.max(0,r.thermal100/width*100)+'%"></div><p>'+eur(r.annualThermal)+' / anno Β· '+fmt(r.annualLiters,0)+' L</p></div><div><h4>Elettrico</h4><b>'+eur(r.ev100)+' / 100 km</b><div class="ev-bar electric" style="width:'+Math.max(0,r.ev100/width*100)+'%"></div><p>'+eur(r.annualEV)+' / anno Β· '+fmt(r.annualKwh,0)+' kWh dalla rete</p></div></div><p>Energia dalla rete: '+fmt(r.gridEnergy,2)+' kWh/100 km. Tariffa media ponderata: '+fmt(r.tariff,3)+' β‚¬/kWh.</p>'+(values.extraPurchase>0?'<p><b>Recupero teorico di '+eur(values.extraPurchase)+' con la sola energia:</b> '+(r.paybackYears!==null?fmt(r.paybackYears,1)+' anni Β· circa '+fmt(r.paybackKm,0)+' km.':'Non raggiungibile con la percorrenza e i costi impostati.')+'</p>':'<p>Inserisci un sovrapprezzo di acquisto se vuoi stimarne il recupero con il solo risparmio energetico.</p>')+'<small>Scenario calcolato dai valori inseriti. '+(source?.verified?'Carburante da un impianto MIMIT selezionato; elettricitΓ  inserita da te.':'Prezzi inseriti da te o da un import non verificato.')+'</small>';
   get('evResults').hidden=false;get('evMessage').textContent='Confronto aggiornato. Nessuna tariffa elettrica Γ¨ stata scaricata o stimata automaticamente.';
  }catch(e){get('evResults').hidden=true;get('evMessage').textContent=e.message;}
 };
 ids.forEach(id=>get(id).addEventListener('input',()=>{if(id==='evFuelPrice'){source=null;get('evFuelSource').textContent='Prezzo carburante inserito da te.';}if(id==='evHomeShare')mix();invalidate();}));
 get('evFuel').addEventListener('change',()=>{source=null;get('evFuelPrice').value='';get('evFuelSource').textContent='Carburante cambiato: inserisci un nuovo prezzo o seleziona un impianto.';invalidate();});mix();
})();
