import {validateRom,isLocalHost,localRomName} from './rom.mjs';
const status=document.querySelector('#status'),input=document.querySelector('#rom'),local=document.querySelector('#local-rom'),retry=document.querySelector('#retry');
let loading=false,romUrl=null,timeout=null;
local.hidden=!isLocalHost(location.hostname);
function failed(message){clearTimeout(timeout);status.textContent=message;retry.hidden=false;}
async function start(buffer){
 const title=validateRom(buffer);
 romUrl=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'}));
 document.querySelector('#chooser').hidden=true;document.querySelector('#screen').hidden=false;
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
async function load(read){
 if(loading)return;loading=true;input.disabled=true;local.disabled=true;status.textContent='Lettura della cartuccia…';
 try{await start(await read());}catch(error){status.textContent=error.message;loading=false;input.disabled=false;input.value='';local.disabled=false;}
}
input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;if(!/\.gbc?$/i.test(file.name)||file.size>8*1024*1024){status.textContent='Scegli un file .gb o .gbc, fino a 8 MB.';input.value='';return;}load(()=>file.arrayBuffer());});
local.addEventListener('click',()=>{if(!isLocalHost(location.hostname))return;load(async()=>{const response=await fetch(new URL('../../'+encodeURIComponent(localRomName),import.meta.url));if(!response.ok)throw Error('ROM locale non trovata. Usa Carica ROM per selezionarla.');return response.arrayBuffer();});});
retry.addEventListener('click',()=>location.reload());
window.addEventListener('pagehide',()=>{clearTimeout(timeout);if(romUrl)URL.revokeObjectURL(romUrl);});
