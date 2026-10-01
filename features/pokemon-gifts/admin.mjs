const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountPokemonGifts(host,{client,userId,isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'}),key='champion:pokemon-gift-send:'+userId;
 let trainers=[],history=[],selected=new Set(),species=1,level=5,query='',busy=false,review=false,message='',pending=null;
 try{pending=JSON.parse(localStorage.getItem(key)||'null');if(pending?.p_operation){selected=new Set(pending.p_recipients);species=pending.p_species;level=pending.p_level;review=true;message='Un invio precedente è in attesa di conferma. Riprova per verificarlo senza duplicare i regali.';}else pending=null;}catch{pending=null;}
 const active=()=>host.isConnected&&isCurrent(),db=globalThis.ROUTE_POKEMON_DB;
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css',import.meta.url)}"><main><a href="#admin">← Amministrazione</a><h1>Invia Pokémon in regalo</h1><p>Scegli esattamente chi deve riceverlo. Ogni destinatario selezionato riceve un Pokémon.</p><p role="status" data-message></p><div data-body></div></main>`;
 const status=()=>{root.querySelector('[data-message]').textContent=message;};
 const errors=e=>({ADMIN_REQUIRED:'Solo un amministratore attivo può inviare regali.',INVALID_RECIPIENTS:'Un destinatario non è più attivo. Aggiorna la pagina e verifica la selezione.',SELECT_RECIPIENTS:'Seleziona da 1 a 100 allenatori.',INVALID_POKEMON:'Seleziona un Pokémon e un livello tra 1 e 100.',OPERATION_MISMATCH:'L’invio in attesa non corrisponde alla selezione. Ricarica la pagina.'}[e.message]||'Invio non confermato. Riprova: lo stesso regalo non verrà inviato due volte.');
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 function recipients(){const q=query.trim().toLocaleLowerCase('it');return trainers.filter(t=>!q||(t.name+' '+t.code).toLocaleLowerCase('it').includes(q));}
 function list(){const container=root.querySelector('[data-recipients]');if(!container)return;container.innerHTML=recipients().map(t=>`<label class="recipient"><input type="checkbox" data-recipient="${esc(t.id)}" ${selected.has(t.id)?'checked':''} ${busy||pending?'disabled':''}><span><b>${esc(t.name)}</b><small>${esc(t.code)}</small></span></label>`).join('')||'<p>Nessun allenatore trovato.</p>';}
 function render(){
  if(!active())return;status();
  const p=db[species],names=Array.from(selected,id=>trainers.find(t=>t.id===id)).filter(Boolean),locked=busy||!!pending;
  root.querySelector('[data-body]').innerHTML=`${review?`<section><h2>Controlla l’invio</h2><img src="${esc(p.sprites.front)}" alt="${esc(p.name)}" width="96" height="96"><p><b>${esc(p.name)} · Livello ${level}</b></p><p>Destinatari: <b>${selected.size}</b></p><ul>${names.map(t=>`<li>${esc(t.name)} · ${esc(t.code)}</li>`).join('')}</ul><p>Riceveranno il popup: “Hai ricevuto un regalo, controlla la tua squadra Pokémon”. Se la squadra è piena, il regalo resterà in attesa della loro scelta.</p><button data-action="send" ${busy?'disabled':''}>${pending?'Verifica / riprova lo stesso invio':'Invia a '+selected.size+' allenatori'}</button>${!pending?'<button data-action="edit">Modifica selezione</button>':''}</section>`:`<section><div class="fields"><label>Pokémon<select data-species ${locked?'disabled':''}>${Object.values(db).map(p=>`<option value="${p.id}" ${p.id===species?'selected':''}>#${p.id} ${esc(p.name)}</option>`).join('')}</select></label><label>Livello<input data-level type="number" min="1" max="100" value="${level}" ${locked?'disabled':''}></label></div><h2>Destinatari</h2><label>Cerca per nome o codice allenatore<input data-search value="${esc(query)}" placeholder="Nome oppure TR-…" type="search"></label><p><b data-count>${selected.size}</b> selezionati · Nessun invio agli altri allenatori</p><div class="recipients" data-recipients></div><button data-action="review" ${!selected.size||busy?'disabled':''}>Controlla e invia</button></section>`}<section><h2>I tuoi ultimi invii</h2>${history.map(h=>`<article><b>${esc(db[h.species_id]?.name)} · Lv. ${h.level}</b><p>${h.count} destinatari · ${new Date(h.created_at).toLocaleString('it-IT')}</p><details><summary>Destinatari</summary><ul>${(h.recipients||[]).map(t=>`<li>${esc(t.name)} · ${esc(t.code)}</li>`).join('')}</ul></details></article>`).join('')||'<p>Nessun invio registrato.</p>'}</section>`;
  list();
 }
 async function refresh(){const data=await rpc('get_admin_pokemon_gifts');trainers=data.trainers;history=data.history;}
 root.addEventListener('input',e=>{
  if(e.target.matches('[data-search]')){query=e.target.value;list();}
  if(e.target.matches('[data-species]'))species=Number(e.target.value);
  if(e.target.matches('[data-level]'))level=Number(e.target.value);
 });
 root.addEventListener('change',e=>{const id=e.target.dataset.recipient;if(!id||busy||pending)return;if(e.target.checked)selected.add(id);else selected.delete(id);root.querySelector('[data-count]').textContent=selected.size;root.querySelector('[data-action="review"]').disabled=!selected.size;});
 root.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||busy||!active())return;
  if(b.dataset.action==='edit'){review=false;render();return;}
  if(b.dataset.action==='review'){
   if(!Number.isInteger(level)||level<1||level>100||!db[species]){message='Il livello deve essere un intero tra 1 e 100.';status();return;}
   if(selected.size>100){message='Puoi selezionare al massimo 100 allenatori per invio.';status();return;}
   review=true;message='';render();return;
  }
  if(b.dataset.action==='send'){
   pending=pending||{p_operation:crypto.randomUUID(),p_recipients:[...selected].sort(),p_species:species,p_level:level};
   try{localStorage.setItem(key,JSON.stringify(pending));}catch{}
   busy=true;message='Invio in corso…';render();
   try{const result=await rpc('admin_send_pokemon_gift',pending);pending=null;try{localStorage.removeItem(key);}catch{}selected.clear();review=false;message=`Regalo inviato a ${result.count} allenatori. Gli altri non hanno ricevuto nulla.`;try{await refresh();}catch{} }
   catch(error){message=errors(error);if(['ADMIN_REQUIRED','INVALID_RECIPIENTS','SELECT_RECIPIENTS','INVALID_POKEMON'].includes(error.message)){pending=null;review=false;try{localStorage.removeItem(key);}catch{}try{await refresh();selected=new Set([...selected].filter(id=>trainers.some(t=>t.id===id)));}catch{}}}
   finally{busy=false;render();}
  }
 });
 try{await refresh();render();}catch{message='Gestione regali non disponibile. Verifica l’accesso admin e la migrazione admin-pokemon-gifts.sql.';status();}
}
