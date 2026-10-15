import {emeraldProofFromSave} from './emerald-save.mjs';
// International Red SRAM, verified against the local Italian ROM's load/checksum routines.
export const saveLayout={size:0x8000,start:0x2598,end:0x3523,badges:0x2602,party:0x2f2c};
export function validateBadgeProof(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value);
 if(bytes.length!==saveLayout.end-saveLayout.start+1)throw Error('SAVE_SIZE');
 let sum=0;for(let i=0;i<bytes.length-1;i++)sum=(sum+bytes[i])&255;
 if(bytes.at(-1)!==((~sum)&255))throw Error('SAVE_CHECKSUM');
 if(bytes[0]<0x80||bytes[0]>0xb9||!bytes.slice(0,11).includes(0x50))throw Error('SAVE_INVALID');
 const party=saveLayout.party-saveLayout.start,count=bytes[party];
 if(count<1||count>6||bytes[party+1+count]!==255)throw Error('SAVE_INVALID');
 for(let i=0;i<count;i++)if(!bytes[party+1+i]||bytes[party+1+i]>190||bytes[party+1+i]!==bytes[party+8+i*44]||bytes[party+8+i*44+33]<1||bytes[party+8+i*44+33]>100)throw Error('SAVE_INVALID');
 return {bytes,badges:bytes[saveLayout.badges-saveLayout.start]};
}
export function proofFromSave(value){const bytes=value instanceof Uint8Array?value:new Uint8Array(value);if(bytes.length!==saveLayout.size)throw Error('SAVE_SIZE');return validateBadgeProof(bytes.slice(saveLayout.start,saveLayout.end+1));}
export function encodeProof(bytes){let str='';for(const byte of bytes)str+=String.fromCharCode(byte);return btoa(str);}
export function decodeProof(text){if(typeof text!=='string'||text.length!==5308||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('SAVE_SIZE');return validateBadgeProof(Uint8Array.from(atob(text),c=>c.charCodeAt(0)));}
export async function proofHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function readLocalRedSave({database=indexedDB,game="red"}={}){
 if(typeof database.databases==='function'&&!(await database.databases()).some(d=>d.name==='/data'))throw Error('SAVE_NOT_FOUND');
 return new Promise((resolve,reject)=>{
  const request=database.open('/data');let missing=false;
  request.onupgradeneeded=()=>{missing=true;request.transaction.abort();};
  request.onerror=()=>reject(Error(missing?'SAVE_NOT_FOUND':'SAVE_STORAGE'));
  request.onblocked=()=>reject(Error('SAVE_STORAGE'));
  request.onsuccess=()=>{
   const db=request.result;if(!db.objectStoreNames.contains('FILE_DATA')){db.close();reject(Error('SAVE_NOT_FOUND'));return;}
   if(!['red','gold','emerald'].includes(game)){db.close();reject(Error('SAVE_INVALID'));return;}
   const tx=db.transaction('FILE_DATA','readonly'),read=tx.objectStore('FILE_DATA').get(game==='emerald'?'/data/saves/Pokemon - Versione Smeraldo (Italy).sav':game==='gold'?'/data/saves/Pokemon - Versione Oro (Italy) (SGB Enhanced).sav':'/data/saves/Pokemon - Versione Rossa (I).sav');
   read.onsuccess=()=>{db.close();if(!read.result?.contents){reject(Error('SAVE_NOT_FOUND'));return;}try{resolve(game==='emerald'?emeraldProofFromSave(read.result.contents):game==='gold'?goldProofFromSave(read.result.contents):proofFromSave(read.result.contents));}catch(error){reject(error);}};
   read.onerror=()=>{db.close();reject(Error('SAVE_STORAGE'));};
  };
 });
}

// International Gold/Silver offsets: PKHeX SAV2Offsets; additive 16-bit checksum.
export const goldSaveLayout={size:0x8000,start:0x2009,end:0x2d6a,badges:0x23e4,party:0x288a};
export function validateGoldProof(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value),l=goldSaveLayout;
 if(bytes.length!==l.end-l.start+1)throw Error('SAVE_SIZE');
 let sum=0;for(let i=0;i<bytes.length-2;i++)sum=(sum+bytes[i])&65535;
 if(sum!==(bytes.at(-2)|(bytes.at(-1)<<8)))throw Error('SAVE_CHECKSUM');
 if(bytes[2]<0x80||bytes[2]>0xb9||!bytes.slice(2,13).includes(0x50))throw Error('SAVE_INVALID');
 const p=l.party-l.start,count=bytes[p];if(count<1||count>6||bytes[p+1+count]!==255)throw Error('SAVE_INVALID');
 for(let i=0;i<count;i++){const species=bytes[p+8+i*48],entry=bytes[p+1+i],level=bytes[p+8+i*48+31];if(species<1||species>251||(entry!==253&&entry!==species)||level<1||level>100)throw Error('SAVE_INVALID');}
 const badge=l.badges-l.start;return {bytes,badges:bytes[badge]|(bytes[badge+1]<<8)};
}
export function goldProofFromSave(value){const bytes=value instanceof Uint8Array?value:new Uint8Array(value);if(bytes.length!==goldSaveLayout.size&&bytes.length!==goldSaveLayout.size+48)throw Error('SAVE_SIZE');return validateGoldProof(bytes.slice(goldSaveLayout.start,goldSaveLayout.end+1));}
export function decodeGoldProof(text){if(typeof text!=='string'||text.length!==4568||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('SAVE_SIZE');return validateGoldProof(Uint8Array.from(atob(text),c=>c.charCodeAt(0)));}
