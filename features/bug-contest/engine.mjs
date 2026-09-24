import {createPokemon} from '../starter/starter-ui.js?v=johto-7';
import {turn} from '../fishing/engine.mjs?v=johto-7';
import {BUG_POKEMON, RULES} from './config.mjs?v=official-1';
import {calculateContestScore} from './scoring.mjs';

export function createContest(starter, now = new Date()) {
  // Validate the actual companion with the existing battle factory.
  createPokemon(starter.species,{level:starter.level,moves:starter.equipped});
  return {version:1,id:crypto.randomUUID(),startedAt:now.toISOString(),phase:'ready',
    starter:structuredClone(starter),pokeballs:RULES.pokeballs,encounters:0,
    caughtPokemon:[],encounter:null,battle:null,judgment:null,endReason:null,message:''};
}

export function generateEncounter(rng = Math.random) {
  const total=BUG_POKEMON.reduce((sum,p)=>sum+p.encounterWeight,0);
  let draw=rng()*total;
  const species=BUG_POKEMON.find(p=>(draw-=p.encounterWeight)<0) || BUG_POKEMON.at(-1);
  const weight=Math.round(species.baseWeight*(1-RULES.weightVariation+rng()*2*RULES.weightVariation)*10)/10;
  return {...structuredClone(species),species:species.id,id:crypto.randomUUID(),weight};
}

function finishIfNeeded(state) {
  if (state.pokeballs<=0) {
    state.pokeballs=0;state.endReason='balls';state.phase='selection';return true;
  }
  // The fifth encounter may still be played: its completion ends capture play.
  if (state.phase!=='battle' && state.encounters>=RULES.maxEncounters) {
    state.endReason='encounters';state.phase='selection';return true;
  }
  return false;
}

function endEncounter(state, message) {
  state.phase='between';state.message=message;finishIfNeeded(state);
}

export function startEncounter(state, rng = Math.random) {
  if (!['ready','between'].includes(state.phase) || finishIfNeeded(state)) return false;
  state.encounter=generateEncounter(rng);state.encounters++;
  const player=createPokemon(state.starter.species,{level:state.starter.level,moves:state.starter.equipped});
  const level=Math.max(1,state.starter.level+RULES.wildLevelOffset),p=state.encounter;
  // Reuse the app's fighter structure, move definitions and turn engine.
  // Only the wild species data differs from the fishing adapter.
  const wild=createPokemon('squirtle',{level,moves:p.moves});
  const [hp,...stats]=p.base.map((base,i)=>Math.floor((2*base+31)*level/100)+(i===0?level+10:5));
  Object.assign(wild,{id:p.species,name:p.name,types:[...p.types],hp,maxHp:hp,baseHp:hp,
    stats:Object.fromEntries(['atk','def','spa','spd','spe'].map((key,i)=>[key,stats[i]]))});
  state.battle={player,wild,turn:0,log:[]};state.phase='battle';
  state.message=`È apparso ${p.name}!`;return true;
}

export function captureProbability(state) {
  const wild=state.battle?.wild;
  if (!wild || wild.hp<=0 || !state.encounter) return 0;
  const health=Math.min(1,wild.hp/wild.maxHp);
  return Math.max(RULES.minCatch,Math.min(RULES.maxCatch,state.encounter.catchRate*(0.45+1.25*(1-health))));
}

function canAct(state) {
  if (state.phase!=='battle' || finishIfNeeded(state)) return false;
  if (state.battle.wild.hp<=0) {endEncounter(state,'Il Pokémon selvatico è KO: non puoi catturarlo.');return false;}
  if (state.battle.player.hp<=0) {endEncounter(state,'Il tuo Starter è esausto.');return false;}
  return true;
}

export function attack(state, moveId, rng = Math.random) {
  if (!canAct(state)) return false;
  const moves=state.battle.player.moves;
  if (moveId==='struggle' ? moves.some(m=>m.pp>0) : !moves.some(m=>m.id===moveId&&m.pp>0)) return false;
  const outcome=turn(state.battle,moveId,rng);
  state.message='';
  if (outcome) endEncounter(state,outcome==='wildKO'?'Il Pokémon selvatico è KO: non puoi catturarlo.':'Il tuo Starter è esausto. Potrà riprendersi prima del prossimo incontro.');
  return true;
}

export function throwPokeball(state, rng = Math.random) {
  if (!canAct(state)) return null;
  state.pokeballs--; // A failed throw costs exactly as much as a successful one.
  const success=rng()<captureProbability(state);
  const message=success?'Cattura riuscita!':'Il Pokémon è uscito dalla Poké Ball!';
  if (success) {
    const {id,species,name,rarity,rarityScore,stars,weight,image}=state.encounter;
    state.caughtPokemon.push({id,species,name,rarity,rarityScore,stars,weight,image});
    endEncounter(state,message);
  } else {
    state.message=message;
    // At zero balls there is no retaliation, no next turn and no next encounter.
    if (!finishIfNeeded(state)) {
      const outcome=turn(state.battle,null,rng);
      if (outcome) endEncounter(state,message+' '+(outcome==='wildKO'?'Il selvatico è andato KO.':'Il tuo Starter è esausto.'));
    }
  }
  return {success,message};
}

export function flee(state) {
  if (!canAct(state)) return false;
  endEncounter(state,'Hai lasciato andare il Pokémon.');return true;
}

export function presentToJury(state, pokemonId, now = new Date()) {
  if (state.phase!=='selection') return null;
  const pokemon=state.caughtPokemon.find(p=>p.id===pokemonId);
  if (!pokemon) return null;
  state.judgment={contestId:state.id,pokemon:structuredClone(pokemon),date:now.toISOString(),...calculateContestScore(pokemon)};
  state.phase='judged';state.message='La giuria ha valutato il tuo Pokémon.';
  return state.judgment;
}
