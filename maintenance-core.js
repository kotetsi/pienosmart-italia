(function(root){
 'use strict';
 function dateNumber(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const [y,m,d]=value.split('-').map(Number),stamp=Date.UTC(y,m-1,d),date=new Date(stamp);
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?stamp/86400000:null;
 }
 function localToday(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
 function status(task,odo,today=localToday()){
  const due=dateNumber(task.dueDate),current=dateNumber(today),days=due===null||current===null?null:due-current;
  const km=Number.isFinite(task.dueKm)&&Number.isFinite(odo)?task.dueKm-odo:null;
  const overdue=days!==null&&days<0||km!==null&&km<0,dueNow=days===0||km===0;
  const soon=days!==null&&days<=task.leadDays||km!==null&&km<=task.leadKm;
  const state=overdue?'overdue':dueNow?'due':soon?'soon':Number.isFinite(task.dueKm)&&km===null?'unknown':'planned';
  return {state,days,km,attention:['overdue','due','soon'].includes(state)};
 }
 function validate(task){
  if(typeof task.name!=='string'||!task.name.trim()||task.name.trim().length>100)throw Error('Inserisci un nome attività (massimo 100 caratteri).');
  if(task.dueDate&&dateNumber(task.dueDate)===null)throw Error('Data di scadenza non valida.');
  if(task.dueKm!==null&&(!Number.isInteger(task.dueKm)||task.dueKm<0||task.dueKm>5000000))throw Error('Chilometraggio di scadenza non valido.');
  if(!task.dueDate&&task.dueKm===null)throw Error('Indica almeno una data oppure un chilometraggio di scadenza.');
  if(!Number.isInteger(task.leadDays)||task.leadDays<0||task.leadDays>365||!Number.isInteger(task.leadKm)||task.leadKm<0||task.leadKm>100000)throw Error('Anticipo avviso non valido.');
  return task;
 }
 const api={dateNumber,localToday,status,validate};if(typeof module!=='undefined')module.exports=api;else root.MaintenanceTools=api;
})(typeof window!=='undefined'?window:globalThis);
