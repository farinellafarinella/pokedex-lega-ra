export async function readStatus(client){const {data,error}=await client.rpc('get_bug_game_status');if(error)throw error;return data;}
export async function readRanking(client,day=null){const {data,error}=await client.rpc('get_bug_game_ranking',{p_day:day});if(error)throw error;return data;}
export async function sendCommand(client,body){
 const {data,error}=await client.functions.invoke('bug-contest',{body});
 if(error){let payload;try{payload=await error.context?.json();}catch{}throw Error(payload?.error||error.message||'REQUEST_FAILED');}
 if(data?.error)throw Error(data.error);return data;
}
export function errorMessage(error){
 const text=error?.message||'';
 const messages={NOT_AUTHORIZED:'Accedi con una Scheda Allenatore attiva.',CONTEST_CLOSED:'La gara è disponibile solo il giovedì, fino a mezzanotte italiana.',INSUFFICIENT_BALANCE:'Servono 50 Pokédollari per iscriverti.',STARTER_REQUIRED:'Scegli prima il tuo Starter.',STARTER_CHANGED:'Lo Starter è cambiato. Ricarica la gara.',STALE_REVISION:'La gara è stata aggiornata da un’altra scheda. Ho ricaricato i progressi.',ALREADY_STARTED:'Sei già iscritto: riprendi la tua gara.',INVALID_COMMAND:'Questa azione non è più disponibile. Ho ricaricato la gara.',CONTEST_NOT_FOUND:'La gara non è stata ancora avviata.'};
 for(const [code,label] of Object.entries(messages))if(text.includes(code))return label;
 if(error?.code==='PGRST202'||/not found|non-2xx|does not exist/i.test(text))return 'La nuova gara è in attivazione. Riprova tra poco.';
 return 'Connessione non riuscita. Riprova: l’azione verrà registrata una sola volta.';
}
export const isRejected=error=>/NOT_AUTHORIZED|CONTEST_CLOSED|INSUFFICIENT_BALANCE|STARTER_REQUIRED|STARTER_CHANGED|STALE_REVISION|ALREADY_STARTED|INVALID_COMMAND|CONTEST_NOT_FOUND/.test(error?.message||'');
