let dialog=null,owner=null,checking=false;
export function syncUser(userId){if(dialog&&owner!==userId){dialog.close();dialog.remove();dialog=null;owner=null;}}
export async function checkPokemonGifts(client,{userId,isCurrent=()=>true,onOpen=()=>{location.hash='#my-team';}}){
 syncUser(userId);
 if(!userId||checking||dialog||globalThis.RouteEncounters?.isActive())return;
 checking=true;
 try{
  const {data,error}=await client.rpc('get_my_pokemon_gifts');
  if(error||!isCurrent()||!Array.isArray(data)||globalThis.RouteEncounters?.isActive())return;
  const unseen=data.filter(g=>g.unseen);if(!unseen.length)return;
  owner=userId;dialog=document.createElement('dialog');dialog.className='pokemon-gift-popup';dialog.setAttribute('aria-labelledby','pokemon-gift-title');
  const shadow=document.createElement('div');dialog.append(shadow);const root=shadow.attachShadow({mode:'open'});
  root.innerHTML=`<link rel="stylesheet" href="${new URL('./style.css',import.meta.url)}"><section><span aria-hidden="true" style="font-size:36px">🎁</span><h2 id="pokemon-gift-title">Hai ricevuto un regalo</h2><p>Hai ricevuto un regalo, controlla la tua squadra Pokémon</p><p data-detail></p><p data-error role="status"></p><button data-open>Controlla la tua squadra Pokémon</button><button data-later>Più tardi</button></section>`;
  dialog.setAttribute('aria-label','Hai ricevuto un regalo, controlla la tua squadra Pokémon');
  root.querySelector('[data-detail]').textContent=unseen.length>1?`Hai ${unseen.length} nuovi regali.`:'';
  if(unseen.some(g=>g.status!=='delivered'))root.querySelector('[data-detail]').textContent+=' I regali in attesa si gestiscono dalla pagina squadra; durante una battaglia la consegna resta sospesa.';
  const current=dialog;
  async function dismiss(open){
   if(!isCurrent()){syncUser(null);return;}
   root.querySelectorAll('button').forEach(b=>b.disabled=true);
   let error;try{({error}=await client.rpc('ack_pokemon_gifts',{p_ids:unseen.map(g=>g.id)}));}catch(e){error=e;}
   if(error){root.querySelector('[data-error]').textContent='Non riesco a confermare la lettura. Riprova.';root.querySelectorAll('button').forEach(b=>b.disabled=false);return;}
   current.close();current.remove();if(dialog===current){dialog=null;owner=null;}if(open&&isCurrent())onOpen();
  }
  current.addEventListener('cancel',e=>{e.preventDefault();dismiss(false);});
  root.querySelector('[data-open]').onclick=()=>dismiss(true);root.querySelector('[data-later]').onclick=()=>dismiss(false);
  document.body.append(current);current.style.cssText='width:min(420px,calc(100vw - 24px));padding:0;border:1px solid #f2c94c;border-radius:18px;background:#191c22;color:#fff;max-height:90dvh;overflow:auto';current.showModal();
 }finally{checking=false;}
}
