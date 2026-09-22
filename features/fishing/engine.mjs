import {createPokemon} from '../starter/starter-ui.js?v=arena-gifs-4';
import {FISH,RARITIES,RULES} from './config.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createBattle(starter,encounter){
 const player=createPokemon(starter.species,{level:starter.level,moves:starter.equipped});
 const species=FISH[encounter.species],level=Math.max(1,starter.level-1);
 // Use the existing stat formula without modifying the shared Starter species.
 const wild=createPokemon('squirtle',{level,moves:species.moves});
 const [hp,...stats]=species.base.map((b,i)=>Math.floor((2*b+31)*level/100)+(i===0?level+10:5));
 Object.assign(wild,{id:encounter.species,name:species.name,types:species.types,maxHp:hp,hp,baseHp:hp,stats:Object.fromEntries(['atk','def','spa','spd','spe'].map((k,i)=>[k,stats[i]]))});
 return {player,wild,turn:0,log:[]};
}
// Fishing battle adapter. Move definitions remain shared with the Starter.
const chart={normal:{rock:.5,steel:.5,ghost:0},fire:{water:.5,fire:.5,rock:.5,dragon:.5,grass:2,ice:2,bug:2,steel:2},water:{water:.5,grass:.5,dragon:.5,fire:2,ground:2,rock:2},grass:{water:2,ground:2,rock:2,grass:.5,fire:.5,poison:.5,flying:.5,bug:.5,dragon:.5,steel:.5},electric:{water:2,flying:2,electric:.5,grass:.5,dragon:.5,ground:0},ice:{water:.5,fire:.5,ice:.5,steel:.5,grass:2,ground:2,flying:2,dragon:2},poison:{grass:2,fairy:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0},steel:{water:.5,fire:.5,electric:.5,steel:.5,rock:2,ice:2,fairy:2},fighting:{normal:2,rock:2,steel:2,ice:2,dark:2,poison:.5,flying:.5,psychic:.5,bug:.5,fairy:.5,ghost:0},ground:{electric:2,fire:2,poison:2,rock:2,steel:2,grass:.5,bug:.5,flying:0},rock:{fire:2,ice:2,flying:2,bug:2,fighting:.5,ground:.5,steel:.5},dark:{psychic:2,ghost:2,dark:.5,fighting:.5,fairy:.5},flying:{grass:2,bug:2,fighting:2,electric:.5,rock:.5,steel:.5}};
const stage=n=>n>=0?(2+n)/2:2/(2-n);
const stat=(p,k)=>p.stats[k]*stage(p.stages[k]||0)*(k==='spe'&&p.status==='paralysis'?.5:1);
export const effectiveness=(type,target)=>target.types.reduce((v,t)=>v*(chart[type]?.[t]??1),1);
function act(a,d,m,log,rng){
 if(a.hp<=0||d.hp<=0)return;
 if(a.flinched){a.flinched=false;log.push(a.name+' tentenna!');return;}
 if(a.status==='sleep'&&a.sleepTurns-->0){log.push(a.name+' dorme.');return;}
 if(a.status==='sleep')a.status=null;
 if(a.status==='paralysis'&&rng()<.25){log.push(a.name+' è paralizzato!');return;}
 if(m.pp!==undefined)m.pp--;
 log.push(a.name+' usa '+m.name+'!');
 if(rng()*100>m.accuracy*stage(a.stages.accuracy)){log.push('La mossa fallisce.');return;}
 const eff=effectiveness(m.type,d);
 if(m.power){
 const physical=m.category==='physical',critical=rng()<(m.critRate||1/24);
 let damage=Math.floor(((2*a.level/5+2)*m.power*stat(a,physical?'atk':'spa')/stat(d,physical?'def':'spd')/50+2)*(m.typeless?1:eff)*(a.types.includes(m.type)?1.5:1)*(physical&&a.status==='burn'?.5:1)*(critical?1.5:1)*(.85+rng()*.15));
 damage=eff===0&&!m.typeless?0:Math.max(1,damage);d.hp=Math.max(0,d.hp-damage);log.push(damage+' PS di danno.'+(eff>1?' È superefficace!':eff===0?' Nessun effetto.':''));
 if(m.recoil)a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.maxHp/4)));
 }
 const target=m.self?a:d;
 if(m.heal)target.hp=Math.min(target.maxHp,target.hp+Math.floor(target.maxHp*m.heal));
 if(m.stages&&(m.self||eff!==0)&&rng()<(m.chance??1)){for(const [key,value] of Object.entries(m.stages))target.stages[key]=clamp(target.stages[key]+value,-6,6);log.push('Statistiche di '+target.name+' modificate.');}
 const immune=(m.powder&&d.types.includes('grass'))||(m.status==='burn'&&d.types.includes('fire'))||(m.status==='poison'&&d.types.some(t=>['poison','steel'].includes(t)))||(m.status==='paralysis'&&d.types.includes('electric'));
 if(m.status&&!d.status&&d.hp>0&&eff!==0&&!immune&&rng()<(m.chance??1)){d.status=m.status;d.sleepTurns=2;log.push(d.name+': '+m.status+'.');}
 if(m.flinch&&rng()<m.flinch)d.flinched=true;
}
const struggle={name:'Scontro',type:'normal',category:'physical',power:50,accuracy:100,priority:0,typeless:true,recoil:true};
export function turn(b,moveId=null,rng=Math.random){
 b.log=[];b.turn++;b.player.flinched=b.wild.flinched=false;
 const available=b.wild.moves.filter(m=>m.pp>0),enemy=available[Math.floor(rng()*available.length)]||struggle;
 const chosen=moveId==='struggle'?struggle:b.player.moves.find(m=>m.id===moveId&&m.pp>0);
 const actions=chosen?[[b.player,b.wild,chosen],[b.wild,b.player,enemy]]:[[b.wild,b.player,enemy]];
 actions.sort((a,c)=>(c[2].priority||0)-(a[2].priority||0)||stat(c[0],'spe')-stat(a[0],'spe'));
 for(const args of actions)act(...args,b.log,rng);
 for(const p of [b.player,b.wild])if(p.hp>0&&['poison','burn'].includes(p.status)){p.hp=Math.max(0,p.hp-Math.max(1,Math.floor(p.maxHp/8)));b.log.push(p.name+' subisce danni da '+p.status+'.');}
 return b.wild.hp===0?'wildKO':b.player.hp===0?'loss':null;
}
export function catchChance(encounter,hp,maxHp){const ratio=hp/maxHp;return clamp(RARITIES[encounter.rarity].catchRate*(ratio>=.7?.45:ratio>=.4?.95:1.5),RULES.minCatch,RULES.maxCatch);}
