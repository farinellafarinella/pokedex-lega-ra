import {fresh,refreshExcavations,FOSSILS,itemName,price} from './model.mjs?v=player-controls-1';
export const betaKey=account=>'champion:fossils-beta:v1:'+account;
export function readBeta(account){
 const raw=localStorage.getItem(betaKey(account));
 if(!raw)return fresh();
 const saved=JSON.parse(raw);
 if(saved?.version!==1||!saved.inventory||!Number.isFinite(saved.balance))throw Error('Salvataggio beta non leggibile.');
 return refreshExcavations(saved);
}
export async function updateBeta(account,change){
 const commit=()=>{const state=readBeta(account);change(state);localStorage.setItem(betaKey(account),JSON.stringify(state));window.dispatchEvent(new CustomEvent('fossils-beta-change',{detail:{account}}));return state;};
 return navigator.locks?navigator.locks.request(betaKey(account),commit):commit();
}
let catalogPromise;
export function betaCatalog(){return catalogPromise??=fetch(new URL('./catalog.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Catalogo dei reperti non disponibile.');return r.json();}).catch(e=>{catalogPromise=null;throw e;});}
export function betaInventoryEntries(state,catalog){
 return catalog.filter(i=>Number.isInteger(state.inventory[i.id])&&state.inventory[i.id]>0).map(i=>({
  id:'fossils-beta:'+i.id,betaId:i.id,name:itemName(i),quantity:state.inventory[i.id],category:FOSSILS[i.id]?'fossils':'items',
  description:FOSSILS[i.id]?`Reperto beta. Risveglia ${FOSSILS[i.id].pokemon} nel Laboratorio Fossili.`:'Reperto raccolto negli scavi del Laboratorio Fossili.',
  image:FOSSILS[i.id]?.image,sprite:i,price:price(i),beta:true
 }));
}
