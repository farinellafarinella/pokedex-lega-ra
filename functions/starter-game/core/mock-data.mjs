// Fixtures locali: nessun dato proviene dal profilo o dal database.
export const types = {normal:'Normale',fire:'Fuoco',water:'Acqua',electric:'Elettro',grass:'Erba',ice:'Ghiaccio',fighting:'Lotta',poison:'Veleno',ground:'Terra',flying:'Volante',psychic:'Psico',bug:'Coleottero',rock:'Roccia',ghost:'Spettro',dragon:'Drago',dark:'Buio',steel:'Acciaio',fairy:'Folletto'};
const move = (name,type,category,power,accuracy,pp,extra={}) => ({name,type,category,power,accuracy,pp,priority:0,...extra});
export const MOVES = {
 thunderbolt:move('Fulmine','electric','special',90,100,15,{status:'paralysis',chance:.1}),
 quick:move('Attacco Rapido','normal','physical',40,100,30,{priority:1}),
 thunderwave:move('Tuononda','electric','status',0,90,20,{status:'paralysis',chance:1}),
 growl:move('Ruggito','normal','status',0,100,40,{stages:{atk:-1}}),
 vine:move('Frustata','grass','physical',45,100,25),
 razor:move('Foglielama','grass','physical',55,95,25,{critRate:1/8}),
 sleep:move('Sonnifero','grass','status',0,75,15,{status:'sleep',chance:1,powder:true}),
 poison:move('Velenpolvere','poison','status',0,75,35,{status:'poison',chance:1,powder:true}),
 water:move('Idropulsar','water','special',60,100,20),
 tackle:move('Azione','normal','physical',40,100,35),
 withdraw:move('Ritirata','water','status',0,100,40,{self:true,stages:{def:1}}),
 ice:move('Geloraggio','ice','special',90,100,10),
 flame:move('Lanciafiamme','fire','special',90,100,15,{status:'burn',chance:.1}),
 scratch:move('Graffio','normal','physical',40,100,35),
 burn:move('Fuocofatuo','fire','status',0,85,15,{status:'burn',chance:1}),
 smoke:move('Muro di Fumo','normal','status',0,100,20,{stages:{accuracy:-1}}),
 jet:move('Acquagetto','water','physical',40,100,20,{priority:1}),
 tomb:move('Rocciotomba','rock','physical',60,95,15,{stages:{spe:-1},chance:1}),
 mud:move('Colpodifango','ground','special',55,95,15,{stages:{spe:-1},chance:1}),
 swords:move('Danzaspada','normal','status',0,100,20,{self:true,stages:{atk:2}}),
 gun:move('Pistolacqua','water','special',40,100,25),
 ancient:move('Forzantica','rock','special',60,100,5,{self:true,stages:{atk:1,def:1,spa:1,spd:1,spe:1},chance:.1}),
 bite:move('Morso','dark','physical',60,100,25,{flinch:.3}),
 sludge:move('Fangobomba','poison','special',90,100,10,{status:'poison',chance:.3}),
 wing:move('Attacco d’Ala','flying','physical',60,100,35),
 rock:move('Frana','rock','physical',75,90,10,{flinch:.3}),
 quake:move('Terremoto','ground','physical',100,100,10),
 scary:move('Visotruce','normal','status',0,100,10,{stages:{spe:-2}}),
};
// Base statistiche, IV 31, EV 0, natura neutra; mosse dimostrative senza vincoli di learnset.
export const SPECIES = {
 pikachu:{name:'Pikachu',types:['electric'],base:[35,55,40,50,50,90],moves:['thunderbolt','quick','thunderwave','growl'],glyph:'spark'},
 bulbasaur:{name:'Bulbasaur',types:['grass','poison'],base:[45,49,49,65,65,45],moves:['vine','razor','sleep','poison'],glyph:'bud'},
 squirtle:{name:'Squirtle',types:['water'],base:[44,48,65,50,64,43],moves:['water','tackle','withdraw','ice'],glyph:'shell'},
 charmander:{name:'Charmander',types:['fire'],base:[39,52,43,60,50,65],moves:['flame','scratch','burn','smoke'],glyph:'flame'},
 kabuto:{name:'Kabuto',types:['rock','water'],base:[30,80,90,55,45,55],moves:['jet','tomb','mud','swords'],glyph:'dome',reward:150},
 omanyte:{name:'Omanyte',types:['rock','water'],base:[35,40,100,90,55,35],moves:['gun','ancient','bite','sludge'],glyph:'spiral',reward:250},
 aerodactyl:{name:'Aerodactyl',types:['rock','flying'],base:[80,105,65,60,75,130],moves:['wing','rock','quake','scary'],glyph:'wings',reward:400},
};
export const MOCK_PROFILE = {name:'Allenatore demo',owned:['pikachu','bulbasaur','squirtle','charmander']};
export const FOSSILS = ['kabuto','omanyte','aerodactyl'];
export const STRUGGLE = move('Scontro','normal','physical',50,100,1,{typeless:true,recoil:true});

