import {FISH,RARITIES} from './config.mjs';
export function createRecordStore(userId,storage){
 const getStorage=()=>storage??globalThis.localStorage;
 const key='champion:fishing:record:v1:'+userId;
 const valid=r=>r&&FISH[r.species]&&RARITIES[r.rarity]&&Number.isFinite(r.weight)&&r.weight>0&&Number.isFinite(r.length)&&r.length>0&&typeof r.rating==='string'&&Number.isFinite(Date.parse(r.date));
 return {read(){try{const r=JSON.parse(getStorage().getItem(key));return valid(r)?r:null;}catch{return null;}},save(r){getStorage().setItem(key,JSON.stringify(r));},reset(){getStorage().removeItem(key);}};
}

