import {startCloudSave} from '../gameboy/cloud.mjs?v=1';
import {reservationKey} from './storage.mjs';
export async function beforeGameBoyBoot(game){
 const fail=message=>{document.getElementById('root').textContent=message+' Apri la sezione Scambi Game Boy dalla Home.';throw Error(message);};
 if(localStorage.getItem(reservationKey(game)))fail('Hai uno scambio da completare o annullare.');
 const config=window.CHAMPION_SUPABASE_CONFIG;
 if(game!=='emerald'&&config&&!window.supabase)fail('Non riesco a caricare la verifica degli scambi. Controlla la connessione e riprova.');
 if(game!=='emerald'&&config&&window.supabase){const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const {data:session,error:authError}=await client.auth.getSession();if(authError)fail('Non riesco a verificare gli scambi.');if(session?.session){const {data,error}=await client.rpc('get_gameboy_rom_trades');if(error&&!['PGRST202','42883'].includes(error.code))fail('Non riesco a verificare gli scambi.');if(Array.isArray(data)&&data.some(t=>t.game===game&&((t.outgoing&&(t.status==='offered'||t.status==='matched'||t.status==='committed'&&!t.sender_applied))||(!t.outgoing&&(t.status==='matched'||t.status==='committed'&&!t.recipient_applied)))))fail('Hai uno scambio da completare o annullare.');}}
 if(!navigator.locks){await startCloudSave(game);return;} // Browsers without Web Locks can play, but cannot edit saves via trades.
 await new Promise((resolve,reject)=>{navigator.locks.request('champion:rom-save',{ifAvailable:true},async lock=>{if(!lock){reject(Error('Un’altra finestra del Game Boy o degli Scambi è aperta. Chiudila e riprova.'));return;}if(localStorage.getItem(reservationKey(game))){reject(Error('Uno scambio ha riservato il salvataggio.'));return;}resolve();await new Promise(()=>{});}).catch(reject);});
 await startCloudSave(game);
}