// Progressione di prova: dati locali, mosse e prezzi modificabili senza database.
Object.assign(MOVES, {
 ember:move('Braciere','fire','special',40,100,25,{status:'burn',chance:.1}),
 spark:move('Scintilla','electric','physical',65,100,20,{status:'paralysis',chance:.3}),
 metal:move('Ferrartigli','steel','physical',50,95,35,{self:true,stages:{atk:1},chance:.1}),
 brick:move('Breccia','fighting','physical',75,100,15),
 recover:move('Ripresa','normal','status',0,100,3,{self:true,heal:.25}),
 focus:move('Concentrazione','normal','status',0,100,10,{self:true,stages:{spa:1,spd:1}}),
});
Object.assign(SPECIES, {
 ivysaur:{name:'Ivysaur',types:['grass','poison'],base:[60,62,63,80,80,60],moves:SPECIES.bulbasaur.moves,glyph:'bud'},
 venusaur:{name:'Venusaur',types:['grass','poison'],base:[80,82,83,100,100,80],moves:SPECIES.bulbasaur.moves,glyph:'bud'},
 charmeleon:{name:'Charmeleon',types:['fire'],base:[58,64,58,80,65,80],moves:SPECIES.charmander.moves,glyph:'flame'},
 charizard:{name:'Charizard',types:['fire','flying'],base:[78,84,78,109,85,100],moves:SPECIES.charmander.moves,glyph:'wings'},
 wartortle:{name:'Wartortle',types:['water'],base:[59,63,80,65,80,58],moves:SPECIES.squirtle.moves,glyph:'shell'},
 blastoise:{name:'Blastoise',types:['water'],base:[79,83,100,85,105,78],moves:SPECIES.squirtle.moves,glyph:'shell'},
});
export const STARTERS = {
 bulbasaur:{moves:['vine','tackle','growl','recover'],evolutions:[[16,'ivysaur'],[32,'venusaur']],description:'Controlla la lotta con Erba, veleno e sonno.'},
 charmander:{moves:['ember','metal','growl','recover'],evolutions:[[16,'charmeleon'],[36,'charizard']],description:'Attacca e riduci i danni fisici con la bruciatura.'},
 squirtle:{moves:['gun','tackle','withdraw','recover'],evolutions:[[16,'wartortle'],[36,'blastoise']],description:'Resisti, aumenta la Difesa e prepara la risposta.'},
 pikachu:{moves:['quick','spark','growl','recover'],evolutions:[],description:'Sfrutta Velocità e priorità. Evoluzione speciale fuori demo.'},
};
export const MOVE_SHOP = [
 {id:'razor',price:180,level:12,starters:['bulbasaur'],description:'Più potenza e probabilità di critico aumentata.'},
 {id:'poison',price:160,level:12,starters:['bulbasaur'],description:'Avvelena: danni a ogni fine turno.'},
 {id:'sleep',price:240,level:13,starters:['bulbasaur'],description:'Addormenta per creare spazio a cura o potenziamenti.'},
 {id:'flame',price:300,level:14,starters:['charmander'],description:'Attacco speciale potente; 10% di scottare.'},
 {id:'burn',price:180,level:12,starters:['charmander'],description:'Scotta e dimezza i danni fisici avversari.'},
 {id:'smoke',price:160,level:12,starters:['charmander'],description:'Riduce la precisione avversaria.'},
 {id:'brick',price:220,level:12,starters:['charmander'],description:'Copertura Lotta per affrontare i fossili Roccia/Acqua.'},
 {id:'water',price:180,level:12,starters:['squirtle'],description:'Attacco Acqua più potente di Pistolacqua.'},
 {id:'ice',price:300,level:14,starters:['squirtle'],description:'Copertura Ghiaccio contro avversari Volante.'},
 {id:'bite',price:160,level:12,starters:['squirtle'],description:'Può far tentennare se colpisci per primo.'},
 {id:'thunderbolt',price:300,level:14,starters:['pikachu'],description:'Potente attacco speciale Elettro.'},
 {id:'thunderwave',price:180,level:12,starters:['pikachu'],description:'Paralizza: riduce la Velocità e può bloccare un turno.'},
 {id:'focus',price:220,level:12,starters:Object.keys(STARTERS),description:'Aumenta Attacco Speciale e Difesa Speciale di uno stadio.'},
];
export const ENCOUNTERS = {
 kabuto:{reward:150,label:'Esploratore',description:'Attacchi fisici e potenziamenti. Preparati a ridurre il suo Attacco.',moves:['jet','tomb','tackle','swords']},
 omanyte:{reward:250,label:'Veterano',description:'Difesa alta, attacchi speciali e veleno. Cura e tempismo contano.',moves:['gun','ancient','poison','withdraw']},
 aerodactyl:{reward:400,label:'Sfida',description:'Veloce e aggressivo. Prima allenati, poi scegli mosse di copertura.',moves:['wing','tomb','bite','scary']},
};
export function moveEffect(m) {
 if(m.heal)return 'Recupera il 25% dei PS · 3 utilizzi per lotta';
 const effects=[];
 if(m.status)effects.push(`${Math.round((m.chance||1)*100)}% ${ {paralysis:'paralisi',poison:'veleno',burn:'bruciatura',sleep:'sonno'}[m.status]}`);
 if(m.stages)effects.push(Object.entries(m.stages).map(([k,n])=>`${{atk:'ATT',def:'DIF',spa:'ATT SP',spd:'DIF SP',spe:'VEL',accuracy:'PREC'}[k]} ${n>0?'+':''}${n}`).join(', ')+(m.self?' su di sé':' avversaria')+(m.power?` (${Math.round((m.chance||1)*100)}%)`:''));
 if(m.priority)effects.push(`Priorità +${m.priority}`);
 if(m.critRate)effects.push('Critico più frequente');
 if(m.flinch)effects.push(`${Math.round(m.flinch*100)}% tentennamento`);
 return effects.join(' · ')||'Danno diretto';
}

export const DIFFICULTIES = {
 training:{name:'Allenamento',offset:-2,coins:.65,xp:.7,ai:'relaxed',description:'Due livelli sotto. Premi ridotti, mosse semplici.'},
 balanced:{name:'Equilibrata',offset:0,coins:1,xp:1,ai:'balanced',description:'Il tuo stesso livello. Premi normali.'},
 hard:{name:'Difficile',offset:3,coins:1.3,xp:1.3,ai:'tactical',description:'Tre livelli sopra. Set più forti e IA più attenta.'},
};
export const ENCOUNTER_SETS = {
 kabuto:{training:['jet','tackle','withdraw','growl'],balanced:['jet','tomb','mud','swords'],hard:['jet','tomb','brick','swords']},
 omanyte:{training:['gun','tackle','withdraw','growl'],balanced:['gun','ancient','poison','withdraw'],hard:['water','ancient','sludge','focus']},
 aerodactyl:{training:['wing','tackle','scary','withdraw'],balanced:['wing','tomb','bite','scary'],hard:['wing','rock','quake','scary']},
};
