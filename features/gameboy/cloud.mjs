// Account-scoped SRAM sync. Revisions prevent an older device overwriting newer progress.
const files={red:'Pokemon - Versione Rossa (I)',gold:'Pokemon - Versione Oro (Italy) (SGB Enhanced)',emerald:'Pokemon - Versione Smeraldo (Italy)'};
function database(name){return new Promise((resolve,reject)=>{const q=indexedDB.open(name,21);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('FILE_DATA'))q.result.createObjectStore('FILE_DATA').createIndex('timestamp','timestamp',{unique:false});};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function access(name,fn,write=false){const db=await database(name);try{return await new Promise((resolve,reject)=>{const tx=db.transaction('FILE_DATA',write?'readwrite':'readonly');let value;const req=fn(tx.objectStore('FILE_DATA'));if(req)req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('SAVE_STORAGE'));});}finally{db.close();}}
const encode=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
async function choose(){return new Promise(resolve=>{const root=document.getElementById('root');root.textContent='Sono presenti progressi diversi su questo dispositivo e nel tuo account. Scegli da dove riprendere. Una copia locale viene conservata.';for(const [text,value] of [['Riprendi dal salvataggio online','cloud'],['Usa il salvataggio di questo dispositivo','local']]){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{root.textContent='Preparazione del Game Boy…';resolve(value);};root.append(b);}});}
export async function startCloudSave(game){
 const config=window.CHAMPION_SUPABASE_CONFIG;if(!config||!window.supabase)return;
 const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)return;
 const status=document.createElement('small');status.setAttribute('role','status');status.style.cssText='display:block;padding:6px;text-align:center';document.body.prepend(status);
 const rpc=async(contents=null,revision=null)=>{const {data,error}=await client.rpc('gameboy_cloud_save',{p_game:game,p_contents:contents,p_revision:revision});if(error)throw error;return data;};
 const path='/data/saves/'+files[game]+'.sav',key='champion:cloud:'+data.session.user.id+':'+game;
 let remote;try{remote=await rpc();}catch(error){throw Error('Sincronizzazione non disponibile. Controlla la connessione o installa l’aggiornamento dei salvataggi online prima di avviare il gioco.');}
 let local=await access('/data',s=>s.get(path)),bytes=local?.contents?encode(local.contents):null,revision=remote?.revision||0;
 let base=localStorage.getItem(key),useCloud=!!remote&&remote.contents!==bytes;
 if(useCloud&&bytes&&bytes!==base)useCloud=await choose()==='cloud';
 if(useCloud){
  await access('/data',s=>{if(local?.contents)s.put(local,'/data/cloud-backups/'+game+'-'+Date.now()+'.sav');for(const dir of ['/data/saves','/data/cloud-backups'])s.put({mode:16877,timestamp:new Date()},dir);s.put({mode:33206,timestamp:new Date(),contents:Uint8Array.from(atob(remote.contents),c=>c.charCodeAt(0))},path);const q=s.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;if(String(c.key).startsWith('/data/states/'+files[game]+'.ss')){s.put(c.value,'/data/cloud-backups/'+Date.now()+'-'+String(c.key).split('/').at(-1));c.delete();}c.continue();};},true);
  await access('/autosave',s=>s.delete('/autosave/'+files[game]+'_auto.ss'),true);bytes=remote.contents;
 }
 if(bytes&&bytes!==remote?.contents){remote=await rpc(bytes,revision);revision=remote.revision;}
 let last=bytes; if(last)localStorage.setItem(key,last);
 status.textContent='Salvataggi online attivi · salva dal menu del gioco e attendi la conferma prima di cambiare dispositivo.';
 let busy=false,conflict=false;
 async function sync(){if(busy||conflict)return;busy=true;try{const record=await access('/data',s=>s.get(path));if(!record?.contents)return;const next=encode(record.contents);if(next===last)return;status.textContent='Invio del salvataggio online…';const saved=await rpc(next,revision);revision=saved.revision;last=next;localStorage.setItem(key,last);status.textContent='Salvataggio sincronizzato ✓ Puoi proseguire su un altro dispositivo.';}catch(e){conflict=e.message?.includes('SAVE_CONFLICT');status.textContent=conflict?'Un altro dispositivo ha aggiornato i progressi. Chiudi e riapri il gioco per scegliere il salvataggio.':'Salvataggio conservato sul dispositivo. Invio online da riprovare: controlla la connessione.';}finally{busy=false;}}
 setInterval(sync,3000);document.addEventListener('visibilitychange',()=>{if(document.hidden)sync();});window.addEventListener('online',sync);
}
