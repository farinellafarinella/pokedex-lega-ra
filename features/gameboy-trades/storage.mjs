import {layouts,replacePartyMember} from './save.mjs';
import {proofHash} from '../gameboy/badge-save.mjs';
export const reservationKey=game=>'champion:rom-trade:'+game;
export const savePath=game=>'/data/saves/'+layouts[game].file+'.sav';
export async function openSaveDB(name='/data'){
 if(typeof indexedDB.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===name))throw Error('SAVE_NOT_FOUND');
 return new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onupgradeneeded=()=>r.transaction.abort();r.onerror=()=>reject(Error('SAVE_NOT_FOUND'));r.onblocked=()=>reject(Error('SAVE_STORAGE'));r.onsuccess=()=>{if(!r.result.objectStoreNames.contains('FILE_DATA')){r.result.close();reject(Error('SAVE_NOT_FOUND'));}else resolve(r.result);};});
}
export async function record(db,key){return new Promise((resolve,reject)=>{const r=db.transaction('FILE_DATA','readonly').objectStore('FILE_DATA').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('SAVE_STORAGE'));});}
export async function readSave(game){const db=await openSaveDB();try{const r=await record(db,savePath(game));if(!r?.contents)throw Error('SAVE_NOT_FOUND');return new Uint8Array(r.contents);}finally{db.close();}}
export async function withSaveLock(fn){if(!navigator.locks)throw Error('LOCK_UNAVAILABLE');return navigator.locks.request('champion:rom-save',{ifAvailable:true},lock=>{if(!lock)throw Error('EMULATOR_OPEN');return fn();});}
async function purgeAutosave(game){let db;try{db=await openSaveDB('/autosave');}catch(e){if(e.message==='SAVE_NOT_FOUND')return;throw e;}try{await new Promise((resolve,reject)=>{const tx=db.transaction('FILE_DATA','readwrite');tx.objectStore('FILE_DATA').delete('/autosave/'+layouts[game].file+'_auto.ss');tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('SAVE_STORAGE'));});}finally{db.close();}}
export async function applyTrade(job){return withSaveLock(async()=>{
 const db=await openSaveDB(),path=savePath(job.game),receiptPath='/data/trade-receipts/'+job.id+'.json';try{
 const receipt=await record(db,receiptPath);if(receipt?.contents){const saved=JSON.parse(new TextDecoder().decode(receipt.contents));const current=await record(db,path);if(await proofHash(current.contents)!==saved.afterHash)throw Error('SAVE_CHANGED');return saved;}
 const source=await record(db,path);if(!source?.contents)throw Error('SAVE_NOT_FOUND');const before=new Uint8Array(source.contents);if(await proofHash(before)!==job.hash)throw Error('SAVE_CHANGED');
 const after=replacePartyMember(job.game,before,job.slot,job.outgoing,job.incoming),afterHash=await proofHash(after),saved={id:job.id,game:job.game,beforeHash:job.hash,afterHash};
 // Delete the resumable state before replacing SRAM. A crash is recoverable from the reservation.
 await purgeAutosave(job.game);
 await new Promise((resolve,reject)=>{const tx=db.transaction('FILE_DATA','readwrite'),store=tx.objectStore('FILE_DATA'),r=store.get(path);r.onsuccess=()=>{if(!r.result||JSON.stringify(Array.from(r.result.contents))!==JSON.stringify(Array.from(before))){tx.abort();return;}
 for(const dir of ['/data/trade-backups','/data/trade-backups/'+job.id,'/data/trade-backups/'+job.id+'/states','/data/trade-receipts'])store.put({timestamp:new Date(),mode:16877},dir);
 const entry=(contents)=>({contents,timestamp:new Date(),mode:33206});store.put(entry(before),'/data/trade-backups/'+job.id+'/'+layouts[job.game].file+'.sav');store.put({...r.result,...entry(after)},path);store.put(entry(new TextEncoder().encode(JSON.stringify(saved))),receiptPath);
 // Preserve old manual states as backups; remove their old load locations.
 const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;if(String(c.key).startsWith('/data/states/'+layouts[job.game].file+'.ss')){store.put(c.value,'/data/trade-backups/'+job.id+'/states/'+String(c.key).split('/').at(-1));c.delete();}c.continue();};};tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('SAVE_STORAGE'));});
 if(await proofHash((await record(db,path)).contents)!==afterHash)throw Error('SAVE_STORAGE');return saved;
 }finally{db.close();}
 });}
export async function downloadSave(game){const bytes=await readSave(game),url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=layouts[game].file+'.sav';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadTradeBackup(id,game){const db=await openSaveDB();try{const r=await record(db,'/data/trade-backups/'+id+'/'+layouts[game].file+'.sav');if(!r?.contents)throw Error('SAVE_NOT_FOUND');const url=URL.createObjectURL(new Blob([r.contents])),a=document.createElement('a');a.href=url;a.download=layouts[game].file+'-prima-scambio.sav';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}finally{db.close();}}
