import {STARTERS,SPECIES,MOVES,MOVE_SHOP,ENCOUNTERS,DIFFICULTIES,ENCOUNTER_SETS} from './mock-data.mjs';
import {Battle,createPokemon} from './battle-engine.mjs';
import {reserveChallenge,awardFossil} from './reward-rules.mjs';
let encounterSequence=0;
export const MAX_LEVEL=50;
export const ARENA_RULES={hpMultiplier:3,maxHitFraction:.24};
export function createProfile(starter='bulbasaur') {
 if(!STARTERS[starter])throw new Error('Starter non disponibile');
 return {name:'Allenatore demo',balance:600,wins:0,losses:0,challenges:{},inventory:{fossil:null},pendingFossil:null,starter:{origin:starter,species:starter,level:12,xp:0,knownMoves:[...STARTERS[starter].moves],equipped:[...STARTERS[starter].moves]}};
}
export const xpRequired=level=>level>=MAX_LEVEL?0:Math.round(220+5*Math.pow(level,1.7));
export function starterPokemon(profile) {
 const s=profile.starter;
 return createPokemon(s.species,{level:s.level,moves:s.equipped});
}
export function nextEvolution(profile) {
 return STARTERS[profile.starter.origin].evolutions.find(([level])=>level>profile.starter.level)||null;
}
export function gainXP(profile,amount) {
 if(!Number.isInteger(amount)||amount<0)throw new Error('XP non validi');
 const s=profile.starter,levels=[],evolutions=[];
 if(s.level>=MAX_LEVEL)return {levels,evolutions};
 s.xp+=amount;
 while(s.level<MAX_LEVEL&&s.xp>=xpRequired(s.level)){
  s.xp-=xpRequired(s.level);s.level++;levels.push(s.level);
  const evolution=STARTERS[s.origin].evolutions.find(([level])=>level===s.level);
  if(evolution&&!profile.linkedStarter){const previous=s.species;s.species=evolution[1];evolutions.push({from:SPECIES[previous].name,to:SPECIES[s.species].name});}
 }
 if(s.level===MAX_LEVEL)s.xp=0;
 return {levels,evolutions};
}
export function purchaseMove(profile,id) {
 const offer=MOVE_SHOP.find(o=>o.id===id&&o.starters.includes(profile.starter.origin));
 if(!offer)throw new Error('Mossa non compatibile con questo starter');
 if(profile.starter.knownMoves.includes(id))throw new Error('Mossa già acquistata');
 if(profile.starter.level<offer.level)throw new Error(`Serve il livello ${offer.level}`);
 if(profile.balance<offer.price)throw new Error('Pokédollari demo insufficienti');
 profile.balance-=offer.price;profile.starter.knownMoves.push(id);
 return MOVES[id].name;
}
export function equipMove(profile,id,slot) {
 if(!Number.isInteger(slot)||slot<0||slot>3)throw new Error('Slot non valido');
 if(!profile.starter.knownMoves.includes(id))throw new Error('Prima acquista la mossa');
 if(profile.starter.equipped.includes(id))throw new Error('Mossa già equipaggiata');
 const replaced=profile.starter.equipped[slot];profile.starter.equipped[slot]=id;
 return MOVES[replaced].name;
}

export function encounterPreview(profile,fossil,difficulty='balanced') {
 const encounter=ENCOUNTERS[fossil],mode=DIFFICULTIES[difficulty];
 if(!encounter||!mode)throw new Error('Avversario o difficoltà non disponibili');
 const level=Math.max(1,Math.min(100,profile.starter.level+mode.offset));
 const xp=Math.round(({kabuto:28,omanyte:34,aerodactyl:40}[fossil])*mode.xp);
 return {level,moves:[...ENCOUNTER_SETS[fossil][difficulty]],aiStyle:mode.ai,winCoins:Math.round(encounter.reward*mode.coins),lossCoins:Math.round(50*mode.coins),winXP:xp,lossXP:Math.max(1,Math.floor(xp*.25))};
}
export function createEncounter(profile,fossil,rng=Math.random,{difficulty='balanced',now=new Date()}={}) {
 if(profile.pendingFossil)throw new Error('Scegli prima quale fossile conservare nell’inventario');
 const preview=encounterPreview(profile,fossil,difficulty),starter=profile.starter;
 const battle=new Battle(starter.species,fossil,rng,{
  player:{level:starter.level,moves:starter.equipped},enemy:{level:preview.level,moves:preview.moves,aiStyle:preview.aiStyle},...ARENA_RULES,
 });
 // Only starting a real encounter consumes a slot; rendering previews is read-only.
 const quota=reserveChallenge(profile,now);
 battle.id=++encounterSequence;battle.owner=profile;battle.challenge={...quota,difficulty,...preview};
 battle.rewards={win:quota.eligible?preview.winCoins:0,loss:quota.eligible?preview.lossCoins:0};
 return battle;
}
export function settleBattle(profile,battle) {
 if(battle.owner!==profile)throw new Error('Lotta non appartenente a questo profilo demo');
 if(!battle.result)throw new Error('La lotta non è terminata');
 if(battle.settlement)return battle.settlement;
 const win=battle.result==='win',challenge=battle.challenge;
 const coins=battle.rewards[win?'win':'loss'];
 const xp=profile.starter.level===MAX_LEVEL?0:win?challenge.winXP:challenge.lossXP;
 profile.balance+=coins;profile[win?'wins':'losses']++;
 const progression=gainXP(profile,xp);
 const fossil=win&&challenge.eligible?awardFossil(profile,battle.enemy.id,battle.id):null;
 battle.settlement={coins,xp,fossil,eligible:challenge.eligible,challengeNumber:challenge.number,...progression};return battle.settlement;
}
