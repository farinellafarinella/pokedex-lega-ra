(function(global){
  "use strict";

  const DB = () => global.ROUTE_POKEMON_DB || {};
  const MOVES = () => global.ROUTE_MOVE_DB || {};

  function uid(){
    if (global.crypto && crypto.randomUUID) return "PKM-" + crypto.randomUUID().slice(0,8).toUpperCase();
    return "PKM-" + Math.random().toString(36).slice(2,10).toUpperCase();
  }

  function expForLevel(level, growth){
    const n = Math.max(1, Math.min(100, Number(level)||1));
    if(n===1)return 0;
    let x;
    switch(growth){
      case "fast": x = 4*n**3/5; break;
      case "slow": x = 5*n**3/4; break;
      case "medium_slow": x = 6*n**3/5 - 15*n**2 + 100*n - 140; break;
      case "slightly_fast": x = 3*n**3/4 + 10*n**2 - 30; break;
      case "slightly_slow": x = 3*n**3/4 + 20*n**2 - 70; break;
      default: x = n**3;
    }
    return Math.max(0, Math.floor(x));
  }

  function levelForExp(exp, growth){
    exp = Math.max(0, Number(exp)||0);
    let level = 1;
    for(let n=2;n<=100;n++){
      if(expForLevel(n,growth) > exp) break;
      level=n;
    }
    return level;
  }

  // Stat formula intentionally matches the Battle Lab prototype:
  // fixed DV-like value 10, no stat-exp yet. One place to replace later.
  function calculateStats(speciesId, level, iv=10){
    const p = DB()[String(speciesId)];
    if(!p) return null;
    const L = Math.max(1,Math.min(100,Number(level)||1));
    const b = p.baseStats;
    const normal = v => Math.floor(((2*v + iv) * L)/100) + 5;
    return {
      maxHp: Math.floor(((2*b.hp + iv) * L)/100) + L + 10,
      attack: normal(b.attack),
      defense: normal(b.defense),
      spAttack: normal(b.spAttack),
      spDefense: normal(b.spDefense),
      speed: normal(b.speed)
    };
  }

  function levelMoves(speciesId, level, max=4){
    const p = DB()[String(speciesId)];
    if(!p) return [];
    const known=[];
    for(const row of p.learnset.levelUp || []){
      if(row.level <= level && MOVES()[row.move]){
        const old=known.indexOf(row.move);
        if(old>=0) known.splice(old,1);
        known.push(row.move);
      }
    }
    return known.slice(-max);
  }

  function createOwnedPokemon(speciesId, level=5, options={}){
    const species=DB()[String(speciesId)];
    if(!species) throw new Error("Specie Pokémon non trovata: "+speciesId);
    const L=Math.max(1,Math.min(100,Number(level)||5));
    const stats=calculateStats(speciesId,L,options.iv ?? 10);
    return {
      uid: options.uid || uid(),
      speciesId:Number(speciesId),
      level:L,
      exp: options.exp ?? expForLevel(L,species.growth),
      currentHp: options.currentHp ?? stats.maxHp,
      moves: Array.isArray(options.moves) && options.moves.length ? options.moves.slice(0,4) : levelMoves(speciesId,L),
      status: options.status ?? null,
      isStarter: options.isStarter === true,
      obtainedFrom: options.obtainedFrom || (options.isStarter ? "STARTER" : "SYSTEM"),
      obtainedAt: options.obtainedAt || new Date().toISOString(),
      iv: options.iv ?? 10
    };
  }

  function getSpecies(instanceOrId){
    const id = typeof instanceOrId === "object" ? instanceOrId.speciesId : instanceOrId;
    return DB()[String(id)] || null;
  }

  function hydrate(instance){
    if(!instance) return null;
    const species=getSpecies(instance);
    if(!species) return null;
    const stats=calculateStats(instance.speciesId,instance.level,instance.iv ?? 10);
    return {...instance,species,stats};
  }

  function maxHp(instance){
    return calculateStats(instance.speciesId,instance.level,instance.iv ?? 10)?.maxHp || 1;
  }

  function heal(instance){
    instance.currentHp=maxHp(instance);
    instance.status=null;
    return instance;
  }

  global.RoutePokemonCore={
    uid, expForLevel, levelForExp, calculateStats, levelMoves,
    createOwnedPokemon, getSpecies, hydrate, maxHp, heal
  };
})(window);
