import {readLeaderboard,readStatus,startFishing,finishFishing,closeFishingBattle} from './leaderboard.mjs?v=balls-xp-1';
import {getTrainerCompanion,SPECIES} from '../starter/starter-ui.js?v=johto-7';
import {FISH,RULES} from './config.mjs';
import {generateFishingEncounter} from './engine.mjs?v=route-1';
import {button,FishingScene,FishingResult,RecordView,FishingLeaderboard,esc} from './components.mjs?v=johto-7';
import {createRecordStore} from './storage.mjs';

export async function mountFishing(host,{client,userId,onBalance=()=>{},isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('../starter/style.css',import.meta.url)}"><link rel="stylesheet" href="${new URL('./style.css',import.meta.url)}"><div id="view"></div>`;
 const view=root.querySelector('#view'),store=createRecordStore(userId),pendingKey='champion:fishing:pending:v1:'+userId;
 let starter=null,status=null,phase='loading',message='',encounter=null,result=null,record=store.read(),newRecord=false,busy=false,frame=0,epoch=0,timingStart=0;
 let ranking=[],rankingError='',rankingLoading=false,pending=null,storageWarning='';
 try{const saved=JSON.parse(localStorage.getItem(pendingKey)||'null');if(saved?.id&&['start','capture','throw','battle','close'].includes(saved.step))pending=saved;}catch{}
 const timers=new Set(),active=()=>host.isConnected&&isCurrent();
 const caught=()=>Number(status?.captures)||0;
 const balls=()=>Number(status?.balls_left)||0;
 const exhausted=()=>caught()>=3||balls()<=0;
 const endReason=()=>caught()>=3?'Hai catturato 3 Pokémon: gara terminata per oggi.':'Poké Ball terminate: gara terminata per oggi.';
 function acceptReward(data){if(data.balls_left!==undefined)status.balls_left=Number(data.balls_left);const oldLevel=starter?.level;if(data.starter)starter=data.starter;return data.xp_awarded>0?` +${data.xp_awarded} XP per il tuo Starter.${starter.level>oldLevel?' È salito al livello '+starter.level+'!':''}`:'';}
 function persist(value){pending=value;try{if(value)localStorage.setItem(pendingKey,JSON.stringify(value));else localStorage.removeItem(pendingKey);}catch{storageWarning='Lascia aperta questa pagina fino al completamento della pesca.';}}
 function cancel(){epoch++;for(const id of timers)clearTimeout(id);timers.clear();cancelAnimationFrame(frame);busy=false;}
 function later(fn,ms){const version=epoch,id=setTimeout(()=>{timers.delete(id);if(active()&&version===epoch)fn();},ms);timers.add(id);}
 function describe(error){const text=error?.message||'';if(error?.code==='PGRST202')return 'La gara non è ancora disponibile. Riprova più tardi.';for(const [key,label] of Object.entries({CAPTURE_LIMIT:'Hai già catturato 3 Pokémon oggi.',BALL_LIMIT:'Hai terminato le Poké Ball per oggi.',STARTER_REQUIRED:'Scegli prima il tuo Starter.',CAPTURE_NOT_CONFIRMED:'Questa vecchia pesca non può essere ripresa. Inizia una nuova pesca.',CONTEST_CLOSED:'La Gara di Pesca apre ogni martedì.',INSUFFICIENT_BALANCE:'Pokédollari insufficienti per lanciare la lenza.',NOT_AUTHORIZED:'Accedi con un account allenatore attivo.',ENCOUNTER_EXPIRED:'Questa pesca è terminata. Puoi iniziarne una nuova.',ENCOUNTER_NOT_FOUND:'Questa pesca non è più disponibile.'}))if(text.includes(key))return label;return 'Connessione non riuscita. Riprova: la stessa operazione non viene addebitata due volte.';}
 function draw(){
  if(!active()){cancel();return;}
  let body;
  if(phase==='loading')body='<p>Caricamento della gara…</p>';
  else if(phase==='error')body=button('retry','Riprova');
  else if(!starter)body='<p>Prima di partecipare alla Gara di Pesca devi scegliere il tuo Starter.</p><a href="#my-starter">Scegli il mio Starter →</a>';
  else if(phase==='settling')body=`<h2>Registrazione del combattimento…</h2>${button('retry-close','Riprova',busy)}`;
  else if(phase==='publishing')body=`<h2>Registrazione della cattura…</h2><p>Il risultato sarà mostrato appena viene confermato.</p>${button('retry-capture','Riprova',busy)}`;
  else if(phase==='result')body=FishingResult(result,newRecord,exhausted(),endReason());
  else if(phase==='battle')body=button('resume-battle','Riprendi la battaglia',busy);
  else if(!status?.is_open)body='<h2>La gara apre ogni martedì</h2><p>Torna martedì per pescare fino a 3 Pokémon.</p>';
  else if(['idle','waiting','timing'].includes(phase))body=FishingScene(phase,pending?.step==='start'?'Riprendi la pesca':`Lancia la lenza · ${Number(status.cost)} Pokédollari`);
  else body=`<h2>${phase==='ended'?'Gara terminata':'La pesca è finita'}</h2>${exhausted()?`<p>${endReason()}</p>`:button('again','PESCA ANCORA',false,'class="primary"')}${button('end','TERMINA LA GARA',phase==='ended')}`;
  view.innerHTML=`<header><span class="eyebrow">EVENTO DEL MARTEDÌ</span><h1>Gara di Pesca</h1><p>Una lenza, il tuo Starter, un nuovo record.</p><a href="#dashboard">← Torna al Pokédex</a></header><div class="layout"><article class="game">${status?`<p>Pokémon catturati: <strong>${caught()}/3</strong> · Poké Ball: <strong>${balls()}/${Number(status.ball_limit)}</strong> · Saldo: ${Number(status.balance)} Pokédollari</p>`:''}<p id="status" role="status" aria-live="polite">${esc(message)}</p>${body}</article><aside><article>${RecordView(record)}</article><article><h3>Il tuo compagno</h3><p>${starter?`${esc(SPECIES[starter.species]?.name||starter.species)} · Livello ${starter.level} · ${starter.xp} XP`:'Nessuno Starter caricato'}</p><p>La lotta usa la tua squadra, i PS rimasti e le mosse possedute. L’EXP viene assegnata dal motore comune solo per vittoria.</p><small>Massimo 3 catture al giorno. Ogni Poké Ball lanciata viene consumata, anche se la cattura fallisce. Vince il Pokémon più lungo.${status?` Ogni lancio della lenza costa ${Number(status.cost)} Pokédollari, anche se il Pokémon fugge.`:''}</small></article></aside></div><article id="fishing-ranking">${FishingLeaderboard(ranking,rankingError,rankingLoading)}</article>${storageWarning?`<p role="alert">${esc(storageWarning)}</p>`:''}`;
  if(pending?.step==='throw'&&!busy){for(const b of root.querySelectorAll('[data-action=moves],[data-action=move],[data-action=flee]'))b.disabled=true;const retry=root.querySelector('[data-action=catch]');if(retry){retry.disabled=false;retry.textContent='Riprova il lancio';}}
  if(busy)for(const b of root.querySelectorAll('[data-action]:not([data-action="refresh-ranking"])'))b.disabled=true;
 }
 async function refreshRanking(){if(rankingLoading)return;rankingLoading=true;updateRanking();try{ranking=await readLeaderboard(client);rankingError='';}catch{rankingError='Classifica online non disponibile. Riprova tra poco.';}finally{rankingLoading=false;updateRanking();}}
 function updateRanking(){if(!active())return;const panel=root.querySelector('#fishing-ranking');if(panel)panel.innerHTML=FishingLeaderboard(ranking,rankingError,rankingLoading);}
 async function load(){
  phase='loading';message='';draw();
  try{
   [status,starter]=await Promise.all([readStatus(client),getTrainerCompanion(client)]);if(!active())return;onBalance(Number(status.balance));
   phase=exhausted()?'ended':'idle';
   if(!pending){const saved=await window.RouteEncounters.pendingEncounter();if(saved?.source==='FISHING')persist({id:saved.token,step:'battle',encounter:{...saved,token:saved.token,species:window.ROUTE_POKEMON_DB[saved.speciesId].slug}});}
   if(pending?.step==='throw'){
    try{await finishFishing(client,pending.id);persist({...pending,step:'capture'});}
    catch(e){if(!/CAPTURE_NOT_CONFIRMED/.test(e.message||''))throw e;const data=await startFishing(client,pending.id);persist({id:pending.id,step:'battle',encounter:{species:data.species,rarity:data.rarity,...generateFishingEncounter(data,starter)}});}
   }
   if(pending?.step==='battle'&&starter){
    encounter=pending.encounter;
    if(!encounter?.token){const data=await startFishing(client,pending.id);encounter={species:data.species,rarity:data.rarity,...generateFishingEncounter(data,starter)};persist({...pending,encounter});}
    phase='battle';
   }
   draw();if(pending?.step==='capture'&&starter)await publishCapture();if(pending?.step==='close'&&starter)await settleBattle();
  }catch(error){if(!active())return;phase='error';message=describe(error);if(/SPECIES_OUTSIDE_CRYSTAL/.test(error.message||'')&&pending){await closeFishingBattle(client,pending.id,'flee');persist(null);phase='finished';message='La vecchia pescata è stata chiusa: questa specie non è presente in Crystal.';}draw();}
 }
 async function cast(){
  if(phase!=='idle'||busy||!status?.is_open||exhausted())return;
  try{await window.RouteEncounters.ensureSource('FISHING');}catch(error){message=error.message;draw();return;}
  cancel();busy=true;message=pending?'Ripresa della pesca…':'Lancio della lenza…';if(!pending)persist({id:crypto.randomUUID(),step:'start'});draw();
  try{const data=await startFishing(client,pending.id);if(!active())return;if(!FISH[data.species])throw Error('INVALID_ENCOUNTER');encounter={species:data.species,rarity:data.rarity,...generateFishingEncounter(data,starter)};status.balance=Number(data.balance);status.balls_left=Number(data.balls_left);onBalance(status.balance);result=null;newRecord=false;busy=false;phase='waiting';message='Lenza lanciata! Aspetta il punto esclamativo.';draw();later(beginTiming,RULES.waitMin+Math.random()*(RULES.waitMax-RULES.waitMin));}
  catch(error){if(!active())return;busy=false;message=describe(error);if(/ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND/.test(error.message||''))persist(null);if(/BALL_LIMIT/.test(error.message||'')){status.balls_left=0;phase='ended';persist(null);}if(/CAPTURE_LIMIT/.test(error.message||'')){status.captures=3;phase='ended';persist(null);}if(/CONTEST_CLOSED/.test(error.message||'')){status.is_open=false;phase='ended';persist(null);}draw();}
 }
 function finishWithoutCatch(text,outcome='flee'){cancel();if(!pending){phase='finished';message=text;draw();return;}persist({id:pending.id,step:'close',outcome,text,encounter});settleBattle();}
 async function settleBattle(){if(busy||pending?.step!=='close')return;busy=true;phase='settling';message='';draw();try{
  let e=pending.encounter;
  if(!e?.token){const data=await startFishing(client,pending.id);e={...generateFishingEncounter(data,starter)};persist({...pending,encounter:e});}
  const outcome=await window.RouteEncounters.abandonEncounter({...e,source:'FISHING'});
  if(!active())return;message=pending.text+acceptReward(outcome.eventResult||{});persist(null);phase='finished';
 }catch(error){if(!active())return;message=describe(error);if(/SPECIES_OUTSIDE_CRYSTAL/.test(error.message||'')){await closeFishingBattle(client,pending.id,'flee');persist(null);phase='finished';message='La vecchia pescata è stata chiusa: questa specie non è presente in Crystal.';}else if(/ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND/.test(error.message||'')){persist(null);phase='finished';}}finally{busy=false;if(active())draw();}}
 async function openEncounter(){
  if(busy||!encounter)return;busy=true;phase='battle';draw();
  try{
   if(!encounter.token){const data=await startFishing(client,pending.id);encounter={...encounter,...generateFishingEncounter(data,starter)};persist({...pending,encounter});}
   await window.startPokemonEncounter({...encounter,source:'FISHING',canCapture:true,canEscape:true,onComplete:async outcome=>{
    // The event backend consumes the central result; never roll a second catch or award legacy XP.
    persist(null);status=await readStatus(client);onBalance(Number(status.balance));
    phase='finished';message={win:'Il selvatico è esausto.',loss:'La squadra è esausta.',flee:'Hai lasciato andare il Pokémon.',capture:'Pokémon catturato.'}[outcome.result];
    if(outcome.result==='capture'&&outcome.eventResult?.length){result={...outcome.eventResult,level:encounter.level};phase='result';newRecord=!record||result.length>record.length;if(newRecord){record=result;store.save(record);}}
    await refreshRanking();
   }});
  }catch(error){message=error.message;}finally{busy=false;draw();}
 }
 function pull(){if(phase!=='timing')return;if(performance.now()-timingStart>=RULES.timingDuration){finishWithoutCatch('Il Pokémon è riuscito a liberarsi!');return;}cancel();persist({id:pending.id,step:'battle',encounter});openEncounter();}
 function beginTiming(){phase='timing';message='Un Pokémon ha abboccato. TIRA!';timingStart=performance.now();draw();root.querySelector('.bite-target').focus({preventScroll:true});function animate(now){if(!active()||phase!=='timing')return;const elapsed=now-timingStart;root.querySelector('#countdown').textContent='Tempo rimasto: '+Math.max(0,Math.ceil((RULES.timingDuration-elapsed)/1000))+' s';if(elapsed>=RULES.timingDuration){finishWithoutCatch('Il Pokémon è riuscito a liberarsi!');return;}frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);}
 async function publishCapture(){
  if(busy||pending?.step!=='capture')return;
  cancel();busy=true;phase='publishing';message='';draw();
  try{const data=await finishFishing(client,pending.id);if(!active())return;result={...data,level:pending.level||starter.level};status.captures=Number(data.captures);acceptReward(data);newRecord=!record||result.length>record.length;if(newRecord){record=result;try{store.save(record);}catch{storageWarning='Il record sul dispositivo non è stato salvato; la cattura è in classifica online.';}}persist(null);phase='result';message='';}
  catch(error){if(!active())return;message=describe(error);if(/CAPTURE_LIMIT|CAPTURE_NOT_CONFIRMED|ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND|CONTEST_CLOSED/.test(error.message||'')){persist(null);phase='ended';if(error.message.includes('CAPTURE_LIMIT'))status.captures=3;if(error.message.includes('CONTEST_CLOSED'))status.is_open=false;}}
  finally{busy=false;if(active()){draw();refreshRanking();}}
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||!active())return;const action=b.dataset.action;
  if(action==='refresh-ranking'){refreshRanking();return;}
  if(busy)return;
  if(action==='retry'){load();return;}
  if(pending?.step==='throw')return;
  if(action==='retry-close'){settleBattle();return;}
  if(action==='retry-capture'){publishCapture();return;}
  if(!starter||['publishing','settling'].includes(phase))return;
  if(action==='again'&&['finished','ended','result'].includes(phase)){cancel();result=null;load();return;}
  if(action==='end'&&['finished','result','ended'].includes(phase)){cancel();phase='ended';message='La tua cattura migliore resta in classifica.';draw();return;}
  if(action==='cast'){cast();return;}
  if(action==='pull'){pull();return;}
  if(action==='resume-battle')openEncounter();
 });
 const observer=new MutationObserver(()=>{if(!active()){cancel();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 await Promise.all([load(),refreshRanking()]);return ()=>{cancel();observer.disconnect();};
}
