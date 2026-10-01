(function(global){
  'use strict';
  let client=null,active=null,healOperation=null;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function speciesId(value){
    const species=global.ROUTE_POKEMON_DB[String(value)]||Object.values(global.ROUTE_POKEMON_DB).find(p=>p.slug===value);
    if(!species)throw Error(`Specie non disponibile nel database Crystal: ${value}.`);
    return species.id;
  }
  function remoteTransport(){
    if(!client)throw Error('Accedi prima di iniziare una battaglia.');
    return {async request(body){
      const {data,error}=await client.functions.invoke('route-encounters',{body});
      if(error){let detail;try{detail=await error.context?.json();}catch{}
        const messages={STARTER_PROTECTED:'Lo starter non può essere liberato.',STALE_TEAM:'La squadra è cambiata: ricarica il gioco.',ENCOUNTER_EXPIRED:'Questo incontro è scaduto.',NOT_AUTHORIZED:'Accedi con una scheda allenatore attiva.',BATTLE_ACTIVE:'Riprendi e concludi l’incontro salvato dalla pagina La mia squadra.',TEAM_EXHAUSTED:'Cura la squadra prima di combattere.',STALE_EVENT:'L’evento è cambiato. Riprova il salvataggio.',EVENT_INTEGRATION_REQUIRED:'Il servizio battaglie è in aggiornamento. Il risultato resta in attesa.'};
        throw Error(messages[detail?.error]||detail?.error||'Le battaglie non sono ancora disponibili. Riprova più tardi.');}
      if(data?.error)throw Error(data.error);
      return data;
    }};
  }
  async function ensureSource(source){
    if(!client)throw Error('Accedi prima di iniziare una battaglia.');
    const {data,error}=await client.rpc('get_route_encounter_sources');
    if(error||!Array.isArray(data)||!data.includes(source))throw Error('Le battaglie di questo evento sono in attivazione. Nessun costo è stato addebitato.');
  }
  async function healTeam(){
    if(active)throw Error('Concludi prima la battaglia in corso.');
    healOperation=healOperation||global.crypto.randomUUID();
    const data=await remoteTransport().request({type:'heal',operationId:healOperation});
    healOperation=null;return data;
  }
  async function pendingEncounter(){
    if(!client)throw Error('Accedi prima di riprendere una battaglia.');
    const {data,error}=await client.rpc('get_route_active_encounter');
    if(error)throw Error('Non riesco a recuperare l’incontro. Riprova.');return data;
  }
  async function resumeActive(){
    const pending=await pendingEncounter();if(!pending)throw Error('Non ci sono battaglie in sospeso.');
    return startPokemonEncounter(pending);
  }
  async function abandonEncounter(options){
    if(active)throw Error('Concludi prima l’incontro in corso.');
    const controller=new EncounterController(options,remoteTransport());active={controller,returnHash:location.hash};
    try{await controller.start();await controller.act('flee');if(!controller.saved)await controller.finish();return controller.result;}
    finally{active=null;}
  }
  class EncounterController{
    constructor(options,transport){
      this.options=options;this.transport=transport;
      this.engine=new global.RouteBattle.BattleEngine();
      // Reuse the package's starter protection, without a second persistent team.
      this.teamManager=new global.RouteTeam.TeamManager({autoLoad:false,storage:{setItem(){}}});
      this.busy=false;this.saved=false;this.pending=null;this.events=[];
    }
    async request(command){
      if(this.busy)throw Error('Attendi il completamento dell’azione.');
      this.busy=true;this.onChange?.();
      // Retain the exact operation after a lost response; never execute a turn twice.
      this.pending=this.pending||{...command,operationId:global.crypto.randomUUID(),encounterId:this.encounterId,revision:this.revision};
      try{
        const data=await this.transport.request(clone(this.pending));
        if(!data?.state||!Array.isArray(data.state.party))throw Error('Risposta battaglia non valida.');
        this.encounterId=data.encounterId;this.revision=data.revision;
        this.engine.state=clone(data.state);this.events=data.events||[];
        this.saved=data.saved===true;this.result=data.result||null;
        this.teamManager.setTeam(data.team||this.engine.syncTeam());
        this.pending=null;return data;
      }finally{this.busy=false;this.onChange?.();}
    }
    async start(){
      const o=this.options;
      return this.request({type:'start',speciesId:speciesId(o.speciesId),level:o.level,source:o.source||'SPECIAL_EVENT',
        token:o.token||null,canCapture:o.canCapture!==false,canEscape:o.canEscape!==false});
    }
    async act(type,value){
      if(this.saved||this.engine.state?.phase!=='battle')return;
      await this.request({type,value});
      if(this.engine.state.phase==='ended')await this.finish();
    }
    async finish(){
      if(this.saved)return this.result;
      if(this.engine.state?.phase!=='ended')throw Error('La battaglia è ancora in corso.');
      // The server computes syncTeam() and saves the real team atomically with event settlement.
      await this.request({type:'finish'});
      if(!this.saved)throw Error('Il salvataggio non è stato confermato.');
      global.dispatchEvent(new CustomEvent('route:team-saved',{detail:{team:this.teamManager.getTeam()}}));
      return this.result;
    }
    async retry(){
      if(this.pending)await this.request(this.pending);
      if(this.engine.state?.phase==='ended'&&!this.saved)await this.finish();
    }
  }
  async function startPokemonEncounter(options={}){
    if(active)throw Error('Concludi prima l’incontro in corso.');
    if(!Number.isInteger(options.level)||options.level<1||options.level>100)throw Error('Il generatore deve fornire un livello tra 1 e 100.');
    speciesId(options.speciesId);
    const controller=new EncounterController(options,remoteTransport());
    active={controller,returnHash:location.hash};
    try{
      await controller.start();
      return await new Promise((resolve,reject)=>{
        const ui=new global.RouteBattleUI.BattleUI({controller,onClose:async()=>{
          const result=controller.result;
          ui.destroy();active=null;
          try{await options.onComplete?.(result);resolve(result);}catch(error){reject(error);}
        }});
        ui.mount();
        if(controller.engine.state.phase==='ended'&&!controller.saved)controller.finish().catch(error=>ui.error(error));
      });
    }catch(error){active=null;throw error;}
  }
  global.RouteEncounters={configure(options){client=options.client;},speciesId,ensureSource,healTeam,pendingEncounter,resumeActive,abandonEncounter,EncounterController,
    isActive:()=>!!active,returnHash:()=>active?.returnHash,startPokemonEncounter};
  global.startPokemonEncounter=startPokemonEncounter;
})(window);
