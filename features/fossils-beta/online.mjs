const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const messages={NOT_AUTHORIZED:'Accedi con una scheda allenatore attiva.',DAILY_LIMIT:'Hai completato i tre scavi di oggi. Nuovi tentativi a mezzanotte italiana.',INSUFFICIENT_BALANCE:'Pokédollari insufficienti.',DIG_ACTIVE:'Concludi prima lo scavo in corso.',NO_ACTIVE_DIG:'Lo scavo è già concluso. Aggiorna il laboratorio.',BATTLE_ACTIVE:'Riprendi e concludi la battaglia in sospeso.',TEAM_EXHAUSTED:'La squadra è esausta. Curala prima di combattere.',ITEM_NOT_OWNED:'Questo reperto non è più nello Zaino.',STALE_REVISION:'Il laboratorio è cambiato. Aggiorna e riprova.',WALL_GENERATION_FAILED:'Non riesco a preparare la parete. Riprova: nessun costo è stato addebitato.'};
export async function mountFossilLaboratory(host,{client,userId,battles=window.RouteEncounters,isCurrent=()=>true,onBalance=()=>{},section='mining'}){
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<link rel="stylesheet" href="${new URL('./online.css?v=mining-touch-3',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main'),key='champion:fossil-online-operation:'+userId;
 let recovered=new Set();
 let state=null,catalog=[],busy=false,error='',tab=section,tool='pick',selected=65,pending=null;
 try{pending=JSON.parse(localStorage.getItem(key));}catch{}
 const current=()=>host.isConnected&&isCurrent();
 const item=id=>catalog.find(i=>i.id===id);
 const title=id=>item(id)?.name||id;
 function art(i){return `<span class="artifact" aria-hidden="true"><span style="width:${i.w*16}px;height:${i.h*16}px;background-position:-${i.x*16}px -${i.y*16}px"></span></span>`;}
 function sprite(x,y,w,h,sheet='board_sheet'){return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><image href="${new URL('./mining/assets/'+sheet+'.png',import.meta.url)}" x="${-x}" y="${-y}" width="${sheet==='health_bar'?128:512}" height="${sheet==='health_bar'?128:512}" /></svg>`;}
 function cracks(health){
  if(health===49)return '';
  const damage=51-health,count=Math.floor(damage/6),parts=[[65,0,15],[60,25,20],[57,50,23],[12,0,28],[8,25,32],[5,50,35]],part=parts[damage%6];
  return '<div class="cracks">'+Array.from({length:count},()=>'<span style="width:11.54%">'+sprite(85,0,24,25,'health_bar')+'</span>').join('')+'<span style="width:'+part[2]/208*100+'%">'+sprite(part[0],part[1],part[2],25,'health_bar')+'</span></div>';
 }
 function recoveredCells(dig){
  const result=new Set();if(!dig)return result;
  for(const [index,cell] of dig.cells.entries()){
   if(cell.spriteX===undefined)continue;
   for(const object of catalog){
    const dx=cell.spriteX-object.x,dy=cell.spriteY-object.y;
    if(dx<0||dy<0||dx>=object.w||dy>=object.h||!object.mask?.[dy]?.[dx])continue;
    const ox=index%13-dx,oy=Math.floor(index/13)-dy,indices=[];
    if(ox<0||oy<0||ox+object.w>13||oy+object.h>10)continue;
    let complete=true;
    for(let y=0;y<object.h;y++)for(let x=0;x<object.w;x++)if(object.mask[y][x]){
     const i=(oy+y)*13+ox+x,c=dig.cells[i];indices.push(i);
     if(c.depth!==0||c.spriteX!==object.x+x||c.spriteY!==object.y+y)complete=false;
    }
    if(complete)indices.forEach(i=>result.add(i));
   }
  }
  return result;
 }
 function updateAim(){
  root.querySelectorAll('[data-cell]').forEach(cell=>{const active=Number(cell.dataset.cell)===selected;cell.classList.toggle('selected',active);cell.setAttribute('aria-pressed',String(active));});
  const output=root.querySelector('.touch-mining output');if(output)output.textContent=`Colonna ${selected%13+1} · Riga ${Math.floor(selected/13)+1}`;
 }
 function render(){
  if(!current())return;
  const disabled=busy||!!pending,team=state?.team||[],level=Math.max(1,...team.map(p=>p.level)),owned=catalog.filter(i=>i.speciesId&&state?.inventory[i.id]>0),dig=state?.dig;
  main.innerHTML=`<a href="#dashboard">← Home</a><span class="eyebrow">SCAVI E RISVEGLIO</span><h1>Laboratorio Fossili</h1><p>Usa la tua squadra. Reperti, saldo e progressi vengono salvati sul tuo account.</p>
  ${error?`<p class="notice" role="alert">${esc(error)}</p>`:''}<p class="operation-status" role="status">${busy?'Salvataggio…':'&nbsp;'}</p>
  ${pending?`<button data-action="retry" ${busy?'disabled':''}>Riprova l’ultima operazione</button>`:''}
  ${!state?`<button data-action="refresh" ${busy?'disabled':''}>Carica laboratorio</button>`:`
   <div class="wallet"><strong>${state.balance} ₽</strong><span>${Math.max(0,3-state.attempts)} / 3 scavi disponibili oggi</span></div>
   <nav><button data-tab="mining" aria-pressed="${tab==='mining'}">⛏ Scavi</button><button data-tab="lab" aria-pressed="${tab==='lab'}">Risveglio</button><a href="#inventory">🎒 Apri lo Zaino</a></nav>
   ${state.pending?`<section class="notice"><p>Una battaglia del laboratorio ti aspetta.</p><button data-action="resume" ${disabled?'disabled':''}>Riprendi battaglia</button></section>`:''}
   ${tab==='mining'?`<section><h2>Scavi nei sotterranei</h2><p>Piccone: colpo preciso. Martello: area più ampia, ma consuma più resistenza. Libera completamente i reperti prima del crollo.</p>
    ${!dig||dig.done?`<button data-action="dig" ${disabled||state.attempts>=3||state.pending||state.balance<50?'disabled':''}>Inizia scavo · 50 ₽</button>${state.attempts>=3?'<p>Nuovi scavi a mezzanotte, ora italiana.</p>':''}`:''}
    ${dig?`<div class="wall-header"><span>${dig.count} reperti nascosti</span><label>Resistenza ${dig.health}/49 <progress max="49" value="${dig.health}"></progress></label></div>
     <div class="mining-board"><div class="board-art">${sprite(80,144,256,192)}</div>${cracks(dig.health)}<div class="wall" role="group" aria-label="Parete da scavare">${dig.cells.map((cell,i)=>`<button class="cell ${recovered.has(i)?'recovered':''} ${i===selected?'selected':''}" data-cell="${i}" ${dig.done?'disabled':''} style="--terrain-x:${(cell.depth?1+cell.depth:1)/31*100}%" data-depth="${cell.depth}" aria-label="Colonna ${i%13+1}, riga ${Math.floor(i/13)+1}, ${cell.depth?cell.depth+' strati':'scoperta'}" aria-pressed="${i===selected}">${cell.spriteX!==undefined?`<span style="background-position:${cell.spriteX/63*100}% ${cell.spriteY/63*100}%"></span>`:''}</button>`).join('')}</div>
     <div class="board-tools"><button data-tool="pick" aria-label="Piccone" title="Piccone" aria-pressed="${tool==='pick'}">${sprite(tool==='pick'?272:224,416,48,64)}</button><button data-tool="hammer" aria-label="Martello" title="Martello" aria-pressed="${tool==='hammer'}">${sprite(tool==='hammer'?272:224,352,48,64)}</button></div></div>
     <div class="touch-mining"><p>Tocca una casella per mirare, correggi con le frecce e premi <b>Scava</b>.</p><div class="aim-pad"><button data-step="up" aria-label="Mira in alto">▲</button><button data-step="left" aria-label="Mira a sinistra">◀</button><button class="primary" data-action="hit" ${disabled||dig.done?'disabled':''}>⛏ Scava</button><button data-step="right" aria-label="Mira a destra">▶</button><button data-step="down" aria-label="Mira in basso">▼</button></div><output aria-live="polite">Colonna ${selected%13+1} · Riga ${Math.floor(selected/13)+1}</output></div><p class="desktop-hint">Scegli piccone o martello e clicca sulla parete per scavare.</p>
     <button data-action="abandon" ${disabled||dig.done?'disabled':''}>Concludi scavo</button>`:''}
    ${dig?.done?`<section class="notice"><h3>${dig.health===0?'La parete è crollata':'Scavo completato'}</h3><p>${state.loot.length?'Reperti recuperati e salvati nello Zaino:':'Nessun reperto completamente liberato.'}</p><div class="loot">${state.loot.map(id=>`<div>${art(item(id))}<span>${esc(title(id))}</span></div>`).join('')}</div><a href="#inventory">Apri lo Zaino →</a></section>`:''}</section>`:`
    <section><h2>La tua squadra</h2><p>${team.length?team.map(p=>`${esc(window.ROUTE_POKEMON_DB[p.speciesId]?.name||p.speciesId)} · Lv. ${p.level}`).join(' / '):'Scegli prima il tuo starter dalla pagina La mia squadra.'}</p><p>Il fossile si risveglia al livello del membro più forte: <strong>${level}</strong>. Potrai cambiare Pokémon durante la lotta.</p>
    <a href="#my-team">Gestisci squadra →</a><button data-action="heal" ${disabled||state.pending?'disabled':''}>Cura la squadra · Gratis</button>
    ${state.result?`<p class="notice">${state.result.outcome==='win'?`Vittoria! +${state.result.coins} Pokédollari.`:state.result.outcome==='loss'?'Squadra sconfitta.':'Battaglia conclusa.'} PS ed EXP sono salvati nella tua squadra.</p>`:''}
    <div class="fossils">${owned.length?owned.map(i=>`<article>${art(i)}<div><h3>${esc(i.pokemon)}</h3><p>${esc(i.name)} ×${state.inventory[i.id]} · Lv. ${level}</p><button data-action="revive" data-item="${esc(i.id)}" ${disabled||state.pending||!team.some(p=>p.currentHp>0)?'disabled':''}>Risveglia e combatti</button></div></article>`).join(''):'<p>Trova un fossile scavando. Il laboratorio usa quelli conservati nello Zaino principale.</p>'}</div></section>`}
   <footer><p>Risveglio gratuito: consuma un fossile. Vittoria: 200 Pokédollari ed EXP normale per i Pokémon partecipanti. Nessuna cattura.</p><button data-action="refresh" ${disabled?'disabled':''}>Aggiorna</button></footer>`}`;
 }
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error){const code=Object.keys(messages).find(k=>error.message?.includes(k));const e=Error(code?messages[code]:['PGRST202','42883','42P01'].includes(error.code)?'Il laboratorio deve essere aggiornato su Supabase. Nessun fossile è stato consumato.':'Non riesco a confermare l’operazione. Riprova.');e.definitive=!!code||['PGRST202','42883','42P01'].includes(error.code);throw e;}return data;}
 function accept(data){recovered=recoveredCells(data.dig);state=data;onBalance(data.balance);}
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
  if(button.dataset.step){const [dx,dy]=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[button.dataset.step];selected=Math.max(0,Math.min(9,Math.floor(selected/13)+dy))*13+Math.max(0,Math.min(12,selected%13+dx));updateAim();return;}
  if(button.dataset.cell!==undefined){selected=Number(button.dataset.cell);if(matchMedia('(max-width: 760px), (pointer: coarse)').matches){updateAim();return;}}
  if(button.dataset.tool){tool=button.dataset.tool;root.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===tool;b.setAttribute('aria-pressed',String(active));b.innerHTML=sprite(active?272:224,b.dataset.tool==='pick'?416:352,48,64);});return;}
  const action=button.dataset.cell!==undefined?'hit':button.dataset.action;if((action==='hit'||action==='abandon')&&state?.dig?.done)return;if(pending&&action!=='retry')return;
  if(action==='revive'&&!confirm(`Risvegliare ${item(button.dataset.item).pokemon}? Consumerai un fossile dello Zaino e combatterai con la tua squadra reale.`))return;
  if(action==='abandon'&&!confirm('Concludere lo scavo? Recupererai soltanto gli oggetti già completamente liberati.'))return;
  busy=true;error='';
  const previousRecovered=new Set(recovered);
  if(action==='hit'){root.querySelector('[data-action=hit]').disabled=true;root.querySelector('.operation-status').textContent='Salvataggio…';}else render();
  try{
   if(action==='refresh')await load();
   else if(action==='retry'){await execute();await load();}
   else if(action==='resume')await battle();
   else if(action==='heal'){await battles.healTeam();await load();}
   else if(action==='revive'){await command('revive',{item:button.dataset.item});await battle();}
   else if(action==='hit')await command('hit',{x:selected%13,y:Math.floor(selected/13),tool});
   else if(['dig','abandon'].includes(action))await command(action);
  }catch(e){error=e.message;}finally{busy=false;render();if(action==='hit'||action==='retry')for(const i of recovered)if(!previousRecovered.has(i))root.querySelector('[data-cell="'+i+'"]')?.classList.add('just-found');}
 });
 busy=true;render();
 try{await loadCatalog();if(pending)await execute();await load();}catch(e){error=e.message;}finally{busy=false;render();}
}
