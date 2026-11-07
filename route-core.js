(function(root){
 'use strict';
 function nearestKm(lat,lng,line){
  const x=lng*111.195*Math.cos(lat*Math.PI/180),y=lat*111.195,k=111.195*Math.cos(lat*Math.PI/180);let best=Infinity;
  for(let i=1;i<line.length;i++){
   const a=line[i-1],b=line[i],ax=a[0]*k,ay=a[1]*111.195,bx=b[0]*k,by=b[1]*111.195;
   const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/den)):0;
   best=Math.min(best,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }return best;
 }
 function candidates(rows,line,fuel,service,corridor){
  if(!Array.isArray(line)||line.length<2)throw Error('Percorso non valido');
  const names={benzina:['benzina'],gasolio:['gasolio'],gpl:['gpl']};if(!names[fuel])throw Error('Carburante non supportato');
  const minLat=Math.min(...line.map(p=>p[1]))-corridor/110,maxLat=Math.max(...line.map(p=>p[1]))+corridor/110,minLng=Math.min(...line.map(p=>p[0]))-corridor/70,maxLng=Math.max(...line.map(p=>p[0]))+corridor/70;
  const unique=new Map();
  for(const row of rows){
   if(!names[fuel].includes(row.fuel.toLowerCase())||service==='self'&&!row.self||service==='served'&&row.self||!row.lat||!row.lng||row.lat<minLat||row.lat>maxLat||row.lng<minLng||row.lng>maxLng)continue;
   const offset=nearestKm(row.lat,row.lng,line);if(offset>corridor)continue;
   const old=unique.get(row.id);if(!old||row.price<old.price)unique.set(row.id,{...row,offset});
  }
  return [...unique.values()].sort((a,b)=>a.price-b.price||a.offset-b.offset);
 }
 function savings(base,via,liters,consumption,reference,price,timeValue){
  if(![base.distance,base.duration,via.distance,via.duration,liters,consumption,reference,price,timeValue].every(Number.isFinite)||liters<=0||consumption<=0||price<=0||reference<=0||timeValue<0)throw Error('Valori di confronto non validi');
  const km=Math.max(0,via.distance-base.distance)/1000,minutes=Math.max(0,via.duration-base.duration)/60,pump=(reference-price)*liters,detour=km*consumption/100*price,time=minutes/60*timeValue;
  return {km,minutes,pump,detour,time,net:pump-detour-time};
 }
 const api={nearestKm,candidates,savings};if(typeof module!=='undefined')module.exports=api;else root.RouteTools=api;
})(typeof window!=='undefined'?window:globalThis);
