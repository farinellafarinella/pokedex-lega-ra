const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fossils={kabuto:['Domofossile','domofossil.png'],omanyte:['Fossilhelix','fossilhelix.png'],aerodactyl:['Ambra Antica','ambra antica.png'],unown:['Runa Unown'],kabutops:['Fossile Kabutops'],omastar:['Fossile Omastar']};
export function inventoryEntries(data){
 const items=(data.items||[]).map(item=>({...item}));
 if(data.fossil){const [name,image]=fossils[data.fossil.species]||['Fossile'];items.unshift({id:'starter:'+data.fossil.id,name,image,description:'Fossile ottenuto nel Laboratorio Fossili.',category:'fossils',quantity:1,manage:true});}
 return items;
}
function itemArt(item){
 if(item.image)return `<img src="${new URL('../../'+encodeURIComponent(item.image),import.meta.url)}" alt="">`;
 if(item.sprite){const s=item.sprite;return `<span class="relic-art" aria-hidden="true"><span style="width:${s.w*16}px;height:${s.h*16}px;background-position:-${s.x*16}px -${s.y*16}px"></span></span>`;}
 return `<span class="item-icon" aria-hidden="true">${item.category==='fossils'?'🪨':'🎒'}</span>`;
}
export async function mountInventory(host,{client,userId,onBalance=()=>{},isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=online-1',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main');let data=null,category='all',loading=false,error=false,eventWarning=false,labWarning=false,labItems=[],notice='';
 const current=()=>host.isConnected&&isCurrent();
 async function readItems(){const {data,error}=await client.rpc('get_fossil_laboratory_inventory');if(error)throw error;labItems=Array.isArray(data)?data:[];}
 function render(){
  if(!current())return;
  const items=[...(data?inventoryEntries(data):[]),...labItems],visible=items.filter(i=>category==='all'||i.category===category);
  main.innerHTML=`<span class="eyebrow">SEMPRE CON TE</span><h1>Il mio Zaino</h1><p>Qui trovi i tuoi fossili e gli oggetti raccolti durante l’avventura.</p>
   ${loading?'<p role="status">Caricamento dello Zaino…</p>':''}
   ${error?'<section role="alert"><p>Non è stato possibile caricare gli oggetti online. Riprova tra poco.</p><button data-reload>Riprova</button></section>':''}
   <nav aria-label="Categorie dello Zaino">${[['all','Tutti'],['fossils','Fossili'],['items','Altri oggetti']].map(([id,label])=>`<button data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</nav>
   ${eventWarning?'<p role="status">Non riesco a verificare gli oggetti di Halloween. Premi Aggiorna per riprovare.</p>':''}
   ${labWarning?'<p role="alert">Non riesco a caricare i reperti del laboratorio. Premi Aggiorna per riprovare.</p>':''}
   ${notice?`<p role="status">${esc(notice)}</p>`:''}
   ${labItems.length?'<p class="notice">I reperti del laboratorio sono salvati nel tuo account. Puoi venderli qui o risvegliare i fossili nel Laboratorio Fossili.</p>':''}
   <p class="count">${items.reduce((sum,i)=>sum+i.quantity,0)} oggetti nello Zaino</p>
   ${data?.pendingFossil?`<section class="notice"><h2>Un fossile da scegliere</h2><p>Hai trovato ${esc(fossils[data.pendingFossil.species]?.[0]||'un nuovo fossile')}. Scegli quale conservare per aggiungerlo allo Zaino.</p><a href="#starter-inventory">Scegli il fossile →</a></section>`:''}
   <div class="items">${visible.length?visible.map(i=>`<article data-item-id="${esc(i.id)}">${itemArt(i)}<div><span class="tag">${i.category==='fossils'?'Fossile':'Oggetto'}${i.laboratory?' · Laboratorio':''}</span><h2>${esc(i.name)}</h2><p>${esc(i.description)}</p><strong>Quantità: ${esc(i.quantity)}</strong>${i.id==='halloween:scope'?'<p><a href="#halloween">Visita la stanza speciale →</a></p>':''}${i.manage?'<p><a href="#starter-inventory">Gestisci fossile →</a></p>':''}${i.laboratory?`<div class="item-actions"><button data-sell="${esc(i.labId)}" ${loading?'disabled':''}>Vendi 1 · ${i.price} ₽</button>${i.category==='fossils'?'<a href="#fossil-arena/risveglio">Usa nel Laboratorio Fossili →</a>':''}</div>`:''}</div></article>`).join(''):!loading&&!error&&!labWarning?`<section class="empty"><h2>${category==='all'?'Lo Zaino è vuoto':category==='fossils'?'Nessun fossile':'Nessun altro oggetto'}</h2><p>Gli oggetti ottenuti compariranno qui.</p><a href="#fossil-arena">Vai al Laboratorio Fossili →</a></section>`:''}</div><button class="refresh" data-reload ${loading?'disabled':''}>Aggiorna Zaino</button>
   <p><a href="#dashboard">← Torna alla Home</a></p>`;
 }
 async function load(){
  if(loading)return;loading=true;error=false;labWarning=false;eventWarning=false;render();
  await Promise.all([
   (async()=>{try{const response=await client.rpc('get_trainer_inventory');if(response.error)throw response.error;if(!response.data||!Array.isArray(response.data.items))throw Error('Invalid inventory');data=response.data;try{const eventItems=await client.rpc('get_halloween_inventory');if(eventItems.error){if(!['PGRST202','42883'].includes(eventItems.error.code))eventWarning=true;}else if(Array.isArray(eventItems.data))data={...data,items:[...data.items,...eventItems.data]};}catch{eventWarning=true;}}catch{error=true;}})(),
   (async()=>{try{await readItems();}catch{labWarning=true;}})()
  ]);
  loading=false;render();
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||loading||!current())return;
  if(button.hasAttribute('data-reload')){await load();return;}
  if(button.hasAttribute('data-sell')&&userId){
   loading=true;render();const key='champion:fossil-online-operation:'+userId;
   try{
    if(localStorage.getItem(key))throw Error('Un’operazione del laboratorio è in attesa. Apri il laboratorio e premi Riprova.');
    const current=await client.rpc('get_fossil_laboratory');if(current.error)throw current.error;
    const command={p_action:'sell',p_operation:crypto.randomUUID(),p_revision:current.data.revision,p_args:{item:button.dataset.sell}};
    localStorage.setItem(key,JSON.stringify(command));
    const response=await client.rpc('fossil_laboratory_command',command);
    if(response.error){if(/STALE_REVISION|ITEM_NOT_OWNED|NOT_AUTHORIZED/.test(response.error.message||''))localStorage.removeItem(key);throw response.error;}
    localStorage.removeItem(key);onBalance(response.data.balance);await readItems();notice='Reperto venduto. Saldo e Zaino aggiornati.';
   }catch(e){notice='Vendita non confermata. '+(e.message||'Apri il laboratorio per riprovare.');}finally{loading=false;render();}return;
  }
  if(['all','fossils','items'].includes(button.dataset.category)){category=button.dataset.category;render();}
 });
 await load();
}
