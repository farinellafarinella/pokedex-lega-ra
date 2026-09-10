import {SPECIES,MOVES,STRUGGLE} from './mock-data.mjs';
// Fixtures and battle snapshots contain only JSON data. This also works over
// plain HTTP on a phone, where structuredClone may be unavailable.
const cloneData = value => JSON.parse(JSON.stringify(value));
// Tabella moderna: [superefficaci, resistiti, immuni].
const chart = {
 normal:['','rock steel','ghost'],fire:['grass ice bug steel','fire water rock dragon',''],
 water:['fire ground rock','water grass dragon',''],electric:['water flying','electric grass dragon','ground'],
 grass:['water ground rock','fire grass poison flying bug dragon steel',''],ice:['grass ground flying dragon','fire water ice steel',''],
 fighting:['normal ice rock dark steel','poison flying psychic bug fairy','ghost'],poison:['grass fairy','poison ground rock ghost','steel'],
 ground:['fire electric poison rock steel','grass bug','flying'],flying:['grass fighting bug','electric rock steel',''],
 psychic:['fighting poison','psychic steel','dark'],bug:['grass psychic dark','fire fighting poison flying ghost steel fairy',''],
 rock:['fire ice flying bug','fighting ground steel',''],ghost:['psychic ghost','dark','normal'],
 dragon:['dragon','steel','fairy'],dark:['psychic ghost','fighting dark fairy',''],
 steel:['ice rock fairy','fire water electric steel',''],fairy:['fighting dragon dark','fire poison steel',''],
};
export function effectiveness(type,targets) {
 const row=chart[type]; if(!row) throw new Error('Tipo sconosciuto');
 return targets.reduce((n,t)=>n*(row[2].split(' ').includes(t)?0:row[0].split(' ').includes(t)?2:row[1].split(' ').includes(t)?.5:1),1);
}
export function createPokemon(id,{level=50,moves=null,hpMultiplier=1,maxHitFraction=null,aiStyle='balanced'}={}) {
 const s=SPECIES[id]; if(!s) throw new Error('Pokémon sconosciuto');
 if(!Number.isInteger(level)||level<1||level>100)throw new Error('Livello non valido');
 const moveIds=moves||s.moves;if(moveIds.length!==4||new Set(moveIds).size!==4||moveIds.some(id=>!MOVES[id]))throw new Error('Servono quattro mosse distinte');
 const [baseHp,atk,def,spa,spd,spe]=s.base.map((b,i)=>Math.floor((2*b+31)*level/100)+(i===0?level+10:5));
 const hp=Math.floor(baseHp*hpMultiplier);
 return {id,name:s.name,types:[...s.types],level,maxHp:hp,hp,baseHp,maxHitFraction,aiStyle,stats:{atk,def,spa,spd,spe},stages:{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0},status:null,sleepTurns:0,flinched:false,lastMove:null,moves:moveIds.map(id=>({id,...cloneData(MOVES[id]),maxPp:MOVES[id].pp}))};
}
export const stageMultiplier = n => n>=0?(2+n)/2:2/(2-n);
export function stat(p,key,critical=false,defending=false) {
 let stage=p.stages[key];
 if(critical&&((defending&&stage>0)||(!defending&&stage<0)))stage=0;
 return Math.max(1,Math.floor(p.stats[key]*stageMultiplier(stage)*(key==='spe'&&p.status==='paralysis'?.5:1)));
}
export function damage(a,d,m,{critical=false,roll=1}={}) {
 const eff=m.typeless?1:effectiveness(m.type,d.types);
 if(!eff||!m.power)return 0;
 const physical=m.category==='physical';
 const attack=stat(a,physical?'atk':'spa',critical);
 const defense=stat(d,physical?'def':'spd',critical,true);
 const base=Math.floor(Math.floor((Math.floor(2*a.level/5)+2)*m.power*attack/defense)/50)+2;
 const stab=!m.typeless&&a.types.includes(m.type)?1.5:1;
 const burn=physical&&a.status==='burn'&&!m.recoil?.5:1;
 const calculated=Math.max(1,Math.floor(base*(critical?1.5:1)*roll*stab*eff*burn));
 // Optional prototype arena rule: prevents a single critical/super-effective
 // move from deciding the entire match. Standard battles keep the original damage.
 return d.maxHitFraction?Math.min(calculated,Math.max(1,Math.floor(d.maxHp*d.maxHitFraction))):calculated;
}
export function canStatus(p,status) {
 return !p.status&&p.hp>0&&!(status==='paralysis'&&p.types.includes('electric'))&&!(status==='burn'&&p.types.includes('fire'))&&!(status==='poison'&&p.types.some(t=>['poison','steel'].includes(t)));
}
function statusAllowed(target,m) {
 return (!m.powder||!target.types.includes('grass'))&&canStatus(target,m.status)&&!(m.type==='electric'&&effectiveness(m.type,target.types)===0);
}
export function accuracy(a,m) {
 const n=a.stages.accuracy;
 return Math.min(1,m.accuracy/100*(n>=0?(3+n)/3:3/(3-n)));
}
export function chooseAI(a,d,rng=Math.random) {
 const available=a.moves.map((m,i)=>({m,i})).filter(({m})=>m.pp>0);
 if(!available.length)return -1;
 const scored=available.map(({m,i})=>{
  let score=0;
  if(m.power)score=damage(a,d,m)*accuracy(a,m)+(m.status&&statusAllowed(d,m)?12*(m.chance||1):0)+(m.flinch?8:0);
  else if(m.heal)score=a.hp<a.maxHp*.6?Math.min(a.maxHp*m.heal,a.maxHp-a.hp):0;
  else if(m.status)score=statusAllowed(d,m)?26*accuracy(a,m):0;
  else if(m.stages){const target=m.self?a:d;score=Object.entries(m.stages).some(([s,n])=>n>0?target.stages[s]<6:target.stages[s]>-6)?18:0;if(m.self&&a.hp<a.maxHp*.3)score*=.3;}
  if(m.power&&effectiveness(m.type,d.types)===0)score=0;
  if(a.aiStyle==='tactical'&&m.power&&damage(a,d,m)>=d.hp)score*=2;
  if(a.aiStyle==='tactical'&&m.priority>0&&stat(a,'spe')<stat(d,'spe'))score*=1.3;
  if(a.lastMove===m.id)score*=.55;
  return {i,score};
 });
 const viable=scored.filter(x=>x.score>0);
 // If all available attacks are immune/ineffective, spend PP until Scontro is available.
 if(!viable.length)return available[Math.floor(rng()*available.length)].i;
 const exponent=a.aiStyle==='relaxed'?1.2:a.aiStyle==='tactical'?3:2;
 const weights=viable.map(x=>({...x,weight:Math.pow(x.score,exponent)}));
 let pick=rng()*weights.reduce((n,x)=>n+x.weight,0);
 for(const x of weights){pick-=x.weight;if(pick<0)return x.i;}
 return weights.at(-1).i;
}
const statusNames={paralysis:'paralizzato',poison:'avvelenato',burn:'scottato',sleep:'addormentato'};
const statNames={atk:'Attacco',def:'Difesa',spa:'Attacco Speciale',spd:'Difesa Speciale',spe:'Velocità',accuracy:'Precisione'};
export class Battle {
 constructor(player,fossil,rng=Math.random,options={}){
  const arena={hpMultiplier:options.hpMultiplier||1,maxHitFraction:options.maxHitFraction||null};
  this.player=createPokemon(player,{...options.player,...arena});this.enemy=createPokemon(fossil,{...options.enemy,...arena});this.rng=rng;this.turn=0;this.result=null;this.reward=0;this.events=[];
  this.rewards=options.rewards||{win:SPECIES[fossil].reward,loss:50};
 }
 snapshot(){return cloneData({player:this.player,enemy:this.enemy,turn:this.turn,result:this.result,reward:this.reward});}
 emit(text,actor=null,kind='message'){this.events.push({text,actor,kind,state:this.snapshot()});}
 finish(){
  if(this.result)return true;
  if(this.player.hp&&this.enemy.hp)return false;
  // Simultaneous KO (Scontro recoil): player loss, explicitly deterministic.
  this.result=this.player.hp>0?'win':'loss';this.reward=this.rewards[this.result];
  this.emit(`${this.result==='win'?'Vittoria!':'Sconfitta.'} Ottieni ${this.reward} Pokédollari demo.`);return true;
 }
 force(result){if(this.result)return [];this.events=[];if(result==='win')this.enemy.hp=0;else this.player.hp=0;this.finish();return this.events;}
 act(actor,target,index,side){
  if(!actor.hp||!target.hp)return;
  if(actor.flinched){this.emit(`${actor.name} tentenna!`);return;}
  if(actor.status==='sleep'){
   actor.sleepTurns--;if(actor.sleepTurns>0){this.emit(`${actor.name} dorme profondamente.`);return;}
   actor.status=null;this.emit(`${actor.name} si è svegliato!`);
  }
  if(actor.status==='paralysis'&&this.rng()<.25){this.emit(`${actor.name} è paralizzato! Non può muoversi.`);return;}
  const m=index===-1?STRUGGLE:actor.moves[index];
  if(index!==-1)m.pp--;
  actor.lastMove=m.id||'struggle';this.emit(`${actor.name} usa ${m.name}!`,side,'attack');
  if(m.heal){
   const healed=Math.min(actor.maxHp-actor.hp,Math.floor(actor.maxHp*m.heal));
   actor.hp+=healed;this.emit(healed?`${actor.name} recupera ${healed} PS!`:`${actor.name} ha già tutti i PS.`);return;
  }
  if((!m.self||m.power)&&!m.recoil&&this.rng()>=accuracy(actor,m)){this.emit('L’attacco fallisce!');return;}
  const eff=m.typeless?1:effectiveness(m.type,target.types);
  if((m.power||m.type==='electric')&&!eff){this.emit(`Non ha effetto su ${target.name}!`);return;}
  if(m.power){
   const critical=this.rng()<(m.critRate||1/24);
   const dealt=damage(actor,target,m,{critical,roll:(85+Math.floor(this.rng()*16))/100});
   target.hp=Math.max(0,target.hp-dealt);this.emit(`${target.name} perde ${dealt} PS.`,side==='player'?'enemy':'player','hit');
   if(critical)this.emit('Brutto colpo!');
   if(eff>1)this.emit('È superefficace!');else if(eff<1)this.emit('Non è molto efficace…');
  }
  if(m.recoil){actor.hp=Math.max(0,actor.hp-Math.max(1,Math.floor(actor.maxHp/4)));this.emit(`${actor.name} subisce il contraccolpo!`);}
  if(!target.hp){this.emit(`${target.name} è esausto!`);return;}
  if(m.status&&this.rng()<(m.chance||1)){
   if(statusAllowed(target,m)){target.status=m.status;if(m.status==='sleep')target.sleepTurns=2+Math.floor(this.rng()*3);this.emit(`${target.name} è ${statusNames[m.status]}!`);}
   else if(!m.power)this.emit('Non ha effetto: stato già presente o immunità.');
  }
  if(m.stages&&(!m.power||this.rng()<(m.chance||1))){
   const p=m.self?actor:target;
   for(const [s,n] of Object.entries(m.stages)){
    const before=p.stages[s];p.stages[s]=Math.max(-6,Math.min(6,before+n));
    this.emit(before===p.stages[s]?`${statNames[s]} di ${p.name} è già al limite!`:`${statNames[s]} di ${p.name} ${n>0?'aumenta':'diminuisce'}!`);
   }
  }
  if(m.flinch&&this.rng()<m.flinch)target.flinched=true;
 }
 play(index){
  if(this.result)throw new Error('Lotta già terminata');
  if(index===-1?this.player.moves.some(m=>m.pp>0):!Number.isInteger(index)||!this.player.moves[index]||this.player.moves[index].pp<=0)throw new Error('Mossa non disponibile');
  this.events=[];this.turn++;this.player.flinched=false;this.enemy.flinched=false;
  // AI is called only after validation of the player's submitted move; never reads that move.
  const enemyIndex=chooseAI(this.enemy,this.player,this.rng);
  const pm=index===-1?STRUGGLE:this.player.moves[index],em=enemyIndex===-1?STRUGGLE:this.enemy.moves[enemyIndex];
  const priority=pm.priority-em.priority,speed=stat(this.player,'spe')-stat(this.enemy,'spe');
  const first=priority!==0?priority>0:speed!==0?speed>0:this.rng()<.5;
  const order=first?[[this.player,this.enemy,index,'player'],[this.enemy,this.player,enemyIndex,'enemy']]:[[this.enemy,this.player,enemyIndex,'enemy'],[this.player,this.enemy,index,'player']];
  this.emit(`Turno ${this.turn}`);
  for(const args of order){this.act(...args);if(this.finish())return this.events;}
  for(const [p,,,side] of order){
   if(p.status==='poison'||p.status==='burn'){
    p.hp=Math.max(0,p.hp-Math.max(1,Math.floor(p.maxHp/(p.status==='poison'?8:16))));
    this.emit(`${p.name} soffre per ${p.status==='poison'?'il veleno':'la scottatura'}!`,side,'hit');
    if(!p.hp)this.emit(`${p.name} è esausto!`);
    if(this.finish())break;
   }
  }
  return this.events;
 }
}
