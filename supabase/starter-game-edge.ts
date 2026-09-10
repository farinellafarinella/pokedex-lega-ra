// Generato da test/starter-integration/build-edge.mjs. Incollare in una Edge Function chiamata starter-game.
// La sorgente modificabile è supabase/functions/starter-game/index.ts e core/.

// supabase/functions/starter-game/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// supabase/functions/starter-game/core/mock-data.mjs
var move = (name, type, category, power, accuracy2, pp, extra = {}) => ({ name, type, category, power, accuracy: accuracy2, pp, priority: 0, ...extra });
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

// supabase/functions/starter-game/core/battle-engine.mjs
var cloneData = (value) => JSON.parse(JSON.stringify(value));
var chart = {
  normal: ["", "rock steel", "ghost"],
  fire: ["grass ice bug steel", "fire water rock dragon", ""],
  water: ["fire ground rock", "water grass dragon", ""],
  electric: ["water flying", "electric grass dragon", "ground"],
  grass: ["water ground rock", "fire grass poison flying bug dragon steel", ""],
  ice: ["grass ground flying dragon", "fire water ice steel", ""],
  fighting: ["normal ice rock dark steel", "poison flying psychic bug fairy", "ghost"],
  poison: ["grass fairy", "poison ground rock ghost", "steel"],
  ground: ["fire electric poison rock steel", "grass bug", "flying"],
  flying: ["grass fighting bug", "electric rock steel", ""],
  psychic: ["fighting poison", "psychic steel", "dark"],
  bug: ["grass psychic dark", "fire fighting poison flying ghost steel fairy", ""],
  rock: ["fire ice flying bug", "fighting ground steel", ""],
  ghost: ["psychic ghost", "dark", "normal"],
  dragon: ["dragon", "steel", "fairy"],
  dark: ["psychic ghost", "fighting dark fairy", ""],
  steel: ["ice rock fairy", "fire water electric steel", ""],
  fairy: ["fighting dragon dark", "fire poison steel", ""]
};
function effectiveness(type, targets) {
  const row = chart[type];
  if (!row) throw new Error("Tipo sconosciuto");
  return targets.reduce((n, t) => n * (row[2].split(" ").includes(t) ? 0 : row[0].split(" ").includes(t) ? 2 : row[1].split(" ").includes(t) ? 0.5 : 1), 1);
}
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
var stageMultiplier = (n) => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
function stat(p, key, critical = false, defending = false) {
  let stage = p.stages[key];
  if (critical && (defending && stage > 0 || !defending && stage < 0)) stage = 0;
  return Math.max(1, Math.floor(p.stats[key] * stageMultiplier(stage) * (key === "spe" && p.status === "paralysis" ? 0.5 : 1)));
}
function damage(a, d, m, { critical = false, roll = 1 } = {}) {
  const eff = m.typeless ? 1 : effectiveness(m.type, d.types);
  if (!eff || !m.power) return 0;
  const physical = m.category === "physical";
  const attack = stat(a, physical ? "atk" : "spa", critical);
  const defense = stat(d, physical ? "def" : "spd", critical, true);
  const base = Math.floor(Math.floor((Math.floor(2 * a.level / 5) + 2) * m.power * attack / defense) / 50) + 2;
  const stab = !m.typeless && a.types.includes(m.type) ? 1.5 : 1;
  const burn = physical && a.status === "burn" && !m.recoil ? 0.5 : 1;
  const calculated = Math.max(1, Math.floor(base * (critical ? 1.5 : 1) * roll * stab * eff * burn));
  return d.maxHitFraction ? Math.min(calculated, Math.max(1, Math.floor(d.maxHp * d.maxHitFraction))) : calculated;
}
function canStatus(p, status) {
  return !p.status && p.hp > 0 && !(status === "paralysis" && p.types.includes("electric")) && !(status === "burn" && p.types.includes("fire")) && !(status === "poison" && p.types.some((t) => ["poison", "steel"].includes(t)));
}
function statusAllowed(target, m) {
  return (!m.powder || !target.types.includes("grass")) && canStatus(target, m.status) && !(m.type === "electric" && effectiveness(m.type, target.types) === 0);
}
function accuracy(a, m) {
  const n = a.stages.accuracy;
  return Math.min(1, m.accuracy / 100 * (n >= 0 ? (3 + n) / 3 : 3 / (3 - n)));
}
function chooseAI(a, d, rng = Math.random) {
  const available = a.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0);
  if (!available.length) return -1;
  const scored = available.map(({ m, i }) => {
    let score = 0;
    if (m.power) score = damage(a, d, m) * accuracy(a, m) + (m.status && statusAllowed(d, m) ? 12 * (m.chance || 1) : 0) + (m.flinch ? 8 : 0);
    else if (m.heal) score = a.hp < a.maxHp * 0.6 ? Math.min(a.maxHp * m.heal, a.maxHp - a.hp) : 0;
    else if (m.status) score = statusAllowed(d, m) ? 26 * accuracy(a, m) : 0;
    else if (m.stages) {
      const target = m.self ? a : d;
      score = Object.entries(m.stages).some(([s, n]) => n > 0 ? target.stages[s] < 6 : target.stages[s] > -6) ? 18 : 0;
      if (m.self && a.hp < a.maxHp * 0.3) score *= 0.3;
    }
    if (m.power && effectiveness(m.type, d.types) === 0) score = 0;
    if (a.aiStyle === "tactical" && m.power && damage(a, d, m) >= d.hp) score *= 2;
    if (a.aiStyle === "tactical" && m.priority > 0 && stat(a, "spe") < stat(d, "spe")) score *= 1.3;
    if (a.lastMove === m.id) score *= 0.55;
    return { i, score };
  });
  const viable = scored.filter((x) => x.score > 0);
  if (!viable.length) return available[Math.floor(rng() * available.length)].i;
  const exponent = a.aiStyle === "relaxed" ? 1.2 : a.aiStyle === "tactical" ? 3 : 2;
  const weights = viable.map((x) => ({ ...x, weight: Math.pow(x.score, exponent) }));
  let pick = rng() * weights.reduce((n, x) => n + x.weight, 0);
  for (const x of weights) {
    pick -= x.weight;
    if (pick < 0) return x.i;
  }
  return weights.at(-1).i;
}
var statusNames = { paralysis: "paralizzato", poison: "avvelenato", burn: "scottato", sleep: "addormentato" };
var statNames = { atk: "Attacco", def: "Difesa", spa: "Attacco Speciale", spd: "Difesa Speciale", spe: "Velocit\xE0", accuracy: "Precisione" };
var Battle = class {
  constructor(player, fossil, rng = Math.random, options = {}) {
    const arena = { hpMultiplier: options.hpMultiplier || 1, maxHitFraction: options.maxHitFraction || null };
    this.player = createPokemon(player, { ...options.player, ...arena });
    this.enemy = createPokemon(fossil, { ...options.enemy, ...arena });
    this.rng = rng;
    this.turn = 0;
    this.result = null;
    this.reward = 0;
    this.events = [];
    this.rewards = options.rewards || { win: SPECIES[fossil].reward, loss: 50 };
  }
  snapshot() {
    return cloneData({ player: this.player, enemy: this.enemy, turn: this.turn, result: this.result, reward: this.reward });
  }
  emit(text, actor = null, kind = "message") {
    this.events.push({ text, actor, kind, state: this.snapshot() });
  }
  finish() {
    if (this.result) return true;
    if (this.player.hp && this.enemy.hp) return false;
    this.result = this.player.hp > 0 ? "win" : "loss";
    this.reward = this.rewards[this.result];
    this.emit(`${this.result === "win" ? "Vittoria!" : "Sconfitta."} Ottieni ${this.reward} Pok\xE9dollari demo.`);
    return true;
  }
  force(result) {
    if (this.result) return [];
    this.events = [];
    if (result === "win") this.enemy.hp = 0;
    else this.player.hp = 0;
    this.finish();
    return this.events;
  }
  act(actor, target, index, side) {
    if (!actor.hp || !target.hp) return;
    if (actor.flinched) {
      this.emit(`${actor.name} tentenna!`);
      return;
    }
    if (actor.status === "sleep") {
      actor.sleepTurns--;
      if (actor.sleepTurns > 0) {
        this.emit(`${actor.name} dorme profondamente.`);
        return;
      }
      actor.status = null;
      this.emit(`${actor.name} si \xE8 svegliato!`);
    }
    if (actor.status === "paralysis" && this.rng() < 0.25) {
      this.emit(`${actor.name} \xE8 paralizzato! Non pu\xF2 muoversi.`);
      return;
    }
    const m = index === -1 ? STRUGGLE : actor.moves[index];
    if (index !== -1) m.pp--;
    actor.lastMove = m.id || "struggle";
    this.emit(`${actor.name} usa ${m.name}!`, side, "attack");
    if (m.heal) {
      const healed = Math.min(actor.maxHp - actor.hp, Math.floor(actor.maxHp * m.heal));
      actor.hp += healed;
      this.emit(healed ? `${actor.name} recupera ${healed} PS!` : `${actor.name} ha gi\xE0 tutti i PS.`);
      return;
    }
    if ((!m.self || m.power) && !m.recoil && this.rng() >= accuracy(actor, m)) {
      this.emit("L\u2019attacco fallisce!");
      return;
    }
    const eff = m.typeless ? 1 : effectiveness(m.type, target.types);
    if ((m.power || m.type === "electric") && !eff) {
      this.emit(`Non ha effetto su ${target.name}!`);
      return;
    }
    if (m.power) {
      const critical = this.rng() < (m.critRate || 1 / 24);
      const dealt = damage(actor, target, m, { critical, roll: (85 + Math.floor(this.rng() * 16)) / 100 });
      target.hp = Math.max(0, target.hp - dealt);
      this.emit(`${target.name} perde ${dealt} PS.`, side === "player" ? "enemy" : "player", "hit");
      if (critical) this.emit("Brutto colpo!");
      if (eff > 1) this.emit("\xC8 superefficace!");
      else if (eff < 1) this.emit("Non \xE8 molto efficace\u2026");
    }
    if (m.recoil) {
      actor.hp = Math.max(0, actor.hp - Math.max(1, Math.floor(actor.maxHp / 4)));
      this.emit(`${actor.name} subisce il contraccolpo!`);
    }
    if (!target.hp) {
      this.emit(`${target.name} \xE8 esausto!`);
      return;
    }
    if (m.status && this.rng() < (m.chance || 1)) {
      if (statusAllowed(target, m)) {
        target.status = m.status;
        if (m.status === "sleep") target.sleepTurns = 2 + Math.floor(this.rng() * 3);
        this.emit(`${target.name} \xE8 ${statusNames[m.status]}!`);
      } else if (!m.power) this.emit("Non ha effetto: stato gi\xE0 presente o immunit\xE0.");
    }
    if (m.stages && (!m.power || this.rng() < (m.chance || 1))) {
      const p = m.self ? actor : target;
      for (const [s, n] of Object.entries(m.stages)) {
        const before = p.stages[s];
        p.stages[s] = Math.max(-6, Math.min(6, before + n));
        this.emit(before === p.stages[s] ? `${statNames[s]} di ${p.name} \xE8 gi\xE0 al limite!` : `${statNames[s]} di ${p.name} ${n > 0 ? "aumenta" : "diminuisce"}!`);
      }
    }
    if (m.flinch && this.rng() < m.flinch) target.flinched = true;
  }
  play(index) {
    if (this.result) throw new Error("Lotta gi\xE0 terminata");
    if (index === -1 ? this.player.moves.some((m) => m.pp > 0) : !Number.isInteger(index) || !this.player.moves[index] || this.player.moves[index].pp <= 0) throw new Error("Mossa non disponibile");
    this.events = [];
    this.turn++;
    this.player.flinched = false;
    this.enemy.flinched = false;
    const enemyIndex = chooseAI(this.enemy, this.player, this.rng);
    const pm = index === -1 ? STRUGGLE : this.player.moves[index], em = enemyIndex === -1 ? STRUGGLE : this.enemy.moves[enemyIndex];
    const priority = pm.priority - em.priority, speed = stat(this.player, "spe") - stat(this.enemy, "spe");
    const first = priority !== 0 ? priority > 0 : speed !== 0 ? speed > 0 : this.rng() < 0.5;
    const order = first ? [[this.player, this.enemy, index, "player"], [this.enemy, this.player, enemyIndex, "enemy"]] : [[this.enemy, this.player, enemyIndex, "enemy"], [this.player, this.enemy, index, "player"]];
    this.emit(`Turno ${this.turn}`);
    for (const args of order) {
      this.act(...args);
      if (this.finish()) return this.events;
    }
    for (const [p, , , side] of order) {
      if (p.status === "poison" || p.status === "burn") {
        p.hp = Math.max(0, p.hp - Math.max(1, Math.floor(p.maxHp / (p.status === "poison" ? 8 : 16))));
        this.emit(`${p.name} soffre per ${p.status === "poison" ? "il veleno" : "la scottatura"}!`, side, "hit");
        if (!p.hp) this.emit(`${p.name} \xE8 esausto!`);
        if (this.finish()) break;
      }
    }
    return this.events;
  }
};

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
function reserveChallenge(profile, now = /* @__PURE__ */ new Date()) {
  const status = rewardStatus(profile, now);
  profile.challenges[status.period] = status.used + 1;
  return { ...status, number: status.used + 1 };
}
function awardFossil(profile, species, battleId) {
  const item = { id: `fossil-${battleId}`, species };
  if (!profile.inventory.fossil) {
    profile.inventory.fossil = item;
    return "received";
  }
  if (profile.inventory.fossil.species === species) return "already-owned";
  if (REWARD_POLICY.replacement === "automatic") {
    profile.inventory.fossil = item;
    return "replaced";
  }
  profile.pendingFossil = item;
  return "choice";
}
function resolveFossil(profile, replace) {
  if (!profile.pendingFossil) throw new Error("Nessun fossile da scegliere");
  if (replace) profile.inventory.fossil = profile.pendingFossil;
  profile.pendingFossil = null;
  return profile.inventory.fossil;
}

