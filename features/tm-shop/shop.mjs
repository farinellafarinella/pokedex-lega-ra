import {createTMShopAPI} from './api.mjs?v=1';
import {getPokemonById,getMoveById,typeNames} from '../pokedex/data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('it-IT')+' PD';
const label=item=>'MT'+String(item.number).padStart(2,'0');
export async function mountTMShop(host,{client,userId,isCurrent=()=>true,onBalance=()=>{}}){
 const root=host.attachShadow({mode:'open'}),api=createTMShopAPI(client,userId);
 let state=null,busy=false,message='',tab='catalog',query='',type='',choice=null;
 const selectedTM=Number(location.hash.split('/')[1]);if(Number.isInteger(selectedTM)&&selectedTM>=1&&selectedTM<=50){tab='owned';query='MT'+String(selectedTM).padStart(2,'0');}
 const current=()=>host.isConnected&&isCurrent();
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=1',import.meta.url)}"><main><a href="#dashboard">← Home</a><header><span class="disc" aria-hidden="true">MT</span><div><span class="eyebrow">NUOVE MOSSE, NUOVE STRATEGIE</span><h1>Negozio MT</h1></div></header><p>Acquista con i tuoi Pokédollari e insegna le mosse ai Pokémon della tua squadra. Ogni MT si consuma dopo un insegnamento riuscito.</p><p class="message" data-message role="status" aria-live="polite"></p><div data-content></div><dialog aria-labelledby="tm-dialog-title"><div data-dialog></div></dialog></main>`;
 const content=root.querySelector('[data-content]'),dialog=root.querySelector('dialog');
 const pokemonName=p=>getPokemonById(p.speciesId)?.name||'#'+p.speciesId;
 const canTeach=(item,p)=>item.compatible.includes(p.uid)&&!p.moves.includes(item.move_key);
 function render(){if(!current())return;
  const pending=api.pending();root.querySelector('[data-message]').textContent=(busy?'Attendi… ': '')+message;
  if(!state){content.innerHTML='<button data-action="reload" '+(busy?'disabled':'')+'>Carica negozio</button>';return;}
  content.innerHTML=`<div class="toolbar"><strong>Saldo disponibile: ${money(state.balance)}</strong><a href="#my-team">La mia squadra</a><a href="#inventory">Zaino</a><button data-action="reload" ${busy?'disabled':''}>Aggiorna</button></div>${pending?'<aside><p>Un’operazione è in attesa di conferma. Puoi verificarla anche dopo aver ricaricato la pagina.</p><button class="primary" data-action="retry" '+(busy?'disabled':'')+'>Verifica operazione</button></aside>':''}<nav aria-label="Sezioni MT"><button data-tab="catalog" aria-pressed="${tab==='catalog'}">Tutte le MT</button><button data-tab="owned" aria-pressed="${tab==='owned'}">Le mie MT · ${state.items.reduce((n,i)=>n+i.quantity,0)}</button></nav><div class="filters"><label>Cerca MT o mossa<input data-query type="search" value="${esc(query)}" placeholder="Es. Tossina o MT06"></label><label>Tipo<select data-type><option value="">Tutti i tipi</option>${[...new Set(state.items.map(i=>i.move_data.type))].sort().map(t=>`<option value="${esc(t)}" ${t===type?'selected':''}>${esc(typeNames[t]||'Speciale')}</option>`).join('')}</select></label></div><div class="offers" data-offers></div>`;
  renderOffers();
 }
 function renderOffers(){if(!current()||!state)return;
  const q=query.toLocaleLowerCase('it').trim(),pending=api.pending(),items=state.items.filter(i=>(tab==='owned'?i.quantity>0:i.active)&&(!type||i.move_data.type===type)&&(!q||(`${label(i)} ${i.move_data.name}`.toLocaleLowerCase('it').includes(q)||String(i.number)===q)));
  root.querySelector('[data-offers]').innerHTML=items.length?items.map(item=>{const m=item.move_data,eligible=state.team.filter(p=>canTeach(item,p));return `<article data-tm="${item.number}"><div class="card-head"><span class="disc small" aria-hidden="true">${String(item.number).padStart(2,'0')}</span><span class="tag">${esc(typeNames[m.type]||'Speciale')}</span></div><small>${label(item)} · MONOUSO</small><h2>${esc(m.name)}</h2><p>${m.category==='status'?'Stato':m.category==='physical'?'Fisica':'Speciale'} · Potenza ${m.power||'—'}<br>Precisione ${m.accuracy||'—'} · PP ${m.pp}</p><p class="compatibility">${eligible.length?'Può impararla: '+eligible.map(p=>esc(pokemonName(p))).join(', '):'Nessun Pokémon della tua squadra può impararla adesso.'}</p><p>Nello Zaino: <strong>${item.quantity}</strong></p><div class="card-actions">${item.active?`<button data-action="buy" data-tm="${item.number}" ${busy||pending||state.balance<item.price?'disabled':''}>Compra 1 · ${money(item.price)}</button>`:''}${item.quantity>0?`<button class="primary" data-action="teach" data-tm="${item.number}" ${busy||pending||!eligible.length||state.pending?'disabled':''}>Insegna mossa</button>`:''}</div></article>`;}).join(''):'<section class="empty"><h2>'+ (tab==='owned'?'Nessuna MT trovata nello Zaino':'Nessuna MT trovata')+'</h2><p>'+ (tab==='owned'?'Acquista una MT oppure modifica i filtri.':'Prova un altro nome o tipo.')+'</p></section>';
 }
 async function load(){state=await api.read();if(current())onBalance(state.balance);}
 function openChoice(action,item){
  choice={action,item,inventoryRevision:state.inventoryRevision,teamRevision:state.teamRevision};
  const body=root.querySelector('[data-dialog]');
  if(action==='buy')body.innerHTML=`<h2 id="tm-dialog-title">Compra ${label(item)} · ${esc(item.move_data.name)}</h2><p>Una MT monouso verrà aggiunta al tuo Zaino.</p><p>Prezzo: <strong>${money(item.price)}</strong><br>Saldo dopo l’acquisto: ${money(state.balance-item.price)}</p><div class="dialog-actions"><button data-action="cancel">Annulla</button><button class="primary" data-action="confirm">Conferma acquisto</button></div>`;
  else body.innerHTML=`<h2 id="tm-dialog-title">Insegna ${esc(item.move_data.name)}</h2><p>Verrà consumata una ${label(item)}. Scegli il Pokémon a cui insegnarla.</p><label>Pokémon<select data-member required><option value="" disabled selected>Scegli un Pokémon</option>${state.team.filter(p=>canTeach(item,p)).map(p=>`<option value="${esc(p.uid)}">${esc(pokemonName(p))} · Lv. ${p.level}</option>`).join('')}</select></label><div data-move-choice></div><div class="dialog-actions"><button data-action="cancel">Annulla</button><button class="primary" data-action="confirm" disabled>Conferma insegnamento</button></div>`;
  dialog.showModal();
 }
 async function send(retry=false){
  let result;
  if(retry)result=await api.retry();
  else{const c=choice,args={p_action:c.action,p_tm:c.item.number,p_inventory_revision:c.inventoryRevision};if(c.action==='buy')args.p_catalog_revision=c.item.revision;else{args.p_team_revision=c.teamRevision;args.p_uid=c.uid;args.p_slot=c.slot??null;}result=await api.command(args);}
  state=result;choice=null;if(current())onBalance(state.balance);
  message=result.event.action==='buy'?`${result.event.name}: MT aggiunta allo Zaino. Pagati ${money(result.event.price)}.`:`Mossa appresa: ${result.event.name}. Una MT è stata consumata.`;
  if(result.replayed)message+=' Operazione già salvata, verificata senza ripeterla.';
  window.dispatchEvent(new CustomEvent('route-team-updated'));
 }
 root.addEventListener('input',e=>{if(e.target.matches('[data-query]')){query=e.target.value;renderOffers();}});
 root.addEventListener('change',e=>{
  if(e.target.matches('[data-type]')){type=e.target.value;renderOffers();}
  if(e.target.matches('[data-member]')){
   choice.uid=e.target.value;choice.slot=null;const p=state.team.find(p=>p.uid===choice.uid),full=p.moves.length>=4;
   root.querySelector('[data-move-choice]').innerHTML=full?`<p>${esc(pokemonName(p))} conosce già quattro mosse. Scegli quale dimenticare:</p><label>Mossa da sostituire<select data-slot required><option value="" selected disabled>Scegli una mossa</option>${p.moves.map((key,index)=>`<option value="${index}">${esc(getMoveById(key)?.name||key)}</option>`).join('')}</select></label>`:`<p>${esc(pokemonName(p))} imparerà la mossa nel posto libero.</p>`;
   root.querySelector('[data-action="confirm"]').disabled=full;
  }
  if(e.target.matches('[data-slot]')){choice.slot=Number(e.target.value);root.querySelector('[data-action="confirm"]').disabled=false;}
 });
 dialog.addEventListener('close',()=>{if(!busy&&!dialog.open)choice=null;});
 root.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||b.disabled||busy||!current())return;
  if(b.dataset.tab){tab=b.dataset.tab;render();return;}
  const action=b.dataset.action;
  if(action==='cancel'){dialog.close();choice=null;return;}
  if(action==='buy'||action==='teach'){const item=state.items.find(i=>i.number===Number(b.dataset.tm));openChoice(action,item);return;}
  if(!['confirm','retry','reload'].includes(action))return;
  busy=true;message='';if(action==='confirm')dialog.close();render();
  try{if(action==='reload')await load();else await send(action==='retry');}
  catch(e){message=e.message;try{await load();}catch{} }
  finally{busy=false;render();}
 });
 busy=true;render();try{await load();}catch(e){message=e.message;}finally{busy=false;render();}
}
