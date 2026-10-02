const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const messages={NOT_AUTHORIZED:'Accedi con una scheda allenatore attiva.',DAILY_LIMIT:'Hai completato i tre scavi di oggi. Nuovi tentativi a mezzanotte italiana.',INSUFFICIENT_BALANCE:'Pokédollari insufficienti.',DIG_ACTIVE:'Concludi prima lo scavo in corso.',NO_ACTIVE_DIG:'Lo scavo è già concluso. Aggiorna il laboratorio.',BATTLE_ACTIVE:'Riprendi e concludi la battaglia in sospeso.',TEAM_EXHAUSTED:'La squadra è esausta. Curala prima di combattere.',ITEM_NOT_OWNED:'Questo reperto non è più nello Zaino.',STALE_REVISION:'Il laboratorio è cambiato. Aggiorna e riprova.',WALL_GENERATION_FAILED:'Non riesco a preparare la parete. Riprova: nessun costo è stato addebitato.'};
export async function mountFossilLaboratory(host,{client,userId,battles=window.RouteEncounters,isCurrent=()=>true,onBalance=()=>{},section='mining'}){
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<link rel="stylesheet" href="${new URL('./online.css?v=1',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main'),key='champion:fossil-online-operation:'+userId;
 let state=null,catalog=[],busy=false,error='',tab=section,tool='pick',selected=65,pending=null;
 try{pending=JSON.parse(localStorage.getItem(key));}catch{}
 const current=()=>host.isConnected&&isCurrent();
 const item=id=>catalog.find(i=>i.id===id);
 const title=id=>item(id)?.name||id;
 function art(i){return `<span class="artifact" aria-hidden="true"><span style="width:${i.w*16}px;height:${i.h*16}px;background-position:-${i.x*16}px -${i.y*16}px"></span></span>`;}
 function render(){
  if(!current())return;
  const disabled=busy||!!pending,team=state?.team||[],level=Math.max(1,...team.map(p=>p.level)),owned=catalog.filter(i=>i.speciesId&&state?.inventory[i.id]>0),dig=state?.dig;
  main.innerHTML=`<a href="#dashboard">← Home</a><span class="eyebrow">SCAVI E RISVEGLIO</span><h1>Laboratorio Fossili</h1><p>Usa la tua squadra. Reperti, saldo e progressi vengono salvati sul tuo account.</p>
  ${error?`<p class="notice" role="alert">${esc(error)}</p>`:''}${busy?'<p role="status">Aggiornamento…</p>':''}
  ${pending?`<button data-action="retry" ${busy?'disabled':''}>Riprova l’ultima operazione</button>`:''}
  ${!state?`<button data-action="refresh" ${busy?'disabled':''}>Carica laboratorio</button>`:`
   <div class="wallet"><strong>${state.balance} ₽</strong><span>${Math.max(0,3-state.attempts)} / 3 scavi disponibili oggi</span></div>
   <nav><button data-tab="mining" aria-pressed="${tab==='mining'}">⛏ Scavi</button><button data-tab="lab" aria-pressed="${tab==='lab'}">Risveglio</button><a href="#inventory">🎒 Apri lo Zaino</a></nav>
   ${state.pending?`<section class="notice"><p>Una battaglia del laboratorio ti aspetta.</p><button data-action="resume" ${disabled?'disabled':''}>Riprendi battaglia</button></section>`:''}
   ${tab==='mining'?`<section><h2>Scavi nei sotterranei</h2><p>Piccone: colpo preciso. Martello: area più ampia, ma consuma più resistenza. Libera completamente i reperti prima del crollo.</p>
    ${!dig||dig.done?`<button data-action="dig" ${disabled||state.attempts>=3||state.pending||state.balance<50?'disabled':''}>Inizia scavo · 50 ₽</button>${state.attempts>=3?'<p>Nuovi scavi a mezzanotte, ora italiana.</p>':''}`:''}
    ${dig&&!dig.done?`<div class="wall-header"><span>${dig.count} reperti nascosti</span><label>Resistenza ${dig.health}/49 <progress max="49" value="${dig.health}"></progress></label></div>
     <div class="wall" role="group" aria-label="Parete da scavare">${dig.cells.map((cell,i)=>`<button class="cell ${i===selected?'selected':''}" data-cell="${i}" data-depth="${cell.depth}" aria-label="Colonna ${i%13+1}, riga ${Math.floor(i/13)+1}, ${cell.depth?cell.depth+' strati':'scoperta'}" aria-pressed="${i===selected}">${cell.spriteX!==undefined?`<span style="background-position:${cell.spriteX/63*100}% ${cell.spriteY/63*100}%"></span>`:''}</button>`).join('')}</div>
     <p>Tocca una casella per mirare, poi premi Scava.</p><div class="tools"><button data-tool="pick" aria-pressed="${tool==='pick'}">Piccone</button><button data-tool="hammer" aria-pressed="${tool==='hammer'}">Martello</button><button class="primary" data-action="hit" ${disabled?'disabled':''}>⛏ Scava</button></div>
     <button data-action="abandon" ${disabled?'disabled':''}>Concludi scavo</button>`:''}
    ${dig?.done?`<section class="notice"><h3>${dig.health===0?'La parete è crollata':'Scavo completato'}</h3><p>${state.loot.length?'Reperti recuperati e salvati nello Zaino:':'Nessun reperto completamente liberato.'}</p><div class="loot">${state.loot.map(id=>`<div>${art(item(id))}<span>${esc(title(id))}</span></div>`).join('')}</div><a href="#inventory">Apri lo Zaino →</a></section>`:''}</section>`:`
    <section><h2>La tua squadra</h2><p>${team.length?team.map(p=>`${esc(window.ROUTE_POKEMON_DB[p.speciesId]?.name||p.speciesId)} · Lv. ${p.level}`).join(' / '):'Scegli prima il tuo starter dalla pagina La mia squadra.'}</p><p>Il fossile si risveglia al livello del membro più forte: <strong>${level}</strong>. Potrai cambiare Pokémon durante la lotta.</p>
    <a href="#my-team">Gestisci squadra →</a><button data-action="heal" ${disabled||state.pending?'disabled':''}>Cura la squadra · Gratis</button>
    ${state.result?`<p class="notice">${state.result.outcome==='win'?`Vittoria! +${state.result.coins} Pokédollari.`:state.result.outcome==='loss'?'Squadra sconfitta.':'Battaglia conclusa.'} PS ed EXP sono salvati nella tua squadra.</p>`:''}
    <div class="fossils">${owned.length?owned.map(i=>`<article>${art(i)}<div><h3>${esc(i.pokemon)}</h3><p>${esc(i.name)} ×${state.inventory[i.id]} · Lv. ${level}</p><button data-action="revive" data-item="${esc(i.id)}" ${disabled||state.pending||!team.some(p=>p.currentHp>0)?'disabled':''}>Risveglia e combatti</button></div></article>`).join(''):'<p>Trova un fossile scavando. Il laboratorio usa quelli conservati nello Zaino principale.</p>'}</div></section>`}
   <footer><p>Risveglio gratuito: consuma un fossile. Vittoria: 200 Pokédollari ed EXP normale per i Pokémon partecipanti. Nessuna cattura.</p><button data-action="refresh" ${disabled?'disabled':''}>Aggiorna</button></footer>`}`;
 }
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error){const code=Object.keys(messages).find(k=>error.message?.includes(k));const e=Error(code?messages[code]:['PGRST202','42883','42P01'].includes(error.code)?'Il laboratorio deve essere aggiornato su Supabase. Nessun fossile è stato consumato.':'Non riesco a confermare l’operazione. Riprova.');e.definitive=!!code||['PGRST202','42883','42P01'].includes(error.code);throw e;}return data;}
 function accept(data){state=data;onBalance(data.balance);}
 async function loadCatalog(){if(!catalog.length){catalog=await fetch(new URL('./online-catalog.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Catalogo del laboratorio non disponibile.');return r.json();});}}
 async function load(){await loadCatalog();accept(await rpc('get_fossil_laboratory'));}
 async function execute(){
  if(!pending)return;
  try{const result=await rpc('fossil_laboratory_command',pending);pending=null;localStorage.removeItem(key);accept(result);}
  catch(e){if(e.definitive){pending=null;localStorage.removeItem(key);await load().catch(()=>{});}throw e;}
 }
 async function command(action,args={}){pending={p_action:action,p_operation:crypto.randomUUID(),p_revision:state.revision,p_args:args};localStorage.setItem(key,JSON.stringify(pending));await execute();}
 async function battle(){if(!state.pending)return;await battles.startPokemonEncounter({...state.pending,canCapture:false});await load();}
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled||busy||!current())return;
  if(button.dataset.tab){tab=button.dataset.tab;render();return;}
  if(button.dataset.cell!==undefined){selected=Number(button.dataset.cell);render();return;}
  if(button.dataset.tool){tool=button.dataset.tool;render();return;}
  const action=button.dataset.action;if(pending&&action!=='retry')return;
  if(action==='revive'&&!confirm(`Risvegliare ${item(button.dataset.item).pokemon}? Consumerai un fossile dello Zaino e combatterai con la tua squadra reale.`))return;
  if(action==='abandon'&&!confirm('Concludere lo scavo? Recupererai soltanto gli oggetti già completamente liberati.'))return;
  busy=true;error='';render();
  try{
   if(action==='refresh')await load();
   else if(action==='retry'){await execute();await load();}
   else if(action==='resume')await battle();
   else if(action==='heal'){await battles.healTeam();await load();}
   else if(action==='revive'){await command('revive',{item:button.dataset.item});await battle();}
   else if(action==='hit')await command('hit',{x:selected%13,y:Math.floor(selected/13),tool});
   else if(['dig','abandon'].includes(action))await command(action);
  }catch(e){error=e.message;}finally{busy=false;render();}
 });
 busy=true;render();
 try{await loadCatalog();if(pending)await execute();await load();}catch(e){error=e.message;}finally{busy=false;render();}
}
