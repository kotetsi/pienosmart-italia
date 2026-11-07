'use strict';
(function(){
 const get=id=>document.getElementById(id),KEY='pienosprint_maintenance_v1',tools=MaintenanceTools;let editing=null;
 function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return {vehicle:typeof data.vehicle==='string'?data.vehicle.slice(0,80):'',odo:Number.isInteger(data.odo)&&data.odo>=0?data.odo:null,tasks:Array.isArray(data.tasks)?data.tasks.filter(t=>{try{tools.validate(t);return typeof t.id==='string';}catch{return false;}}).slice(0,100):[]};}catch{return {vehicle:'',odo:null,tasks:[]};}}
 function message(text){get('maintenanceMessage').textContent=text;}
 function save(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{message('Memoria locale non disponibile: dati non salvati.');return false;}}
 function metrics(task,status){return [task.dueDate?'Data: '+task.dueDate+(status.days===null?'':' · '+(status.days<0?fmt(-status.days,0)+' giorni oltre scadenza':status.days===0?'oggi':fmt(status.days,0)+' giorni rimasti')):'',task.dueKm!==null?'Km: '+fmt(task.dueKm,0)+(status.km===null?' · aggiorna il contachilometri':' · '+(status.km<0?fmt(-status.km,0)+' km oltre scadenza':fmt(status.km,0)+' km rimasti')):''].filter(Boolean).join('<br>');}
 const labels={overdue:'Scaduto',due:'Scadenza raggiunta',soon:'In scadenza',unknown:'Aggiorna i km',planned:'Programmato'},rank={overdue:0,due:1,soon:2,unknown:3,planned:4};
 function draw(){
  const data=read(),active=data.tasks.filter(t=>!t.completedOn).map(t=>({task:t,status:tools.status(t,data.odo)})).sort((a,b)=>rank[a.status.state]-rank[b.status.state]||(a.task.dueDate||'9999').localeCompare(b.task.dueDate||'9999'));
  const count=active.filter(x=>x.status.attention).length;document.querySelectorAll('.maintenance-badge').forEach(b=>b.textContent=count?' ('+count+')':'');
  get('maintenanceSummary').textContent=(data.vehicle||'Il tuo veicolo')+' · '+(data.odo===null?'Contachilometri non indicato':fmt(data.odo,0)+' km')+' · '+count+' attività da controllare.';
  get('maintenanceTasks').innerHTML=active.map(({task:t,status:s})=>'<article class="maintenance-task maintenance-'+s.state+'"><span class="maintenance-state">'+labels[s.state]+'</span><h4>'+escapeHtml(t.name)+'</h4><p>'+metrics(t,s)+'</p><div class="alert-actions"><button type="button" class="btn outline" data-maintenance-action="complete" data-id="'+escapeHtml(t.id)+'">Segna completata</button><button type="button" class="linkbtn" data-maintenance-action="edit" data-id="'+escapeHtml(t.id)+'">Modifica</button><button type="button" class="linkbtn" data-maintenance-action="remove" data-id="'+escapeHtml(t.id)+'">Rimuovi</button></div></article>').join('')||'<p>Nessuna attività da fare. Aggiungi una scadenza per iniziare.</p>';
  get('maintenanceHistory').innerHTML=data.tasks.filter(t=>t.completedOn).slice().sort((a,b)=>b.completedOn.localeCompare(a.completedOn)).map(t=>'<article class="maintenance-task"><h4>'+escapeHtml(t.name)+'</h4><p>Completata il '+escapeHtml(t.completedOn)+(Number.isFinite(t.completedOdo)?' · '+fmt(t.completedOdo,0)+' km':'')+'</p><button type="button" class="linkbtn" data-maintenance-action="restore" data-id="'+escapeHtml(t.id)+'">Ripristina tra le attività da fare</button></article>').join('')||'<p>Nessuna attività completata.</p>';
  for(const container of ['maintenanceTasks','maintenanceHistory'])get(container).querySelectorAll('[data-maintenance-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.maintenanceAction,b.dataset.id)));
 }
 function reset(){editing=null;get('maintenanceFormTitle').textContent='Nuovo promemoria';get('maintenanceName').value='';get('maintenanceDueDate').value='';get('maintenanceDueKm').value='';get('maintenanceLeadDays').value='14';get('maintenanceLeadKm').value='500';get('cancelMaintenanceEdit').hidden=true;}
 function action(type,id){
  const data=read(),t=data.tasks.find(t=>t.id===id);if(!t)return;
  if(type==='edit'){editing=id;get('maintenanceName').value=t.name;get('maintenanceDueDate').value=t.dueDate||'';get('maintenanceDueKm').value=t.dueKm===null?'':t.dueKm;get('maintenanceLeadDays').value=t.leadDays;get('maintenanceLeadKm').value=t.leadKm;get('maintenanceFormTitle').textContent='Modifica promemoria';get('cancelMaintenanceEdit').hidden=false;get('maintenanceName').focus();return;}
  if(type==='complete'){t.completedOn=tools.localToday();t.completedOdo=data.odo;}
  else if(type==='restore'){delete t.completedOn;delete t.completedOdo;}
  else if(type==='remove'){data.tasks=data.tasks.filter(t=>t.id!==id);}else return;
  if(save(data)){if(editing===id)reset();draw();message(type==='complete'?'Attività registrata come completata. La prossima scadenza va impostata da te.':type==='restore'?'Attività ripristinata con la scadenza originale.':'Promemoria rimosso.');}
 }
 get('saveMaintenanceVehicle').onclick=()=>{
  const raw=get('maintenanceOdo').value.trim(),odo=raw===''?null:Number(raw);if(odo!==null&&(!Number.isInteger(odo)||odo<0||odo>5000000)){message('Inserisci un contachilometri valido, senza decimali.');return;}
  const data=read();data.vehicle=get('maintenanceVehicle').value.trim().slice(0,80);data.odo=odo;if(save(data)){draw();message('Veicolo aggiornato su questo browser.');}
 };
 get('saveMaintenanceTask').onclick=()=>{
  try{const raw=get('maintenanceDueKm').value.trim(),t={id:editing||(window.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),name:get('maintenanceName').value.trim(),dueDate:get('maintenanceDueDate').value,dueKm:raw===''?null:Number(raw),leadDays:Number(get('maintenanceLeadDays').value),leadKm:Number(get('maintenanceLeadKm').value)};
   if(!get('maintenanceLeadDays').value.trim()||!get('maintenanceLeadKm').value.trim())throw Error('Indica gli anticipi avviso, anche zero.');tools.validate(t);const data=read(),idx=data.tasks.findIndex(x=>x.id===editing);
   if(editing&&idx<0)throw Error('Il promemoria è stato rimosso in un’altra scheda. Ricarica il modulo.');
   if(idx>=0&&data.tasks[idx].completedOn)throw Error('L’attività è già stata completata in un’altra scheda. Annulla la modifica.');
   if(idx>=0)data.tasks[idx]=t;else{if(data.tasks.length>=100)throw Error('Limite di 100 attività, incluso lo storico. Esporta i dati prima di rimuovere attività.');data.tasks.push(t);}
   if(save(data)){reset();draw();message('Promemoria salvato. Controllo per data e chilometri attivo all’apertura del sito.');}
  }catch(e){message(e.message);}
 };
 get('cancelMaintenanceEdit').onclick=reset;
 get('exportMaintenance').onclick=()=>{const data=read(),cell=v=>{const text=String(v??'');return '"'+(/^[\s]*[=+\-@]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"'},rows=[['veicolo','attivita','data_scadenza','km_scadenza','anticipo_giorni','anticipo_km','completata_il','km_completamento'],...data.tasks.map(t=>[data.vehicle,t.name,t.dueDate,t.dueKm,t.leadDays,t.leadKm,t.completedOn,t.completedOdo])],blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pienosprint-manutenzione.csv';a.click();URL.revokeObjectURL(url);};
 window.addEventListener('pienosprint:fill-saved',event=>{const odo=Number(event.detail?.odo);if(!Number.isInteger(odo)||odo<=0)return;const data=read();if(data.odo===null||odo>data.odo){data.odo=odo;if(save(data)){get('maintenanceOdo').value=odo;draw();}}});
 window.addEventListener('storage',event=>{if(event.key===KEY){const data=read();get('maintenanceVehicle').value=data.vehicle;get('maintenanceOdo').value=data.odo??'';draw();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
 window.addEventListener('pienosprint:page-change',event=>{if(event.detail?.page==='garage')draw();});
 const data=read();if(data.odo===null){const fills=saved();if(Array.isArray(fills)){const odo=Math.max(0,...fills.map(f=>Number.isFinite(f.odo)?f.odo:0));if(odo>0){data.odo=odo;save(data);}}}
 get('maintenanceVehicle').value=data.vehicle;get('maintenanceOdo').value=data.odo??'';draw();
})();
