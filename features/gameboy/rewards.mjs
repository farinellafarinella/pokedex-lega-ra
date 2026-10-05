import {readLocalRedSave,encodeProof} from './badge-save.mjs?v=1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors={SAVE_NOT_FOUND:'Non trovo un salvataggio di Pokémon Rosso in questo browser. Gioca, salva dal menu del gioco e torna qui.',SAVE_CHECKSUM:'Il salvataggio non è ancora completo o non è valido. Salva di nuovo dal menu di Pokémon Rosso e riprova.',SAVE_SIZE:'Formato del salvataggio non supportato.',SAVE_INVALID:'Il salvataggio non è compatibile con Pokémon Rosso italiano.',SAVE_STORAGE:'Non riesco a leggere il salvataggio in questo browser. Riprova dopo aver chiuso il Game Boy.',MEDAL_REQUIRED:'Questa medaglia non risulta nel salvataggio. Salva dopo aver battuto la palestra.',TEAM_FULL:'La squadra del sito è piena. Libera un posto in La mia squadra e torna a riscattare: il premio resta disponibile.',TEAM_PENDING:'Completa prima la scelta del Pokémon in attesa in La mia squadra.',STARTER_REQUIRED:'Scegli prima lo starter in La mia squadra.',BATTLE_ACTIVE:'Concludi prima la battaglia sul sito, poi riscatta il premio.',NOT_AUTHORIZED:'Accedi di nuovo al sito per riscattare il premio.',OPERATION_MISMATCH:'La richiesta non corrisponde al tentativo precedente. Riapri la pagina.',REWARD_UNAVAILABLE:'Questo premio non è ancora configurato.'};
export async function mountGameBoyRewards(host,{client,userId,isCurrent=()=>host.isConnected}={}){
 const current=()=>host.isConnected&&isCurrent();let status=null,proof=null,busy=false,message='',pending=null;
 const key='champion:gameboy-badge:'+userId;
 try{pending=JSON.parse(localStorage.getItem(key)||'null');if(pending?.type!=='claim'||typeof pending.proof!=='string')pending=null;}catch{}
 host.innerHTML="<section class=\"panel pad\"><p><a href=\"#gameboy\">← Torna al Game Boy</a></p><h1>Ricompense di Pokémon Rosso</h1><section aria-labelledby=\"gameboy-medals-title\"><h2 id=\"gameboy-medals-title\">Le tue medaglie, i tuoi premi</h2><p>Per ogni palestra battuta in Pokémon Rosso puoi riscattare un Pokémon di livello 5 sul sito, una sola volta per account. Salva nel menu del gioco e torna qui con lo stesso browser.</p><p>I Pokémon della tua partita restano in Pokémon Rosso.</p><p><button class=\"btn secondary\" data-check>Controlla medaglie</button> <a class=\"btn secondary\" href=\"#my-team\">La mia squadra</a></p><p data-status role=\"status\" aria-live=\"polite\"></p><div data-retry></div><div data-rewards class=\"gameboy-rewards\"></div></section></section>";
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./rewards.css?v=1',import.meta.url).href;host.prepend(stylesheet);
 const names=window.ROUTE_POKEMON_DB||{};
 function render(){if(!current())return;
  host.querySelector('[data-status]').textContent=busy?'Controllo in corso…':message||(pending?'Hai un riscatto da verificare. Premi Riprova riscatto.':proof?`${Array.from({length:8},(_,i)=>!!(proof.badges&(1<<i))).filter(Boolean).length} medaglie trovate nel salvataggio.`:'');
  host.querySelector('[data-check]').disabled=busy||!!pending;
  host.querySelector('[data-retry]').innerHTML=pending?'<button class="btn primary" data-retry-claim '+(busy?'disabled':'')+'>Riprova riscatto</button>':'';
  host.querySelector('[data-rewards]').innerHTML=(status?.rewards||[]).map(r=>{
   const unlocked=!!proof&&(proof.badges&(1<<r.badge)),pokemon=names[r.species_id],full=status.teamCount>=6||status.pending;
   return `<article class="gameboy-reward ${r.claimed?'claimed':unlocked?'unlocked':''}"><small>MEDAGLIA ${esc(r.medal).toUpperCase()}</small><h3>${esc(r.leader)}</h3>${pokemon?.sprites?.front?`<img src="${esc(pokemon.sprites.front)}" width="72" height="72" alt="${esc(pokemon.name)}">`:''}<p><strong>${esc(pokemon?.name||'#'+r.species_id)} · Lv. ${r.level}</strong></p><p>${r.claimed?'Premio già riscattato':unlocked?'Medaglia ottenuta':'Batti la palestra e salva nel gioco'}</p>${r.claimed?'':`<button class="btn primary" data-claim="${r.badge}" ${busy||pending||!unlocked||full?'disabled':''}>Riscatta ${esc(pokemon?.name||'Pokémon')}</button>`}</article>`;
  }).join('');
 }
 async function fetchStatus(){if(!client)throw Error('NOT_AUTHORIZED');const {data,error}=await client.rpc('get_gameboy_badge_rewards');if(error)throw Error(error.message);status=data;}
 const explain=e=>errors[e.message]||(/get_gameboy_badge_rewards|Could not find.*function|404/i.test(e.message)?'Premi medaglie da installare: aggiorna SQL e funzione gameboy-rewards su Supabase.':'Non riesco a confermare il riscatto. '+e.message);
 async function check(){if(busy||pending)return;busy=true;message='';render();
  try{await fetchStatus();proof=await readLocalRedSave();if(status.teamCount>=6)message=errors.TEAM_FULL;else if(status.pending)message=errors.TEAM_PENDING;}
  catch(e){proof=null;message=explain(e);}finally{busy=false;render();}
 }
 async function claim(badge){if(busy)return;busy=true;message='';
  try{
   if(!pending){if(!proof)return;pending={type:'claim',badge,operationId:crypto.randomUUID(),proof:encodeProof(proof.bytes)};localStorage.setItem(key,JSON.stringify(pending));}
   render();const {data,error}=await client.functions.invoke('gameboy-rewards',{body:pending});let problem=data?.error;
   if(error?.context){try{const details=await (error.context.clone?.()||error.context).json();problem=details.error||details.message||problem;}catch{}}
   if(error||problem)throw Error(problem||error.message);
   if(!data?.pokemon)throw Error('Risposta del server incompleta. Premi Riprova riscatto.');
   pending=null;localStorage.removeItem(key);message=`${names[data.pokemon.speciesId]?.name||'Pokémon'} di livello ${data.pokemon.level} ${data.replayed?'era già stato aggiunto':'è stato aggiunto'} alla tua squadra.`;
   await fetchStatus();
  }catch(e){message=explain(e);if(['TEAM_FULL','TEAM_PENDING','STARTER_REQUIRED','BATTLE_ACTIVE','MEDAL_REQUIRED','SAVE_SIZE','SAVE_CHECKSUM','SAVE_INVALID','INVALID_COMMAND','REWARD_UNAVAILABLE'].includes(e.message)){pending=null;localStorage.removeItem(key);}}
  finally{busy=false;render();}
 }
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||!current())return;if(b.hasAttribute('data-check'))check();if(b.hasAttribute('data-retry-claim'))claim(pending?.badge);if(b.hasAttribute('data-claim'))claim(Number(b.dataset.claim));});
 if(pending){try{await fetchStatus();}catch(e){message=explain(e);}render();}else await check();
}
