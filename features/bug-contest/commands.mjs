import {createContest,startEncounter,attack,throwPokeball,flee,presentToJury} from './engine.mjs';

// Shared authoritative command dispatcher, used only by the Edge Function.
export function applyCommand(previous,command,starter,rng=Math.random){
 if(command.type==='start'){
  if(previous)throw Error('ALREADY_STARTED');
  if(!starter)throw Error('STARTER_REQUIRED');
  return createContest(starter);
 }
 if(!previous)throw Error('CONTEST_NOT_FOUND');
 const state=structuredClone(previous);
 let accepted=false;
 switch(command.type){
  case 'next':accepted=startEncounter(state,rng);break;
  case 'move':accepted=attack(state,command.move,rng);break;
  case 'catch':accepted=!!throwPokeball(state,rng);break;
  case 'flee':accepted=flee(state);break;
  case 'present':accepted=!!presentToJury(state,command.pokemonId);break;
  default:throw Error('INVALID_COMMAND');
 }
 if(!accepted)throw Error('INVALID_COMMAND');
 return state;
}
