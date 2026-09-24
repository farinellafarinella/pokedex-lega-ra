// This file is appended to the shared engine by scripts/build-bug-edge.mjs.
import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'NOT_AUTHORIZED'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError||!auth.user)return reply({error:'NOT_AUTHORIZED'},401);
  const user=auth.user.id;
  if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'REQUEST_TOO_LARGE'},413);
  const text=await req.text();if(text.length>4096)return reply({error:'REQUEST_TOO_LARGE'},413);
  const body=JSON.parse(text);
  if(!body||!uuid.test(body.operationId||'')||!Number.isSafeInteger(body.revision)||body.revision<0||!/^\d{4}-\d{2}-\d{2}$/.test(body.day||''))return reply({error:'INVALID_COMMAND'},400);
  const {data:duplicate,error:duplicateError}=await admin.rpc('get_bug_game_operation',{p_user:user,p_operation:body.operationId});
  if(duplicateError)throw duplicateError;if(duplicate)return reply(duplicate);
  const {data:current,error:readError}=await admin.rpc('read_bug_game',{p_user:user});
  if(readError)throw readError;
  if(!current.isOpen||body.day!==current.day)return reply({error:'CONTEST_CLOSED'},400);
  if(body.revision!==current.revision)return reply({error:'STALE_REVISION'},409);
  // The browser sends only an action. It cannot supply state, RNG, catches or score.
  const state=bugCore.applyCommand(current.state,body,current.starter);
  const {data,error}=await admin.rpc('commit_bug_game',{p_user:user,p_day:current.day,p_revision:current.revision,p_operation:body.operationId,p_kind:body.type,p_state:state});
  if(error)throw error;
  return reply(data);
 }catch(error){
  const message=error instanceof Error?error.message:(error as any)?.message||'REQUEST_FAILED';
  return reply({error:message},message.includes('STALE_REVISION')?409:400);
 }
});
