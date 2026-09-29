import {validateRom,hostedRomUrl} from './rom.mjs';
const status=document.querySelector('#status'),retry=document.querySelector('#retry');
let loading=false,romUrl=null,timeout=null;
function failed(message){clearTimeout(timeout);status.textContent=message;retry.hidden=false;}
async function start(buffer){
 const title=validateRom(buffer);
 romUrl=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'}));
 document.querySelector('#screen').hidden=false;
 status.textContent='Caricamento dell’emulatore…';
 Object.assign(window,{
  EJS_player:'#game',EJS_core:'gambatte',EJS_gameUrl:romUrl,EJS_gameName:title,
  EJS_pathtodata:'https://cdn.emulatorjs.org/stable/data/',EJS_language:'it-IT',
  EJS_color:'#a71922',EJS_backgroundColor:'#17191f',EJS_startOnLoaded:false,
  EJS_startButtonName:'Avvia gioco',EJS_threads:false,EJS_fixedSaveInterval:10000,
  EJS_onGameStart:()=>{clearTimeout(timeout);retry.hidden=true;status.textContent='Gioco avviato. Salva la partita prima di uscire.';},
  EJS_ready:()=>{clearTimeout(timeout);retry.hidden=true;status.textContent='Pronto: premi Avvia gioco.';}
 });
 const script=document.createElement('script');script.src=window.EJS_pathtodata+'loader.js';
 script.onerror=()=>failed('Impossibile scaricare l’emulatore. Controlla la connessione e riprova.');
 timeout=setTimeout(()=>failed('Il caricamento sta impiegando più del previsto. Puoi attendere oppure riprovare.'),45000);
 document.body.append(script);
}
async function load(){
 if(loading)return;loading=true;retry.hidden=true;status.textContent='Caricamento di Pokémon Rosso…';
 try{
  const response=await fetch(hostedRomUrl(import.meta.url));
  if(!response.ok)throw Error(response.status===404?'Il file di Pokémon Rosso non è disponibile sul sito. Controlla che sia stato pubblicato nella cartella principale.':'Impossibile caricare Pokémon Rosso. Riprova tra poco.');
  await start(await response.arrayBuffer());
 }catch(error){loading=false;failed(error.message||'Impossibile caricare Pokémon Rosso. Controlla la connessione e riprova.');}
}
retry.addEventListener('click',()=>location.reload());
window.addEventListener('pagehide',()=>{clearTimeout(timeout);if(romUrl)URL.revokeObjectURL(romUrl);});

await load();
