export function readerCapabilities(){return {webNDEF:globalThis.isSecureContext&&typeof globalThis.NDEFReader==='function',native:typeof globalThis.RouteNFCReaderBridge?.read==='function'};}
export async function readNFC(challenge,{signal}={}){
 const capabilities=readerCapabilities();
 if(capabilities.native){const evidence=await globalThis.RouteNFCReaderBridge.read({challenge,signal});if(!evidence||typeof evidence!=='object')throw Error('PROOF_INVALID');return evidence;}
 const purpose=challenge.binding.purpose;
 if(purpose!=='identify')throw Error('SECURE_READER_REQUIRED');
 if(!capabilities.webNDEF)throw Error('NFC_UNAVAILABLE');
 const reader=new globalThis.NDEFReader();
 return new Promise((resolve,reject)=>{
  let done=false;const finish=(error,evidence)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(evidence);};
  const abort=()=>finish(new DOMException('Cancelled','AbortError'));
  const onRead=event=>{try{
   const urls=[...event.message.records].filter(r=>r.recordType==='url').map(r=>new TextDecoder().decode(r.data));
   if(urls.length!==1||urls[0].length>4096||new URL(urls[0]).protocol!=='https:')throw Error('PROOF_INVALID');
   finish(null,{type:'sdm',ndefUrl:urls[0]});
  }catch(error){finish(error);}};
  const onError=()=>finish(Error('NFC_UNAVAILABLE'));
  const cleanup=()=>{reader.removeEventListener('reading',onRead);reader.removeEventListener('readingerror',onError);signal?.removeEventListener('abort',abort);};
  reader.addEventListener('reading',onRead);reader.addEventListener('readingerror',onError);signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}reader.scan({signal}).catch(error=>finish(error));
 });
}
