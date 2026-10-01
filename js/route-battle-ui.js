(function(global){
  'use strict';
  const stylesheet=new URL('../css/route-battle.css?v=encounters-1',document.currentScript.src).href;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses={PSN:'Avvelenato',BRN:'Scottato',PAR:'Paralizzato',SLP:'Addormentato',FRZ:'Congelato'};
  class BattleUI{
    constructor({controller,onClose}){this.controller=controller;this.engine=controller.engine;this.onClose=onClose;this.partyOpen=false;this.message='';this.log=[];}
    mount(){
      this.previousFocus=document.activeElement;
      this.dialog=document.createElement('dialog');this.dialog.className='route-battle-dialog';this.dialog.setAttribute('aria-label','Battaglia Pokémon');
      const host=document.createElement('div');this.dialog.append(host);
      this.root=host.attachShadow({mode:'open'});
      this.root.innerHTML=`<link rel="stylesheet" href="${stylesheet}"><main class="rb-app"><h1>Battaglia Pokémon</h1><div data-content></div></main>`;
      (document.querySelector('.pokedex-screen')||document.body).append(this.dialog);
      this.dialog.addEventListener('cancel',event=>event.preventDefault());
      this.root.addEventListener('click',event=>this.click(event));
      this.controller.onChange=()=>this.render();this.render();this.dialog.showModal();
    }
    species(mon){return global.ROUTE_POKEMON_DB[String(mon.speciesId)];}
    fighter(mon,side){const species=this.species(mon),max=global.RoutePokemonCore.maxHp(mon);
      return `<div class="rb-mon rb-${side}-mon"><img src="${esc(species.sprites[side==='enemy'?'front':'back'])}" alt="${esc(species.name)}" width="112" height="112"></div><section class="rb-panel rb-${side}-panel"><div class="rb-row"><b>${esc(species.name)}</b><span>Lv. ${mon.level}</span></div><div class="rb-hp" role="progressbar" aria-label="PS di ${esc(species.name)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${mon.currentHp}"><span style="width:${mon.currentHp/max*100}%"></span></div><div>${mon.currentHp} / ${max} PS</div><span>${mon.currentHp===0?'Esausto':statuses[mon.status]||''}</span></section>`;
    }
    button(action,label,disabled=false,extra=''){return `<button type="button" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;}
    render(){
      if(!this.root)return;
      const c=this.controller,s=this.engine.state;if(!s)return;
      const locked=c.busy||!!c.pending,ended=s.phase==='ended',forced=s.pendingSwitch;
      const events=c.events;c.events=[];
      for(const event of events){const move=global.ROUTE_MOVE_DB[event.moveKey];
        const text=event.type==='move'?`${event.side==='player'?'Il tuo Pokémon':'Il selvatico'} usa ${move?.name||event.moveKey}: ${event.damage||0} PS.`:
          event.type==='exp'?`+${event.amount} EXP.`:event.type==='level_up'?`Livello ${event.from} → ${event.to}!`:
          event.type==='move_learned'?`Mossa appresa: ${move?.name||event.moveKey}.`:
          event.type==='evolution'?`Evoluzione in ${global.ROUTE_POKEMON_DB[event.toSpeciesId].name}!`:
          event.type==='capture_failed'?'Il Pokémon è uscito dalla Ball!':event.type==='miss'?'La mossa fallisce.':event.type==='cannot_act'?'Il Pokémon non riesce ad agire.':'';
        if(text)this.log.push(text);
      }
      const party=(this.partyOpen||forced)&&!ended?`<section><h2>${forced?'Pokémon esausto: scegli chi entra':'SQUADRA'}</h2><div id="rb-party">${s.party.map((p,i)=>this.button('switch',`${esc(this.species(p).name)}${p.isStarter?' ★':''}<small>Lv. ${p.level} · ${p.currentHp}/${global.RoutePokemonCore.maxHp(p)} PS</small>`,locked||i===s.activeIndex||p.currentHp<=0,`data-index="${i}" class="rb-party-slot"`)).join('')}</div>${!forced?this.button('party','Torna alle mosse',locked):''}</section>`:'';
      const replacement=c.needsReplacement()?`<section><h2>SQUADRA COMPLETA</h2><p>Per tenere questo Pokémon devi liberarne uno.</p>${s.party.map(p=>this.button('replace',`${esc(this.species(p).name)} · ${p.isStarter?'STARTER · NON LIBERABILE':'LIBERA E SOSTITUISCI'}`,locked||p.isStarter,`data-uid="${esc(p.uid)}"`)).join('')}${this.button('discard','Annulla · lascia andare il catturato',locked)}</section>`:'';
      const result={win:'VITTORIA',loss:'SCONFITTA',capture:'POKÉMON CATTURATO',flee:'SEI FUGGITO'};
      this.root.querySelector('[data-content]').innerHTML=`${s.testMode?'<p>Prova Safari · la squadra e il saldo reali restano invariati.</p>':''}<div class="rb-scene"><div class="rb-platform rb-enemy-platform"></div><div class="rb-platform rb-player-platform"></div>${this.fighter(this.engine.enemy(),'enemy')}${this.fighter(this.engine.active(),'player')}</div><p role="status" aria-live="polite">${esc(this.message|| (forced?'Scegli un Pokémon utilizzabile.':ended?result[s.result]:'Scegli la tua azione.'))}</p>${!ended&&!forced&&!this.partyOpen?`<div id="rb-moves">${this.engine.active().moves.map(key=>{const m=global.ROUTE_MOVE_DB[key];return this.button('move',`${esc(m?.name||key)}<small>${esc(m?.type)} · ${m?.power||'Stato'}</small>`,locked||!m,`class="rb-move" data-move="${esc(key)}"`);}).join('')}</div><div class="rb-actions">${this.button('party','SQUADRA',locked)}${s.canCapture?this.button('capture',`CATTURA${s.balls===null?'':' · '+s.balls+' Ball'}`,locked||s.balls===0):''}${s.canEscape?this.button('flee','FUGGI',locked):''}</div>`:''}${party}${replacement}${locked&&!c.busy?this.button('retry','Riprova la stessa azione'):''}${ended&&!c.saved&&!replacement&&!locked?this.button('save','Salva risultato'):''}${c.saved?`<p>${s.testMode?'Prova salvata.':'Squadra salvata.'}</p>${this.button('close','Torna al gioco')}`:''}<details open><summary>Registro della battaglia</summary><ol>${this.log.slice(-15).map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details>`;
      if(forced)this.root.querySelector('[data-action="switch"]:not(:disabled)')?.focus();
    }
    error(error){this.message=error.message;this.render();}
    async click(event){
      const b=event.target.closest('[data-action]');if(!b||b.disabled||this.controller.busy)return;
      const action=b.dataset.action;this.message='';
      try{
        if(action==='party'){this.partyOpen=!this.partyOpen;this.render();return;}
        if(action==='close'){await this.onClose();return;}
        if(action==='retry'){await this.controller.retry();return;}
        if(action==='save'){await this.controller.finish();return;}
        if(action==='discard'){await this.controller.finish(null,true);return;}
        if(action==='replace'){
          const p=this.engine.state.party.find(p=>p.uid===b.dataset.uid);if(!p||p.isStarter)return;
          if(global.confirm(`Liberare definitivamente ${this.species(p).name} e sostituirlo con ${this.species(this.engine.state.capturedPokemon).name}?`))await this.controller.finish(p.uid);
          return;
        }
        this.partyOpen=false;
        await this.controller.act(action,action==='move'?b.dataset.move:action==='switch'?Number(b.dataset.index):undefined);
      }catch(error){this.error(error);}
    }
    destroy(){this.controller.onChange=null;this.dialog.close();this.dialog.remove();this.previousFocus?.focus();}
  }
  global.RouteBattleUI={BattleUI};
})(window);
