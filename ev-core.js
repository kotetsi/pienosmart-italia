(function(root){
 'use strict';
 function calculate(v){
  if(![v.annualKm,v.thermalConsumption,v.fuelPrice,v.evConsumption,v.lossPercent,v.homeShare,v.extraPurchase].every(Number.isFinite))throw Error('Completa i campi richiesti con numeri validi.');
  if(v.annualKm<0||v.annualKm>300000||v.thermalConsumption<=0||v.thermalConsumption>50||v.fuelPrice<=0||v.fuelPrice>10||v.evConsumption<=0||v.evConsumption>100||v.lossPercent<0||v.lossPercent>=50||v.homeShare<0||v.homeShare>100||v.extraPurchase<0||v.extraPurchase>300000)throw Error('Controlla consumi, prezzi, chilometri e percentuali.');
  const share=v.homeShare/100;
  if(share>0&&(!Number.isFinite(v.homePrice)||v.homePrice<0||v.homePrice>5))throw Error('Inserisci la tariffa domestica in €/kWh.');
  if(share<1&&(!Number.isFinite(v.publicPrice)||v.publicPrice<0||v.publicPrice>5))throw Error('Inserisci la tariffa pubblica in €/kWh.');
  const tariff=(share>0?share*v.homePrice:0)+(share<1?(1-share)*v.publicPrice:0),gridEnergy=v.evConsumption/(1-v.lossPercent/100),thermal100=v.thermalConsumption*v.fuelPrice,ev100=gridEnergy*tariff,annualThermal=thermal100*v.annualKm/100,annualEV=ev100*v.annualKm/100,saving=annualThermal-annualEV;
  return {tariff,gridEnergy,thermal100,ev100,annualThermal,annualEV,saving,annualLiters:v.annualKm*v.thermalConsumption/100,annualKwh:v.annualKm*gridEnergy/100,paybackYears:v.extraPurchase>0&&saving>0?v.extraPurchase/saving:null,paybackKm:v.extraPurchase>0&&thermal100>ev100?v.extraPurchase/(thermal100-ev100)*100:null};
 }
 const api={calculate};if(typeof module!=='undefined')module.exports=api;else root.EVTools=api;
})(typeof window!=='undefined'?window:globalThis);
