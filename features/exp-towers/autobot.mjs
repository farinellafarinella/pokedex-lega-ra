export function createTowerAutobot({client,userId,isCurrent=()=>true,onUpdate=()=>{},storage=localStorage,delay=ms=>new Promise(r=>setTimeout(r,ms)),interval=800}){
 const key='champion:parco-autobot:'+userId;let stopped=false,running=false,job=null;
 const save=()=>storage.setItem(key,JSON.stringify(job));
 async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message);return data;}
 async function send(body){
  job.body=job.body||body;save();
  const {data,error}=await client.functions.invoke('route-encounters',{body:job.body});
  if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error||data?.error||error.message);}
  if(data?.error)throw Error(data.error);if(!data?.state)throw Error('Risposta autobot incompleta. Riprova per recuperare la stessa azione.');
  job.body=null;save();return data;
 }
 async function work(type){
  if(!await rpc('exp_autobot_access'))throw Error('ADMIN_REQUIRED');
  try{job=JSON.parse(storage.getItem(key)||'null');}catch{}job=job||{type,body:null,startOperation:null};
  if(job.type!==type&&(job.body||job.startOperation))throw Error('Riprendi prima il tentativo autobot dell’altra arena.');job.type=type;save();
  let battle=job.body?await send():null;
  while(!stopped&&isCurrent()){
   if(!battle||battle.saved){
    if(battle?.saved&&battle.state.result!=='win'){await onUpdate({battle});return 'loss';}
    const view=await rpc('get_exp_towers');await onUpdate({view,battle});
    const tower=view.towers.find(t=>t.type===type);if(tower?.nextFloor===101)return 'complete';
    if(view.pending&&view.pending.towerType!==type)throw Error('PARK_CLIMB_ACTIVE');
    let pending=view.pending;
    if(!pending){job.startOperation=job.startOperation||crypto.randomUUID();save();const started=await rpc('start_exp_tower',{p_type:type,p_operation:job.startOperation});job.startOperation=null;save();pending=started.pending;if(!pending)continue;}
    else{job.startOperation=null;save();}
    if(stopped||!isCurrent())return 'stopped';
    battle=await send({type:'start',...pending,operationId:crypto.randomUUID()});
   }
   await onUpdate({battle});
   if(battle.saved)continue;
   if(battle.state.pendingMoves?.length)return 'learning';
   if(stopped||!isCurrent())return 'stopped';
   await delay(interval);if(stopped||!isCurrent())return 'stopped';
   battle=await send({type:'tower-auto',encounterId:battle.encounterId,revision:battle.revision,operationId:crypto.randomUUID()});
  }
  return 'stopped';
 }
 return {get running(){return running;},stop(){stopped=true;},async run(type){
  if(running)throw Error('Autobot già avviato.');running=true;stopped=false;
  try{
   if(globalThis.navigator?.locks)return await navigator.locks.request('champion:parco-autobot:'+userId,{ifAvailable:true},lock=>{if(!lock)throw Error('Autobot già aperto in un’altra finestra.');return work(type);});
   return await work(type);
  }finally{running=false;if(job&&!job.body&&!job.startOperation)storage.removeItem(key);}
 }};
}
