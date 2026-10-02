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
    if(command.type==='learn')response=engine.chooseLearnedMove(command.value);
    else if(command.type==='move')response=engine.chooseMove(command.value);
    else if(command.type==='switch')response=engine.switchPokemon(command.value);
    else if(command.type==='capture')response=engine.attemptCapture();
    else if(command.type==='flee')response=engine.escape();
    else if(command.type==='finish'){
      if(state.phase!=='ended')throw Error('BATTLE_ACTIVE');
      if(state.pendingMoves?.length)throw Error('MOVE_CHOICE_REQUIRED');
      if(state.testMode)return {state:engine.snapshot(),events,team:structuredClone(state.initialTeam),saved:true,result:{result:state.result,source:state.source,capturedPokemon:null,testMode:true}};
      // Captures belong to event scoring only. QR/gifts own all roster additions.
      return {state:engine.snapshot(),events,team:engine.syncTeam(),saved:true,
        result:{result:state.result,source:state.source,capturedPokemon:state.result==='capture'?structuredClone(state.capturedPokemon):null,addedToTeam:false}};
    }else throw Error('INVALID_COMMAND');
    if(!response.ok)throw Error(response.reason);
    return {state:engine.snapshot(),events,team:engine.syncTeam(),saved:false};
  }
  global.RouteEncounterSession={startSession,applyCommand};
})(window);
