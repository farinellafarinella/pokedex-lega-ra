import {artwork,SPECIES} from '../starter/starter-ui.js?v=johto-7';
import {RULES} from './config.mjs?v=official-1';
import {readStatus,readRanking,sendCommand,errorMessage,isRejected} from './api.mjs?v=official-2';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kg=value=>Number(value).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+' kg';
const btn=(action,label,disabled=false,extra='')=>`<button type="button" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;
const bugArt=p=>`<img class="pokemon" src="${new URL('../../bug gif/'+(p.species||p.id)+'.gif?v=official-1',import.meta.url)}" alt="${esc(p.name)}" width="140" height="140">`;
export async function mountBugContest(host,{client,userId,onBalance=()=>{},isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('../starter/style.css?v=fossil-cave-1',import.meta.url)}"><link rel="stylesheet" href="${new URL('./style.css?v=official-1',import.meta.url)}"><div id="view"></div>`;
 const view=root.querySelector('#view'),key='champion:bug-game:pending:v1:'+userId;
 let status=null,contest=null,starter=null,loading=true,busy=false,throwing=false,message='',error='',pending=null;
 let ranking=null,rankingLoading=false,rankingError='',rankingPeriod='today',timer=null,receivedAt=0;
 const active=()=>host.isConnected&&isCurrent();
 const dateLabel=day=>day.split('-').reverse().join('/');
 const open=()=>!!status?.isOpen&&Date.parse(status.serverNow)+Date.now()-receivedAt<Date.parse(status.closesAt);
 try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 function remember(value){pending=value;try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}catch{}}
 function accept(data){if(!active())return;status=data;contest=data.state;starter=data.starter;receivedAt=Date.now();onBalance(data.balance);}
  function battleView(){return '<h2>Incontro '+contest.encounters+'</h2>'+btn('route-battle','Affronta '+esc(contest.encounter.name),busy);}
 async function openEncounter(){
  if(busy||!contest?.encounter)return;
  busy=true;render();
  try{
   if(!contest.encounter.encounterToken)accept(await sendCommand(client,{type:'resume',operationId:crypto.randomUUID(),revision:status.revision,day:status.day}));
   await window.startPokemonEncounter({
   speciesId:window.RouteEncounters.speciesId(contest.encounter.species),
   level:contest.encounter.level??contest.battle?.wild.level,
   token:contest.encounter.encounterToken||status.encounterToken,
   source:'BUG_CONTEST',canCapture:true,canEscape:true,
   onComplete:async()=>{accept(await readStatus(client));}
  });}catch(e){message=e.message;}finally{busy=false;render();}
 }

  function selectionView() {
    const reason=contest.endReason==='balls'?'Le Poké Ball sono terminate.':`Hai completato i ${RULES.maxEncounters} incontri.`;
    if (!contest.caughtPokemon.length) return `<h2>Gara terminata</h2><p>${reason}</p><p>Non hai catturato nessun Pokémon da presentare alla giuria.</p>${'<p>Hai concluso la gara di oggi. Torna il prossimo giovedì.</p>'}`;
    return `<h2>Scegli il Pokémon da presentare alla giuria</h2><p>${reason} Presenta un solo Pokémon: la scelta è definitiva per questa gara.</p><div class="selection">${contest.caughtPokemon.map(p=>`<article>${bugArt(p)}<h3>${esc(p.name)}</h3><p>Peso: ${kg(p.weight)}<br>Rarità: ${esc(p.rarity)}</p>${btn('present','PRESENTA ALLA GIURIA',busy,`data-id="${esc(p.id)}" aria-label="Presenta ${esc(p.name)}, ${kg(p.weight)}, alla giuria"`)}</article>`).join('')}</div>`;
  }

  function judgmentView() {
    const j=contest.judgment,p=j.pokemon;
    return `<div class="judgment"><h2>Valutazione della giuria</h2>${bugArt(p)}<h3>${esc(p.name)}</h3><dl><div><dt>Peso</dt><dd>${kg(p.weight)}</dd></div><div><dt>Rarità</dt><dd><span aria-label="${esc(p.rarity)}">${'★'.repeat(p.stars)}</span><small>${esc(p.rarity)}</small></dd></div><div><dt>Valutazione peso</dt><dd>${j.weightScore} punti</dd></div><div><dt>Bonus rarità</dt><dd>${j.rarityBonus} punti</dd></div></dl><p>PUNTEGGIO FINALE</p><strong class="final-score">${j.total}</strong><p>Gara del ${new Date(j.date).toLocaleString('it-IT')}</p><p class="published">✓ Pokémon registrato nella classifica del ${dateLabel(j.day||status.day)}.</p></div>`;
  }

  function caughtView() {
    return `<aside><h2>Pokémon catturati <span>(${contest.caughtPokemon.length})</span></h2>${contest.caughtPokemon.length?`<ul class="caught">${contest.caughtPokemon.map(p=>`<li>${bugArt(p)}<span><b>${esc(p.name)}</b><br>${kg(p.weight)}</span></li>`).join('')}</ul>`:'<p>Nessuna cattura per ora.</p>'}</aside>`;
  }


 function rankingView(){
  const rows=ranking?.rows||[],winner=ranking?.winner;
  return `<section class="daily-ranking"><h2>Classifica Gara Pigliamosche</h2><p>Vince il punteggio più alto: peso + rarità. Premio: 300 Pokédollari.</p>
  <div class="ranking-actions">${btn('ranking-today','Oggi',rankingLoading,`aria-pressed="${rankingPeriod==='today'}"`)}${btn('ranking-previous','Ultima gara',rankingLoading,`aria-pressed="${rankingPeriod==='previous'}"`)}${btn('ranking-refresh',rankingLoading?'Aggiornamento…':'Aggiorna',rankingLoading)}</div>
  ${rankingError?`<p role="status">${esc(rankingError)}</p>`:''}
  ${ranking?`<p><strong>${dateLabel(ranking.day)} · ${ranking.closed?'Classifica definitiva':'Classifica del giorno'}</strong><br>Chiusura a mezzanotte, ora italiana.</p>`:''}
  ${winner?`<div class="daily-winner"><span>🏆 Vincitore del giorno</span><h3>${esc(winner.trainerName)}</h3>${bugArt({species:winner.species,name:winner.pokemonName})}<p>${esc(winner.pokemonName)} · ${kg(winner.weight)} · <strong>${winner.total} punti</strong></p><p>${ranking.rewardPaid?'Premio di 300 Pokédollari accreditato.':'Premio: 300 Pokédollari.'}</p></div>`:''}
  ${rows.length?`<ol class="ranking-list">${rows.map(row=>`<li class="${row.isMe?'my-entry':''}"><b class="rank-number">${row.position}°</b><div>${bugArt({species:row.species,name:row.pokemonName})}<strong>${esc(row.trainerName)}${row.isMe?' · Tu':''}</strong><span>${esc(row.pokemonName)} · ${kg(row.weight)}</span><small>${esc(row.rarity)}</small></div><b class="rank-score">${row.total}<small>punti</small></b></li>`).join('')}</ol>`:'<p>Nessun Pokémon presentato per questa giornata.</p>'}
  <small>A parità di punteggio: bonus rarità, poi peso, poi prima presentazione.</small></section>`;
 }
 function render(){
  if(!active())return;
  let body='';
  if(loading)body='<p>Caricamento della gara…</p>';
  else if(error)body=`<p role="alert">${esc(error)}</p>${btn('retry','Riprova')}`;
  else if(!starter)body='<h2>Scegli prima il tuo Starter</h2><a href="#my-starter">Vai a Il mio Starter →</a>';
  else if(contest?.phase==='judged')body=judgmentView();
  else if(!open())body='<h2>La gara si svolge il giovedì</h2><p>Iscrizioni, incontri e presentazione alla giuria terminano a mezzanotte italiana. Consulta “Ultima gara” per il vincitore.</p>';
  else if(!contest)body=`${artwork(starter.species)}<h2>${esc(SPECIES[starter.species]?.name||starter.species)} · Lv. ${starter.level}</h2><p>Una gara per allenatore oggi: ${RULES.pokeballs} Poké Ball e massimo ${RULES.maxEncounters} incontri. Presenta un solo Pokémon alla giuria entro mezzanotte.</p><p>La lotta usa la squadra reale e conserva i PS rimasti.</p>${btn('start','ISCRIVITI · 50 POKÉDOLLARI',busy||status.balance<50,'class="primary"')}${status.balance<50?'<p>Saldo insufficiente.</p>':''}`;
  else if(contest.phase==='ready')body=`<h2>Pronto per la gara</h2>${btn('next','CERCA UN POKÉMON',busy,'class="primary"')}`;
  else if(contest.phase==='battle')body=battleView();
  else if(contest.phase==='between')body=`<h2>Incontro terminato</h2><p>I progressi e i PS della squadra sono salvati.</p>${btn('next','CONTINUA LA GARA',busy,'class="primary"')}`;
  else if(contest.phase==='selection')body=selectionView();
  const balls=pending?.type==='catch'&&contest?.phase==='battle'&&status?.revision===pending.revision?Math.max(0,contest.pokeballs-1):(contest?.pokeballs??RULES.pokeballs);
  view.innerHTML=`<header><span class="eyebrow">EVENTO DEL GIOVEDÌ</span><h1>Gara Pigliamosche</h1><p>Indebolisci, cattura e scegli il tuo campione.</p><a href="#dashboard">← Torna al Pokédex</a>${status?`<p>Saldo: ${status.balance} Pokédollari</p>`:''}</header>
  <div class="counters"><strong data-balls>Poké Ball × ${balls}</strong><span>Incontri: ${contest?.encounters??0} / ${RULES.maxEncounters}</span><span>Catturati: ${contest?.caughtPokemon.length??0}</span></div>
  <article class="game"><p class="message" role="status" aria-live="polite">${throwing?'Lancio della Poké Ball…':esc(message||contest?.message||'')}</p>${throwing?'<div class="throw-animation" aria-hidden="true">◓</div>':''}${pending?`<p>Registrazione dell’azione in corso.</p>${btn('retry-command',busy?'Attendi…':'Riprova il salvataggio',busy)}`:''}${body}</article>
  ${contest?caughtView():''}${rankingView()}`;
  if(busy||pending)root.querySelectorAll('.game button:not([data-action="retry-command"])').forEach(button=>button.disabled=true);
 }
 async function refreshRanking(){
  if(rankingLoading||!active())return;
  clearTimeout(timer);rankingLoading=true;rankingError='';
  try{
   const today=await readRanking(client);
   const data=rankingPeriod==='previous'?await readRanking(client,today.previousDay):today;
   if(!active())return;ranking=data;
   if(!busy&&!pending){const fresh=await readStatus(client);if(!busy&&!pending&&(!status||fresh.day>status.day||fresh.day===status.day&&fresh.revision>=status.revision))accept(fresh);}
  }catch(e){rankingError=errorMessage(e);}
  finally{rankingLoading=false;if(active()){render();const remaining=status?Date.parse(status.closesAt)-(Date.parse(status.serverNow)+Date.now()-receivedAt):30000;timer=setTimeout(refreshRanking,remaining>0?Math.min(30000,remaining+100):30000);}}
 }
 async function load(){
  if(busy)return;busy=true;loading=true;error='';render();
  try{accept(await readStatus(client));}catch(e){error=errorMessage(e);}
  finally{busy=false;loading=false;render();}
  if(active()&&!error&&pending)await sendPending();
 }
 async function sendPending(){
  if(busy||!pending||!active())return;
  if(['move','catch','flee'].includes(pending.type)){
   try{accept(await readStatus(client));remember(null);message='Progressi precedenti recuperati.';render();if(contest?.phase==='battle')await openEncounter();}catch(e){message=errorMessage(e);render();}return;
  }
  if(['start','next'].includes(pending.type)){try{await window.RouteEncounters.ensureSource('BUG_CONTEST');}catch(e){message=e.message;render();return;}}
  busy=true;message='';throwing=pending.type==='catch';render();
  try{
   const data=await sendCommand(client,pending);
   if(!active())return;
   remember(null);accept(data);render();
   if(throwing)await new Promise(resolve=>setTimeout(resolve,RULES.throwAnimationMs));
  }catch(e){
   message=errorMessage(e);
   if(isRejected(e)){remember(null);try{accept(await readStatus(client));}catch{}}
  }finally{busy=false;throwing=false;if(active()){render();refreshRanking();}}
 }
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled||!active())return;
  const action=b.dataset.action;
  if(action.startsWith('ranking-')){if(action==='ranking-today')rankingPeriod='today';if(action==='ranking-previous')rankingPeriod='previous';await refreshRanking();return;}
  if(busy)return;
  if(action==='retry'){await load();return;}
  if(action==='retry-command'){await sendPending();return;}
  if(pending)return;
  if(action==='route-battle'){await openEncounter();return;}
  if(!open())return;
  if(['start','next'].includes(action)){try{await window.RouteEncounters.ensureSource('BUG_CONTEST');}catch(e){message=e.message;render();return;}}
  if(!['start','next','present'].includes(action))return;
  remember({type:action,move:b.dataset.move,pokemonId:b.dataset.id,day:status.day,revision:status.revision,operationId:crypto.randomUUID()});
  await sendPending();
  if(contest?.phase==='battle'&&!pending)await openEncounter();
 });
 await Promise.all([load(),refreshRanking()]);
 return ()=>clearTimeout(timer);
}
