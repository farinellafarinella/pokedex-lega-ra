(function(global){
  'use strict';
  // Runs on the server and in integration tests. No minigame combat formulas here.
  function startSession(team,encounter){
    const engine=new global.RouteBattle.BattleEngine();
    engine.start({team,wildSpeciesId:encounter.speciesId,wildLevel:encounter.level,...encounter});
    engine.state.testMode=encounter.testMode===true;
    if(Number.isFinite(encounter.wildHealthFraction))engine.enemy().currentHp=Math.max(1,Math.floor(engine.maxHp(engine.enemy())*Math.max(0,Math.min(1,encounter.wildHealthFraction))));
    return engine.snapshot();
  }
  function applyCommand(state,command,{rng=Math.random}={}){
    const events=[],engine=new global.RouteBattle.BattleEngine({rng,onEvent:e=>{const {state,...event}=e;events.push(event);}});
    engine.state=structuredClone(state);
    let response;
    if(command.type==='move')response=engine.chooseMove(command.value);
    else if(command.type==='switch')response=engine.switchPokemon(command.value);
    else if(command.type==='capture')response=engine.attemptCapture();
    else if(command.type==='flee')response=engine.escape();
    else if(command.type==='finish'){
      if(state.phase!=='ended')throw Error('BATTLE_ACTIVE');
      if(state.testMode)return {state:engine.snapshot(),events,team:structuredClone(state.initialTeam),saved:true,result:{result:state.result,source:state.source,capturedPokemon:null,testMode:true}};
      const manager=new global.RouteTeam.TeamManager({autoLoad:false,storage:{setItem(){}}});
      manager.setTeam(engine.syncTeam());
      let capturedPokemon=null;
      if(state.result==='capture'&&!command.discard){
        const caught=structuredClone(state.capturedPokemon);
        const result=manager.isFull()?manager.replacePokemon(command.replaceUid,caught):manager.addPokemon(caught);
        if(!result.ok)throw Error(result.reason);
        capturedPokemon=caught;
      }
      return {state:engine.snapshot(),events,team:manager.getTeam(),saved:true,
        result:{result:state.result,source:state.source,capturedPokemon,discarded:state.result==='capture'&&!capturedPokemon}};
    }else throw Error('INVALID_COMMAND');
    if(!response.ok)throw Error(response.reason);
    return {state:engine.snapshot(),events,team:engine.syncTeam(),saved:false};
  }
  global.RouteEncounterSession={startSession,applyCommand};
})(window);
