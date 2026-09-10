// Economy mock. These are simulated participants, never real player counts.
export const FOSSIL_ITEMS = {
 kabuto:{name:'Domofossile',pokemon:'Kabuto',basePrice:120,holders:480,sellers:80,buyers:70},
 omanyte:{name:'Fossilhelix',pokemon:'Omanyte',basePrice:220,holders:320,sellers:45,buyers:60},
 aerodactyl:{name:'Ambra Antica',pokemon:'Aerodactyl',basePrice:360,holders:150,sellers:25,buyers:40},
};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function targetPrice(id,{holders,sellers,buyers}) {
 const item=FOSSIL_ITEMS[id];if(!item)throw new Error('Fossile sconosciuto');
 if(![holders,sellers,buyers].every(n=>Number.isInteger(n)&&n>=0)||holders<1||sellers>holders)throw new Error('Dati di mercato non validi');
 const scarcity=Math.sqrt(400/holders),pressure=Math.sqrt((buyers+20)/(sellers+20));
 return Math.round(clamp(item.basePrice*scarcity*pressure,item.basePrice*.35,item.basePrice*3));
}
export function createMarket(){
 const rows=Object.fromEntries(Object.entries(FOSSIL_ITEMS).map(([id,item])=>{
  const state={holders:item.holders,sellers:item.sellers,buyers:item.buyers};
  const price=targetPrice(id,state);return [id,{...state,price,previous:price,history:[price]}];
 }));
 return {revision:0,tick:0,rows,sales:[]};
}
export function advanceMarket(market,scenario='balanced',rng=Math.random){
 if(!['balanced','demand','selling','scarcity'].includes(scenario))throw new Error('Scenario sconosciuto');
 for(const [id,row] of Object.entries(market.rows)){
  const noise=()=>Math.floor(rng()*7)-3;
  row.holders=clamp(row.holders+(scenario==='scarcity'?-Math.max(2,Math.round(row.holders*.12)):noise()),20,5000);
  row.sellers=clamp(row.sellers+(scenario==='selling'?Math.max(8,Math.round(row.sellers*.3)):noise()),0,row.holders);
  row.buyers=clamp(row.buyers+(scenario==='demand'?Math.max(8,Math.round(row.buyers*.3)):noise()),0,5000);
  const target=targetPrice(id,row),step=Math.max(1,Math.round(row.price*.08));
  row.previous=row.price;row.price=Math.round(clamp(target,row.price-step,row.price+step));
  row.history.push(row.price);row.history=row.history.slice(-20);
 }
 market.tick++;market.revision++;return market;
}
export function saleQuote(profile,market){
 const fossil=profile.inventory.fossil;if(!fossil)throw new Error('Non possiedi un fossile');
 if(profile.pendingFossil)throw new Error('Prima scegli quale fossile conservare');
 const row=market.rows[fossil.species];
 return {fossilId:fossil.id,species:fossil.species,price:row.price,revision:market.revision};
}
export function sellFossil(profile,market,quote){
 const current=saleQuote(profile,market);
 if(!quote||Object.keys(current).some(k=>current[k]!==quote[k]))throw new Error('Quotazione cambiata: controlla il prezzo aggiornato');
 profile.balance+=current.price;profile.inventory.fossil=null;
 market.rows[current.species].sellers=Math.min(market.rows[current.species].holders,market.rows[current.species].sellers+1);
 market.sales.push({...current,tick:market.tick});market.revision++;
 return current;
}
