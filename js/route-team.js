(function(global){
  "use strict";
  const Core=global.RoutePokemonCore;
  const MAX_TEAM=6;
  const DEFAULT_KEY="route_team_v1";

  function clone(v){return JSON.parse(JSON.stringify(v));}

  class TeamManager{
    constructor(options={}){
      this.storageKey=options.storageKey || DEFAULT_KEY;
      this.storage=options.storage || global.localStorage;
      this.team=[];
      if(options.autoLoad !== false) this.load();
    }

    load(){
      try{
        const raw=this.storage?.getItem(this.storageKey);
        const data=raw?JSON.parse(raw):[];
        this.team=Array.isArray(data)?data.slice(0,MAX_TEAM):[];
      }catch(e){ this.team=[]; }
      return this.getTeam();
    }

    save(){
      this.storage?.setItem(this.storageKey,JSON.stringify(this.team));
      global.dispatchEvent(new CustomEvent("route:team-changed",{detail:{team:this.getTeam()}}));
      return true;
    }

    setTeam(team){
      if(!Array.isArray(team)) throw new Error("La squadra deve essere un array.");
      if(team.length>MAX_TEAM) throw new Error("Massimo 6 Pokémon.");
      const starters=team.filter(p=>p?.isStarter);
      if(team.length && starters.length!==1) throw new Error("La squadra deve contenere esattamente uno starter.");
      this.team=clone(team);
      this.save();
      return this.getTeam();
    }

    getTeam(){return clone(this.team);}
    getRawTeam(){return this.team;}
    isFull(){return this.team.length>=MAX_TEAM;}
    getByUid(uid){return this.team.find(p=>p.uid===uid)||null;}
    getStarter(){return this.team.find(p=>p.isStarter)||null;}
    starterIndex(){return this.team.findIndex(p=>p.isStarter);}
    canRelease(uid){
      const p=this.getByUid(uid);
      return !!p && p.isStarter!==true;
    }

    addPokemon(pokemon){
      if(this.isFull()) return {ok:false,reason:"TEAM_FULL"};
      if(!pokemon?.uid || !pokemon?.speciesId) return {ok:false,reason:"INVALID_POKEMON"};
      if(pokemon.isStarter && this.getStarter()) return {ok:false,reason:"STARTER_EXISTS"};
      this.team.push(clone(pokemon));
      this.save();
      return {ok:true,pokemon:clone(pokemon)};
    }

    releasePokemon(uid){
      const index=this.team.findIndex(p=>p.uid===uid);
      if(index<0) return {ok:false,reason:"NOT_FOUND"};
      if(this.team[index].isStarter) return {ok:false,reason:"STARTER_PROTECTED"};
      const released=this.team.splice(index,1)[0];
      this.save();
      return {ok:true,released:clone(released)};
    }

    replacePokemon(oldUid,newPokemon){
      const index=this.team.findIndex(p=>p.uid===oldUid);
      if(index<0) return {ok:false,reason:"NOT_FOUND"};
      if(this.team[index].isStarter) return {ok:false,reason:"STARTER_PROTECTED"};
      if(!newPokemon?.uid || !newPokemon?.speciesId) return {ok:false,reason:"INVALID_POKEMON"};
      const released=this.team[index];
      this.team[index]=clone({...newPokemon,isStarter:false});
      this.save();
      return {ok:true,released:clone(released),added:clone(this.team[index]),index};
    }

    movePokemon(fromIndex,toIndex){
      fromIndex=Number(fromIndex);toIndex=Number(toIndex);
      if(fromIndex<0||toIndex<0||fromIndex>=this.team.length||toIndex>=this.team.length)
        return {ok:false,reason:"BAD_INDEX"};
      const [p]=this.team.splice(fromIndex,1);
      this.team.splice(toIndex,0,p);
      this.save();
      return {ok:true,team:this.getTeam()};
    }

    swap(a,b){
      a=Number(a);b=Number(b);
      if(a<0||b<0||a>=this.team.length||b>=this.team.length) return {ok:false,reason:"BAD_INDEX"};
      [this.team[a],this.team[b]]=[this.team[b],this.team[a]];
      this.save();
      return {ok:true,team:this.getTeam()};
    }

    createAndAdd(speciesId,level=5,options={}){
      const p=Core.createOwnedPokemon(speciesId,level,options);
      return {pokemon:p,result:this.addPokemon(p)};
    }

    createStarter(speciesId,level=5,options={}){
      if(this.team.length) return {ok:false,reason:"TEAM_NOT_EMPTY"};
      const starter=Core.createOwnedPokemon(speciesId,level,{...options,isStarter:true,obtainedFrom:"STARTER"});
      this.team=[starter];
      this.save();
      return {ok:true,pokemon:clone(starter)};
    }

    healAll(){
      for(const p of this.team) Core.heal(p);
      this.save();
      return this.getTeam();
    }
  }

  global.RouteTeam={MAX_TEAM,TeamManager};
})(window);
