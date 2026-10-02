export const RULES={excavationCost:50,excavationLimit:3,laboratoryCost:0,victoryMoney:200};
export const FOSSILS={
 'Skull Fossil':{name:'Fossilcranio',pokemon:'Cranidos',species:'cranidos',baseExp:99,image:'fossilcranio.png',price:300,base:[67,125,40,30,30,58],types:['rock'],moves:['tackle','tomb','ancient','growl']},
 'Armor Fossil':{name:'Fossilscudo',pokemon:'Shieldon',species:'shieldon',baseExp:99,image:'fossilscudo.png',price:300,base:[30,42,118,42,88,30],types:['rock','steel'],moves:['tackle','tomb','ancient','withdraw']},
 'Dome Fossil':{name:'Domofossile',pokemon:'Kabuto',species:'kabuto',baseExp:119,image:'domofossil.png',price:250,base:[30,80,90,55,45,55],types:['rock','water'],moves:['scratch','water','tomb','withdraw']},
 'Helix Fossil':{name:'Fossilhelix',pokemon:'Omanyte',species:'omanyte',baseExp:120,image:'fossilhelix.png',price:250,base:[35,40,100,90,55,35],types:['rock','water'],moves:['water','tomb','ancient','withdraw']},
 'Old Amber':{name:'Ambra Antica',pokemon:'Aerodactyl',species:'aerodactyl',baseExp:202,image:'ambra antica.png',price:400,base:[80,105,65,60,75,130],types:['rock','flying'],moves:['bite','wing','tomb','growl']},
 'Root Fossil':{name:'Radifossile',pokemon:'Lileep',species:'lileep',baseExp:99,image:'radiofossile.png',price:280,base:[66,41,77,61,87,23],types:['rock','grass'],moves:['vine','ancient','tomb','growl']},
 'Claw Fossil':{name:'Fossilunghia',pokemon:'Anorith',species:'anorith',baseExp:99,image:'fossilunghia.png',price:280,base:[45,95,50,40,50,75],types:['rock','bug'],moves:['scratch','ancient','tomb','growl']}
};
const labels={'Leaf Stone':'Pietrafoglia','Fire Stone':'Pietrafocaia','Water Stone':'Pietraidrica','Thunder Stone':'Pietratuono','Moon stone':'Pietralunare','Sun Stone':'Pietrasolare','Green Shard':'Coccio Verde','Red Shard':'Coccio Rosso','Blue Shard':'Coccio Blu','Yellow Shard':'Coccio Giallo','Heat Rock':'Roccia Calda','Damp Rock':'Roccia Umida','Icy Rock':'Roccia Fredda','Smooth Rock':'Roccia Liscia','Revive':'Revitalizzante','Max Revive':'Revitalizzante Max','Star Piece':'Pezzo Stella','Heart Scale':'Squama Cuore','Hard Stone':'Pietradura','Everstone':'Pietrastante','Light Clay':'Creta Luce','Iron Ball':'Ferropalla','Oval Stone':'Pietraovale','Rare Bone':'Ossostesso','Odd Keystone':'Roccianima','Insect Plate':'Lastra Insetto','Dread Plate':'Lastratimore','Draco Plate':'Lastradrakon','Zap Plate':'Lastrasaetta','Fist Plate':'Lastrapugno','Flame Plate':'Lastrarogo','Sky Plate':'Lastracielo','Spooky Plate':'Lastratetra','Meadow Plate':'Lastraprato','Earth Plate':'Lastraterra','Icicle Plate':'Lastragelo','Toxic Plate':'Lastrafiele','Mind Plate':'Lastramente','Stone Plate':'Lastrapietra','Iron Plate':'Lastraferro','Splash Plate':'Lastraidro'};
export function itemName(item){if(FOSSILS[item.id])return FOSSILS[item.id].name;if(labels[item.id])return labels[item.id];const m=item.id.match(/^(Small|Large) (Green|Red|Blue|Prism|Pale) Sphere$/);return m?'Sfera '+({Green:'Verde',Red:'Rossa',Blue:'Blu',Prism:'Prisma',Pale:'Pallida'}[m[2]])+' '+(m[1]==='Small'?'piccola':'grande'):item.id;}
export function price(item){return FOSSILS[item.id]?.price??({SMALL_SPHERES:15,LARGE_SPHERES:40,EVOLUTION_STONES:120,SHARDS:30,WEATHER_STONES:60,ITEMS:80,PLATES:150}[item.category]??30);}
export const fresh=()=>({version:1,balance:500,xp:0,inventory:{},attempts:0,fossilRecoveredThisBatch:false,pendingMining:null,battle:null,result:null,history:[],kitUsed:false,monday:true,starter:'squirtle'});
export function startExcavation(state,id){if(state.pendingMining)throw Error('Hai già uno scavo in corso.');if(state.attempts>=RULES.excavationLimit)throw Error('Hai completato i 3 scavi di prova. Rinnova i tentativi nei comandi della beta.');if(state.balance<RULES.excavationCost)throw Error('Pokédollari insufficienti.');state.balance-=RULES.excavationCost;state.attempts++;state.pendingMining=id;}
export function settleExcavation(state,id,items,catalog){if(!id||state.pendingMining!==id)return false;const known=new Set(catalog.map(i=>i.id));if(!Array.isArray(items)||items.length>4||items.some(i=>!known.has(i)))throw Error('Reperti non validi.');for(const item of items)state.inventory[item]=(state.inventory[item]||0)+1;if(items.some(item=>Object.hasOwn(FOSSILS,item)))state.fossilRecoveredThisBatch=true;state.pendingMining=null;state.history.unshift({type:'scavo',items:[...items]});return true;}
export function sell(state,id,quantity,catalog){const item=catalog.find(i=>i.id===id);if(!item||!Number.isInteger(quantity)||quantity<1||(state.inventory[id]||0)<quantity)throw Error('Quantità non disponibile.');state.inventory[id]-=quantity;const value=price(item)*quantity;state.balance+=value;state.history.unshift({type:'vendita',id,quantity,value});return value;}
export function revive(state,id,battle){if(state.battle)throw Error('Concludi prima la battaglia in corso.');if(!FOSSILS[id]||!(state.inventory[id]>0))throw Error('Questo fossile non è nello Zaino.');state.inventory[id]--;state.battle={...battle,fossil:id};state.result=null;state.history.unshift({type:'risveglio',id});}
export function demoKit(state){if(state.kitUsed)throw Error('Kit già aggiunto. Puoi azzerare la prova per ricominciare.');for(const id of Object.keys(FOSSILS))state.inventory[id]=(state.inventory[id]||0)+1;state.inventory['Red Shard']=(state.inventory['Red Shard']||0)+3;state.inventory['Fire Stone']=(state.inventory['Fire Stone']||0)+1;state.kitUsed=true;}

