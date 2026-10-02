(function(global){
  "use strict";

  const Core=global.RoutePokemonCore;
  const DB=()=>global.ROUTE_POKEMON_DB||{};
  const MOVES=()=>global.ROUTE_MOVE_DB||{};

  const TYPE_CHART={
    normal:{rock:.5,ghost:0,steel:.5},
    fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
    water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5},
    electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
    grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
    ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
    fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2},
    poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0},
    ground:{fire:2,electric:2,grass:.5,poison:2,flying:0,bug:.5,rock:2,steel:2},
    flying:{electric:.5,grass:2,fighting:2,bug:2,rock:.5,steel:.5},
    psychic:{fighting:2,poison:2,psychic:.5,dark:0,steel:.5},
    bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5},
    rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
    ghost:{normal:0,psychic:2,dark:.5,steel:.5},
    dragon:{dragon:2,steel:.5},
    dark:{fighting:.5,psychic:2,ghost:2,dark:.5,steel:.5},
    steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5}
  };

  const stageMultiplier=s=>s>=0?(2+s)/2:2/(2-s);
  const accuracyMultiplier=s=>s>=0?(3+s)/3:3/(3-s);
  const clampStage=n=>Math.max(-6,Math.min(6,n));

  class BattleEngine{
    constructor(options={}){
      this.rng=options.rng||Math.random;
      this.onEvent=typeof options.onEvent==="function"?options.onEvent:()=>{};
      this.state=null;
    }

    emit(type,data={}){
      const event={type,...data,state:this.snapshot()};
      this.onEvent(event);
      global.dispatchEvent(new CustomEvent("route:battle-event",{detail:event}));
      return event;
    }

    snapshot(){
      return this.state?JSON.parse(JSON.stringify(this.state)):null;
    }

    species(mon){return DB()[String(mon.speciesId)];}
    move(key){return MOVES()[key];}
    maxHp(mon){return Core.maxHp(mon);}

    prepareMon(instance){
      const p=JSON.parse(JSON.stringify(instance));
      const stats=Core.calculateStats(p.speciesId,p.level,p.iv??10);
      p.currentHp=Math.min(Number.isFinite(p.currentHp)?p.currentHp:stats.maxHp,stats.maxHp);
      p.moves=(p.moves||Core.levelMoves(p.speciesId,p.level)).slice(0,4);
      p.status=p.status||null;
      p.battle={
        attack:0,defense:0,spAttack:0,spDefense:0,speed:0,
        accuracy:0,evasion:0,confused:0,sleepTurns:0,
        seeded:false,protected:false,reflect:0,lightScreen:0
      };
      return p;
    }

    createWild(speciesId,level=5,options={}){
      return this.prepareMon(Core.createOwnedPokemon(speciesId,level,{
        ...options,uid:options.uid||("WILD-"+speciesId+"-"+Date.now()),
        obtainedFrom:"WILD"
      }));
    }

    start({team,wildSpeciesId,wildLevel,wildPokemon=null,source="SPECIAL_EVENT",canCapture=true,canEscape=true,ballBonus=1,balls=null}){
      if(!wildPokemon && (!DB()[String(wildSpeciesId)] || !Number.isInteger(wildLevel) || wildLevel<1 || wildLevel>100)) throw new Error("Incontro non valido.");
      if(!Array.isArray(team)||!team.length||team.length>6) throw new Error("Squadra non valida.");
      const party=team.map(p=>this.prepareMon(p));
      const first=party.findIndex(p=>p.currentHp>0);
      if(first<0) throw new Error("Nessun Pokémon della squadra può combattere.");
      this.state={
        phase:"battle",
        source,canCapture:canCapture===true,canEscape:canEscape===true,
        ballBonus:Number.isFinite(ballBonus)&&ballBonus>0?ballBonus:1,
        balls:Number.isInteger(balls)&&balls>=0?balls:null,
        initialTeam:JSON.parse(JSON.stringify(team)),
        result:null,
        party,
        activeIndex:first,
        enemy:wildPokemon?this.prepareMon(wildPokemon):this.createWild(wildSpeciesId,wildLevel),
        turn:1,
        participants:[party[first].uid],
        pendingSwitch:false
      };
      this.emit("battle_start",{activeUid:party[first].uid,enemySpeciesId:this.state.enemy.speciesId});
      return this.snapshot();
    }

    active(){return this.state?.party?.[this.state.activeIndex]||null;}
    enemy(){return this.state?.enemy||null;}

    typeEffect(moveType,types){
      return (types||[]).reduce((v,t)=>v*(TYPE_CHART[moveType]?.[t]??1),1);
    }

    stat(mon,key){
      const base=Core.calculateStats(mon.speciesId,mon.level,mon.iv??10)[key];
      let result=base*stageMultiplier(mon.battle[key]||0);
      if(key==="attack"&&mon.status==="BRN") result*=0.5;
      if(key==="speed"&&mon.status==="PAR") result*=0.25;
      return Math.max(1,Math.floor(result));
    }

    accuracy(user,target,move){
      if(move.effect==="always_hit") return true;
      let acc=Number(move.accuracy||100);
      const stage=clampStage((user.battle.accuracy||0)-(target.battle.evasion||0));
      acc*=accuracyMultiplier(stage);
      return this.rng()*100<acc;
    }

    damage(user,target,move,options={}){
      const us=this.species(user),ts=this.species(target);
      const typeEff=this.typeEffect(move.type,ts.types);
      if(typeEff===0) return {damage:0,effectiveness:0,crit:false};

      if(move.effect==="static_damage"){
        return {damage:Math.min(target.currentHp,move.power||0),effectiveness:typeEff,crit:false};
      }
      if(move.effect==="level_damage"){
        return {damage:Math.min(target.currentHp,user.level),effectiveness:typeEff,crit:false};
      }
      if(move.effect==="super_fang"){
        return {damage:Math.max(1,Math.floor(target.currentHp/2)),effectiveness:typeEff,crit:false};
      }
      if(!move.power || move.power<=0) return {damage:0,effectiveness:typeEff,crit:false};

      const special=move.category==="special";
      const A=special?this.stat(user,"spAttack"):this.stat(user,"attack");
      const D=special?this.stat(target,"spDefense"):this.stat(target,"defense");
      let base=Math.floor(Math.floor(Math.floor((2*user.level/5)+2)*move.power*A/D)/50)+2;
      const stab=us.types.includes(move.type)?1.5:1;
      const crit=this.rng()<0.0625;
      const critical=crit?2:1;
      const variance=(217+Math.floor(this.rng()*39))/255;
      let screen=1;
      if(special && target.battle.lightScreen>0) screen=0.5;
      if(!special && target.battle.reflect>0) screen=0.5;
      let dmg=Math.floor(base*stab*typeEff*critical*variance*screen);
      if(typeEff>0) dmg=Math.max(1,dmg);
      if(move.effect==="false_swipe") dmg=Math.min(dmg,Math.max(0,target.currentHp-1));
      return {damage:dmg,effectiveness:typeEff,crit};
    }

    canAct(mon){
      if(mon.currentHp<=0) return {ok:false,reason:"KO"};
      if(mon.status==="SLP"){
        if(mon.battle.sleepTurns<=0) mon.battle.sleepTurns=1+Math.floor(this.rng()*3);
        mon.battle.sleepTurns--;
        if(mon.battle.sleepTurns>=0){
          if(mon.battle.sleepTurns===0) mon.status=null;
          else return {ok:false,reason:"SLEEP"};
        }
      }
      if(mon.status==="PAR" && this.rng()<0.25) return {ok:false,reason:"PARALYSIS"};
      if(mon.status==="FRZ"){
        if(this.rng()<0.1)mon.status=null;
        else return {ok:false,reason:"FREEZE"};
      }
      if(mon.battle.confused>0){
        mon.battle.confused--;
        if(this.rng()<0.5){
          const fake={power:40,type:"???",category:"physical"};
          const A=this.stat(mon,"attack"),D=this.stat(mon,"defense");
          const dmg=Math.max(1,Math.floor((Math.floor((2*mon.level/5)+2)*40*A/D/50)+2));
          mon.currentHp=Math.max(0,mon.currentHp-dmg);
          return {ok:false,reason:"CONFUSION",selfDamage:dmg};
        }
      }
      return {ok:true};
    }

    applyStatus(target,status){
      if(target.status) return false;
      const types=this.species(target).types;
      if(status==="PSN"&&types.some(t=>t==="poison"||t==="steel"))return false;
      if(status==="BRN"&&types.includes("fire"))return false;
      if(status==="FRZ"&&types.includes("ice"))return false;
      target.status=status;
      if(status==="SLP") target.battle.sleepTurns=1+Math.floor(this.rng()*3);
      return true;
    }

    stage(mon,key,amount){
      mon.battle[key]=clampStage((mon.battle[key]||0)+amount);
    }

    applyEffect(user,target,move,dealt=0){
      const e=move.effect||"";
      const chance=(move.effectChance??100)/100;
      const roll=()=>this.rng()<chance;

      const stageMap={
        attack_down:["attack",-1,target],attack_down_2:["attack",-2,target],
        defense_down:["defense",-1,target],defense_down_2:["defense",-2,target],
        speed_down:["speed",-1,target],speed_down_2:["speed",-2,target],
        accuracy_down:["accuracy",-1,target],evasion_down:["evasion",-1,target],
        attack_up:["attack",1,user],attack_up_2:["attack",2,user],
        defense_up:["defense",1,user],defense_up_2:["defense",2,user],
        speed_up:["speed",1,user],speed_up_2:["speed",2,user],
        sp_atk_up:["spAttack",1,user],sp_def_up_2:["spDefense",2,user],
        evasion_up:["evasion",1,user]
      };
      if(stageMap[e]){
        const [k,a,m]=stageMap[e]; this.stage(m,k,a); return {handled:true};
      }
      if(e.endsWith("_down_hit") && roll()){
        const key=e.startsWith("speed")?"speed":e.startsWith("attack")?"attack":e.startsWith("sp_def")?"spDefense":"defense";
        this.stage(target,key,-1); return {handled:true};
      }
      if(e==="attack_up_hit" && roll()){this.stage(user,"attack",1);return {handled:true}}
      if(e==="defense_up_hit" && roll()){this.stage(user,"defense",1);return {handled:true}}

      if(e==="sleep"){this.applyStatus(target,"SLP");return {handled:true}}
      if(e==="poison"||e==="toxic"){this.applyStatus(target,"PSN");return {handled:true}}
      if(e==="paralyze"){this.applyStatus(target,"PAR");return {handled:true}}
      if((e==="burn_hit"||e==="flame_wheel"||e==="sacred_fire")&&roll()){this.applyStatus(target,"BRN");return {handled:true}}
      if(e==="paralyze_hit"&&roll()){this.applyStatus(target,"PAR");return {handled:true}}
      if(e==="freeze_hit"&&roll()){this.applyStatus(target,"FRZ");return {handled:true}}
      if(e==="poison_hit"&&roll()){this.applyStatus(target,"PSN");return {handled:true}}
      if((e==="confuse"||e==="confuse_hit") && (e==="confuse"||roll())){target.battle.confused=2+Math.floor(this.rng()*4);return {handled:true}}

      if(["heal","morning_sun","synthesis","moonlight","milk_drink","softboiled"].includes(e)){
        const amount=Math.floor(this.maxHp(user)/2);
        user.currentHp=Math.min(this.maxHp(user),user.currentHp+amount); return {handled:true,heal:amount};
      }
      if(e==="protect"){user.battle.protected=true;return {handled:true}}
      if(e==="reflect"){user.battle.reflect=5;return {handled:true}}
      if(e==="light_screen"){user.battle.lightScreen=5;return {handled:true}}
      if(e==="leech_seed"){target.battle.seeded=true;return {handled:true}}
      if(e==="leech_hit" && dealt>0){
        const heal=Math.max(1,Math.floor(dealt/2));
        user.currentHp=Math.min(this.maxHp(user),user.currentHp+heal);return {handled:true,heal};
      }
      if(e==="recoil_hit" && dealt>0){
        const recoil=Math.max(1,Math.floor(dealt/4));
        user.currentHp=Math.max(0,user.currentHp-recoil);return {handled:true,recoil};
      }
      if(e==="selfdestruct"){user.currentHp=0;return {handled:true}}
      return {handled:false};
    }

    hitCount(move){
      if(move.effect==="double_hit") return 2;
      if(move.effect==="triple_kick") return 3;
      if(move.effect==="multi_hit"||move.effect==="poison_multi_hit"){
        const r=this.rng();
        return r<.375?2:r<.75?3:r<.875?4:5;
      }
      return 1;
    }

    executeMove(user,target,moveKey,side){
      const move=this.move(moveKey);
      if(!move) return this.emit("move_error",{side,moveKey});

      const act=this.canAct(user);
      if(!act.ok){
        return this.emit("cannot_act",{side,reason:act.reason,selfDamage:act.selfDamage||0});
      }

      if(target.battle.protected){
        target.battle.protected=false;
        return this.emit("protected",{side,moveKey});
      }

      if(!this.accuracy(user,target,move)){
        return this.emit("miss",{side,moveKey});
      }

      const hits=this.hitCount(move);
      let total=0,last={effectiveness:1,crit:false};
      for(let i=0;i<hits;i++){
        if(target.currentHp<=0) break;
        const d=this.damage(user,target,move);
        last=d;
        target.currentHp=Math.max(0,target.currentHp-d.damage);
        total+=d.damage;
      }

      const effect=move.power>0&&last.effectiveness===0?{handled:true}:this.applyEffect(user,target,move,total);
      this.emit("move",{side,moveKey,moveName:move.name,damage:total,hits,effectiveness:last.effectiveness,crit:last.crit,effectHandled:effect.handled});
      return {move,total,effect};
    }

    priority(mon,moveKey){
      const m=this.move(moveKey);
      if(!m) return 0;
      if(m.effect==="priority_hit") return 1;
      if(["protect","detect"].includes(m.effect)) return 3;
      return 0;
    }

    endTurn(){
      const mons=[this.active(),this.enemy()];
      for(const mon of mons){
        if(!mon||mon.currentHp<=0) continue;
        const max=this.maxHp(mon);
        if(mon.status==="PSN") mon.currentHp=Math.max(0,mon.currentHp-Math.max(1,Math.floor(max/8)));
        if(mon.status==="BRN") mon.currentHp=Math.max(0,mon.currentHp-Math.max(1,Math.floor(max/8)));
        if(mon.battle.seeded){
          const d=Math.max(1,Math.floor(max/8));
          mon.currentHp=Math.max(0,mon.currentHp-d);
          const other=mon===this.active()?this.enemy():this.active();
          if(other&&other.currentHp>0) other.currentHp=Math.min(this.maxHp(other),other.currentHp+d);
        }
        mon.battle.protected=false;
        if(mon.battle.reflect>0) mon.battle.reflect--;
        if(mon.battle.lightScreen>0) mon.battle.lightScreen--;
      }
    }

    enemyMove(){
      const e=this.enemy();
      const usable=(e.moves||[]).filter(k=>this.move(k));
      return usable[Math.floor(this.rng()*usable.length)] || "TACKLE";
    }

    chooseMove(moveKey){
      if(!this.state||this.state.phase!=="battle") return {ok:false,reason:"NO_BATTLE"};
      if(this.state.pendingSwitch) return {ok:false,reason:"SWITCH_REQUIRED"};
      const p=this.active(),e=this.enemy();
      if(!p.moves.includes(moveKey)) return {ok:false,reason:"MOVE_NOT_KNOWN"};

      const enemyKey=this.enemyMove();
      const order=[
        {side:"player",mon:p,target:e,key:moveKey},
        {side:"enemy",mon:e,target:p,key:enemyKey}
      ].sort((a,b)=>{
        const pr=this.priority(b.mon,b.key)-this.priority(a.mon,a.key);
        if(pr) return pr;
        return this.stat(b.mon,"speed")-this.stat(a.mon,"speed");
      });

      for(const action of order){
        if(this.state.phase!=="battle") break;
        if(action.mon.currentHp<=0||action.target.currentHp<=0) continue;
        this.executeMove(action.mon,action.target,action.key,action.side);
        this.checkFaints();
      }

      if(this.state.phase==="battle"){
        this.endTurn();
        this.checkFaints();
        this.state.turn++;
      }
      return {ok:true,state:this.snapshot()};
    }

    checkFaints(){
      const p=this.active(),e=this.enemy();
      if(this.state.party.every(mon=>mon.currentHp<=0) && this.state.phase==="battle"){
        this.state.phase="ended";this.state.result="loss";
        this.emit("battle_end",{result:"loss"});return;
      }
      if(e.currentHp<=0 && this.state.phase==="battle"){
        this.emit("enemy_fainted",{speciesId:e.speciesId});
        this.awardExp(e);
        this.state.phase="ended";this.state.result="win";
        this.emit("battle_end",{result:"win"});
        return;
      }
      if(p.currentHp<=0 && this.state.phase==="battle"){
        const available=this.state.party.some((m,i)=>i!==this.state.activeIndex&&m.currentHp>0);
        if(available){
          this.state.pendingSwitch=true;
          this.emit("player_fainted",{uid:p.uid});
        }else{
          this.state.phase="ended";this.state.result="loss";
          this.emit("battle_end",{result:"loss"});
        }
      }
    }

    switchPokemon(index,{forced=false}={}){
      if(!this.state||this.state.phase!=="battle") return {ok:false,reason:"NO_BATTLE"};
      index=Number(index);
      const next=this.state.party[index];
      if(!next) return {ok:false,reason:"BAD_INDEX"};
      if(index===this.state.activeIndex) return {ok:false,reason:"ALREADY_ACTIVE"};
      if(next.currentHp<=0) return {ok:false,reason:"KO"};
      forced=this.state.pendingSwitch===true;
      const old=this.active();
      this.state.activeIndex=index;
      if(!this.state.participants.includes(next.uid)) this.state.participants.push(next.uid);
      this.state.pendingSwitch=false;
      this.emit("switch",{fromUid:old.uid,toUid:next.uid,forced});

      if(!forced && this.enemy().currentHp>0){
        this.executeMove(this.enemy(),this.active(),this.enemyMove(),"enemy");
        this.endTurn();
        this.checkFaints();
        this.state.turn++;
      }
      return {ok:true,state:this.snapshot()};
    }

    expGain(defeated){
      const species=this.species(defeated);
      const participants=Math.max(1,this.state.participants.filter(uid=>{
        const m=this.state.party.find(x=>x.uid===uid); return m&&m.currentHp>0;
      }).length);
      return Math.floor((species.baseExp*defeated.level/7)/participants);
    }

    awardExp(defeated){
      const amount=this.expGain(defeated);
      for(const uid of this.state.participants){
        const mon=this.state.party.find(x=>x.uid===uid);
        if(!mon||mon.currentHp<=0||mon.level>=100) continue;
        const species=this.species(mon);
        const oldLevel=mon.level;
        mon.exp+=amount;
        mon.level=Math.max(oldLevel,Core.levelForExp(mon.exp,species.growth));
        const newStats=Core.calculateStats(mon.speciesId,mon.level,mon.iv??10);
        if(mon.level>oldLevel){
          mon.currentHp=Math.min(newStats.maxHp,mon.currentHp+(newStats.maxHp-Core.calculateStats(mon.speciesId,oldLevel,mon.iv??10).maxHp));
          this.learnLevelMoves(mon,oldLevel,mon.level);
          this.tryLevelEvolution(mon);
          this.emit("level_up",{uid:mon.uid,from:oldLevel,to:mon.level});
        }
        this.emit("exp",{uid:mon.uid,amount});
      }
    }

    learnLevelMoves(mon,oldLevel,newLevel){
      const learned=(this.species(mon).learnset.levelUp||[]).filter(x=>x.level>oldLevel&&x.level<=newLevel);
      this.state.pendingMoves=this.state.pendingMoves||[];
      for(const row of learned){
        if(mon.moves.includes(row.move)||this.state.pendingMoves.some(p=>p.uid===mon.uid&&p.moveKey===row.move))continue;
        if(mon.moves.length<4){
          mon.moves.push(row.move);
          mon.knownMoves=[...new Set([...(mon.knownMoves||[]),...mon.moves])];
          this.emit('move_learned',{uid:mon.uid,moveKey:row.move});
        }else this.state.pendingMoves.push({uid:mon.uid,moveKey:row.move});
      }
    }

    chooseLearnedMove(value){
      const next=this.state.pendingMoves?.[0];
      if(this.state.phase!=='ended'||!next||!value||value.uid!==next.uid||value.moveKey!==next.moveKey)return {ok:false,reason:'INVALID_MOVE_CHOICE'};
      const mon=this.state.party.find(p=>p.uid===next.uid),slot=value.slot;
      if(!mon||(slot!==null&&(!Number.isInteger(slot)||slot<0||slot>=mon.moves.length)))return {ok:false,reason:'INVALID_MOVE_CHOICE'};
      if(slot!==null){
        mon.knownMoves=[...new Set([...(mon.knownMoves||[]),...mon.moves,next.moveKey])];
        mon.moves[slot]=next.moveKey;
        this.emit('move_learned',next);
      }else this.emit('move_declined',next);
      this.state.pendingMoves.shift();return {ok:true,state:this.snapshot()};
    }

    tryLevelEvolution(mon){
      let species=this.species(mon);
      const evo=(species.evolutions||[]).find(e=>e.method==="level"&&mon.level>=e.level);
      if(!evo) return false;
      const old=mon.speciesId;
      mon.speciesId=evo.to;
      const newMax=this.maxHp(mon);
      mon.currentHp=Math.min(newMax,mon.currentHp);
      this.emit("evolution",{uid:mon.uid,fromSpeciesId:old,toSpeciesId:evo.to});
      return true;
    }

    captureChance(){
      const enemy=this.enemy();
      if(!enemy || enemy.currentHp<=0)return 0;
      const max=this.maxHp(enemy),status=["SLP","FRZ"].includes(enemy.status)?2:enemy.status?1.5:1;
      return Math.min(.95,Math.max(.01,((3*max-2*enemy.currentHp)/(3*max))*this.species(enemy).catchRate/255*this.state.ballBonus*status));
    }

    attemptCapture(){
      if(this.state?.phase!=="battle"||this.state.pendingSwitch||!this.state.canCapture||this.state.balls===0)return {ok:false,reason:"CAPTURE_UNAVAILABLE"};
      if(this.state.balls!==null)this.state.balls--;
      if(this.rng()<this.captureChance()){
        const {battle,...wild}=this.enemy();
        this.state.capturedPokemon={...wild,isStarter:false,obtainedFrom:this.state.source};
        this.state.phase="ended";this.state.result="capture";
        this.emit("battle_end",{result:"capture"});
      }else{
        this.emit("capture_failed");
        this.executeMove(this.enemy(),this.active(),this.enemyMove(),"enemy");
        this.checkFaints();
        if(this.state.phase==="battle"){this.endTurn();this.checkFaints();this.state.turn++;}
      }
      return {ok:true,state:this.snapshot()};
    }

    escape(){
      if(this.state?.phase!=="battle"||this.state.pendingSwitch||!this.state.canEscape)return {ok:false,reason:"ESCAPE_UNAVAILABLE"};
      this.state.party=this.state.initialTeam.map(p=>this.prepareMon(p));
      this.state.phase="ended";this.state.result="flee";
      this.emit("battle_end",{result:"flee"});
      return {ok:true,state:this.snapshot()};
    }

    syncTeam(){
      // Returns party data stripped of temporary battle state.
      return this.state.party.map(mon=>{
        const out={...mon};
        if(this.state.result!=="flee")out.progressSystem="ROUTE";
        delete out.battle;
        delete out.species;
        delete out.stats;
        return out;
      });
    }
  }

  global.RouteBattle={BattleEngine,TYPE_CHART};
})(window);
