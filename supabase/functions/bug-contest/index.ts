// GENERATED: node scripts/build-bug-edge.mjs. No credentials in this file.
const starterCore=(()=>{
// Catalogo condivisibile con il motore Supabase. Valori di bilanciamento del gioco.
const JOHTO_STARTERS = ['chikorita', 'cyndaquil', 'totodile'];
const JOHTO_FOSSILS = ['unown', 'kabutops', 'omastar'];
const JOHTO_LINES = {
  chikorita: ['chikorita', 'bayleef', 'meganium'],
  cyndaquil: ['cyndaquil', 'quilava', 'typhlosion'],
  totodile: ['totodile', 'croconaw', 'feraligatr']
};
const JOHTO_MOVES = {
  chikorita: ['vine', 'tackle', 'growl', 'recover'],
  cyndaquil: ['ember', 'quick', 'smoke', 'recover'],
  totodile: ['gun', 'scratch', 'growl', 'recover']
};
function installJohto({SPECIES, MOVES, STARTERS, LINES, EVOLUTIONS, DESCRIPTION, MOVE_SHOP, ENCOUNTERS, ENCOUNTER_SETS, FOSSIL_ITEMS}) {
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

// supabase/functions/starter-game/core/mock-data.mjs
var types = { normal: "Normale", fire: "Fuoco", water: "Acqua", electric: "Elettro", grass: "Erba", ice: "Ghiaccio", fighting: "Lotta", poison: "Veleno", ground: "Terra", flying: "Volante", psychic: "Psico", bug: "Coleottero", rock: "Roccia", ghost: "Spettro", dragon: "Drago", dark: "Buio", steel: "Acciaio", fairy: "Folletto" };
var move = (name, type, category, power, accuracy, pp, extra = {}) => ({ name, type, category, power, accuracy, pp, priority: 0, ...extra });
var MOVES = {
  thunderbolt: move("Fulmine", "electric", "special", 90, 100, 15, { status: "paralysis", chance: 0.1 }),
  quick: move("Attacco Rapido", "normal", "physical", 40, 100, 30, { priority: 1 }),
  thunderwave: move("Tuononda", "electric", "status", 0, 90, 20, { status: "paralysis", chance: 1 }),
  growl: move("Ruggito", "normal", "status", 0, 100, 40, { stages: { atk: -1 } }),
  vine: move("Frustata", "grass", "physical", 45, 100, 25),
  razor: move("Foglielama", "grass", "physical", 55, 95, 25, { critRate: 1 / 8 }),
  sleep: move("Sonnifero", "grass", "status", 0, 75, 15, { status: "sleep", chance: 1, powder: true }),
  poison: move("Velenpolvere", "poison", "status", 0, 75, 35, { status: "poison", chance: 1, powder: true }),
  water: move("Idropulsar", "water", "special", 60, 100, 20),
  tackle: move("Azione", "normal", "physical", 40, 100, 35),
  withdraw: move("Ritirata", "water", "status", 0, 100, 40, { self: true, stages: { def: 1 } }),
  ice: move("Geloraggio", "ice", "special", 90, 100, 10),
  flame: move("Lanciafiamme", "fire", "special", 90, 100, 15, { status: "burn", chance: 0.1 }),
  scratch: move("Graffio", "normal", "physical", 40, 100, 35),
  burn: move("Fuocofatuo", "fire", "status", 0, 85, 15, { status: "burn", chance: 1 }),
  smoke: move("Muro di Fumo", "normal", "status", 0, 100, 20, { stages: { accuracy: -1 } }),
  jet: move("Acquagetto", "water", "physical", 40, 100, 20, { priority: 1 }),
  tomb: move("Rocciotomba", "rock", "physical", 60, 95, 15, { stages: { spe: -1 }, chance: 1 }),
  mud: move("Colpodifango", "ground", "special", 55, 95, 15, { stages: { spe: -1 }, chance: 1 }),
  swords: move("Danzaspada", "normal", "status", 0, 100, 20, { self: true, stages: { atk: 2 } }),
  gun: move("Pistolacqua", "water", "special", 40, 100, 25),
  ancient: move("Forzantica", "rock", "special", 60, 100, 5, { self: true, stages: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, chance: 0.1 }),
  bite: move("Morso", "dark", "physical", 60, 100, 25, { flinch: 0.3 }),
  sludge: move("Fangobomba", "poison", "special", 90, 100, 10, { status: "poison", chance: 0.3 }),
  wing: move("Attacco d\u2019Ala", "flying", "physical", 60, 100, 35),
  rock: move("Frana", "rock", "physical", 75, 90, 10, { flinch: 0.3 }),
  quake: move("Terremoto", "ground", "physical", 100, 100, 10),
  scary: move("Visotruce", "normal", "status", 0, 100, 10, { stages: { spe: -2 } })
};
var SPECIES = {
  pikachu: { name: "Pikachu", types: ["electric"], base: [35, 55, 40, 50, 50, 90], moves: ["thunderbolt", "quick", "thunderwave", "growl"], glyph: "spark" },
  bulbasaur: { name: "Bulbasaur", types: ["grass", "poison"], base: [45, 49, 49, 65, 65, 45], moves: ["vine", "razor", "sleep", "poison"], glyph: "bud" },
  squirtle: { name: "Squirtle", types: ["water"], base: [44, 48, 65, 50, 64, 43], moves: ["water", "tackle", "withdraw", "ice"], glyph: "shell" },
  charmander: { name: "Charmander", types: ["fire"], base: [39, 52, 43, 60, 50, 65], moves: ["flame", "scratch", "burn", "smoke"], glyph: "flame" },
  kabuto: { name: "Kabuto", types: ["rock", "water"], base: [30, 80, 90, 55, 45, 55], moves: ["jet", "tomb", "mud", "swords"], glyph: "dome", reward: 150 },
  omanyte: { name: "Omanyte", types: ["rock", "water"], base: [35, 40, 100, 90, 55, 35], moves: ["gun", "ancient", "bite", "sludge"], glyph: "spiral", reward: 250 },
  aerodactyl: { name: "Aerodactyl", types: ["rock", "flying"], base: [80, 105, 65, 60, 75, 130], moves: ["wing", "rock", "quake", "scary"], glyph: "wings", reward: 400 }
};
var STRUGGLE = move("Scontro", "normal", "physical", 50, 100, 1, { typeless: true, recoil: true });
Object.assign(MOVES, {
  ember: move("Braciere", "fire", "special", 40, 100, 25, { status: "burn", chance: 0.1 }),
  spark: move("Scintilla", "electric", "physical", 65, 100, 20, { status: "paralysis", chance: 0.3 }),
  metal: move("Ferrartigli", "steel", "physical", 50, 95, 35, { self: true, stages: { atk: 1 }, chance: 0.1 }),
  brick: move("Breccia", "fighting", "physical", 75, 100, 15),
  recover: move("Ripresa", "normal", "status", 0, 100, 3, { self: true, heal: 0.25 }),
  focus: move("Concentrazione", "normal", "status", 0, 100, 10, { self: true, stages: { spa: 1, spd: 1 } })
});
Object.assign(SPECIES, {
  ivysaur: { name: "Ivysaur", types: ["grass", "poison"], base: [60, 62, 63, 80, 80, 60], moves: SPECIES.bulbasaur.moves, glyph: "bud" },
  venusaur: { name: "Venusaur", types: ["grass", "poison"], base: [80, 82, 83, 100, 100, 80], moves: SPECIES.bulbasaur.moves, glyph: "bud" },
  charmeleon: { name: "Charmeleon", types: ["fire"], base: [58, 64, 58, 80, 65, 80], moves: SPECIES.charmander.moves, glyph: "flame" },
  charizard: { name: "Charizard", types: ["fire", "flying"], base: [78, 84, 78, 109, 85, 100], moves: SPECIES.charmander.moves, glyph: "wings" },
  wartortle: { name: "Wartortle", types: ["water"], base: [59, 63, 80, 65, 80, 58], moves: SPECIES.squirtle.moves, glyph: "shell" },
  blastoise: { name: "Blastoise", types: ["water"], base: [79, 83, 100, 85, 105, 78], moves: SPECIES.squirtle.moves, glyph: "shell" }
});
var STARTERS = {
  bulbasaur: { moves: ["vine", "tackle", "growl", "recover"], evolutions: [[16, "ivysaur"], [32, "venusaur"]], description: "Controlla la lotta con Erba, veleno e sonno." },
  charmander: { moves: ["ember", "metal", "growl", "recover"], evolutions: [[16, "charmeleon"], [36, "charizard"]], description: "Attacca e riduci i danni fisici con la bruciatura." },
  squirtle: { moves: ["gun", "tackle", "withdraw", "recover"], evolutions: [[16, "wartortle"], [36, "blastoise"]], description: "Resisti, aumenta la Difesa e prepara la risposta." },
  pikachu: { moves: ["quick", "spark", "growl", "recover"], evolutions: [], description: "Sfrutta Velocit\xE0 e priorit\xE0. Evoluzione speciale fuori demo." }
};
var MOVE_SHOP = [
  { id: "razor", price: 180, level: 12, starters: ["bulbasaur"], description: "Pi\xF9 potenza e probabilit\xE0 di critico aumentata." },
  { id: "poison", price: 160, level: 12, starters: ["bulbasaur"], description: "Avvelena: danni a ogni fine turno." },
  { id: "sleep", price: 240, level: 13, starters: ["bulbasaur"], description: "Addormenta per creare spazio a cura o potenziamenti." },
  { id: "flame", price: 300, level: 14, starters: ["charmander"], description: "Attacco speciale potente; 10% di scottare." },
  { id: "burn", price: 180, level: 12, starters: ["charmander"], description: "Scotta e dimezza i danni fisici avversari." },
  { id: "smoke", price: 160, level: 12, starters: ["charmander"], description: "Riduce la precisione avversaria." },
  { id: "brick", price: 220, level: 12, starters: ["charmander"], description: "Copertura Lotta per affrontare i fossili Roccia/Acqua." },
  { id: "water", price: 180, level: 12, starters: ["squirtle"], description: "Attacco Acqua pi\xF9 potente di Pistolacqua." },
  { id: "ice", price: 300, level: 14, starters: ["squirtle"], description: "Copertura Ghiaccio contro avversari Volante." },
  { id: "bite", price: 160, level: 12, starters: ["squirtle"], description: "Pu\xF2 far tentennare se colpisci per primo." },
  { id: "thunderbolt", price: 300, level: 14, starters: ["pikachu"], description: "Potente attacco speciale Elettro." },
  { id: "thunderwave", price: 180, level: 12, starters: ["pikachu"], description: "Paralizza: riduce la Velocit\xE0 e pu\xF2 bloccare un turno." },
  { id: "focus", price: 220, level: 12, starters: Object.keys(STARTERS), description: "Aumenta Attacco Speciale e Difesa Speciale di uno stadio." }
];
var ENCOUNTERS = {
  kabuto: { reward: 150, label: "Esploratore", description: "Attacchi fisici e potenziamenti. Preparati a ridurre il suo Attacco.", moves: ["jet", "tomb", "tackle", "swords"] },
  omanyte: { reward: 250, label: "Veterano", description: "Difesa alta, attacchi speciali e veleno. Cura e tempismo contano.", moves: ["gun", "ancient", "poison", "withdraw"] },
  aerodactyl: { reward: 400, label: "Sfida", description: "Veloce e aggressivo. Prima allenati, poi scegli mosse di copertura.", moves: ["wing", "tomb", "bite", "scary"] }
};
var DIFFICULTIES = {
  training: { name: "Allenamento", offset: -2, coins: 0.65, xp: 0.7, ai: "relaxed", description: "Due livelli sotto. Premi ridotti, mosse semplici." },
  balanced: { name: "Equilibrata", offset: 0, coins: 1, xp: 1, ai: "balanced", description: "Il tuo stesso livello. Premi normali." },
  hard: { name: "Difficile", offset: 3, coins: 1.3, xp: 1.3, ai: "tactical", description: "Tre livelli sopra. Set pi\xF9 forti e IA pi\xF9 attenta." }
};
var ENCOUNTER_SETS = {
  kabuto: { training: ["jet", "tackle", "withdraw", "growl"], balanced: ["jet", "tomb", "mud", "swords"], hard: ["jet", "tomb", "brick", "swords"] },
  omanyte: { training: ["gun", "tackle", "withdraw", "growl"], balanced: ["gun", "ancient", "poison", "withdraw"], hard: ["water", "ancient", "sludge", "focus"] },
  aerodactyl: { training: ["wing", "tackle", "scary", "withdraw"], balanced: ["wing", "tomb", "bite", "scary"], hard: ["wing", "rock", "quake", "scary"] }
};

// supabase/functions/starter-game/core/config.mjs
var CONFIG = { initialLevel: 5, maxLevel: 50, initialBalance: 0 };
var LINES = { bulbasaur: ["bulbasaur", "ivysaur", "venusaur"], charmander: ["charmander", "charmeleon", "charizard"], squirtle: ["squirtle", "wartortle", "blastoise"] };
var EVOLUTIONS = {
  bulbasaur: { next: "ivysaur", level: 16, experience: 0, encounters: 0 },
  ivysaur: { next: "venusaur", level: 32, experience: 0, encounters: 0 },
  charmander: { next: "charmeleon", level: 16, experience: 0, encounters: 0 },
  charmeleon: { next: "charizard", level: 36, experience: 0, encounters: 0 },
  squirtle: { next: "wartortle", level: 16, experience: 0, encounters: 0 },
  wartortle: { next: "blastoise", level: 36, experience: 0, encounters: 0 }
};
var DESCRIPTION = { bulbasaur: "Un compagno paziente e tenace, pronto a crescere insieme a te.", charmander: "Una piccola fiamma e un grande coraggio per ogni avventura.", squirtle: "Vivace e affidabile, affronta ogni sfida con il suo guscio." };
function canEvolve(profile) {
  const rule = EVOLUTIONS[profile.starter.species];
  return !!rule && profile.starter.level >= rule.level && profile.totalXP >= rule.experience && profile.encounters >= rule.encounters;
}

// supabase/functions/starter-game/core/battle-engine.mjs
var cloneData = (value) => JSON.parse(JSON.stringify(value));
function createPokemon(id, { level = 50, moves = null, hpMultiplier = 1, maxHitFraction = null, aiStyle = "balanced" } = {}) {
  const s = SPECIES[id];
  if (!s) throw new Error("Pok\xE9mon sconosciuto");
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new Error("Livello non valido");
  const moveIds = moves || s.moves;
  if (moveIds.length !== 4 || new Set(moveIds).size !== 4 || moveIds.some((id2) => !MOVES[id2])) throw new Error("Servono quattro mosse distinte");
  const [baseHp, atk, def, spa, spd, spe] = s.base.map((b, i) => Math.floor((2 * b + 31) * level / 100) + (i === 0 ? level + 10 : 5));
  const hp = Math.floor(baseHp * hpMultiplier);
  return { id, name: s.name, types: [...s.types], level, maxHp: hp, hp, baseHp, maxHitFraction, aiStyle, stats: { atk, def, spa, spd, spe }, stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0 }, status: null, sleepTurns: 0, flinched: false, lastMove: null, moves: moveIds.map((id2) => ({ id: id2, ...cloneData(MOVES[id2]), maxPp: MOVES[id2].pp })) };
}

// supabase/functions/starter-game/core/reward-rules.mjs
var REWARD_POLICY = { period: "daily", limit: 3, timeZone: "Europe/Rome", replacement: "choice" };
function periodKey(now = /* @__PURE__ */ new Date(), period = REWARD_POLICY.period) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: REWARD_POLICY.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  const date = /* @__PURE__ */ new Date(`${get("year")}-${get("month")}-${get("day")}T12:00:00Z`);
  if (period === "weekly") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  else if (period !== "daily") throw new Error("Periodo premi sconosciuto");
  return date.toISOString().slice(0, 10);
}
function rewardStatus(profile, now = /* @__PURE__ */ new Date()) {
  const period = periodKey(now), used = profile.challenges[period] || 0;
  return { period, used, remaining: Math.max(0, REWARD_POLICY.limit - used), eligible: used < REWARD_POLICY.limit };
}

// supabase/functions/starter-game/core/progression.mjs
var MAX_LEVEL = 50;
var xpRequired = (level) => level >= MAX_LEVEL ? 0 : Math.round(220 + 5 * Math.pow(level, 1.7));
function starterPokemon(profile) {
  const s = profile.starter;
  return createPokemon(s.species, { level: s.level, moves: s.equipped });
}
function encounterPreview(profile, fossil, difficulty = "balanced") {
  const encounter = ENCOUNTERS[fossil], mode = DIFFICULTIES[difficulty];
  if (!encounter || !mode) throw new Error("Avversario o difficolt\xE0 non disponibili");
  const level = Math.max(1, Math.min(100, profile.starter.level + mode.offset));
  const xp = Math.round({ kabuto: 28, omanyte: 34, aerodactyl: 40, unown: 28, kabutops: 34, omastar: 40 }[fossil] * mode.xp);
  return { level, moves: [...ENCOUNTER_SETS[fossil][difficulty]], aiStyle: mode.ai, winCoins: Math.round(encounter.reward * mode.coins), lossCoins: Math.round(50 * mode.coins), winXP: xp, lossXP: Math.max(1, Math.floor(xp * 0.25)) };
}

// supabase/functions/starter-game/core/market.mjs
var FOSSIL_ITEMS = {
  kabuto: { name: "Domofossile", pokemon: "Kabuto", basePrice: 120, holders: 480, sellers: 80, buyers: 70 },
  omanyte: { name: "Fossilhelix", pokemon: "Omanyte", basePrice: 220, holders: 320, sellers: 45, buyers: 60 },
  aerodactyl: { name: "Ambra Antica", pokemon: "Aerodactyl", basePrice: 360, holders: 150, sellers: 25, buyers: 40 }
};

installJohto({SPECIES,MOVES,STARTERS,LINES,EVOLUTIONS,DESCRIPTION,MOVE_SHOP,ENCOUNTERS,ENCOUNTER_SETS,FOSSIL_ITEMS});


return {createPokemon};})();
const fishingCore=(()=>{const {createPokemon}=starterCore;
// Fishing balance and artwork. Server species and dimensions: database/fishing.sql.
const RARITIES = {
 common: {label:'Comune', weight:55, catchRate:.58},
 uncommon: {label:'Non Comune', weight:28, catchRate:.44},
 rare: {label:'Raro', weight:13, catchRate:.30},
 veryRare: {label:'Molto Raro', weight:4, catchRate:.19}
};
// Base dimensions are game balancing values, mirrored in database/fishing.sql.
const fish=(name,rarity,base,types=['water'],moves=['gun','tackle','withdraw','growl'],kg=10,metres=.6,asset=null)=>({name,rarity,base,types,moves,kg,metres,weight:1,asset});
const FISH = {
 magikarp:fish('Magikarp','common',[20,10,55,15,20,80],['water'],['tackle','growl','withdraw','gun'],10,.9),
 goldeen:fish('Goldeen','common',[45,67,60,35,50,63]),
 poliwag:fish('Poliwag','common',[40,50,40,40,40,90]),
 tentacool:fish('Tentacool','common',[40,40,35,50,100,70],['water','poison']),
 krabby:fish('Krabby','common',[30,105,90,25,25,50]),
 horsea:fish('Horsea','uncommon',[30,40,70,70,25,60]),
 shellder:fish('Shellder','uncommon',[30,65,100,45,25,40]),
 staryu:fish('Staryu','uncommon',[30,45,55,70,55,85],['water'],['gun','tackle','recover','withdraw']),
 chinchou:fish('Chinchou','uncommon',[75,38,38,56,56,67],['water','electric'],['gun','spark','tackle','growl']),
 remoraid:fish('Remoraid','uncommon',[35,65,35,65,35,65]),
 corsola:fish('Corsola','rare',[65,55,95,65,95,35],['water','rock'],['gun','ancient','recover','tackle']),
 carvanha:fish('Carvanha','rare',[45,90,20,65,20,65],['water','dark'],['gun','bite','tackle','scary']),
 feebas:fish('Feebas','veryRare',[20,15,20,10,55,80]),
 psyduck:fish('Psyduck','common',[50,52,48,65,50,55],['water'],undefined,20,.8,'../safari/assets/psyduck.png'),
 slowpoke:fish('Slowpoke','rare',[90,65,65,40,40,15],['water','psychic'],undefined,36,1.2,'../safari/assets/slowpoke.png'),
 dratini:fish('Dratini','veryRare',[41,64,45,50,50,50],['dragon'],['tackle','quick','thunderwave','scary'],3,1.8,'../safari/assets/dratini.png')
};
const RULES={waitMin:1800,waitMax:5200,timingDuration:8500,minCatch:.05,maxCatch:.95,sizeMin:.70,sizeMax:1.70,sizeBands:[[.90,'Piccolo'],[1.10,'Normale'],[1.30,'Grande'],[1.50,'Enorme'],[Infinity,'Record']]};



const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createBattle(starter,encounter){
 const player=createPokemon(starter.species,{level:starter.level,moves:starter.equipped});
 const species=FISH[encounter.species],level=Math.max(1,starter.level-1);
 // Use the existing stat formula without modifying the shared Starter species.
 const wild=createPokemon('squirtle',{level,moves:species.moves});
 const [hp,...stats]=species.base.map((b,i)=>Math.floor((2*b+31)*level/100)+(i===0?level+10:5));
 Object.assign(wild,{id:encounter.species,name:species.name,types:species.types,maxHp:hp,hp,baseHp:hp,stats:Object.fromEntries(['atk','def','spa','spd','spe'].map((k,i)=>[k,stats[i]]))});
 return {player,wild,turn:0,log:[]};
}
// Fishing battle adapter. Move definitions remain shared with the Starter.
const chart={normal:{rock:.5,steel:.5,ghost:0},fire:{water:.5,fire:.5,rock:.5,dragon:.5,grass:2,ice:2,bug:2,steel:2},water:{water:.5,grass:.5,dragon:.5,fire:2,ground:2,rock:2},grass:{water:2,ground:2,rock:2,grass:.5,fire:.5,poison:.5,flying:.5,bug:.5,dragon:.5,steel:.5},electric:{water:2,flying:2,electric:.5,grass:.5,dragon:.5,ground:0},ice:{water:.5,fire:.5,ice:.5,steel:.5,grass:2,ground:2,flying:2,dragon:2},poison:{grass:2,fairy:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0},steel:{water:.5,fire:.5,electric:.5,steel:.5,rock:2,ice:2,fairy:2},fighting:{normal:2,rock:2,steel:2,ice:2,dark:2,poison:.5,flying:.5,psychic:.5,bug:.5,fairy:.5,ghost:0},ground:{electric:2,fire:2,poison:2,rock:2,steel:2,grass:.5,bug:.5,flying:0},rock:{fire:2,ice:2,flying:2,bug:2,fighting:.5,ground:.5,steel:.5},dark:{psychic:2,ghost:2,dark:.5,fighting:.5,fairy:.5},flying:{grass:2,bug:2,fighting:2,electric:.5,rock:.5,steel:.5}};
const stage=n=>n>=0?(2+n)/2:2/(2-n);
const stat=(p,k)=>p.stats[k]*stage(p.stages[k]||0)*(k==='spe'&&p.status==='paralysis'?.5:1);
const effectiveness=(type,target)=>target.types.reduce((v,t)=>v*(chart[type]?.[t]??1),1);
function act(a,d,m,log,rng){
 if(a.hp<=0||d.hp<=0)return;
 if(a.flinched){a.flinched=false;log.push(a.name+' tentenna!');return;}
 if(a.status==='sleep'&&a.sleepTurns-->0){log.push(a.name+' dorme.');return;}
 if(a.status==='sleep')a.status=null;
 if(a.status==='paralysis'&&rng()<.25){log.push(a.name+' è paralizzato!');return;}
 if(m.pp!==undefined)m.pp--;
 log.push(a.name+' usa '+m.name+'!');
 if(rng()*100>m.accuracy*stage(a.stages.accuracy)){log.push('La mossa fallisce.');return;}
 const eff=effectiveness(m.type,d);
 if(m.power){
 const physical=m.category==='physical',critical=rng()<(m.critRate||1/24);
 let damage=Math.floor(((2*a.level/5+2)*m.power*stat(a,physical?'atk':'spa')/stat(d,physical?'def':'spd')/50+2)*(m.typeless?1:eff)*(a.types.includes(m.type)?1.5:1)*(physical&&a.status==='burn'?.5:1)*(critical?1.5:1)*(.85+rng()*.15));
 damage=eff===0&&!m.typeless?0:Math.max(1,damage);d.hp=Math.max(0,d.hp-damage);log.push(damage+' PS di danno.'+(eff>1?' È superefficace!':eff===0?' Nessun effetto.':''));
 if(m.recoil)a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.maxHp/4)));
 }
 const target=m.self?a:d;
 if(m.heal)target.hp=Math.min(target.maxHp,target.hp+Math.floor(target.maxHp*m.heal));
 if(m.stages&&(m.self||eff!==0)&&rng()<(m.chance??1)){for(const [key,value] of Object.entries(m.stages))target.stages[key]=clamp(target.stages[key]+value,-6,6);log.push('Statistiche di '+target.name+' modificate.');}
 const immune=(m.powder&&d.types.includes('grass'))||(m.status==='burn'&&d.types.includes('fire'))||(m.status==='poison'&&d.types.some(t=>['poison','steel'].includes(t)))||(m.status==='paralysis'&&d.types.includes('electric'));
 if(m.status&&!d.status&&d.hp>0&&eff!==0&&!immune&&rng()<(m.chance??1)){d.status=m.status;d.sleepTurns=2;log.push(d.name+': '+m.status+'.');}
 if(m.flinch&&rng()<m.flinch)d.flinched=true;
}
const struggle={name:'Scontro',type:'normal',category:'physical',power:50,accuracy:100,priority:0,typeless:true,recoil:true};
function turn(b,moveId=null,rng=Math.random){
 b.log=[];b.turn++;b.player.flinched=b.wild.flinched=false;
 const available=b.wild.moves.filter(m=>m.pp>0),enemy=available[Math.floor(rng()*available.length)]||struggle;
 const chosen=moveId==='struggle'?struggle:b.player.moves.find(m=>m.id===moveId&&m.pp>0);
 const actions=chosen?[[b.player,b.wild,chosen],[b.wild,b.player,enemy]]:[[b.wild,b.player,enemy]];
 actions.sort((a,c)=>(c[2].priority||0)-(a[2].priority||0)||stat(c[0],'spe')-stat(a[0],'spe'));
 for(const args of actions)act(...args,b.log,rng);
 for(const p of [b.player,b.wild])if(p.hp>0&&['poison','burn'].includes(p.status)){p.hp=Math.max(0,p.hp-Math.max(1,Math.floor(p.maxHp/8)));b.log.push(p.name+' subisce danni da '+p.status+'.');}
 return b.wild.hp===0?'wildKO':b.player.hp===0?'loss':null;
}
function catchChance(encounter,hp,maxHp){const ratio=hp/maxHp;return clamp(RARITIES[encounter.rarity].catchRate*(ratio>=.7?.45:ratio>=.4?.95:1.5),RULES.minCatch,RULES.maxCatch);}

