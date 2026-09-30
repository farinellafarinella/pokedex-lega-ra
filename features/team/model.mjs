import {getPokemonById,getPokemonLevelMoves} from '../pokedex/data.mjs';
export const TEAM_LIMIT=6;
export const generatePokemonUid=()=>`PKM-${crypto.randomUUID()}`;
export function calculateExpForLevel(speciesId,level){
 const species=getPokemonById(speciesId);if(!species)throw Error('Specie non valida.');
 const n=Math.max(1,Math.min(100,Math.floor(level)));
 const formulas={fast:()=>4*n**3/5,slow:()=>5*n**3/4,medium_slow:()=>6*n**3/5-15*n**2+100*n-140,slightly_fast:()=>3*n**3/4+10*n**2-30,slightly_slow:()=>3*n**3/4+20*n**2-70};
 return n===1?0:Math.max(0,Math.floor((formulas[species.growth]||(()=>n**3))()));
}
export function calculateStats(speciesId,level){
 const p=getPokemonById(speciesId);if(!p)throw Error('Specie non valida.');
 return Object.fromEntries(Object.entries(p.baseStats).map(([key,value])=>[key,Math.floor((2*value+10)*level/100)+(key==='hp'?level+10:5)]));
}
export function createOwnedPokemon(speciesId,level=5,{isStarter=false,obtainedFrom='QR',uid=generatePokemonUid(),obtainedAt=new Date().toISOString()}={}){
 if(!Number.isInteger(level)||level<1||level>100)throw Error('Livello non valido.');
 const moves=[];for(const {move} of getPokemonLevelMoves(speciesId,level)){const i=moves.indexOf(move);if(i>=0)moves.splice(i,1);moves.push(move);}
 return {uid,speciesId:Number(speciesId),level,exp:calculateExpForLevel(speciesId,level),currentHp:calculateStats(speciesId,level).hp,moves:moves.slice(-4),status:null,isStarter,obtainedFrom,obtainedAt};
}
export const canReleasePokemon=p=>!!p&&p.isStarter===false;
export function validateTeam(team){
 if(!Array.isArray(team)||team.length<1||team.length>TEAM_LIMIT||team.filter(p=>p.isStarter===true).length!==1||new Set(team.map(p=>p.uid)).size!==team.length)throw Error('Squadra non valida.');
 for(const p of team){if(!getPokemonById(p.speciesId)||!p.uid||!Number.isInteger(p.level)||p.level<1||p.level>100||!Number.isInteger(p.exp)||p.exp<0||!Number.isInteger(p.currentHp)||p.currentHp<0||p.currentHp>calculateStats(p.speciesId,p.level).hp||!Array.isArray(p.moves)||p.moves.length>4)throw Error('Pokémon non valido.');}
 return true;
}
// Pure transitions for preview/tests. Production persists only through authenticated RPCs.
export function releasePokemon(team,uid){const p=team.find(p=>p.uid===uid);if(!canReleasePokemon(p))return false;const next=team.filter(p=>p.uid!==uid);validateTeam(next);return next;}
export function replaceTeamPokemon(team,uid,pokemon){const i=team.findIndex(p=>p.uid===uid);if(i<0||!canReleasePokemon(team[i])||pokemon.isStarter)return false;const next=team.map((p,j)=>j===i?structuredClone(pokemon):p);validateTeam(next);return next;}
export function addPokemonToTeam(team,pokemon){if(team.length>=TEAM_LIMIT||pokemon.isStarter)return false;const next=[...team,structuredClone(pokemon)];validateTeam(next);return next;}
export function movePokemonInTeam(team,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=team.length||to>=team.length)return false;const next=[...team];next.splice(to,0,next.splice(from,1)[0]);validateTeam(next);return next;}
export function createBattleParty(team){validateTeam(team);return {party:structuredClone(team),activePokemonIndex:team.findIndex(p=>p.currentHp>0)};}
export function switchBattlePokemon(battle,index){if(!Number.isInteger(index)||index===battle.activePokemonIndex||!battle.party[index]||battle.party[index].currentHp<=0)return false;const forced=battle.activePokemonIndex<0||battle.party[battle.activePokemonIndex].currentHp<=0;battle.activePokemonIndex=index;return {consumesTurn:!forced};}
export const isPartyDefeated=battle=>battle.party.every(p=>p.currentHp===0);
