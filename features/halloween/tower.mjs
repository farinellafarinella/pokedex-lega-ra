const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors={HALLOWEEN_CLOSED:'La torre è aperta dal 1° al 31 ottobre.',FLOOR_LOCKED:'Questo piano non è ancora aperto.',NOT_ENOUGH_CANDIES:'Servono 250 caramelle per la Spettrosonda.',SCOPE_REQUIRED:'Ti serve la Spettrosonda per rivelare Marowak.',STARTER_REQUIRED:'Scegli prima il tuo starter nella pagina squadra.',TEAM_EXHAUSTED:'La squadra è esausta. Curala prima di combattere.',BATTLE_ACTIVE:'Hai un incontro in sospeso. Riprendilo dalla pagina squadra.',NOT_AUTHORIZED:'Accedi con una scheda allenatore attiva.'};
export async function mountHalloween(host,{client,isCurrent=()=>true,battles=globalThis.RouteEncounters,onGift=()=>{}}){
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=1',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main');let state=null,busy=false,message='',selected=null,room=false;
 const current=()=>host.isConnected&&isCurrent();
 const errorText=e=>Object.entries(errors).find(([code])=>e?.message?.includes(code))?.[1]||'Non riesco a confermare l’azione. Premi Aggiorna per recuperare i progressi salvati.';
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 function render(){
  if(!current())return;
  if(!state){main.innerHTML='<h1>Torre di Lavandonia</h1><p role="status">'+esc(message||'Caricamento della torre…')+'</p><button data-action="refresh">Riprova</button><a href="#dashboard">← Home</a>';return;}
  const floor=state.floors.find(f=>f.floor===selected),completed=state.floors.filter(f=>f.completed).length;
  const disabled=busy||!state.open||!!state.pending;
  main.innerHTML=`<header><a href="#dashboard">← Home</a><span class="eyebrow">HALLOWEEN · OTTOBRE ${esc(state.season)}</span><h1>Torre di<br><em>Lavandonia</em></h1><p>Le luci si accendono, un piano alla volta.<br>Scegli: dolcetto o scherzetto?</p></header>
   <div class="wallet"><span>🍬 <strong>${state.candies}</strong> caramelle</span><span>${completed} / 31 piani risolti</span></div>
   <button data-action="floors" ${busy?'disabled':''}>Scegli un piano ↓</button>
   <p role="status" aria-live="polite">${esc(message)}</p>
   ${!state.open?'<section class="notice">L’evento è aperto dal 1° al 31 ottobre. I progressi restano salvati; fuori ottobre gli incontri in sospeso si possono concludere, ma non assegnano premi.</section>':''}
   ${state.pending?`<section class="notice"><h2>Uno spettro ti aspetta</h2><p>Riprendi l’incontro prima di scegliere un’altra prova.</p><button data-action="resume" ${busy?'disabled':''}>Riprendi battaglia</button></section>`:''}
   <div class="layout"><section class="tower" aria-label="Piani della torre"><div class="roof" aria-hidden="true">☾</div><div class="floors">${[...state.floors].reverse().map(f=>`<button class="floor ${f.completed?'solved':f.unlocked?'lit':'locked'} ${selected===f.floor?'selected':''}" data-floor="${f.floor}" ${busy||!f.unlocked?'disabled':''} aria-label="Piano ${f.floor}${f.completed?', completato':f.unlocked?', disponibile':', si apre il '+f.floor+' ottobre'}" aria-pressed="${selected===f.floor}"><span>${f.completed?'✓':f.unlocked?'✦':'🔒'}</span><b>${f.floor}</b><small>${f.completed?'Risolto':f.unlocked?'Entra':f.floor+' ott.'}</small></button>`).join('')}</div><p>Un piano al giorno. Quelli precedenti restano recuperabili per tutto ottobre.</p></section>
   <div class="adventure"><section class="challenge" aria-label="Prova del piano">${floor?`<span class="eyebrow">PIANO ${floor.floor}</span><h2>${floor.completed?'Una luce nella nebbia':'Dolcetto o scherzetto?'}</h2>${floor.completed?'<p>Hai già ricevuto le 10 caramelle di questo piano. Scegli un altro piano per continuare.</p>':`<p>Supera una delle due prove per ricevere <strong>10 caramelle</strong>. Hai un solo tentativo al quiz. Se sbagli, dovrai vincere la battaglia; se perdi, puoi riprovarla.</p>${floor.quizFailed?'<p class="notice">Hai sbagliato il quiz. Per completare questo piano rimane soltanto Scherzetto.</p>':''}<div class="choices">${!floor.quizFailed?`<button data-action="quiz" ${disabled?'disabled':''}>🍬 Dolcetto<small>Rispondi a un quiz</small></button>`:''}<button data-action="battle" ${disabled?'disabled':''}>👻 Scherzetto<small>Sfida Gastly, Haunter o Misdreavus</small></button></div>${floor.quiz&&!floor.quizFailed?`<fieldset ${disabled?'disabled':''}><legend>${esc(floor.quiz.question)}</legend>${floor.quiz.options.map((option,i)=>`<button data-answer="${i}">${esc(option)}</button>`).join('')}</fieldset>`:''}`}`:'<h2>Scegli un piano illuminato</h2><p>Ogni prova superata ti avvicina al mistero della stanza speciale.</p>'}</section>
   <section class="scope"><span class="eyebrow">LO STRUMENTO DEL MISTERO</span><h2>Spettrosonda</h2>${state.scope?'<p>✓ È nel tuo zaino. Puoi rivelare lo spettro nella stanza speciale.</p><a href="#inventory">Apri lo zaino →</a>':`<p>Sblocca la Spettrosonda con <strong>250 caramelle</strong>: bastano 25 piani completati.</p><progress aria-label="Caramelle per la Spettrosonda" max="250" value="${Math.min(250,state.candies)}"></progress><button data-action="scope" ${disabled||state.candies<250?'disabled':''}>Sblocca · 250 caramelle</button>`}</section>
   <section class="special"><span class="eyebrow">STANZA SPECIALE DI LAVANDONIA</span><h2>${state.cubone?'Lo spirito ha trovato pace':room&&state.scope?'Lo spettro è Marowak!':'Un lamento oltre la porta'}</h2>${room?state.cubone?'<p>Hai sconfitto Marowak e ottenuto Cubone di livello 5 come regalo. Se la squadra è piena, il regalo resta in attesa della tua scelta.</p><a href="#my-team">Controlla la tua squadra →</a>':state.scope?`<img class="ghost" src="${esc(globalThis.ROUTE_POKEMON_DB?.[105]?.sprites.front||'')}" alt="Marowak" width="112" height="112"><p>La Spettrosonda rivela Marowak. Sconfiggilo con la tua squadra e riceverai <strong>Cubone di livello 5</strong>, una sola volta.</p><button data-action="boss" ${disabled?'disabled':''}>Affronta Marowak</button><p>La Spettrosonda non si consuma. Se perdi puoi riprovare.</p>`:'<div class="unknown" aria-label="Spettro misterioso">👻</div><p>«Vattene…» Una presenza ti impedisce di proseguire. Solo la Spettrosonda può rivelare chi si nasconde qui.</p>':`<p>Qualcuno veglia sulla torre. Entra e scopri il suo segreto.</p><button data-action="room" ${busy?'disabled':''}>Visita la stanza</button>`}</section></div></div>
   <footer><button data-action="refresh" ${busy?'disabled':''}>Aggiorna</button><button data-action="heal" ${busy||state.pending?'disabled':''}>Cura la squadra · Gratis</button><a href="#my-team">La mia squadra</a><p>I Pokémon affrontati non vengono catturati. Cubone è il regalo finale. Le caramelle avanzate restano nel saldo dell’evento.</p></footer>`;
 }
 async function load(){state=await rpc('get_halloween_event');if(selected===null)selected=state.floors.find(f=>f.unlocked&&!f.completed)?.floor||state.floors.find(f=>f.unlocked)?.floor||null;}
 async function fight(){
  if(!state.pending)return;
  const isBoss=state.pending.speciesId===105;
  const result=await battles.startPokemonEncounter({...state.pending,background:'halloween'});
  if(!current())return;
  await load();
  message=result?.result==='win'?(isBoss&&state.cubone?'Marowak è stato sconfitto! Hai ricevuto Cubone di livello 5.':state.open?'Piano completato: +10 caramelle!':'Incontro concluso. L’evento è terminato.'):'Incontro concluso. Puoi curare la squadra e riprovare.';
  if(isBoss&&state.cubone)await onGift();
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled||busy||!current())return;
  if(button.dataset.floor){selected=Number(button.dataset.floor);message='';render();root.querySelector('.challenge').scrollIntoView({block:'start'});return;}
  const action=button.dataset.action;if(action==='floors'){root.querySelector('.tower').scrollIntoView({block:'start'});return;}if(action==='room'){room=true;render();return;}
  busy=true;message='';render();
  try{
   if(action==='refresh')await load();
   else if(action==='heal'){await battles.healTeam();message='La squadra è di nuovo in salute.';}
   else if(action==='resume')await fight();
   else{
    state=await rpc('halloween_command',{p_action:button.hasAttribute('data-answer')?'answer':action,p_floor:selected,p_answer:button.hasAttribute('data-answer')?Number(button.dataset.answer):null});
    message=state.message||'';
    if((action==='battle'||action==='boss')&&state.pending)await fight();
   }
  }catch(e){message=errorText(e);try{await load();}catch{} }
  finally{busy=false;render();}
 });
 render();try{await load();}catch(e){message=errorText(e);}render();
}
