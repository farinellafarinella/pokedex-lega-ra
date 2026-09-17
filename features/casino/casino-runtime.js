(()=>{
'use strict';
const scriptURL=document.currentScript.src;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>new Date(x).toLocaleDateString('it-IT',{timeZone:'Europe/Rome'});
const money=x=>new Intl.NumberFormat('it-IT').format(x)+' ₽';
const errors={ACCOUNT_NOT_ACTIVE:'Accedi con un account attivo.',SELECT_THREE_DIFFERENT_CARDS:'Seleziona esattamente tre carte diverse.',CASINO_CLOSED:'Questa estrazione è chiusa. Controlla la nuova data e conferma le carte per il prossimo giovedì.',ALREADY_CONFIRMED:'Hai già confermato le carte di questo giovedì.',OPERATION_CONFLICT:'Questa conferma è già stata utilizzata con altre carte.'};
function errorText(e){if(e?.code==='PGRST202')return 'Il Casinò deve essere attivato su Supabase.';if(e?.code==='42501')return 'Il tuo accesso al Casinò non è autorizzato. Esci e accedi nuovamente.';return Object.entries(errors).find(([code])=>e.message?.includes(code))?.[1]||'Casinò non disponibile. Riprova tra poco.';}
function createCasinoAPI(client){return {
 async read(drawDate=null){const {data,error}=await client.rpc('get_casino_status',{p_draw_date:drawDate});if(error)throw error;return data;},
 async submit(cards,operation,drawDate){const {data,error}=await client.rpc('submit_casino_cards',{p_cards:cards,p_operation:operation,p_draw_date:drawDate});if(error)throw error;return data;}
};}
async function mountCasino(host,{client,api=createCasinoAPI(client),isCurrent=()=>true,onBalance=()=>{}}){
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=7',scriptURL)}"><section id="view"></section>`;
 let state=null,selected=new Set(),busy=false,loading=false,pending=null,notice='',selectedDate=null,offset=0,boundaryRequested=false,confirmation=false,diagnostic='';
 const view=root.querySelector('#view'),active=()=>host.isConnected&&isCurrent();
 const serverTime=()=>Date.now()+offset;
 const playable=()=>state?.can_play&&state.current_draw&&serverTime()<Date.parse(state.current_draw.closes_at);
 const button=(action,label,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
 function accept(data){if(!data||!Array.isArray(data.history)||!Array.isArray(data.ranking)||!Number.isFinite(Date.parse(data.server_now)))throw Error('Risposta non valida');state=data;offset=Date.parse(data.server_now)-Date.now();onBalance(data.balance);if(data.my_entry)selected=new Set(data.my_entry.cards);else if(!data.can_play)selected.clear();if(data.error_code)notice=errors[data.error_code]||data.error_code;}
 const cardImage=n=>`<img class="card-art" src="${new URL("../../c"+n+".png",scriptURL)}" alt="" draggable="false">`;
 root.addEventListener("error",e=>{if(e.target.matches?.(".card-art"))e.target.hidden=true;},true);
 function cards(values,large=false){return `<div class="draw-cards ${large?'large':''}">${(values||[]).map(n=>`<span class="result-card" aria-label="Carta ${n}"><small>LEGA</small><b>${n}</b><span>◓</span>${cardImage(n)}</span>`).join('')}</div>`;}
 function render(){if(!active())return;
  if(!state){view.innerHTML=`<h1>Casinò di Zafferanopoli</h1><p role="status">${esc(notice||'Caricamento dell’estrazione settimanale del giovedì…')}</p>${button('refresh','Riprova')}${diagnostic?`<details><summary>Dettagli dell’errore</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(diagnostic)}</pre></details>`:''}`;return;}
  const current=state.current_draw,draw=state.selected_draw,entry=state.my_entry,own=state.my_selected_entry,open=playable(),thursday=!!current;
  view.innerHTML=`<div class="eyebrow">ESTRAZIONE SETTIMANALE DEL GIOVEDÌ</div><h1>Casinò di Zafferanopoli</h1><p>Casinò consultabile tutti i giorni. Tre carte su dieci, con un’unica estrazione ogni giovedì alle 20:00.</p><div class="balance">Saldo <strong>${money(state.balance)}</strong></div><p id="notice" role="status" aria-live="polite">${esc(notice)}</p><article class="schedule"><span class="pill">${current?.status==='open'?'GIOCATE APERTE · ESTRAZIONE GIOVEDÌ ALLE 20:00':current?.status==='drawn'?'ESTRAZIONE CONCLUSA':'GIOCATE CHIUSE'}</span><h2>${current?.status==='open'?'Estrazione di giovedì '+date(current.draw_date+'T12:00:00Z'):'Le giocate riaprono giovedì'}</h2><p>${current?.status==='open'?'Scegli le carte in qualsiasi giorno e conferma entro giovedì alle 19:59:59. Una giocata per estrazione, senza modifiche dopo la conferma.':'Il Casinò è sempre consultabile: scopri risultati, storico e classifiche. Puoi confermare le carte tutta la settimana per il prossimo giovedì.'}</p><strong id="countdown" aria-live="off"></strong><small id="countdown-label"></small></article>
  ${current?.status==='open'?`<article><div class="select-head"><h2>${entry?'Giocata confermata':'Scegli esattamente 3 carte'}</h2><span>${selected.size} / 3</span></div><div class="card-grid">${Array.from({length:10},(_,i)=>i+1).map(n=>button('card',`<small>CARTA</small><b>${n}</b><span>◓</span>${cardImage(n)}`,`class="playing-card ${selected.has(n)?'selected':''}" data-card="${n}" aria-label="Carta ${n}" aria-pressed="${selected.has(n)}" ${!open||busy?'disabled':''}`)).join('')}</div>${entry?'<p class="locked">✓ Carte confermate. Non puoi più modificarle.</p>':`<p>Partecipazione gratuita · La selezione diventa definitiva solo dopo la conferma.</p>${confirmation?`<div class="confirm"><p>Confermi le carte <b>${[...selected].sort((a,b)=>a-b).join(', ')}</b>? La giocata non potrà essere modificata.</p>${button('send','Conferma definitiva',`class="primary" ${!open||busy?'disabled':''}`)}${button('cancel','Rivedi le carte',busy?'disabled':'')}</div>`:button('confirm','Conferma le 3 carte',`class="primary" ${selected.size!==3||!open||busy?'disabled':''}`)}`}</article>`:''}
  <article><h2>Premi</h2><div class="prizes">${[[3,500],[2,100],[1,20],[0,0]].map(([matches,prize])=>`<div><small>${matches} carte</small><strong>${money(prize)}</strong></div>`).join('')}</div></article>
  ${state.draws.length?`<label for="draw-date">Risultati e classifiche dei giovedì<select id="draw-date"><option value="">Ultima estrazione conclusa</option>${state.draws.map(d=>`<option value="${d.draw_date}" ${selectedDate===d.draw_date?'selected':''}>${date(d.draw_date+'T12:00:00Z')} · settimana ${d.iso_week}/${d.iso_year}</option>`).join('')}</select></label>`:''}
  <article><h2>${draw?.status==='drawn'?'Carte estratte · '+date(draw.draw_date+'T12:00:00Z'):'Risultato dell’estrazione'}</h2>${draw?.status==='drawn'?`${cards(draw.cards,true)}${own?`<p>Le tue carte: <b>${own.cards.join(', ')}</b></p><h3>${own.matches} carte indovinate · ${money(own.prize)}</h3><p>${own.prize>0?'Premio accreditato automaticamente sul tuo saldo.':'Nessun premio per questa estrazione.'}</p>`:'<p>Non hai partecipato a questa estrazione.</p>'}`:draw?'<p>Le carte saranno estratte dal server alle 20:00.</p>':'<p>Nessuna estrazione conclusa da mostrare.</p>'}</article>
  <article><h2>Classifica ${draw?.status==='drawn'?'del '+date(draw.draw_date+'T12:00:00Z'):''}</h2>${draw?.status==='drawn'?[3,2,1,0].map(matches=>`<section class="rank-group"><h3>${matches?matches+' carte indovinate':'Partecipanti senza vincita'}</h3>${state.ranking.filter(r=>r.matches===matches).map(r=>`<div class="rank-row ${r.trainer_id===state.trainer_id?'self':''}"><span>${esc(r.trainer_name)}</span><strong>${money(r.prize)}</strong></div>`).join('')||'<p class="small">Nessun partecipante in questa fascia.</p>'}</section>`).join(''):'<p>La classifica viene pubblicata dopo l’estrazione.</p>'}</article>
  <article><h2>Il tuo storico</h2>${state.history.map(h=>`<div class="history-row"><div><b>${date(h.draw_date+'T12:00:00Z')}</b><small>Carte ${h.cards.join(', ')} · ${h.settled_at?h.matches+' indovinate':'In attesa delle 20:00'}</small></div><strong>${h.settled_at?money(h.prize):'—'}</strong></div>`).join('')||'<p>Non hai ancora confermato una giocata.</p>'}</article>${button('refresh','Aggiorna risultati',busy?'disabled':'')}<p><a href="#dashboard">Torna alla Home</a></p>`;
  updateCountdown();
 }
 function updateCountdown(){if(!state||!active())return;const current=state.current_draw,until=current?.status==='open'?Date.parse(current.closes_at):Date.parse(state.next_open);let seconds=Math.max(0,Math.ceil((until-serverTime())/1000));
  const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  const el=root.querySelector('#countdown');if(el)el.textContent=`${d?d+'g ':''}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const label=root.querySelector('#countdown-label');if(label)label.textContent=current?.status==='open'?'All’estrazione del giovedì · Europe/Rome':'Al prossimo giovedì · Europe/Rome';
  if(seconds===0){root.querySelectorAll('[data-action=card],[data-action=confirm],[data-action=send]').forEach(b=>b.disabled=true);if(!boundaryRequested&&!loading&&!busy){boundaryRequested=true;refresh().finally(()=>setTimeout(()=>boundaryRequested=false,5000));}}
 }
 async function refresh(){if(loading||busy||!active())return;loading=true;try{const data=await api.read(selectedDate);if(!active())return;accept(data);diagnostic='';render();}catch(e){if(active()){console.error('Caricamento Casinò:',e);diagnostic=[e?.code,e?.message||String(e),e?.details,e?.hint].filter(Boolean).join('\n');notice=errorText(e);render();}}finally{loading=false;}}
 root.addEventListener('change',e=>{if(e.target.id==='draw-date'){selectedDate=e.target.value||null;refresh();}});
 root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled||busy||!active())return;const a=b.dataset.action;
  if(a==='refresh'){notice='';return refresh();}
  if(a==='card'){if(!playable())return;const n=Number(b.dataset.card);if(selected.has(n))selected.delete(n);else if(selected.size<3)selected.add(n);confirmation=false;render();return;}
  if(a==='confirm'){if(playable()&&selected.size===3){confirmation=true;render();}return;}
  if(a==='cancel'){confirmation=false;render();return;}
  if(a==='send'){
   if(!playable()||selected.size!==3)return;const choices=[...selected].sort((a,b)=>a-b),key=JSON.stringify(choices);
   if(!pending||pending.key!==key)pending={key,id:crypto.randomUUID()};busy=true;notice='Conferma in corso…';render();
   try{const data=await api.submit(choices,pending.id,state.current_draw.draw_date);if(!active())return;accept(data);pending=null;confirmation=false;notice=data.error_code?errors[data.error_code]:'Giocata confermata. Le carte non sono più modificabili.';}
   catch(error){notice=errorText(error);try{const data=await api.read(selectedDate);if(active()){accept(data);if(data.my_entry){pending=null;confirmation=false;notice='Giocata confermata. Le carte non sono più modificabili.';}}}catch{} }
   finally{busy=false;render();}
  }
 });
 const timer=setInterval(()=>{if(!active()){clearInterval(timer);clearInterval(poll);return;}updateCountdown();},250);
 const poll=setInterval(()=>{if(active())refresh();},15000);
 await refresh();return {refresh};
}

window.ChampionCasino={createCasinoAPI,mountCasino};
})();
