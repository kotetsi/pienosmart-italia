(function(root){
 'use strict';
 const key=(id,fuel,mode)=>JSON.stringify([String(id),fuel,String(mode)]);
 function evaluate(watches,rows,metadata,now=Date.now()){
  const stamp=Date.parse(metadata?.generatedAt),age=now-stamp;
  if(metadata?.sourceType!=='official-api'||metadata?.verified!==true||!Number.isFinite(stamp)||age< -300000||age>172800000)return {watches,events:[],status:'unverified'};
  const lookup=new Map(rows.map(row=>[key(row.id,row.fuel,row.self?'1':'0'),row]));const events=[];
  const next=watches.map(w=>{
   if(!Number.isFinite(w.anchorPrice)||!Number.isFinite(w.drop)||w.drop<.001||w.drop>1||w.anchorPrice<.2||w.anchorPrice>5)return w;
   if(Date.parse(w.lastSnapshot)>=stamp)return w;
   const row=lookup.get(w.key);if(!row)return {...w,lastSnapshot:metadata.generatedAt,available:false};
   if(!Number.isFinite(row.price)||row.price<.2||row.price>5)return w;
   const change=Math.round(w.anchorPrice*1000)-Math.round(row.price*1000),trigger=change>=Math.round(w.drop*1000);
   if(trigger)events.push({key:w.key,snapshot:metadata.generatedAt,name:w.name,fuel:w.fuel,mode:w.mode,before:w.anchorPrice,price:row.price,read:false});
   return {...w,lastSnapshot:metadata.generatedAt,lastPrice:row.price,available:true,anchorPrice:trigger?row.price:w.anchorPrice};
  });
  return {watches:next,events,status:'ok'};
 }
 const api={key,evaluate};if(typeof module!=='undefined')module.exports=api;else root.AlertTools=api;
})(typeof window!=='undefined'?window:globalThis);
