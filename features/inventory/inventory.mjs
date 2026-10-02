import {readBeta,updateBeta,betaCatalog,betaInventoryEntries,betaKey} from '../fossils-beta/store.mjs?v=normal-exp-1';
import {sell} from '../fossils-beta/model.mjs?v=normal-exp-1';
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
export async function mountInventory(host,{client,userId,isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=fossils-2',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main');let data=null,category='all',loading=false,error=false,eventWarning=false,betaWarning=false,catalog=[],betaItems=[],notice='';
 const current=()=>host.isConnected&&isCurrent();
 function readItems(){betaItems=userId?betaInventoryEntries(readBeta(userId),catalog):[];}
 function render(){
  if(!current())return;
  const items=[...(data?inventoryEntries(data):[]),...betaItems],visible=items.filter(i=>category==='all'||i.category===category);
  main.innerHTML=`<span class="eyebrow">SEMPRE CON TE</span><h1>Il mio Zaino</h1><p>Qui trovi i tuoi fossili e gli oggetti raccolti durante l’avventura.</p>
   ${loading?'<p role="status">Caricamento dello Zaino…</p>':''}
   ${error?'<section role="alert"><p>Non è stato possibile caricare gli oggetti online. Riprova tra poco.</p><button data-reload>Riprova</button></section>':''}
   <nav aria-label="Categorie dello Zaino">${[['all','Tutti'],['fossils','Fossili'],['items','Altri oggetti']].map(([id,label])=>`<button data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</nav>
   ${eventWarning?'<p role="status">Non riesco a verificare gli oggetti di Halloween. Premi Aggiorna per riprovare.</p>':''}
   ${betaWarning?'<p role="alert">Non riesco a leggere i reperti della beta su questo dispositivo. Premi Aggiorna per riprovare.</p>':''}
   ${notice?`<p role="status">${esc(notice)}</p>`:''}
   ${betaItems.length?'<p class="notice">I reperti contrassegnati Beta test sono di prova e restano salvati su questo dispositivo. Puoi venderli qui o usare i fossili nel Laboratorio Fossili.</p>':''}
   <p class="count">${items.reduce((sum,i)=>sum+i.quantity,0)} oggetti nello Zaino</p>
   ${data?.pendingFossil?`<section class="notice"><h2>Un fossile da scegliere</h2><p>Hai trovato ${esc(fossils[data.pendingFossil.species]?.[0]||'un nuovo fossile')}. Scegli quale conservare per aggiungerlo allo Zaino.</p><a href="#starter-inventory">Scegli il fossile →</a></section>`:''}
   <div class="items">${visible.length?visible.map(i=>`<article data-item-id="${esc(i.id)}">${itemArt(i)}<div><span class="tag">${i.category==='fossils'?'Fossile':'Oggetto'}${i.beta?' · Beta test':''}</span><h2>${esc(i.name)}</h2><p>${esc(i.description)}</p><strong>Quantità: ${esc(i.quantity)}</strong>${i.id==='halloween:scope'?'<p><a href="#halloween">Visita la stanza speciale →</a></p>':''}${i.manage?'<p><a href="#starter-inventory">Gestisci fossile →</a></p>':''}${i.beta?`<div class="item-actions"><button data-sell="${esc(i.betaId)}" ${loading?'disabled':''}>Vendi 1 · ${i.price} ₽ di prova</button>${i.category==='fossils'?'<a href="#fossil-arena/risveglio">Usa nel Laboratorio Fossili →</a>':''}</div>`:''}</div></article>`).join(''):!loading&&!error&&!betaWarning?`<section class="empty"><h2>${category==='all'?'Lo Zaino è vuoto':category==='fossils'?'Nessun fossile':'Nessun altro oggetto'}</h2><p>Gli oggetti ottenuti compariranno qui.</p><a href="#fossil-arena">Vai al Laboratorio Fossili →</a></section>`:''}</div><button class="refresh" data-reload ${loading?'disabled':''}>Aggiorna Zaino</button>
   <p><a href="#dashboard">← Torna alla Home</a></p>`;
 }
 async function load(){
  if(loading)return;loading=true;error=false;betaWarning=false;eventWarning=false;render();
  await Promise.all([
   (async()=>{try{const response=await client.rpc('get_trainer_inventory');if(response.error)throw response.error;if(!response.data||!Array.isArray(response.data.items))throw Error('Invalid inventory');data=response.data;try{const eventItems=await client.rpc('get_halloween_inventory');if(eventItems.error){if(!['PGRST202','42883'].includes(eventItems.error.code))eventWarning=true;}else if(Array.isArray(eventItems.data))data={...data,items:[...data.items,...eventItems.data]};}catch{eventWarning=true;}}catch{error=true;}})(),
   (async()=>{if(!userId)return;try{catalog=await betaCatalog();readItems();}catch{betaWarning=true;}})()
  ]);
  loading=false;render();
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||loading||!current())return;
  if(button.hasAttribute('data-reload')){await load();return;}
  if(button.hasAttribute('data-sell')&&userId){
   loading=true;render();try{const id=button.dataset.sell;let value;await updateBeta(userId,state=>{value=sell(state,id,1,catalog);});readItems();notice=`Venduto un reperto: +${value} Pokédollari di prova.`;}catch(e){notice=e.message;}finally{loading=false;render();}return;
  }
  if(['all','fossils','items'].includes(button.dataset.category)){category=button.dataset.category;render();}
 });
 const refreshLocal=()=>{if(!current()){window.removeEventListener('storage',onStorage);window.removeEventListener('fossils-beta-change',onChange);return;}try{readItems();betaWarning=false;}catch{betaWarning=true;}render();};
 const onStorage=e=>{if(userId&&e.key===betaKey(userId))refreshLocal();};
 const onChange=e=>{if(userId&&e.detail.account===userId)refreshLocal();};
 window.addEventListener('storage',onStorage);window.addEventListener('fossils-beta-change',onChange);
 await load();
}
