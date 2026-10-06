export function canUseAutoFarm(profile){
 // There is one administrator: use the authenticated role, not a mutable display name.
 return profile?.role==='admin'&&(profile.active??profile.is_active)===true;
}

export function chooseFarmAction(state,Engine){
 const engine=new Engine({rng:()=>.5});engine.restore(state);
 const target=engine.enemy();
 const best=mon=>engine.usable(mon).map(value=>({action:'move',value,score:engine.estimate(mon,target,value)})).sort((a,b)=>b.score-a.score)[0];
 if(state.pendingSwitch){
  const candidates=state.party.map((mon,value)=>({mon,value})).filter(({mon,value})=>mon.currentHp>0&&value!==state.activeIndex);
  candidates.sort((a,b)=>best(b.mon).score-best(a.mon).score);
  if(!candidates.length)throw Error('Nessun Pokémon disponibile.');
  return {action:'switch',value:candidates[0].value};
 }
 const {action,value}=best(engine.active());return {action,value};
}

export class AutoFarm {
 constructor({read,perform,choose,isCurrent,onChange,pause=()=>new Promise(r=>setTimeout(r,800))}){
  Object.assign(this,{read,perform,choose,isCurrent,onChange,pause});this.running=false;this.count=0;this.exp=0;this.reason='';
 }
 stop(reason='Fermato. La battaglia eventualmente in corso può essere ripresa a mano.'){
  this.running=false;this.reason=reason;this.onChange();
 }
 async start(position,limit){
  if(this.executing)return;
  if(!Number.isInteger(position)||position<1||position>5||!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Scegli da 1 a 1000 battaglie.');
  this.executing=true;this.running=true;this.position=position;this.limit=limit;this.count=0;this.exp=0;this.reason='';this.onChange();
  let completed=null;
  try{
   while(this.running&&this.isCurrent()){
    const {state,battle,pending,busy}=this.read();
    if(pending||busy)throw Error('Operazione in sospeso: recuperala prima di continuare.');
    const station=state.stations.find(s=>s.position===position);
    let body;
    if(state.active){
     const active=state.active;
     if(active.position!==position||active.defender)throw Error('Riprendi a mano la battaglia già in corso.');
     if(!active.state)body={type:'init',battleId:active.id,revision:active.revision};
     else body={type:'act',battleId:active.id,revision:active.revision,...this.choose(active.state)};
    }else if(battle?.status==='settled'&&battle.id!==completed){
     completed=battle.id;this.count++;this.exp+=Object.values(battle.state?.expAwards||{}).reduce((sum,n)=>sum+Number(n),0);this.onChange();
     if(battle.result!=='win')throw Error('Ciclo fermato: '+(battle.result==='loss'?'sconfitta.':'pareggio o annullamento.'));
     // Release the reservation before checking the battle limit.
     if(station?.reserved_by===state.userId)body={type:'command',action:'proceed',args:{position}};
    }
    if(!body){
     if(this.count>=limit){this.stop('Limite raggiunto.');break;}
     if(!station||station.owner_id)throw Error('Il posto è occupato da un giocatore.');
     if(station.battle_id||station.reserved_by)throw Error('Il bot è impegnato o il posto è riservato.');
     if(position>state.progress.unlocked)throw Error('Postazione ancora bloccata.');
     if(!state.config.opened)throw Error('Le nuove sfide sono chiuse.');
     const training=station.dailyWins>=station.rules.daily_limit;
     if(!training&&state.balance<station.effectiveStake)throw Error('Saldo insufficiente per la posta.');
     body={type:'start',position};
    }
    if(!this.running||!this.isCurrent())break;
    if(!await this.perform(body))throw Error('Operazione non confermata. Controlla il messaggio della Route.');
    await this.pause();
   }
  }catch(error){this.stop(error.message);}finally{this.executing=false;if(this.running)this.stop();else this.onChange();}
 }
}