// supabase/functions/starter-game/core/progression.mjs
var encounterSequence = 0;
var MAX_LEVEL = 50;
var ARENA_RULES = { hpMultiplier: 3, maxHitFraction: 0.24 };
function createProfile(starter = "bulbasaur") {
  if (!STARTERS[starter]) throw new Error("Starter non disponibile");
  return { name: "Allenatore demo", balance: 600, wins: 0, losses: 0, challenges: {}, inventory: { fossil: null }, pendingFossil: null, starter: { origin: starter, species: starter, level: 12, xp: 0, knownMoves: [...STARTERS[starter].moves], equipped: [...STARTERS[starter].moves] } };
}
var xpRequired = (level) => level >= MAX_LEVEL ? 0 : Math.round(220 + 5 * Math.pow(level, 1.7));
function starterPokemon(profile) {
  const s = profile.starter;
  return createPokemon(s.species, { level: s.level, moves: s.equipped });
}
function gainXP(profile, amount) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("XP non validi");
  const s = profile.starter, levels = [], evolutions = [];
  if (s.level >= MAX_LEVEL) return { levels, evolutions };
  s.xp += amount;
  while (s.level < MAX_LEVEL && s.xp >= xpRequired(s.level)) {
    s.xp -= xpRequired(s.level);
    s.level++;
    levels.push(s.level);
    const evolution = STARTERS[s.origin].evolutions.find(([level]) => level === s.level);
    if (evolution && !profile.linkedStarter) {
      const previous = s.species;
      s.species = evolution[1];
      evolutions.push({ from: SPECIES[previous].name, to: SPECIES[s.species].name });
    }
  }
  if (s.level === MAX_LEVEL) s.xp = 0;
  return { levels, evolutions };
}
function purchaseMove(profile, id) {
  const offer = MOVE_SHOP.find((o) => o.id === id && o.starters.includes(profile.starter.origin));
  if (!offer) throw new Error("Mossa non compatibile con questo starter");
  if (profile.starter.knownMoves.includes(id)) throw new Error("Mossa gi\xE0 acquistata");
  if (profile.starter.level < offer.level) throw new Error(`Serve il livello ${offer.level}`);
  if (profile.balance < offer.price) throw new Error("Pok\xE9dollari demo insufficienti");
  profile.balance -= offer.price;
  profile.starter.knownMoves.push(id);
  return MOVES[id].name;
}
function equipMove(profile, id, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) throw new Error("Slot non valido");
  if (!profile.starter.knownMoves.includes(id)) throw new Error("Prima acquista la mossa");
  if (profile.starter.equipped.includes(id)) throw new Error("Mossa gi\xE0 equipaggiata");
  const replaced = profile.starter.equipped[slot];
  profile.starter.equipped[slot] = id;
  return MOVES[replaced].name;
}
function encounterPreview(profile, fossil, difficulty = "balanced") {
  const encounter = ENCOUNTERS[fossil], mode = DIFFICULTIES[difficulty];
  if (!encounter || !mode) throw new Error("Avversario o difficolt\xE0 non disponibili");
  const level = Math.max(1, Math.min(100, profile.starter.level + mode.offset));
  const xp = Math.round({ kabuto: 28, omanyte: 34, aerodactyl: 40 }[fossil] * mode.xp);
  return { level, moves: [...ENCOUNTER_SETS[fossil][difficulty]], aiStyle: mode.ai, winCoins: Math.round(encounter.reward * mode.coins), lossCoins: Math.round(50 * mode.coins), winXP: xp, lossXP: Math.max(1, Math.floor(xp * 0.25)) };
}
function createEncounter(profile, fossil, rng = Math.random, { difficulty = "balanced", now = /* @__PURE__ */ new Date() } = {}) {
  if (profile.pendingFossil) throw new Error("Scegli prima quale fossile conservare nell\u2019inventario");
  const preview = encounterPreview(profile, fossil, difficulty), starter = profile.starter;
  const battle = new Battle(starter.species, fossil, rng, {
    player: { level: starter.level, moves: starter.equipped },
    enemy: { level: preview.level, moves: preview.moves, aiStyle: preview.aiStyle },
    ...ARENA_RULES
  });
  const quota = reserveChallenge(profile, now);
  battle.id = ++encounterSequence;
  battle.owner = profile;
  battle.challenge = { ...quota, difficulty, ...preview };
  battle.rewards = { win: quota.eligible ? preview.winCoins : 0, loss: quota.eligible ? preview.lossCoins : 0 };
  return battle;
}
function settleBattle(profile, battle) {
  if (battle.owner !== profile) throw new Error("Lotta non appartenente a questo profilo demo");
  if (!battle.result) throw new Error("La lotta non \xE8 terminata");
  if (battle.settlement) return battle.settlement;
  const win = battle.result === "win", challenge = battle.challenge;
  const coins = battle.rewards[win ? "win" : "loss"];
  const xp = profile.starter.level === MAX_LEVEL ? 0 : win ? challenge.winXP : challenge.lossXP;
  profile.balance += coins;
  profile[win ? "wins" : "losses"]++;
  const progression = gainXP(profile, xp);
  const fossil = win && challenge.eligible ? awardFossil(profile, battle.enemy.id, battle.id) : null;
  battle.settlement = { coins, xp, fossil, eligible: challenge.eligible, challengeNumber: challenge.number, ...progression };
  return battle.settlement;
}

