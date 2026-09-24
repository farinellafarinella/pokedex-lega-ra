import {readLeaderboard,readStatus,startFishing,finishFishing,throwFishingBall,closeFishingBattle} from './leaderboard.mjs?v=balls-xp-1';
import {getTrainerCompanion,SPECIES} from '../starter/starter-ui.js?v=johto-7';
import {FISH,RULES} from './config.mjs';
import {createBattle,turn,catchChance} from './engine.mjs?v=johto-7';
import {button,FishingScene,FishingBattle,FishingResult,RecordView,FishingLeaderboard,esc} from './components.mjs?v=johto-7';
import {createRecordStore} from './storage.mjs';

export async function mountFishing(host,{client,userId,onBalance=()=>{},isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('../starter/style.css',import.meta.url)}"><link rel="stylesheet" href="${new URL('./style.css',import.meta.url)}"><div id="view"></div>`;
 const view=root.querySelector('#view'),store=createRecordStore(userId),pendingKey='champion:fishing:pending:v1:'+userId;
 let starter=null,status=null,phase='loading',message='',encounter=null,battle=null,result=null,record=store.read(),newRecord=false,busy=false,moves=false,frame=0,epoch=0,timingStart=0;
 let ranking=[],rankingError='',rankingLoading=false,pending=null,storageWarning='';
 try{const saved=JSON.parse(localStorage.getItem(pendingKey)||'null');if(saved?.id&&['start','capture','throw','battle','close'].includes(saved.step))pending=saved;}catch{}
 const timers=new Set(),active=()=>host.isConnected&&isCurrent();
 const caught=()=>Number(status?.captures)||0;
 const balls=()=>Number(status?.balls_left)||0;
 const exhausted=()=>caught()>=3||balls()<=0;
 const endReason=()=>caught()>=3?'Hai catturato 3 Pokémon: gara terminata per oggi.':'Poké Ball terminate: gara terminata per oggi.';
 function acceptReward(data){if(data.balls_left!==undefined)status.balls_left=Number(data.balls_left);const oldLevel=starter?.level;if(data.starter)starter=data.starter;return data.xp_awarded>0?` +${data.xp_awarded} XP per il tuo Starter.${starter.level>oldLevel?' È salito al livello '+starter.level+'!':''}`:'';}
 function rememberBattle(){if(pending&&battle)persist({id:pending.id,step:'battle',battle,encounter});}
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
  else if(!status?.is_open)body='<h2>La gara apre ogni martedì</h2><p>Torna martedì per pescare fino a 3 Pokémon.</p>';
  else if(['idle','waiting','timing'].includes(phase))body=FishingScene(phase,pending?.step==='start'?'Riprendi la pesca':`Lancia la lenza · ${Number(status.cost)} Pokédollari`);
  else if(phase==='battle')body=FishingBattle(battle,catchChance(encounter,battle.wild.hp,battle.wild.maxHp),busy,moves,balls());
  else body=`<h2>${phase==='ended'?'Gara terminata':'La pesca è finita'}</h2>${exhausted()?`<p>${endReason()}</p>`:button('again','PESCA ANCORA',false,'class="primary"')}${button('end','TERMINA LA GARA',phase==='ended')}`;
  view.innerHTML=`<header><span class="eyebrow">EVENTO DEL MARTEDÌ</span><h1>Gara di Pesca</h1><p>Una lenza, il tuo Starter, un nuovo record.</p><a href="#dashboard">← Torna al Pokédex</a></header><div class="layout"><article class="game">${status?`<p>Pokémon catturati: <strong>${caught()}/3</strong> · Poké Ball: <strong>${balls()}/${Number(status.ball_limit)}</strong> · Saldo: ${Number(status.balance)} Pokédollari</p>`:''}<p id="status" role="status" aria-live="polite">${esc(message)}</p>${body}</article><aside><article>${RecordView(record)}</article><article><h3>Il tuo compagno</h3><p>${starter?`${esc(SPECIES[starter.species]?.name||starter.species)} · Livello ${starter.level} · ${starter.xp} XP`:'Nessuno Starter caricato'}</p><p>Ogni pesca ripristina PS e PP del compagno. +20 XP per cattura o vittoria, +5 XP per sconfitta o Poké Ball esaurite.</p><small>Massimo 3 catture al giorno. Ogni Poké Ball lanciata viene consumata, anche se la cattura fallisce. Vince il Pokémon più lungo.${status?` Ogni lancio della lenza costa ${Number(status.cost)} Pokédollari, anche se il Pokémon fugge.`:''}</small></article></aside></div><article id="fishing-ranking">${FishingLeaderboard(ranking,rankingError,rankingLoading)}</article>${storageWarning?`<p role="alert">${esc(storageWarning)}</p>`:''}`;
  if(pending?.step==='throw'&&!busy){for(const b of root.querySelectorAll('[data-action=moves],[data-action=move],[data-action=flee]'))b.disabled=true;const retry=root.querySelector('[data-action=catch]');if(retry){retry.disabled=false;retry.textContent='Riprova il lancio';}}
  if(busy)for(const b of root.querySelectorAll('[data-action]:not([data-action="refresh-ranking"])'))b.disabled=true;
 }
 async function refreshRanking(){if(rankingLoading)return;rankingLoading=true;updateRanking();try{ranking=await readLeaderboard(client);rankingError='';}catch{rankingError='Classifica online non disponibile. Riprova tra poco.';}finally{rankingLoading=false;updateRanking();}}
 function updateRanking(){if(!active())return;const panel=root.querySelector('#fishing-ranking');if(panel)panel.innerHTML=FishingLeaderboard(ranking,rankingError,rankingLoading);}
 async function load(){phase='loading';message='';draw();try{const values=await Promise.all([readStatus(client),getTrainerCompanion(client)]);if(!active())return;[status,starter]=values;onBalance(Number(status.balance));phase=exhausted()?'ended':'idle';if(pending?.step==='battle'&&starter&&status.is_open&&!exhausted()){battle=pending.battle;encounter=pending.encounter;phase='battle';}draw();if(pending?.step==='battle'&&starter&&status.is_open&&balls()<=0){finishWithoutCatch('Le Poké Ball sono terminate.','exhausted');return;}if(pending?.step==='capture'&&starter)await publishCapture();if(pending?.step==='throw'&&starter)await throwBall();if(pending?.step==='close'&&starter)await settleBattle();}catch(error){if(!active())return;phase='error';message=describe(error);draw();}}
 async function cast(){
  if(phase!=='idle'||busy||!status?.is_open||exhausted())return;
  cancel();busy=true;message=pending?'Ripresa della pesca…':'Lancio della lenza…';if(!pending)persist({id:crypto.randomUUID(),step:'start'});draw();
  try{const data=await startFishing(client,pending.id);if(!active())return;if(!FISH[data.species])throw Error('INVALID_ENCOUNTER');encounter={species:data.species,rarity:data.rarity};status.balance=Number(data.balance);status.balls_left=Number(data.balls_left);onBalance(status.balance);battle=null;result=null;moves=false;newRecord=false;busy=false;phase='waiting';message='Lenza lanciata! Aspetta il punto esclamativo.';draw();later(beginTiming,RULES.waitMin+Math.random()*(RULES.waitMax-RULES.waitMin));}
  catch(error){if(!active())return;busy=false;message=describe(error);if(/ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND/.test(error.message||''))persist(null);if(/BALL_LIMIT/.test(error.message||'')){status.balls_left=0;phase='ended';persist(null);}if(/CAPTURE_LIMIT/.test(error.message||'')){status.captures=3;phase='ended';persist(null);}if(/CONTEST_CLOSED/.test(error.message||'')){status.is_open=false;phase='ended';persist(null);}draw();}
 }
 function finishWithoutCatch(text,outcome='flee'){cancel();if(!pending){phase='finished';message=text;draw();return;}persist({id:pending.id,step:'close',outcome,text});settleBattle();}
 async function settleBattle(){if(busy||pending?.step!=='close')return;busy=true;phase='settling';message='';draw();try{const data=await closeFishingBattle(client,pending.id,pending.outcome);if(!active())return;message=pending.text+acceptReward(data);persist(null);phase='finished';}catch(error){if(!active())return;message=describe(error);if(/ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND/.test(error.message||'')){persist(null);phase='finished';}}finally{busy=false;if(active())draw();}}
 async function throwBall(){
  if(busy||!pending)return;
  if(pending.step!=='throw'){if(phase!=='battle'||balls()<=0)return;persist({id:pending.id,step:'throw',throwId:crypto.randomUUID(),hp:battle.wild.hp,maxHp:battle.wild.maxHp,level:battle.wild.level,battle:structuredClone(battle),encounter});}
  busy=true;battle=pending.battle;encounter=pending.encounter;phase='battle';message='Lanci la Poké Ball…';draw();
  try{const data=await throwFishingBall(client,pending);if(!active())return;status.balls_left=Number(data.balls_left);busy=false;if(data.success){result={...data.result,level:pending.level||starter.level};status.captures=Number(result.captures);message=acceptReward(result);newRecord=!record||result.length>record.length;if(newRecord){record=result;try{store.save(record);}catch{storageWarning='Il record è disponibile nella classifica online.';}}persist(null);phase='result';draw();refreshRanking();}else{const id=pending.id;persist({id,step:'battle',battle,encounter});message='Oh no! '+FISH[encounter.species].name+' è uscito dalla Poké Ball!';endTurn(null);if(phase==='battle'&&balls()<=0)finishWithoutCatch('Le Poké Ball sono terminate.','exhausted');}}
  catch(error){if(!active())return;busy=false;message=describe(error);if(/BALL_LIMIT/.test(error.message||'')){status.balls_left=0;finishWithoutCatch(message,'exhausted');return;}if(/CAPTURE_LIMIT|CAPTURE_NOT_CONFIRMED|ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND|CONTEST_CLOSED/.test(error.message||'')){persist(null);phase='ended';if(error.message.includes('CAPTURE_LIMIT'))status.captures=3;if(error.message.includes('CONTEST_CLOSED'))status.is_open=false;}draw();}
 }

 function pull(){if(phase!=='timing')return;if(performance.now()-timingStart>=RULES.timingDuration){finishWithoutCatch('Il Pokémon è riuscito a liberarsi!');return;}cancel();battle=createBattle(starter,encounter);phase='battle';rememberBattle();message='Scegli una mossa oppure tenta la cattura.';draw();}
 function beginTiming(){phase='timing';message='Un Pokémon ha abboccato. TIRA!';timingStart=performance.now();draw();root.querySelector('.bite-target').focus({preventScroll:true});function animate(now){if(!active()||phase!=='timing')return;const elapsed=now-timingStart;root.querySelector('#countdown').textContent='Tempo rimasto: '+Math.max(0,Math.ceil((RULES.timingDuration-elapsed)/1000))+' s';if(elapsed>=RULES.timingDuration){finishWithoutCatch('Il Pokémon è riuscito a liberarsi!');return;}frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);}
 async function publishCapture(){
  if(busy||pending?.step!=='capture')return;
  cancel();busy=true;phase='publishing';message='';draw();
  try{const data=await finishFishing(client,pending.id);if(!active())return;result={...data,level:pending.level||starter.level};status.captures=Number(data.captures);acceptReward(data);newRecord=!record||result.length>record.length;if(newRecord){record=result;try{store.save(record);}catch{storageWarning='Il record sul dispositivo non è stato salvato; la cattura è in classifica online.';}}persist(null);phase='result';message='';}
  catch(error){if(!active())return;message=describe(error);if(/CAPTURE_LIMIT|CAPTURE_NOT_CONFIRMED|ENCOUNTER_EXPIRED|ENCOUNTER_NOT_FOUND|CONTEST_CLOSED/.test(error.message||'')){persist(null);phase='ended';if(error.message.includes('CAPTURE_LIMIT'))status.captures=3;if(error.message.includes('CONTEST_CLOSED'))status.is_open=false;}}
  finally{busy=false;if(active()){draw();refreshRanking();}}
 }
 function endTurn(move){const outcome=turn(battle,move);if(outcome){finishWithoutCatch(outcome==='wildKO'?'Il Pokémon selvatico è esausto: non puoi più catturarlo.':'Il tuo Starter è esausto. Riprova con una nuova pesca.',outcome==='wildKO'?'win':'loss');return;}rememberBattle();draw();}
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||!active())return;const action=b.dataset.action;
  if(action==='refresh-ranking'){refreshRanking();return;}
  if(busy)return;
  if(action==='retry'){load();return;}
  if(pending?.step==='throw'){if(action==='catch')throwBall();return;}
  if(action==='retry-close'){settleBattle();return;}
  if(action==='retry-capture'){publishCapture();return;}
  if(!starter||['publishing','settling'].includes(phase))return;
  if(action==='again'&&['finished','ended','result'].includes(phase)){cancel();result=null;load();return;}
  if(action==='end'&&['finished','result','ended'].includes(phase)){cancel();phase='ended';message='La tua cattura migliore resta in classifica.';draw();return;}
  if(action==='cast'){cast();return;}
  if(action==='pull'){pull();return;}
  if(phase!=='battle')return;
  if(action==='moves'){moves=!moves;draw();}
  if(action==='move'){const move=b.dataset.move;if(move==='struggle'?battle.player.moves.some(m=>m.pp>0):!battle.player.moves.some(m=>m.id===move&&m.pp>0))return;message='';endTurn(move);}
  if(action==='flee')finishWithoutCatch('Hai lasciato andare il Pokémon.');
  if(action==='catch')throwBall();
 });
 const observer=new MutationObserver(()=>{if(!active()){cancel();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 await Promise.all([load(),refreshRanking()]);return ()=>{cancel();observer.disconnect();};
}
