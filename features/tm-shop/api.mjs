export const messages={NOT_AUTHORIZED:'Accedi con la tua scheda allenatore.',INVALID_COMMAND:'Richiesta non valida.',INVALID_TM:'Questa MT non è disponibile.',TM_UNAVAILABLE:'Questa MT non è più in vendita.',OFFER_CHANGED:'Il prezzo è cambiato. Aggiorna il negozio e conferma il nuovo prezzo.',INSUFFICIENT_BALANCE:'Pokédollari insufficienti.',INVENTORY_FULL:'Hai raggiunto il limite di copie di questa MT.',STALE_INVENTORY:'Le tue MT sono cambiate. Aggiorna e riprova.',STALE_TEAM:'La squadra è cambiata. Aggiorna e scegli di nuovo il Pokémon.',TEAM_PENDING:'Completa prima l’acquisizione in attesa nella tua squadra.',BATTLE_ACTIVE:'Concludi prima la battaglia in corso.',TM_NOT_OWNED:'Non possiedi questa MT.',MEMBER_NOT_FOUND:'Questo Pokémon non è più nella tua squadra.',MOVE_INCOMPATIBLE:'Questo Pokémon non può imparare questa mossa.',ALREADY_LEARNED:'Il Pokémon conosce già questa mossa. La MT è ancora nello Zaino.',REPLACEMENT_REQUIRED:'Scegli quale delle quattro mosse sostituire.',INVALID_SLOT:'Scegli una mossa da sostituire.',OPERATION_MISMATCH:'Il tentativo salvato non corrisponde alla richiesta.'};
export function createTMShopAPI(client,userId,{storage=globalThis.localStorage}={}){
 const key='champion:tm-shop:'+userId;
 const pending=()=>JSON.parse(storage.getItem(key)||'null');
 async function rpc(name,args={}){
  const {data,error}=await client.rpc(name,args);
  if(error){const code=Object.keys(messages).find(k=>error.message?.includes(k)),e=Error(messages[code]||(['PGRST202','42883','42P01'].includes(error.code)?'Il negozio MT non è ancora disponibile.':'Operazione non confermata. Premi Verifica operazione per riprovare.'));e.definitive=!!code;throw e;}
  if(!data||!Array.isArray(data.items))throw Error('Risposta incompleta. Premi Verifica operazione per riprovare.');return data;
 }
 async function send(args){try{const result=await rpc('tm_shop_command',args);storage.removeItem(key);return result;}catch(e){if(e.definitive)storage.removeItem(key);throw e;}}
 return {pending,read:()=>rpc('get_tm_shop'),
  command:args=>{if(pending())throw Error('Verifica prima l’operazione in attesa.');const attempt={...args,p_operation:crypto.randomUUID()};storage.setItem(key,JSON.stringify(attempt));return send(attempt);},
  retry:()=>{const args=pending();if(!args)throw Error('Nessuna operazione in attesa.');return send(args);}
 };
}