// A guaranteed fossil is buried in the final wall, never granted as inventory loot.
export function needsBuriedFossil(state){
 return state.attempts===RULES.excavationLimit&&!state.fossilRecoveredThisBatch;
}

// Same wild-battle formula as RouteBattle.expGain; the beta has one participant.
// Gen I species yields: data/pokemon-db.json. Later fossils: pret/pokeheartgold
// files/poketool/personal/personal.json (Gen IV expYield).
export function fossilExperience(fossil,level){
 const species=FOSSILS[fossil];
 if(!species||!Number.isInteger(level)||level<1||level>100)throw Error('Dati esperienza del fossile non validi.');
 return Math.floor(species.baseExp*level/7);
}

// Finalize once: clearing the active battle prevents duplicate rewards on reload.
export function finishBattle(state,outcome){
 if(!state.battle)return false;
 if(!['win','loss','flee'].includes(outcome))throw Error('Esito battaglia non valido.');
 const reward={money:outcome==='win'?RULES.victoryMoney:0,xp:outcome==='win'&&state.battle.player.hp>0&&state.battle.player.level<100?fossilExperience(state.battle.fossil,state.battle.wild.level):0};
 state.balance+=reward.money;
 state.xp=(Number.isFinite(state.xp)?state.xp:0)+reward.xp;
 state.result={outcome,fossil:state.battle.fossil,reward};
 state.history.unshift({type:'battaglia',...state.result});
 state.battle=null;
 return true;
}
