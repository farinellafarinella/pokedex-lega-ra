export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=value=>new Intl.NumberFormat('it-IT').format(Number(value))+' PD';
export const dateTime=value=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export const gameArt={slots:{icon:'777',color:'pink',pokemon:25},voltorb:{icon:'×3',color:'green',pokemon:100},blackjack:{icon:'A♠',color:'blue',pokemon:52},roulette:{icon:'◉',color:'gold',pokemon:35},tcg:{icon:'TCG',color:'pink',pokemon:137},scratch:{icon:'R',color:'red',pokemon:52},tombola:{icon:'90',color:'blue',pokemon:113},memory:{icon:'♫',color:'green',pokemon:39},'high-card':{icon:'K♣',color:'gold',pokemon:65},jackpot:{icon:'★',color:'pink',pokemon:149}};
// Resolve existing species assets, without copying images or inventing external URLs.
// Reuse the same Pokémon GIFs already displayed throughout Pokémon Route.
export function pokemonSprite(id,{database=globalThis.ROUTE_POKEMON_DB||{},allowExternal=true}={}){
 const p=database[id],fallback=new URL('../../pokeball%20icon.png',import.meta.url).href;
 const front=p?.sprites?.front;let animated=null;try{if(front&&allowExternal&&new URL(front).protocol==='https:')animated=front;}catch{}
 return {name:p?.name||'Pokémon #'+id,animated,fallback};
}
const messages={ACCOUNT_NOT_ACTIVE:'Accedi con una scheda Allenatore attiva.',ADMIN_REQUIRED:'Questa funzione è riservata agli amministratori.',REVISION_CONFLICT:'La configurazione è cambiata. Aggiorna prima di salvare.',INVALID_CONFIG:'Configurazione non valida. Controlla gli importi e i campi.',FREE_GAME:'Memory ed estrazione TCG devono restare gratuiti.',OPERATION_CONFLICT:'Il codice operazione è già stato utilizzato per dati diversi.',CASINO_MAINTENANCE:'Il collaudo è sospeso dalla modalità manutenzione.',RATE_LIMIT:'Limite di collaudi raggiunto. Attendi un minuto.',OFFLINE:'Connessione assente. Riconnettiti per verificare lo stato sul server.'};
export function explain(e){return messages[e?.message]||(/PGRST202|Could not find.*function/.test(e?.message||'')?'Installa le migrazioni del Casinò su Supabase.':/constraint|invalid input/.test(e?.message||'')?'Valore non valido. Controlla i limiti della configurazione.':'Operazione non confermata. Aggiorna lo stato prima di riprovare.');}
export function createCasinoHubAPI(client){const rpc=async(name,args)=>{if(globalThis.navigator?.onLine===false)throw Error('OFFLINE');const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message||error.code);return data;};return {
 read:(admin=false)=>rpc('get_route_casino_lobby',{p_admin:admin}),
 save:(operation,revision,target,values)=>rpc('route_casino_admin_save',{p_operation:operation,p_revision:revision,p_target:target,p_values:values}),
 check:operation=>rpc('route_casino_sandbox_check',{p_operation:operation})
 };}