return {turn};})();
const bugCore=(()=>{const {createPokemon}=starterCore;const {turn}=fishingCore;
// Regole della Gara Pigliamosche ufficiale. Il server usa lo stesso motore.
const RULES = {
  pokeballs: 10,
  maxEncounters: 5,
  weightVariation: 0.20,
  minCatch: 0.05,
  maxCatch: 0.95,
  wildLevelOffset: -1,
  throwAnimationMs: 500
};
const SCORE_RULES = {pointsPerKg: 1.1};

// encounterWeight regola la frequenza; rarityScore è il bonus della giuria.
// base contiene PS, Attacco, Difesa, Att. speciale, Dif. speciale, Velocità.
const BUG_POKEMON = [
  {"id":"caterpie","name":"Caterpie","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":2.9,"encounterWeight":14,"catchRate":0.65,"base":[45,30,35,20,20,45],"types":["bug"],"moves":["tackle","growl","withdraw","quick"],"image":"bug gif/caterpie.gif"},
  {"id":"ledyba","name":"Ledyba","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":10.8,"encounterWeight":12,"catchRate":0.65,"base":[40,20,30,40,80,55],"types":["bug","flying"],"moves":["tackle","growl","withdraw","quick"],"image":"bug gif/ledyba.gif"},
  {"id":"pinsir","name":"Pinsir","rarity":"Raro","rarityScore":20,"stars":3,"baseWeight":55,"encounterWeight":6,"catchRate":0.38,"base":[65,125,100,55,70,85],"types":["bug"],"moves":["tackle","brick","swords","scary"],"image":"bug gif/pinsir.gif"},
  {"id":"scyther","name":"Scyther","rarity":"Raro","rarityScore":20,"stars":3,"baseWeight":56,"encounterWeight":6,"catchRate":0.38,"base":[70,110,80,55,80,105],"types":["bug","flying"],"moves":["wing","quick","swords","tackle"],"image":"bug gif/scyther.gif"},
  {"id":"venonat","name":"Venonat","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":30,"encounterWeight":10,"catchRate":0.5,"base":[60,55,50,40,55,45],"types":["bug","poison"],"moves":["tackle","poison","sleep","growl"],"image":"bug gif/venonat.gif"},
  {"id":"parasect","name":"Parasect","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":29.5,"encounterWeight":8,"catchRate":0.5,"base":[60,95,80,60,80,30],"types":["bug","grass"],"moves":["scratch","razor","sleep","growl"],"image":"bug gif/parasect.gif"},
  {"id":"spinarak","name":"Spinarak","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":8.5,"encounterWeight":12,"catchRate":0.65,"base":[40,60,40,40,40,30],"types":["bug","poison"],"moves":["tackle","poison","scary","growl"],"image":"bug gif/spinarak.gif"},
  {"id":"kakuna","name":"Kakuna","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":10,"encounterWeight":12,"catchRate":0.65,"base":[45,25,50,25,25,35],"types":["bug","poison"],"moves":["tackle","withdraw","poison","growl"],"image":"bug gif/kakuna.gif"},
  {"id":"beedrill","name":"Beedrill","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":29.5,"encounterWeight":8,"catchRate":0.5,"base":[65,90,40,45,80,75],"types":["bug","poison"],"moves":["wing","poison","quick","swords"],"image":"bug gif/beedrill.gif"},
  {"id":"butterfree","name":"Butterfree","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":32,"encounterWeight":8,"catchRate":0.5,"base":[60,45,50,90,80,70],"types":["bug","flying"],"moves":["wing","tackle","sleep","growl"],"image":"bug gif/butterfree.gif"},
  {"id":"heracross","name":"Heracross","rarity":"Molto raro","rarityScore":30,"stars":4,"baseWeight":54,"encounterWeight":4,"catchRate":0.28,"base":[80,125,75,40,95,85],"types":["bug","fighting"],"moves":["tackle","brick","swords","scary"],"image":"bug gif/heracross.gif"}
];


// Chiamata per la valutazione finale e, prima della scelta, soltanto dal debug.
function calculateContestScore(pokemon) {
  if (!Number.isFinite(pokemon.weight) || pokemon.weight<=0 || !Number.isFinite(pokemon.rarityScore) || pokemon.rarityScore<0) throw Error('Esemplare non valido.');
  const weightScore = Math.round(pokemon.weight * SCORE_RULES.pointsPerKg);
  const rarityBonus = pokemon.rarityScore;
  return {weightScore, rarityBonus, total:weightScore + rarityBonus};
}





function createContest(starter, now = new Date()) {
  // Validate the actual companion with the existing battle factory.
  createPokemon(starter.species,{level:starter.level,moves:starter.equipped});
  return {version:1,id:crypto.randomUUID(),startedAt:now.toISOString(),phase:'ready',
    starter:structuredClone(starter),pokeballs:RULES.pokeballs,encounters:0,
    caughtPokemon:[],encounter:null,battle:null,judgment:null,endReason:null,message:''};
}

function generateEncounter(rng = Math.random) {
  const total=BUG_POKEMON.reduce((sum,p)=>sum+p.encounterWeight,0);
  let draw=rng()*total;
  const species=BUG_POKEMON.find(p=>(draw-=p.encounterWeight)<0) || BUG_POKEMON.at(-1);
  const weight=Math.round(species.baseWeight*(1-RULES.weightVariation+rng()*2*RULES.weightVariation)*10)/10;
  return {...structuredClone(species),species:species.id,id:crypto.randomUUID(),weight};
}

function finishIfNeeded(state) {
  if (state.pokeballs<=0) {
    state.pokeballs=0;state.endReason='balls';state.phase='selection';return true;
  }
  // The fifth encounter may still be played: its completion ends capture play.
  if (state.phase!=='battle' && state.encounters>=RULES.maxEncounters) {
    state.endReason='encounters';state.phase='selection';return true;
  }
  return false;
}

function endEncounter(state, message) {
  state.phase='between';state.message=message;finishIfNeeded(state);
}

function startEncounter(state, rng = Math.random) {
  if (!['ready','between'].includes(state.phase) || finishIfNeeded(state)) return false;
  state.encounter=generateEncounter(rng);state.encounters++;
  const player=createPokemon(state.starter.species,{level:state.starter.level,moves:state.starter.equipped});
  const level=Math.max(1,state.starter.level+RULES.wildLevelOffset),p=state.encounter;
  // Reuse the app's fighter structure, move definitions and turn engine.
  // Only the wild species data differs from the fishing adapter.
  const wild=createPokemon('squirtle',{level,moves:p.moves});
  const [hp,...stats]=p.base.map((base,i)=>Math.floor((2*base+31)*level/100)+(i===0?level+10:5));
  Object.assign(wild,{id:p.species,name:p.name,types:[...p.types],hp,maxHp:hp,baseHp:hp,
    stats:Object.fromEntries(['atk','def','spa','spd','spe'].map((key,i)=>[key,stats[i]]))});
  state.battle={player,wild,turn:0,log:[]};state.phase='battle';
  state.message=`È apparso ${p.name}!`;return true;
}

function captureProbability(state) {
  const wild=state.battle?.wild;
  if (!wild || wild.hp<=0 || !state.encounter) return 0;
  const health=Math.min(1,wild.hp/wild.maxHp);
  return Math.max(RULES.minCatch,Math.min(RULES.maxCatch,state.encounter.catchRate*(0.45+1.25*(1-health))));
}

function canAct(state) {
  if (state.phase!=='battle' || finishIfNeeded(state)) return false;
  if (state.battle.wild.hp<=0) {endEncounter(state,'Il Pokémon selvatico è KO: non puoi catturarlo.');return false;}
  if (state.battle.player.hp<=0) {endEncounter(state,'Il tuo Starter è esausto.');return false;}
  return true;
}

function attack(state, moveId, rng = Math.random) {
  if (!canAct(state)) return false;
  const moves=state.battle.player.moves;
  if (moveId==='struggle' ? moves.some(m=>m.pp>0) : !moves.some(m=>m.id===moveId&&m.pp>0)) return false;
  const outcome=turn(state.battle,moveId,rng);
  state.message='';
  if (outcome) endEncounter(state,outcome==='wildKO'?'Il Pokémon selvatico è KO: non puoi catturarlo.':'Il tuo Starter è esausto. Potrà riprendersi prima del prossimo incontro.');
  return true;
}

function throwPokeball(state, rng = Math.random) {
  if (!canAct(state)) return null;
  state.pokeballs--; // A failed throw costs exactly as much as a successful one.
  const success=rng()<captureProbability(state);
  const message=success?'Cattura riuscita!':'Il Pokémon è uscito dalla Poké Ball!';
  if (success) {
    const {id,species,name,rarity,rarityScore,stars,weight,image}=state.encounter;
    state.caughtPokemon.push({id,species,name,rarity,rarityScore,stars,weight,image});
    endEncounter(state,message);
  } else {
    state.message=message;
    // At zero balls there is no retaliation, no next turn and no next encounter.
    if (!finishIfNeeded(state)) {
      const outcome=turn(state.battle,null,rng);
      if (outcome) endEncounter(state,message+' '+(outcome==='wildKO'?'Il selvatico è andato KO.':'Il tuo Starter è esausto.'));
    }
  }
  return {success,message};
}

function flee(state) {
  if (!canAct(state)) return false;
  endEncounter(state,'Hai lasciato andare il Pokémon.');return true;
}

function presentToJury(state, pokemonId, now = new Date()) {
  if (state.phase!=='selection') return null;
  const pokemon=state.caughtPokemon.find(p=>p.id===pokemonId);
  if (!pokemon) return null;
  state.judgment={contestId:state.id,pokemon:structuredClone(pokemon),date:now.toISOString(),...calculateContestScore(pokemon)};
  state.phase='judged';state.message='La giuria ha valutato il tuo Pokémon.';
  return state.judgment;
}


// Shared authoritative command dispatcher, used only by the Edge Function.
function applyCommand(previous,command,starter,rng=Math.random){
 if(command.type==='start'){
  if(previous)throw Error('ALREADY_STARTED');
  if(!starter)throw Error('STARTER_REQUIRED');
  return createContest(starter);
 }
 if(!previous)throw Error('CONTEST_NOT_FOUND');
 const state=structuredClone(previous);
 let accepted=false;
 switch(command.type){
  case 'next':accepted=startEncounter(state,rng);break;
  case 'move':accepted=attack(state,command.move,rng);break;
  case 'catch':accepted=!!throwPokeball(state,rng);break;
  case 'flee':accepted=flee(state);break;
  case 'present':accepted=!!presentToJury(state,command.pokemonId);break;
  default:throw Error('INVALID_COMMAND');
 }
 if(!accepted)throw Error('INVALID_COMMAND');
 return state;
}

return {applyCommand};})();

