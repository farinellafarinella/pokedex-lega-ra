import {createClient} from 'npm:@supabase/supabase-js@2';
import {applyCommand} from './core/game.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
export async function handle(req:Request){
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Metodo non consentito'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Accedi al tuo account.'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError||!auth.user)return reply({error:'Sessione scaduta. Accedi di nuovo.'},401);
  const user=auth.user.id;
  const {data:profile,error:profileError}=await admin.from('profiles').select('balance,is_active').eq('user_id',user).single();
  if(profileError||!profile?.is_active)return reply({error:'Profilo non attivo.'},403);
  if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'Richiesta troppo grande'},413);
  const raw=await req.text();if(raw.length>4096)return reply({error:'Richiesta troppo grande'},413);
  const body=JSON.parse(raw);
  const {data:row,error:readError}=await admin.from('starter_games').select('state,revision').eq('user_id',user).maybeSingle();
  if(readError)return reply({error:'Il mio Starter è in attivazione. Riprova più tardi.'},503);
  const current={state:row?.state||{profile:null,battle:null,log:[]},revision:row?.revision||0,balance:Number(profile.balance)};
  if(body.type==='read')return reply(current);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operationId||'')||!Number.isSafeInteger(body.revision))return reply({error:'Richiesta non valida'},400);
  const {data:duplicate,error:duplicateError}=await admin.from('starter_operations').select('operation_id').eq('user_id',user).eq('operation_id',body.operationId).maybeSingle();
  if(duplicateError)throw duplicateError;
  if(duplicate)return reply(current);
  if(body.revision!==current.revision)return reply({error:'Progressi aggiornati da un’altra scheda. Riprova.',...current},409);
  const {state,delta}=applyCommand(current.state,body,{balance:current.balance,now:new Date()});
  const {data,error}=await admin.rpc('commit_starter_command',{p_user:user,p_revision:current.revision,p_operation:body.operationId,p_state:state,p_delta:delta});
  if(error){if(error.message.includes('STALE_REVISION'))return reply({error:'Progressi aggiornati da un’altra scheda. Ricarica e riprova.'},409);if(error.message.includes('INSUFFICIENT_BALANCE'))return reply({error:'Pokédollari insufficienti.'},400);throw error;}
  return reply(data);
 }catch(error){return reply({error:error instanceof Error?error.message:'Operazione non riuscita. Riprova.'},400);}
}
Deno.serve(handle);
