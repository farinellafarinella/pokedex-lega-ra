// Catalogo condivisibile con il motore Supabase. Valori di bilanciamento del gioco.
export const JOHTO_STARTERS = ['chikorita', 'cyndaquil', 'totodile'];
export const JOHTO_FOSSILS = ['unown', 'kabutops', 'omastar'];
export const JOHTO_LINES = {
  chikorita: ['chikorita', 'bayleef', 'meganium'],
  cyndaquil: ['cyndaquil', 'quilava', 'typhlosion'],
  totodile: ['totodile', 'croconaw', 'feraligatr']
};
export const JOHTO_MOVES = {
  chikorita: ['vine', 'tackle', 'growl', 'recover'],
  cyndaquil: ['ember', 'quick', 'smoke', 'recover'],
  totodile: ['gun', 'scratch', 'growl', 'recover']
};
export function installJohto({SPECIES, MOVES, STARTERS, LINES, EVOLUTIONS, DESCRIPTION, MOVE_SHOP, ENCOUNTERS, ENCOUNTER_SETS, FOSSIL_ITEMS}) {
  MOVES.hidden = {name:'Introforza',type:'psychic',category:'special',power:60,accuracy:100,pp:15,priority:0};
  const rows = [
    ['chikorita','Chikorita',['grass'],[45,49,65,49,65,45],'chikorita'],
    ['bayleef','Bayleef',['grass'],[60,62,80,63,80,60],'chikorita'],
    ['meganium','Meganium',['grass'],[80,82,100,83,100,80],'chikorita'],
    ['cyndaquil','Cyndaquil',['fire'],[39,52,43,60,50,65],'cyndaquil'],
    ['quilava','Quilava',['fire'],[58,64,58,80,65,80],'cyndaquil'],
    ['typhlosion','Typhlosion',['fire'],[78,84,78,109,85,100],'cyndaquil'],
    ['totodile','Totodile',['water'],[50,65,64,44,48,43],'totodile'],
    ['croconaw','Croconaw',['water'],[65,80,80,59,63,58],'totodile'],
    ['feraligatr','Feraligatr',['water'],[85,105,100,79,83,78],'totodile']
  ];
  for (const [id,name,types,base,origin] of rows) SPECIES[id]={name,types,base,moves:[...JOHTO_MOVES[origin]]};
  Object.assign(LINES,JOHTO_LINES);
  Object.assign(DESCRIPTION,{
    chikorita:'Uno starter Erba pronto a crescere insieme a te a Johto.',
    cyndaquil:'Uno starter Fuoco per una nuova avventura a Johto.',
    totodile:'Uno starter Acqua vivace e determinato.'
  });
  for (const [origin,levels] of [['chikorita',[16,32]],['cyndaquil',[14,36]],['totodile',[18,30]]]) {
    const line=LINES[origin];
    STARTERS[origin]={moves:[...JOHTO_MOVES[origin]],evolutions:[[levels[0],line[1]],[levels[1],line[2]]],description:DESCRIPTION[origin]};
    for (let i=0;i<2;i++) EVOLUTIONS[line[i]]={next:line[i+1],level:levels[i],experience:0,encounters:0};
  }
  const equivalents={bulbasaur:'chikorita',charmander:'cyndaquil',squirtle:'totodile'};
  for (const offer of MOVE_SHOP) {
    offer.starters=[...new Set([...offer.starters,...offer.starters.map(id=>equivalents[id]).filter(Boolean)])];
  }
  Object.assign(SPECIES,{
    unown:{name:'Unown',types:['psychic'],base:[48,72,48,72,48,48],moves:['hidden','ancient','focus','recover']},
    kabutops:{name:'Kabutops',types:['rock','water'],base:[60,115,105,65,70,80],moves:['jet','tomb','mud','swords']},
    omastar:{name:'Omastar',types:['rock','water'],base:[70,60,125,115,70,55],moves:['water','ancient','bite','withdraw']}
  });
  Object.assign(ENCOUNTERS,{
    unown:{reward:150,label:'Johto',description:'Una sfida Psico tra le rovine di Johto.',moves:SPECIES.unown.moves},
    kabutops:{reward:250,label:'Johto',description:'Attacchi fisici e una corazza resistente.',moves:SPECIES.kabutops.moves},
    omastar:{reward:400,label:'Johto',description:'Una difesa solida e potenti attacchi speciali.',moves:SPECIES.omastar.moves}
  });
  Object.assign(ENCOUNTER_SETS,{
    unown:{training:['hidden','tackle','growl','withdraw'],balanced:['hidden','ancient','focus','recover'],hard:['hidden','ancient','focus','recover']},
    kabutops:{training:['jet','tackle','withdraw','growl'],balanced:['jet','tomb','mud','swords'],hard:['jet','rock','brick','swords']},
    omastar:{training:['gun','tackle','withdraw','growl'],balanced:['water','ancient','bite','withdraw'],hard:['water','ancient','sludge','focus']}
  });
  Object.assign(FOSSIL_ITEMS,{
    unown:{name:'Runa Unown',pokemon:'Unown',basePrice:120},
    kabutops:{name:'Fossile Kabutops',pokemon:'Kabutops',basePrice:220},
    omastar:{name:'Fossile Omastar',pokemon:'Omastar',basePrice:360}
  });
}
