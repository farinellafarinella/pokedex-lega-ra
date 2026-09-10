import {Battle} from './battle-engine.mjs';
import {createProfile,createEncounter,settleBattle,purchaseMove,equipMove,starterPokemon} from './progression.mjs';
import {resolveFossil,rewardStatus} from './reward-rules.mjs';
import {FOSSIL_ITEMS} from './market.mjs';
import {CONFIG,LINES,EVOLUTIONS,canEvolve} from './config.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
export function restoreBattle(raw,profile,rng=Math.random){if(!raw)return null;const battle=Object.assign(Object.create(Battle.prototype),clone(raw));battle.owner=profile;battle.rng=rng;battle.events=[];return battle;}
export function packBattle(battle){if(!battle)return null;const {owner,rng,events,...raw}=battle;return clone(raw);}
export function applyCommand(previous,command,{balance,now=new Date(),rng=Math.random}={}){
 const state=previous?clone(previous):{profile:null,battle:null,log:[]};
 let p=state.profile,b=restoreBattle(state.battle,p,rng);
 const active=b&&!b.result;
 if(command.type==='choose'){
  if(p)throw Error('Lo starter è già stato scelto.');
  if(!Object.hasOwn(LINES,command.starter))throw Error('Starter non disponibile.');
  p=createProfile(command.starter);p.starter.level=CONFIG.initialLevel;p.balance=balance;p.totalXP=0;p.encounters=0;p.linkedStarter=true;
  state.profile=p;
 }else{
  if(!p)throw Error('Scegli prima il tuo starter.');
  p.balance=balance;
  if(active&&!['move','abandon'].includes(command.type))throw Error('Concludi o abbandona la lotta in corso.');
  if(command.type==='start'){
   b=createEncounter(p,command.opponent,rng,{difficulty:command.difficulty,now});b.id=crypto.randomUUID();
   state.log=[`Vai, ${b.player.name}! Affronti ${b.enemy.name}.`];
  }else if(command.type==='move'){
   if(!active)throw Error('Nessuna lotta in corso.');
   if(!Number.isInteger(command.slot)||command.slot< -1||command.slot>3)throw Error('Mossa non valida.');
   const events=b.play(command.slot);state.log.push(...events.map(e=>e.text.replaceAll(' demo','')));
   if(b.result&&!b.settlement){const reward=settleBattle(p,b);p.totalXP+=reward.xp;p.encounters++;}
  }else if(command.type==='abandon'){
   if(!active)throw Error('Nessuna lotta in corso.');
   b=null;state.log=['Lotta abbandonata. Il tentativo rimane consumato, nessun premio assegnato.'];
  }else if(command.type==='buy'){purchaseMove(p,command.move);
  }else if(command.type==='equip'){equipMove(p,command.move,command.slot);
  }else if(command.type==='evolve'){
   if(!canEvolve(p))throw Error('I requisiti di evoluzione non sono ancora raggiunti.');
   p.starter.species=EVOLUTIONS[p.starter.species].next;
  }else if(command.type==='resolve'){
   if(!['keep','replace'].includes(command.choice))throw Error('Scelta non valida.');resolveFossil(p,command.choice==='replace');
  }else if(command.type==='sell'){
   if(p.pendingFossil)throw Error('Scegli prima il fossile da conservare.');
   const fossil=p.inventory.fossil;
   if(!fossil||command.fossilId!==fossil.id)throw Error('Il fossile non è più disponibile.');
   const price=FOSSIL_ITEMS[fossil.species].basePrice;
   if(command.price!==price)throw Error('Il prezzo è cambiato. Ricarica la quotazione.');
   p.balance+=price;p.inventory.fossil=null;
  }else throw Error('Operazione non disponibile.');
 }
 p.starter.stage=LINES[p.starter.origin].indexOf(p.starter.species);
 const pokemon=starterPokemon(p);p.starter.stats={hp:pokemon.maxHp,...pokemon.stats};
 state.battle=packBattle(b);state.log=state.log.slice(-100);
 // Solo le quote del periodo corrente servono: non cresce indefinitamente il documento.
 const period=rewardStatus(p,now).period;p.challenges=Object.fromEntries(Object.entries(p.challenges).filter(([key])=>key===period));
 return {state,delta:p.balance-balance};
}