// This file is appended to the shared engine by scripts/build-bug-edge.mjs.
import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'NOT_AUTHORIZED'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError||!auth.user)return reply({error:'NOT_AUTHORIZED'},401);
  const user=auth.user.id;
  if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'REQUEST_TOO_LARGE'},413);
  const text=await req.text();if(text.length>4096)return reply({error:'REQUEST_TOO_LARGE'},413);
  const body=JSON.parse(text);
  if(!body||!uuid.test(body.operationId||'')||!Number.isSafeInteger(body.revision)||body.revision<0||!/^\d{4}-\d{2}-\d{2}$/.test(body.day||''))return reply({error:'INVALID_COMMAND'},400);
  const {data:duplicate,error:duplicateError}=await admin.rpc('get_bug_game_operation',{p_user:user,p_operation:body.operationId});
  if(duplicateError)throw duplicateError;if(duplicate)return reply(duplicate);
  const {data:current,error:readError}=await admin.rpc('read_bug_game',{p_user:user});
  if(readError)throw readError;
  if(!current.isOpen||body.day!==current.day)return reply({error:'CONTEST_CLOSED'},400);
  if(body.revision!==current.revision)return reply({error:'STALE_REVISION'},409);
  // The browser sends only an action. It cannot supply state, RNG, catches or score.
  const state=bugCore.applyCommand(current.state,body,current.starter);
  const {data,error}=await admin.rpc('commit_bug_game',{p_user:user,p_day:current.day,p_revision:current.revision,p_operation:body.operationId,p_kind:body.type,p_state:state});
  if(error)throw error;
  return reply(data);
 }catch(error){
  const message=error instanceof Error?error.message:(error as any)?.message||'REQUEST_FAILED';
  return reply({error:message},message.includes('STALE_REVISION')?409:400);
 }
});
