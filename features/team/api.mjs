import {canReleasePokemon,TEAM_LIMIT} from './model.mjs';
const messages={STARTER_PROTECTED:'Lo starter non può essere liberato o sostituito.',STARTER_REQUIRED:'Scegli prima il tuo starter.',STALE_TEAM:'La squadra è cambiata su un altro dispositivo. Aggiorna e riprova.',TEAM_FULL:'La squadra è completa: scegli chi liberare.',PENDING_EXISTS:'Completa prima l’acquisizione già in attesa.',QR_INVALID:'QR non valido, scaduto o già utilizzato.',BATTLE_ACTIVE:'Concludi prima la battaglia dello starter.',NOT_AUTHORIZED:'Accedi con una scheda allenatore attiva.',MEMBER_NOT_FOUND:'Questo Pokémon non è più nella squadra.'};
export function createTeamAPI(client){
 let state={team:[],pending:null,revision:0};
 async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error){const e=Error(error.code==='PGRST202'?'La squadra deve essere attivata su Supabase. Lo starter e i suoi progressi sono al sicuro.':Object.entries(messages).find(([key])=>error.message?.includes(key))?.[1]||'Impossibile salvare la squadra. Riprova.');e.code=error.code;throw e;}if(!data||!Array.isArray(data.team))throw Error('Risposta squadra non valida.');state=data;return structuredClone(state);}
 const command=(action,extra={})=>rpc('route_team_command',{p_action:action,p_revision:state.revision,...extra});
 return {
 read:()=>rpc('get_route_team'),
 getTeam:()=>structuredClone(state.team),getTeamPokemonByUid:uid=>structuredClone(state.team.find(p=>p.uid===uid)||null),
 getStarterPokemon:()=>structuredClone(state.team.find(p=>p.isStarter)||null),getActivePokemon:()=>structuredClone(state.team[0]||null),isTeamFull:()=>state.team.length>=TEAM_LIMIT,
 canReleasePokemon:uid=>canReleasePokemon(state.team.find(p=>p.uid===uid)),
 releasePokemon:uid=>canReleasePokemon(state.team.find(p=>p.uid===uid))?command('release',{p_uid:uid}):Promise.resolve(false),
 replaceTeamPokemon:uid=>canReleasePokemon(state.team.find(p=>p.uid===uid))?command('replace',{p_uid:uid}):Promise.resolve(false),
 movePokemonInTeam:(from,to)=>command('move',{p_uid:state.team[from]?.uid,p_position:to}),
 // Only a server-authorized QR can add a member; raw client Pokémon are never accepted.
 addPokemonToTeam:token=>command('claim',{p_token:token}),acceptPending:()=>command('accept')
 };
}
