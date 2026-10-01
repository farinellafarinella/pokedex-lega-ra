(function(global){
  'use strict';
  const stylesheet=new URL('../css/route-battle.css?v=scenarios-1',document.currentScript.src).href;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeNames={normal:'Normale',fire:'Fuoco',water:'Acqua',electric:'Elettro',grass:'Erba',ice:'Ghiaccio',fighting:'Lotta',poison:'Veleno',ground:'Terra',flying:'Volante',psychic:'Psico',bug:'Coleottero',rock:'Roccia',ghost:'Spettro',dragon:'Drago',dark:'Buio',steel:'Acciaio','???':'???'};
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
    experience(mon){const species=this.species(mon),core=global.RoutePokemonCore,base=core.expForLevel(mon.level,species.growth),next=core.expForLevel(mon.level+1,species.growth),max=mon.level>=100?1:Math.max(1,next-base),value=mon.level>=100?1:Math.min(max,Math.max(0,mon.exp-base));return '<label class="rb-exp">EXP '+(mon.level>=100?'MAX':value+' / '+max)+'<progress aria-label="Esperienza di '+esc(species.name)+'" value="'+value+'" max="'+max+'"></progress></label>';}
    fighter(mon,side){const species=this.species(mon);
      return `<div class="rb-mon rb-${side}-mon"><img src="${esc(species.sprites[side==='enemy'?'front':'back'])}" alt="${esc(species.name)}" width="112" height="112"></div>`;
    }
    panel(mon,side){const species=this.species(mon),max=global.RoutePokemonCore.maxHp(mon);
      return `<section class="rb-panel rb-${side}-panel"><div class="rb-row"><b>${esc(species.name)}</b><span>Lv. ${mon.level}</span></div><div class="rb-hp" role="progressbar" aria-label="PS di ${esc(species.name)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${mon.currentHp}"><span style="width:${mon.currentHp/max*100}%"></span></div><div>${mon.currentHp} / ${max} PS</div><span>${mon.currentHp===0?'Esausto':statuses[mon.status]||''}</span>${side==='player'?this.experience(mon):''}</section>`;
    }
    button(action,label,disabled=false,extra=''){return `<button type="button" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;}
    render(){
      if(!this.root)return;
      const c=this.controller,s=this.engine.state;if(!s)return;
      const background=c.options?.background==='halloween'?'halloween':({FISHING:'water',FOSSIL_HUNT:'mountain',BUG_CONTEST:'grass',SAFARI:'grass'}[s.source]||'grass');
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
      const result={win:'VITTORIA',loss:'SCONFITTA',capture:'CATTURA REGISTRATA PER L’EVENTO',flee:'SEI FUGGITO'};
      this.root.querySelector('[data-content]').innerHTML=`${s.testMode?'<p>Prova Safari · la squadra e il saldo reali restano invariati.</p>':''}${this.panel(this.engine.enemy(),'enemy')}<div class="rb-scene" data-background="${background}">${this.fighter(this.engine.enemy(),'enemy')}${this.fighter(this.engine.active(),'player')}</div>${this.panel(this.engine.active(),'player')}<p role="status" aria-live="polite">${esc(this.message|| (forced?'Scegli un Pokémon utilizzabile.':ended?result[s.result]:'Scegli la tua azione.'))}</p>${!ended&&!forced&&!this.partyOpen?`<div id="rb-moves">${this.engine.active().moves.map(key=>{const m=global.ROUTE_MOVE_DB[key];return this.button('move',`${esc(m?.name||key)}<small>${esc(typeNames[m?.type]||m?.type)} · ${m?.power||'Stato'}</small>`,locked||!m,`class="rb-move" data-move="${esc(key)}"`);}).join('')}</div><div class="rb-actions">${this.button('party','SQUADRA',locked)}${s.canCapture?this.button('capture',`CATTURA${s.balls===null?'':' · '+s.balls+' Ball'}`,locked||s.balls===0):''}${s.canEscape?this.button('flee','FUGGI',locked):''}</div>`:''}${party}${locked&&!c.busy?this.button('retry','Riprova la stessa azione'):''}${ended&&!c.saved&&!locked?this.button('save','Salva risultato'):''}${c.saved?`<p>${s.testMode?'Prova salvata.':'Squadra salvata.'}</p>${this.button('close','Torna al gioco')}`:''}${ended&&s.result==='capture'?'<p>La cattura conta per l’evento. Il Pokémon non entra nella squadra.</p>':''}<details><summary>Registro della battaglia</summary><ol>${this.log.slice(-15).map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details>`;
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
        this.partyOpen=false;
        await this.controller.act(action,action==='move'?b.dataset.move:action==='switch'?Number(b.dataset.index):undefined);
      }catch(error){this.error(error);}
    }
    destroy(){this.controller.onChange=null;this.dialog.close();this.dialog.remove();this.previousFocus?.focus();}
  }
  global.RouteBattleUI={BattleUI};
})(window);
