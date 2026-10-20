// NTAG213/215 identifiers are public, copyable labels. Never payment proofs.
export function normalizePokedexID(value){const id=String(value??'').trim().toUpperCase();if(!/^POKEDEX-[0-9]{4,10}$/.test(id))throw Error('NFC_ID_INVALID');return id;}
export function identifierFromNDEF(message){
 const records=[...(message?.records||[])].filter(r=>r.recordType==='text');
 if(!records.length)throw Error('NFC_TEXT_REQUIRED');
 const ids=records.map(record=>{if(!record.data||record.data.byteLength>128)throw Error('NFC_ID_INVALID');let text;try{text=new TextDecoder(record.encoding||'utf-8',{fatal:true}).decode(record.data);}catch{throw Error('NFC_ID_INVALID');}return normalizePokedexID(text);});
 if(new Set(ids).size!==1)throw Error('NFC_MULTIPLE_IDS');return ids[0];
}
export const supportsIdentifierNFC=()=>globalThis.isSecureContext===true&&typeof globalThis.NDEFReader==='function';
export function readPokedexIdentifier({signal,timeout=40000}={}){
 if(!supportsIdentifierNFC())return Promise.reject(Error('NFC_UNAVAILABLE'));
 const reader=new globalThis.NDEFReader(),controller=new AbortController();
 return new Promise((resolve,reject)=>{
  let done=false;const finish=(error,id)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);reader.removeEventListener('reading',reading);reader.removeEventListener('readingerror',failed);controller.abort();error?reject(error):resolve(id);};
  const abort=()=>finish(new DOMException('Lettura interrotta','AbortError'));
  const reading=event=>{try{finish(null,identifierFromNDEF(event.message));}catch(error){finish(error);}};
  const failed=()=>finish(Error('NFC_READ_FAILED'));
  const timer=setTimeout(()=>finish(Error('NFC_TIMEOUT')),timeout);
  signal?.addEventListener('abort',abort,{once:true});reader.addEventListener('reading',reading);reader.addEventListener('readingerror',failed);
  if(signal?.aborted){abort();return;}
  try{reader.scan({signal:controller.signal}).catch(error=>finish(error));}catch(error){finish(error);}
 });
}
