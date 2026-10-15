const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function readTradeTrainers(client){
 const {data,error}=await client.rpc('get_trade_trainers');
 if(error||!Array.isArray(data))throw Error('Non riesco a caricare gli allenatori. Aggiorna la pagina; se il problema continua, installa l’aggiornamento Scelta allenatore su Supabase.');
 return data;
}
export function trainerOptions(trainers,query='',selected=''){
 const counts=new Map();for(const t of trainers)counts.set(t.name,(counts.get(t.name)||0)+1);
 const q=query.trim().toLocaleLowerCase('it');
 const matches=trainers.filter(t=>t.name.toLocaleLowerCase('it').includes(q));
 return `<option value="">${matches.length?'Scegli un allenatore':trainers.length?'Nessun allenatore trovato':'Nessun altro allenatore disponibile'}</option>`+matches.map(t=>`<option value="${esc(t.code)}" ${t.code===selected?'selected':''}>${esc(t.name)}${counts.get(t.name)>1?' · '+esc(t.code):''}</option>`).join('');
}
export function trainerPicker(trainers){return `<label>Cerca allenatore<input type="search" data-trainer-search placeholder="Cerca per nome" autocomplete="off"></label><label>Allenatore destinatario<select name="code" data-trainer-code required ${trainers.length?'':'disabled'}>${trainerOptions(trainers)}</select></label>${trainers.length?'':'<p>Nessun altro allenatore attivo disponibile.</p>'}`;}
export function bindTrainerPicker(root,trainers){const input=root.querySelector('[data-trainer-search]'),select=root.querySelector('[data-trainer-code]');if(input&&select)input.addEventListener('input',()=>{select.innerHTML=trainerOptions(trainers,input.value,select.value);});}