// supabase/functions/starter-game/core/market.mjs
var FOSSIL_ITEMS = {
  kabuto: { name: "Domofossile", pokemon: "Kabuto", basePrice: 120, holders: 480, sellers: 80, buyers: 70 },
  omanyte: { name: "Fossilhelix", pokemon: "Omanyte", basePrice: 220, holders: 320, sellers: 45, buyers: 60 },
  aerodactyl: { name: "Ambra Antica", pokemon: "Aerodactyl", basePrice: 360, holders: 150, sellers: 25, buyers: 40 }
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
function canEvolve(profile) {
  const rule = EVOLUTIONS[profile.starter.species];
  return !!rule && profile.starter.level >= rule.level && profile.totalXP >= rule.experience && profile.encounters >= rule.encounters;
}

// supabase/functions/starter-game/core/game.mjs
var clone = (value) => JSON.parse(JSON.stringify(value));
function restoreBattle(raw, profile, rng = Math.random) {
  if (!raw) return null;
  const battle = Object.assign(Object.create(Battle.prototype), clone(raw));
  battle.owner = profile;
  battle.rng = rng;
  battle.events = [];
  return battle;
}
function packBattle(battle) {
  if (!battle) return null;
  const { owner, rng, events, ...raw } = battle;
  return clone(raw);
}
function applyCommand(previous, command, { balance, now = /* @__PURE__ */ new Date(), rng = Math.random } = {}) {
  const state = previous ? clone(previous) : { profile: null, battle: null, log: [] };
  let p = state.profile, b = restoreBattle(state.battle, p, rng);
  const active = b && !b.result;
  if (command.type === "choose") {
    if (p) throw Error("Lo starter \xE8 gi\xE0 stato scelto.");
    if (!Object.hasOwn(LINES, command.starter)) throw Error("Starter non disponibile.");
    p = createProfile(command.starter);
    p.starter.level = CONFIG.initialLevel;
    p.balance = balance;
    p.totalXP = 0;
    p.encounters = 0;
    p.linkedStarter = true;
    state.profile = p;
  } else {
    if (!p) throw Error("Scegli prima il tuo starter.");
    p.balance = balance;
    if (active && !["move", "abandon"].includes(command.type)) throw Error("Concludi o abbandona la lotta in corso.");
    if (command.type === "start") {
      b = createEncounter(p, command.opponent, rng, { difficulty: command.difficulty, now });
      b.id = crypto.randomUUID();
      state.log = [`Vai, ${b.player.name}! Affronti ${b.enemy.name}.`];
    } else if (command.type === "move") {
      if (!active) throw Error("Nessuna lotta in corso.");
      if (!Number.isInteger(command.slot) || command.slot < -1 || command.slot > 3) throw Error("Mossa non valida.");
      const events = b.play(command.slot);
      state.log.push(...events.map((e) => e.text.replaceAll(" demo", "")));
      if (b.result && !b.settlement) {
        const reward = settleBattle(p, b);
        p.totalXP += reward.xp;
        p.encounters++;
      }
    } else if (command.type === "abandon") {
      if (!active) throw Error("Nessuna lotta in corso.");
      b = null;
      state.log = ["Lotta abbandonata. Il tentativo rimane consumato, nessun premio assegnato."];
    } else if (command.type === "buy") {
      purchaseMove(p, command.move);
    } else if (command.type === "equip") {
      equipMove(p, command.move, command.slot);
    } else if (command.type === "evolve") {
      if (!canEvolve(p)) throw Error("I requisiti di evoluzione non sono ancora raggiunti.");
      p.starter.species = EVOLUTIONS[p.starter.species].next;
    } else if (command.type === "resolve") {
      if (!["keep", "replace"].includes(command.choice)) throw Error("Scelta non valida.");
      resolveFossil(p, command.choice === "replace");
    } else if (command.type === "sell") {
      if (p.pendingFossil) throw Error("Scegli prima il fossile da conservare.");
      const fossil = p.inventory.fossil;
      if (!fossil || command.fossilId !== fossil.id) throw Error("Il fossile non \xE8 pi\xF9 disponibile.");
      const price = FOSSIL_ITEMS[fossil.species].basePrice;
      if (command.price !== price) throw Error("Il prezzo \xE8 cambiato. Ricarica la quotazione.");
      p.balance += price;
      p.inventory.fossil = null;
    } else throw Error("Operazione non disponibile.");
  }
  p.starter.stage = LINES[p.starter.origin].indexOf(p.starter.species);
  const pokemon = starterPokemon(p);
  p.starter.stats = { hp: pokemon.maxHp, ...pokemon.stats };
  state.battle = packBattle(b);
  state.log = state.log.slice(-100);
  const period = rewardStatus(p, now).period;
  p.challenges = Object.fromEntries(Object.entries(p.challenges).filter(([key]) => key === period));
  return { state, delta: p.balance - balance };
}

// supabase/functions/starter-game/index.ts
var cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
var reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
async function handle(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Metodo non consentito" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Accedi al tuo account." }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Sessione scaduta. Accedi di nuovo." }, 401);
    const user = auth.user.id;
    const { data: profile, error: profileError } = await admin.from("profiles").select("balance,is_active").eq("user_id", user).single();
    if (profileError || !profile?.is_active) return reply({ error: "Profilo non attivo." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 4096) return reply({ error: "Richiesta troppo grande" }, 413);
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: "Richiesta troppo grande" }, 413);
    const body = JSON.parse(raw);
    const { data: row, error: readError } = await admin.from("starter_games").select("state,revision").eq("user_id", user).maybeSingle();
    if (readError) return reply({ error: "Il mio Starter \xE8 in attivazione. Riprova pi\xF9 tardi." }, 503);
    const current = { state: row?.state || { profile: null, battle: null, log: [] }, revision: row?.revision || 0, balance: Number(profile.balance) };
    if (body.type === "read") return reply(current);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operationId || "") || !Number.isSafeInteger(body.revision)) return reply({ error: "Richiesta non valida" }, 400);
    const { data: duplicate, error: duplicateError } = await admin.from("starter_operations").select("operation_id").eq("user_id", user).eq("operation_id", body.operationId).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return reply(current);
    if (body.revision !== current.revision) return reply({ error: "Progressi aggiornati da un\u2019altra scheda. Riprova.", ...current }, 409);
    const { state, delta } = applyCommand(current.state, body, { balance: current.balance, now: /* @__PURE__ */ new Date() });
    const { data, error } = await admin.rpc("commit_starter_command", { p_user: user, p_revision: current.revision, p_operation: body.operationId, p_state: state, p_delta: delta });
    if (error) {
      if (error.message.includes("STALE_REVISION")) return reply({ error: "Progressi aggiornati da un\u2019altra scheda. Ricarica e riprova." }, 409);
      if (error.message.includes("INSUFFICIENT_BALANCE")) return reply({ error: "Pok\xE9dollari insufficienti." }, 400);
      throw error;
    }
    return reply(data);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Operazione non riuscita. Riprova." }, 400);
  }
}
Deno.serve(handle);
export {
  handle
};
