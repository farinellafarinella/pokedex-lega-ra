(function(global){
 'use strict';
 const Core=global.RoutePokemonCore,Base=global.RouteBattle.BattleEngine;
 class DuelEngine extends Base{
  move(key){return key==='STRUGGLE'?{name:'Scontro',type:'???',category:'physical',power:50,accuracy:100,effect:'recoil_hit',pp:1}:super.move(key);}
  maxHp(mon){return mon.routeStats?.maxHp||super.maxHp(mon);}
  prepareMon(instance){const mon=super.prepareMon(instance);if(mon.routeStats)mon.currentHp=Math.min(instance.currentHp??mon.routeStats.maxHp,mon.routeStats.maxHp);return mon;}
  stat(mon,key){if(!mon.routeStats)return super.stat(mon,key);const stage=mon.battle[key]||0;let value=mon.routeStats[key]*(stage>=0?(2+stage)/2:2/(2-stage));if(key==='attack'&&mon.status==='BRN')value*=.5;if(key==='speed'&&mon.status==='PAR')value*=.25;return Math.max(1,Math.floor(value));}
  fresh(p){const mon=this.prepareMon({...p,currentHp:this.maxHp(p),status:null});mon.pp=Object.fromEntries(mon.moves.map(k=>[k,this.move(k)?.pp||1]));return mon;}
  startDuel(attack,defense){
   if(!attack?.length||!defense?.length||attack.length>6||defense.length>6)throw Error('INVALID_TEAM');
   super.start({team:attack.map(p=>this.fresh(p)),wildPokemon:this.fresh(defense[0]),source:'ROUTE01',canCapture:false});
   this.state.defenders=defense.map(p=>this.fresh(p));this.state.defenderIndex=0;this.state.enemy=this.state.defenders[0];this.state.ai=this.planAI();return this.snapshot();
  }
  restore(state){this.state=structuredClone(state);this.state.enemy=this.state.defenders[this.state.defenderIndex];}
  usable(p){const moves=p.moves.filter(k=>(p.pp[k]||0)>0&&this.move(k));return moves.length?moves:['STRUGGLE'];}
  estimate(user,target,key){
   const m=this.move(key),eff=this.typeEffect(m.type,this.species(target).types);
   if(!m.power){
    if(['heal','morning_sun','synthesis','milk_drink','softboiled','moonlight'].includes(m.effect))return (1-user.currentHp/this.maxHp(user))*65;
    if(['sleep','poison','toxic','paralyze','confuse'].includes(m.effect))return target.status?0:20;
    return 5;
   }
   const saved=this.rng;this.rng=()=>.5;let damage;try{damage=this.damage(user,target,m).damage;}finally{this.rng=saved;}
   return eff===0?0:damage*(m.accuracy||100)/100+(damage>=target.currentHp?20:0);
  }
  planAI(){
   const e=this.enemy(),p=this.active(),best=mon=>this.usable(mon).map(key=>({type:'move',value:key,score:this.estimate(mon,p,key)})).sort((a,b)=>b.score-a.score)[0];
   let action=best(e);
   if(e.currentHp/this.maxHp(e)<.3||action.score<12){
    for(const [i,mon] of this.state.defenders.entries())if(i!==this.state.defenderIndex&&mon.currentHp>0){
     const incoming=Math.max(...this.usable(p).map(k=>this.estimate(p,mon,k))),score=best(mon).score-incoming*.45;
     if(score>action.score+18)action={type:'switch',value:i,score};
    }
   }
   return {type:action.type,value:action.value}; // Stored before the player submits their next action.
  }
  faint(){
   const alive=this.state.party.some(p=>p.currentHp>0),enemyAlive=this.state.defenders.some(p=>p.currentHp>0);
   if(!alive||!enemyAlive){this.state.phase='ended';this.state.result=!alive&&!enemyAlive?'draw':alive?'win':'loss';return;}
   if(this.enemy().currentHp<=0){this.state.defenderIndex=this.state.defenders.findIndex(p=>p.currentHp>0);this.state.enemy=this.state.defenders[this.state.defenderIndex];this.emit('enemy_switch',{speciesId:this.enemy().speciesId});}
   this.state.pendingSwitch=this.active().currentHp<=0;
  }
  canAct(mon){const result=super.canAct(mon);if(result.ok&&this.ppAction?.user===mon&&this.ppAction.key!=='STRUGGLE')mon.pp[this.ppAction.key]--;return result;}
  hit(side,key){const user=side==='player'?this.active():this.enemy(),target=side==='player'?this.enemy():this.active();if(user.currentHp<=0||target.currentHp<=0)return;this.ppAction={user,key};try{super.executeMove(user,target,key,side);}finally{this.ppAction=null;}}
  command(type,value){
   if(this.state.phase!=='battle')throw Error('BATTLE_ENDED');
   if(type==='flee'){this.state.phase='ended';this.state.result='loss';return this.snapshot();}
   if(type==='switch'){
    if(!Number.isInteger(value)||value===this.state.activeIndex||!this.state.party[value]||this.state.party[value].currentHp<=0)throw Error('INVALID_SWITCH');
   }else if(type!=='move'||this.state.pendingSwitch||!this.usable(this.active()).includes(value))throw Error('INVALID_MOVE');
   if(this.state.pendingSwitch){this.state.activeIndex=value;this.state.pendingSwitch=false;this.state.ai=this.planAI();return this.snapshot();}
   const ai=this.state.ai||this.planAI(),actions=[{side:'player',type,value},{side:'enemy',...ai}];
   const priority=a=>a.type==='switch'?6:this.priority(a.side==='player'?this.active():this.enemy(),a.value);
   actions.sort((a,b)=>priority(b)-priority(a)||this.stat(b.side==='player'?this.active():this.enemy(),'speed')-this.stat(a.side==='player'?this.active():this.enemy(),'speed'));
   // A fainted Pokémon never grants its replacement another action in the same turn.
   for(const a of actions){
    const mon=a.side==='player'?this.active():this.enemy();if(mon.currentHp<=0)continue;
    if(a.type==='switch'){if(a.side==='player')this.state.activeIndex=a.value;else{this.state.defenderIndex=a.value;this.state.enemy=this.state.defenders[a.value];}this.emit('switch',{side:a.side});}
    else this.hit(a.side,a.value);
   }
   this.endTurn();this.faint();this.state.turn++;
   if(this.state.turn>500&&this.state.phase==='battle'){this.state.phase='ended';this.state.result='draw';}
   if(this.state.phase==='battle')this.state.ai=this.planAI();return this.snapshot();
  }
 }
 global.RouteDuel={DuelEngine};
})(window);
