// Reader contract for a future native adapter: available(), diagnostics(), read({signal,onReady}).
// Native adapters must supply an actual NDEF message, never a payment authorization.
export function pokedexURL(base,identifier){
 if(!/^POKEDEX-[0-9]{4,10}$/.test(identifier))throw Error('NFC_ID_INVALID');
 const url=new URL(base);url.search='';url.hash='nfc/'+identifier;return url.href;
}
export function identifierFromURL(value,base){
 let url,site;try{url=new URL(value);site=new URL(base);}catch{throw Error('NFC_URL_INVALID');}
 if(url.protocol!=='https:'||url.origin!==site.origin||url.pathname!==site.pathname||url.search||url.username||url.password)throw Error('NFC_URL_INVALID');
 const match=/^#nfc\/(POKEDEX-[0-9]{4,10})$/.exec(url.hash);if(!match)throw Error('NFC_URL_INVALID');return match[1];
}
export function identifierFromMessage(message,base){
 const records=[...(message?.records||[])].filter(r=>r.recordType==='url');if(!records.length)throw Error('NFC_URL_REQUIRED');
 const ids=records.map(r=>{if(!r.data||r.data.byteLength>2048)throw Error('NFC_URL_INVALID');let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(r.data);}catch{throw Error('NFC_URL_INVALID');}return identifierFromURL(value,base);});
 if(new Set(ids).size!==1)throw Error('NFC_MULTIPLE_IDS');return ids[0];
}
export function createWebReader({base=globalThis.location?.href}={}){
 const available=()=>globalThis.isSecureContext===true&&typeof globalThis.NDEFReader==='function'&&globalThis.top===globalThis.self;
 return {available,diagnostics:async()=>{let permission='non disponibile';try{permission=(await navigator.permissions.query({name:'nfc'})).state;}catch{}return {secure:globalThis.isSecureContext===true,api:typeof globalThis.NDEFReader==='function',topLevel:globalThis.top===globalThis.self,permission,hardware:'Da verificare con scansione su smartphone reale'};},
 read({signal,onReady=()=>{},timeout=40000}={}){
 if(!available())return Promise.reject(Error('NFC_UNAVAILABLE'));
 const reader=new globalThis.NDEFReader(),controller=new AbortController();
 return new Promise((resolve,reject)=>{let done=false;
 const finish=(error,id)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);reader.removeEventListener('reading',reading);reader.removeEventListener('readingerror',failed);controller.abort();error?reject(error):resolve(id);};
 const abort=()=>finish(new DOMException('Lettura interrotta','AbortError'));
 const reading=e=>{try{finish(null,identifierFromMessage(e.message,base));}catch(error){finish(error);}};
 const failed=()=>finish(Error('NFC_READ_FAILED'));
 const timer=setTimeout(()=>finish(Error('NFC_TIMEOUT')),timeout);
 signal?.addEventListener('abort',abort,{once:true});reader.addEventListener('reading',reading);reader.addEventListener('readingerror',failed);
 if(signal?.aborted){abort();return;}
 try{reader.scan({signal:controller.signal}).then(()=>{if(!done)onReady();}).catch(error=>finish(error));}catch(error){finish(error);}
 });
 }};
}
