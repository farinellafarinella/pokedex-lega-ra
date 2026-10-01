const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fossils={kabuto:['Domofossile','domofossil.png'],omanyte:['Fossilhelix','fossilhelix.png'],aerodactyl:['Ambra Antica','ambra antica.png'],unown:['Runa Unown'],kabutops:['Fossile Kabutops'],omastar:['Fossile Omastar']};
export function inventoryEntries(data){
 const items=(data.items||[]).map(item=>({...item}));
 if(data.fossil){const [name,image]=fossils[data.fossil.species]||['Fossile'];items.unshift({id:'starter:'+data.fossil.id,name,image,description:'Fossile ottenuto nell’Arena Fossili.',category:'fossils',quantity:1,manage:true});}
 return items;
}
export async function mountInventory(host,{client,isCurrent=()=>true}){
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css?v=1',import.meta.url)}"><main></main>`;
 const main=root.querySelector('main');let data=null,category='all',loading=false,error=false,eventWarning=false;
 const current=()=>host.isConnected&&isCurrent();
 function render(){
  if(!current())return;
  const items=data?inventoryEntries(data):[],visible=items.filter(i=>category==='all'||i.category===category);
  main.innerHTML=`<span class="eyebrow">SEMPRE CON TE</span><h1>Il mio Zaino</h1><p>Qui trovi i tuoi fossili e gli oggetti raccolti durante l’avventura.</p>
   ${loading?'<p role="status">Caricamento dello Zaino…</p>':error?'<section role="alert"><p>Non è stato possibile caricare lo Zaino. Riprova tra poco.</p><button data-reload>Riprova</button></section>':`<nav aria-label="Categorie dello Zaino">${[['all','Tutti'],['fossils','Fossili'],['items','Altri oggetti']].map(([id,label])=>`<button data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</nav>
   ${eventWarning?'<p role="status">Non riesco a verificare gli oggetti di Halloween. Premi Aggiorna per riprovare.</p>':''}<p class="count">${items.reduce((sum,i)=>sum+i.quantity,0)} oggetti nello Zaino</p>
   ${data?.pendingFossil?`<section class="notice"><h2>Un fossile da scegliere</h2><p>Hai trovato ${esc(fossils[data.pendingFossil.species]?.[0]||'un nuovo fossile')}. Scegli quale conservare per aggiungerlo allo Zaino.</p><a href="#starter-inventory">Scegli il fossile →</a></section>`:''}
   <div class="items">${visible.length?visible.map(i=>`<article>${i.image?`<img src="${new URL('../../'+encodeURIComponent(i.image),import.meta.url)}" alt="">`:`<span class="item-icon" aria-hidden="true">${i.category==='fossils'?'🪨':'🎒'}</span>`}<div><span class="tag">${i.category==='fossils'?'Fossile':'Oggetto'}</span><h2>${esc(i.name)}</h2><p>${esc(i.description)}</p><strong>Quantità: ${esc(i.quantity)}</strong>${i.id==='halloween:scope'?'<p><a href="#halloween">Visita la stanza speciale →</a></p>':''}${i.manage?'<p><a href="#starter-inventory">Gestisci fossile →</a></p>':''}</div></article>`).join(''):`<section class="empty"><h2>${category==='all'?'Lo Zaino è vuoto':category==='fossils'?'Nessun fossile':'Nessun altro oggetto'}</h2><p>Gli oggetti ottenuti compariranno qui.</p>${category!=='items'?'<a href="#fossil-arena">Vai all’Arena Fossili →</a>':''}</section>`}</div><button class="refresh" data-reload>Aggiorna Zaino</button>`}
   <p><a href="#dashboard">← Torna alla Home</a></p>`;
 }
 async function load(){if(loading)return;loading=true;error=false;render();try{const response=await client.rpc('get_trainer_inventory');if(response.error)throw response.error;if(!response.data||!Array.isArray(response.data.items))throw Error('Invalid inventory');data=response.data;eventWarning=false;try{const eventItems=await client.rpc('get_halloween_inventory');if(eventItems.error){if(!['PGRST202','42883'].includes(eventItems.error.code))eventWarning=true;}else if(Array.isArray(eventItems.data)){data={...data,items:[...data.items,...eventItems.data]};}}catch{eventWarning=true;}}catch{error=true;}finally{loading=false;render();}}
 root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||loading||!current())return;if(button.hasAttribute('data-reload')){load();return;}if(['all','fossils','items'].includes(button.dataset.category)){category=button.dataset.category;render();}});
 await load();
}
