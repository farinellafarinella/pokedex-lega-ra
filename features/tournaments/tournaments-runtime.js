(()=>{
'use strict';
const scriptURL=document.currentScript.src;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={open:'Iscrizioni aperte',running:'In corso',finished:'Concluso',cancelled:'Annullato'};
const money=value=>new Intl.NumberFormat('it-IT').format(Number(value)||0)+' ₽';
const messages={ACCOUNT_NOT_ACTIVE:'Accedi con una Scheda Allenatore attiva.',ADMIN_REQUIRED:'Questa operazione è riservata agli admin.',TOURNAMENT_NOT_FOUND:'Evento non trovato. Aggiorna la pagina.',INVALID_TOURNAMENT:'Inserisci un nome da 2 a 80 caratteri e una descrizione di massimo 600 caratteri.',REGISTRATION_CLOSED:'Le iscrizioni sono chiuse. Aggiorna l’evento.',TOURNAMENT_FULL:'L’evento ha raggiunto il limite di 128 iscritti.',NOT_ENOUGH_PLAYERS:'Servono almeno 2 iscritti per avviare l’evento.',INVALID_WINNER:'Seleziona uno dei due giocatori dell’incontro.',MATCH_NOT_READY:'Aspetta che siano decisi entrambi i giocatori di questo incontro.',RESULT_ALREADY_SET:'Il risultato è già stato confermato. Aggiorna il tabellone.',TOURNAMENT_NOT_RUNNING:'L’evento non è in corso.',OPERATION_CONFLICT:'Operazione già utilizzata. Riapri il modulo e riprova.'};
function errorText(error){
 if(error?.message?.includes('INSUFFICIENT_BALANCE'))return 'Non hai abbastanza Pokédollari per questa iscrizione.';
 if(error?.message?.includes('INVALID_ENTRY_FEE'))return 'Il costo deve essere un numero intero da 0 a 1.000.000 di Pokédollari.';
 if(error?.code==='PGRST202'||error?.code==='42P01')return 'La sezione Eventi deve essere attivata su Supabase.';
 return Object.entries(messages).find(([code])=>error?.message?.includes(code))?.[1]||'Operazione non riuscita. Riprova: se era già stata salvata, non verrà duplicata.';
}
function uuid(){const b=new Uint8Array(16);globalThis.crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
async function mountTournaments(host,{client,isCurrent=()=>true,initialId=null,onBalance=()=>{}}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=2',scriptURL)}"><main id="view"></main>`;
 const view=root.querySelector('#view');
 let state=null,selectedId=/^[0-9a-f-]{36}$/i.test(initialId||'')?initialId:null,busy=false,notice='',diagnostic='',confirmAction=null;
 let creating=false,draft={name:'',description:'',fee:'0'},createOperation=null,entryOperation=null;
 const active=()=>host.isConnected&&isCurrent();
 const button=(action,label,attrs='')=>`<button type="button" data-action="${action}" ${attrs} ${busy?'disabled':''}>${label}</button>`;
 const person=id=>state?.entries.find(p=>p.id===id);
 const name=id=>person(id)?.name||'Allenatore';
 async function rpc(method,args){const {data,error}=await client.rpc(method,args);if(error)throw error;return data;}
 function accept(data){state=data;if(Number.isFinite(Number(data.balance)))onBalance(Number(data.balance));}
 function changeEntry(join){
  try{const key=selectedId+':'+join;if(entryOperation?.key!==key)entryOperation={key,id:uuid()};}
  catch(error){notice='Impossibile confermare in questo browser. Riprova con un browser aggiornato.';render();return;}
  return mutate('join_league_tournament',{p_tournament_id:selectedId,p_join:join,p_operation:entryOperation.id},join?'Iscrizione confermata.':'Iscrizione annullata. La quota pagata è stata rimborsata.',()=>{entryOperation=null;});
 }
 const roundName=(round,total)=>round===total?'Finale':round===total-1?'Semifinali':round===total-2?'Quarti di finale':`Turno ${round}`;
 function feedback(){return `<div class="notice" role="status" aria-live="polite">${esc(notice)}</div>${diagnostic?`<details class="diagnostic"><summary>Dettagli dell’errore</summary><pre>${esc(diagnostic)}</pre></details>`:''}`;}
 function confirmation(){
  if(!confirmAction)return '';
  const a=confirmAction,t=state.selected;
  const final=a.type==='winner'&&state.matches.find(m=>m.id===a.match)?.round_no===Math.log2(t.bracket_size);
  const text=a.type==='join'?`Iscriverti a “${t.name}” al costo di ${money(t.entry_fee)}? La quota verrà scalata dal tuo saldo e aggiunta interamente al montepremi.`:a.type==='start'?`Avviare “${t.name}” con ${state.entries.length} iscritti e ${money(t.prize_pool)} di montepremi? Le iscrizioni verranno chiuse e gli abbinamenti sorteggiati.`:a.type==='winner'?`Confermare ${name(a.winner)} come vincitore? Il risultato sarà definitivo.${final?` Riceverà automaticamente tutto il montepremi: ${money(t.prize_pool)}.`:' Il giocatore passerà al turno successivo.'}`:a.type==='cancel'?`Annullare “${t.name}”? Tutti gli iscritti riceveranno il rimborso della quota pagata.`:`Vuoi annullare la tua iscrizione? Riceverai il rimborso di ${money(person(state.me)?.paid_fee)}. Potrai iscriverti nuovamente finché l’evento rimane aperto.`;
  return `<section class="confirmation" aria-label="Conferma operazione"><p>${esc(text)}</p><div class="actions">${button('commit','Conferma', 'class="primary"')}${button('dismiss','Indietro')}</div></section>`;
 }
 function matchCard(m){
  const ready=m.status==='pending'&&m.player1_id&&m.player2_id;
  const row=(id,slot)=>{const prior=state.matches.find(x=>x.round_no===m.round_no-1&&x.position===m.position*2-(slot===1?1:0));
   const title=id?name(id):m.round_no===1?'Passaggio automatico':`Vincitore incontro ${prior?.position||'—'} del turno ${m.round_no-1}`;
   return `<div class="player ${id&&id===m.winner_id?'winner':''} ${id===state.me?'self':''}"><span>${esc(title)}${id===state.me?' <small>(tu)</small>':''}${id&&id===m.winner_id?' <span aria-label="Vincitore">✓</span>':''}</span>${ready&&state.is_admin?button('winner','Vince',`data-match="${m.id}" data-winner="${id}" aria-label="Conferma vittoria di ${esc(title)}"`):''}</div>`;};
  return `<article class="match"><div class="match-head"><small>Incontro ${m.position}</small><small>${m.status==='bye'?'Passaggio automatico':m.status==='played'?'Concluso':ready?'Da giocare':'In attesa'}</small></div>${row(m.player1_id,1)}${row(m.player2_id,2)}</article>`;
 }
 function detail(){const t=state.selected;if(!t)return `<p>Evento non trovato.</p>${button('back','Tutti gli eventi')}`;
  const joined=state.entries.some(e=>e.id===state.me),total=Math.log2(t.bracket_size||2);
  return `${button('back','← Tutti gli eventi')}<section class="tournament-head"><span class="pill ${t.status}">${labels[t.status]}</span><h2>${esc(t.name)}</h2>${t.description?`<p class="description">${esc(t.description)}</p>`:''}<p>${state.entries.length} iscritti · Eliminazione diretta</p><div class="entry-money"><span>Quota d’iscrizione<strong>${money(t.entry_fee)}</strong></span><span>${t.status==='finished'?'Premio al vincitore':'Montepremi'}<strong>${money(t.prize_pool)}</strong></span></div><p class="small">Il vincitore riceve il 100% del montepremi.</p>${t.status==='finished'?`<div class="champion"><small>VINCITORE DELL’EVENTO</small><strong>${esc(name(t.winner_id))}</strong>${Number(t.prize_paid)>0?`<p>${money(t.prize_paid)} accreditati automaticamente.</p>`:''}</div>`:''}</section>
  ${t.status==='open'?`<div class="actions">${joined?`<span class="joined">✓ Sei iscritto</span>${button('leave','Annulla iscrizione')}`:button('join','Iscriviti all’evento',`class="primary" ${state.entries.length>=128?'disabled':''}`)}${state.is_admin?`${button('start','Avvia l’evento',`class="primary" ${state.entries.length<2?'disabled':''}`)}${button('cancel','Annulla evento')}`:''}</div><p class="small">La quota è rimborsabile prima dell’avvio. Da 2 a 128 giocatori. Gli abbinamenti vengono sorteggiati all’avvio.${state.is_admin&&state.entries.length<2?' Servono almeno 2 iscritti.':''}</p>`:''}
  ${confirmation()}${feedback()}
  ${state.matches.length?`<h2>Tabellone</h2><p class="small">${state.is_admin&&t.status==='running'?'Premi “Vince” accanto al vincitore di ciascun incontro. ':''}Chi perde è eliminato. I passaggi automatici del primo turno sono già assegnati.</p><div class="bracket" role="region" aria-label="Tabellone dell’evento" tabindex="0">${Array.from({length:total},(_,i)=>i+1).map(round=>`<section class="round"><h3>${roundName(round,total)}</h3>${state.matches.filter(m=>m.round_no===round).map(matchCard).join('')}</section>`).join('')}</div>`:''}
  <details class="participants" ${t.status==='open'?'open':''}><summary>Iscritti (${state.entries.length})</summary><ul>${state.entries.map(p=>`<li><span>${esc(p.name)}${p.id===state.me?' (tu)':''}</span><small>${esc(p.code)}</small></li>`).join('')||'<li>Nessun iscritto. Puoi essere il primo!</li>'}</ul></details>`;
 }
 function listing(){return `${state.is_admin?`${button('new','+ Crea evento','class="primary"')}${creating?`<form id="create-form"><h2>Nuovo evento</h2><label>Nome<input name="name" required minlength="2" maxlength="80" value="${esc(draft.name)}" placeholder="Es. Coppa di Kanto" ${busy?'disabled':''}></label><label>Descrizione e regole<textarea name="description" maxlength="600" rows="4" placeholder="Luogo, orario e regole degli incontri" ${busy?'disabled':''}>${esc(draft.description)}</textarea></label><label>Costo d’iscrizione (Pokédollari)<input name="fee" type="number" min="0" max="1000000" step="1" required value="${esc(draft.fee)}" ${busy?'disabled':''}></label><p class="small">0 = gratuito. Tutto l’incasso va al vincitore. La quota non cambia dopo la creazione. Da 2 a 128 giocatori · Eliminazione diretta</p><div class="actions"><button type="submit" class="primary" ${busy?'disabled':''}>Apri le iscrizioni</button>${button('close-form','Annulla')}</div></form>`:''}`:''}${feedback()}
  ${['open','running','finished','cancelled'].map(status=>{const list=state.tournaments.filter(t=>t.status===status);return list.length?`<section><h2>${{open:'Iscriviti a un evento',running:'Eventi in corso',finished:'Eventi conclusi',cancelled:'Eventi annullati'}[status]}</h2><div class="tournament-list">${list.map(t=>`<article class="tournament"><span class="pill ${status}">${labels[status]}</span><h3>${esc(t.name)}</h3><p>${t.participant_count} iscritti${t.joined?' · Sei iscritto':''}</p><p>Quota: <b>${money(t.entry_fee)}</b> · Montepremi: <b>${money(t.prize_pool)}</b></p>${t.winner_name?`<p class="joined">Vincitore: ${esc(t.winner_name)}</p>`:''}${button('open',status==='open'?'Iscrizioni e dettagli':'Vedi tabellone',`data-id="${t.id}"`)}</article>`).join('')}</div></section>`:'';}).join('')||'<p>Non ci sono ancora eventi. Quando un admin ne crea uno, potrai iscriverti qui.</p>'}`;}
 function render(){if(!active())return;
  view.innerHTML=`<div class="eyebrow">CHAMPION LEAGUE</div><h1>Eventi</h1><p>Iscriviti, affronta gli altri allenatori e conquista la finale.</p>${state?`<div class="balance">Il tuo saldo <strong>${money(state.balance)}</strong></div>`:''}${!state?feedback():selectedId?detail():listing()}<div class="footer">${button('refresh','Aggiorna')}<a href="#dashboard">Torna alla Home</a></div>`;
 }
 async function refresh(){if(busy||!active())return;busy=true;render();try{const next=await rpc('get_league_tournaments',{p_tournament_id:selectedId});if(active()){accept(next);diagnostic='';}}catch(e){notice=errorText(e);diagnostic=[e.code,e.message,e.details,e.hint].filter(Boolean).join('\n');}finally{busy=false;render();}}
 async function mutate(method,args,success,onSuccess=()=>{}){if(busy||!active())return;busy=true;notice='Salvataggio…';diagnostic='';render();let saved=false;
  try{await rpc(method,args);saved=true;if(!active())return;onSuccess();confirmAction=null;notice=success;accept(await rpc('get_league_tournaments',{p_tournament_id:selectedId}));}
  catch(e){notice=saved?`${success} Premi “Aggiorna” per caricare i dati aggiornati.`:errorText(e);diagnostic=[e.code,e.message,e.details,e.hint].filter(Boolean).join('\n');}
  finally{busy=false;render();if(active())root.querySelector('.notice')?.scrollIntoView({block:'nearest'});}
 }
 root.addEventListener('input',e=>{if(['name','description','fee'].includes(e.target.name)){draft[e.target.name]=e.target.value;createOperation=null;}});
 root.addEventListener('submit',e=>{if(e.target.id!=='create-form')return;e.preventDefault();if(busy)return;try{createOperation??=uuid();}catch(error){notice='Impossibile creare l’evento in questo browser. Apri il sito con un browser aggiornato.';render();return;}
  mutate('create_league_tournament',{p_id:createOperation,p_name:draft.name.trim(),p_description:draft.description,p_entry_fee:Number(draft.fee)},'Evento creato. Le iscrizioni sono aperte.',()=>{selectedId=createOperation;creating=false;draft={name:'',description:'',fee:'0'};createOperation=null;});
 });
 root.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled||busy||!active())return;const a=b.dataset.action;
  if(a==='refresh'){notice='';confirmAction=null;return refresh();}
  if(a==='open'){selectedId=b.dataset.id;notice='';diagnostic='';confirmAction=null;return refresh();}
  if(a==='back'){selectedId=null;notice='';diagnostic='';confirmAction=null;return refresh();}
  if(a==='new'){creating=true;render();root.querySelector('input')?.focus();return;}
  if(a==='close-form'){creating=false;draft={name:'',description:'',fee:'0'};createOperation=null;render();return;}
  if(a==='dismiss'){confirmAction=null;render();return;}
  if(['join','start','cancel','leave','winner'].includes(a)){confirmAction={type:a,match:b.dataset.match,winner:b.dataset.winner};render();const commit=root.querySelector('[data-action=commit]');commit?.focus({preventScroll:true});commit?.scrollIntoView({block:'nearest'});return;}
  if(a==='commit'&&confirmAction){const c=confirmAction;
   if(c.type==='start')return mutate('start_league_tournament',{p_tournament_id:selectedId},'Evento avviato. Il tabellone è pronto.');
   if(c.type==='cancel')return mutate('cancel_league_tournament',{p_tournament_id:selectedId},'Evento annullato.');
   if(c.type==='join')return changeEntry(true);
   if(c.type==='leave')return changeEntry(false);
   if(c.type==='winner')return mutate('record_league_winner',{p_match_id:c.match,p_winner_id:c.winner},'Risultato confermato.');
  }
 });
 notice='Caricamento eventi…';await refresh();if(state){notice='';render();}
 return {refresh};
}
window.ChampionTournaments={mountTournaments};
})();
