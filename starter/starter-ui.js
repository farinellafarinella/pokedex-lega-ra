// Generato da test/starter-integration/build-ui.mjs. Sorgente: features/starter/view.mjs.

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
  const xp = Math.round({ kabuto: 28, omanyte: 34, aerodactyl: 40 }[fossil] * mode.xp);
  return { level, moves: [...ENCOUNTER_SETS[fossil][difficulty]], aiStyle: mode.ai, winCoins: Math.round(encounter.reward * mode.coins), lossCoins: Math.round(50 * mode.coins), winXP: xp, lossXP: Math.max(1, Math.floor(xp * 0.25)) };
}

// supabase/functions/starter-game/core/market.mjs
var FOSSIL_ITEMS = {
  kabuto: { name: "Domofossile", pokemon: "Kabuto", basePrice: 120, holders: 480, sellers: 80, buyers: 70 },
  omanyte: { name: "Fossilhelix", pokemon: "Omanyte", basePrice: 220, holders: 320, sellers: 45, buyers: 60 },
  aerodactyl: { name: "Ambra Antica", pokemon: "Aerodactyl", basePrice: 360, holders: 150, sellers: 25, buyers: 40 }
};

// features/starter/art.mjs
var files = { squirtle: ["squirtle.png", "squirtle-back.png"], kabuto: ["kabuto.png"] };
function artwork(id, back = false) {
  const file = files[id]?.[back ? 1 : 0] || files[id]?.[0];
  return file ? `<img class="pokemon" src="${new URL("./assets/" + file, import.meta.url)}" alt="${id}${back ? " di spalle" : ""}" width="160" height="160">` : '<svg class="pokemon placeholder" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="32"/><path d="M18 50h64"/><circle cx="50" cy="50" r="10"/></svg>';
}

// features/starter/api.mjs
var integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var moveList = (value) => Array.isArray(value) && value.every((id) => typeof id === "string" && Object.hasOwn(MOVES, id));
function validateStarterResponse(data) {
  const invalid = () => {
    throw Error("Risposta di starter-game non valida. Pubblica il contenuto completo di starter-game-edge.ts nella funzione starter-game e riprova.");
  };
  if (!record(data) || !record(data.state) || !integer(data.revision) || !Number.isFinite(data.balance) || data.balance < 0) return invalid();
  const { profile, battle, log } = data.state;
  if (!Array.isArray(log) || !log.every((t) => typeof t === "string")) return invalid();
  if (profile !== null) {
    if (!record(profile) || !record(profile.starter)) return invalid();
    const s = profile.starter;
    if (!Object.hasOwn(LINES, s.origin) || !LINES[s.origin].includes(s.species) || !integer(s.level, 1) || s.level > 50 || !integer(s.xp) || !integer(profile.totalXP) || !integer(profile.encounters) || !record(profile.challenges) || !record(profile.inventory) || !moveList(s.equipped) || s.equipped.length !== 4 || !moveList(s.knownMoves)) return invalid();
    for (const f of [profile.inventory.fossil, profile.pendingFossil]) if (f !== null && (!record(f) || !["kabuto", "omanyte", "aerodactyl"].includes(f.species) || typeof f.id !== "string")) return invalid();
  }
  if (battle !== null) {
    if (!profile || !record(battle) || !integer(battle.turn) || ![null, "win", "loss"].includes(battle.result)) return invalid();
    for (const p of [battle.player, battle.enemy]) if (!record(p) || !Object.hasOwn(SPECIES, p.id) || typeof p.name !== "string" || !integer(p.level, 1) || !integer(p.hp) || !integer(p.maxHp, 1) || !Array.isArray(p.moves) || !p.moves.every((m) => record(m) && Object.hasOwn(MOVES, m.id) && typeof m.name === "string" && integer(m.pp) && integer(m.maxPp))) return invalid();
  }
  return data;
}
var STARTER_FUNCTION = "bright-processor";
function createStarterAPI(client) {
  async function request(body) {
    const { data, error } = await client.functions.invoke(STARTER_FUNCTION, { body });
    if (error) {
      let payload;
      try {
        payload = await error.context?.json();
      } catch {
      }
      throw Error(payload?.error || "Il mio Starter non \xE8 raggiungibile. Riprova tra poco.");
    }
    if (data?.error) throw Error(data.error);
    return validateStarterResponse(data);
  }
  return { read: () => request({ type: "read" }), command: (body, revision, operationId) => request({ ...body, revision, operationId }) };
}
async function getTrainerCompanion(client) {
  const result = await createStarterAPI(client).read();
  return result.state.profile?.starter || null;
}

// features/starter/view.mjs
var escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var typeLabel = (id) => SPECIES[id].types.map((t) => types[t]).join(" / ");
var button = (action, label, disabled = false, extra = "") => `<button data-action="${action}" ${disabled ? "disabled" : ""} ${extra}>${label}</button>`;
async function mountStarter(host, { client, section = "starter", onBalance = () => {
}, isCurrent = () => true }) {
  const root = host.attachShadow({ mode: "open" }), api = createStarterAPI(client);
  root.innerHTML = `<link rel="stylesheet" href="${new URL("./style.css", import.meta.url)}"><div id="view">Caricamento del tuo starter\u2026</div>`;
  const view = root.querySelector("#view");
  let result = null, page = section, busy = false, message = "", selectedMove = null, difficulty = "balanced", confirmSale = false, pending = null;
  const active = () => result?.state.battle && !result.state.battle.result;
  function render() {
    if (!isCurrent() || !host.isConnected) return;
    const p = result?.state.profile;
    view.innerHTML = `<div class="eyebrow">IL TUO COMPAGNO DI AVVENTURE</div><h1>${page === "starter" ? "Il mio Starter" : page === "arena" ? "Arena Fossili" : page === "shop" ? "Scuola mosse" : "Fossili e vendita"}</h1><p id="status" role="status">${escape(message)}</p>${result ? `<p class="balance">Saldo: <strong>${result.balance} \u20BD</strong></p>` : ""}${p ? `<nav>${["starter", "arena", "shop", "inventory"].map((id, i) => button("page", ["Il mio Starter", "Arena Fossili", "Mosse", "Fossili"][i], busy, `data-page="${id}" aria-pressed="${page === id}"`)).join("")}</nav>` : ""}<div id="body"></div><p class="back"><a href="#fossil-hunt">Caccia ai Fossili classica \u2192</a></p>`;
    const body = view.querySelector("#body");
    if (!result) {
      body.innerHTML = button("reload", "Riprova", busy);
      return;
    }
    if (!p) {
      body.innerHTML = `<p>Scegli il compagno che ti accompagner\xE0 nei minigiochi. La scelta \xE8 legata al tuo account.</p><div class="choices">${Object.keys(LINES).map((id) => `<article>${artwork(id)}<h2>${SPECIES[id].name}</h2><small>${typeLabel(id)}</small><p>${DESCRIPTION[id]}</p>${button("choose", "Scegli questo Pok\xE9mon", busy, `data-starter="${id}" aria-label="Scegli ${SPECIES[id].name}"`)}</article>`).join("")}</div>`;
      return;
    }
    if (page === "starter") body.innerHTML = starter(p);
    if (page === "arena") body.innerHTML = arena(p);
    if (page === "shop") body.innerHTML = shop(p);
    if (page === "inventory") body.innerHTML = inventory(p);
    if (busy) body.querySelectorAll("button").forEach((b) => b.disabled = true);
  }
  function starter(p) {
    const s = p.starter, creature = starterPokemon(p), rule = EVOLUTIONS[s.species], line = LINES[s.origin], stage = line.indexOf(s.species), next = xpRequired(s.level);
    return `<article class="hero">${artwork(s.species)}<h2>${SPECIES[s.species].name} <small>Lv. ${s.level}</small></h2><p>${typeLabel(s.species)}</p><label for="xp">Esperienza: ${s.xp} / ${next || "MAX"} XP \xB7 ${p.totalXP} XP totali</label><progress id="xp" max="${next || 1}" value="${next ? s.xp : 1}"></progress><div class="stats">${Object.entries({ PS: creature.maxHp, Attacco: creature.stats.atk, Difesa: creature.stats.def, "Att. speciale": creature.stats.spa, "Dif. speciale": creature.stats.spd, Velocit\u00E0: creature.stats.spe }).map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join("")}</div></article><article><h2>Mosse disponibili</h2>${s.equipped.map((id) => `<p><strong>${MOVES[id].name}</strong><br><small>${types[MOVES[id].type]} \xB7 Potenza ${MOVES[id].power || "\u2014"} \xB7 PP ${MOVES[id].pp}</small></p>`).join("")}</article><article><h2>Linea evolutiva</h2><ol class="line">${line.map((id, i) => `<li class="${i > stage ? "locked" : ""}" ${i === stage ? 'aria-current="step"' : ""}>${artwork(id)}<b>${SPECIES[id].name}</b><small>${i === stage ? "Attuale" : i > stage ? "Da sbloccare" : "Sbloccato"}</small></li>`).join("")}</ol>${rule ? `<h3>Prossima evoluzione: ${SPECIES[rule.next].name}</h3><p>Livello ${s.level} / ${rule.level}<br>XP totali ${p.totalXP} / ${rule.experience}<br>Incontri completati ${p.encounters} / ${rule.encounters}</p>${button("evolve", "Evolvi", !canEvolve(p) || !!active())}` : "<p>Linea evolutiva completata!</p>"}</article><article><h2>Insieme nei minigiochi</h2><p>Il tuo starter ti accompagna nella Caccia ai Fossili, nella Pesca e negli altri incontri. Le lotte 1 contro 1 saranno disponibili in futuro.</p>${button("page", "Entra nell\u2019Arena Fossili", false, 'data-page="arena"')}<p><a href="#fishing">Gara di Pesca \u2192</a></p></article>`;
  }
  function arena(p) {
    const b = result.state.battle;
    if (b) return battle(b);
    const quota = rewardStatus(p);
    return `<article><h2>Scegli la tua sfida</h2><p>${SPECIES[p.starter.species].name} \xB7 Livello ${p.starter.level}</p><p>${quota.remaining} / 3 sfide premio rimaste oggi. Dalla quarta ottieni solo XP. Anche gli abbandoni consumano un tentativo.</p><div class="difficulty">${Object.entries(DIFFICULTIES).map(([id, d]) => button("difficulty", d.name, false, `data-difficulty="${id}" aria-pressed="${id === difficulty}"`)).join("")}</div></article>${Object.keys(FOSSIL_ITEMS).map((id) => {
      const preview = encounterPreview(p, id, difficulty);
      return `<article>${artwork(id)}<h2>${SPECIES[id].name} \xB7 Lv. ${preview.level}</h2><p>${typeLabel(id)}</p><p>Vittoria: ${quota.eligible ? preview.winCoins : 0} \u20BD \xB7 ${p.starter.level >= CONFIG.maxLevel ? 0 : preview.winXP} XP${quota.eligible ? " \xB7 " + FOSSIL_ITEMS[id].name : ""}</p>${button("start", "Affronta " + SPECIES[id].name, !!p.pendingFossil, `data-opponent="${id}"`)}</article>`;
    }).join("")}${p.pendingFossil ? "<p>Vai in Fossili e scegli quale conservare prima della prossima sfida.</p>" : ""}`;
  }
  function battle(b) {
    const fighter = (c, back) => `<div class="fighter ${back ? "player" : "enemy"}">${artwork(c.id, back)}<div><strong>${c.name}</strong> \xB7 Lv. ${c.level}<p>PS ${c.hp} / ${c.maxHp}${c.status ? " \xB7 " + escape(c.status) : ""}</p><progress max="${c.maxHp}" value="${c.hp}" aria-label="PS di ${c.name}"></progress></div></div>`;
    return `<article class="battle">${fighter(b.enemy, false)}${fighter(b.player, true)}<p>Turno ${b.turn}</p>${b.result ? `<h2>${b.result === "win" ? "Vittoria!" : "Sconfitta"}</h2><p>+${b.settlement?.coins || 0} \u20BD \xB7 +${b.settlement?.xp || 0} XP</p>${button("close", "Scegli un altro avversario")}` : `<div class="moves">${b.player.moves.map((m, i) => button("move", `${m.name}<small>PP ${m.pp}/${m.maxPp} \xB7 ${types[m.type]}</small>`, m.pp === 0, `data-slot="${i}"`)).join("")}${b.player.moves.every((m) => m.pp === 0) ? button("move", "Scontro", false, 'data-slot="-1"') : ""}</div>${button("abandon", "Abbandona la lotta")}</article>`}${b.result ? "</article>" : ""}<details open><summary>Registro della lotta</summary><ul>${result.state.log.slice(-12).map((t) => `<li>${escape(t)}</li>`).join("")}</ul></details>`;
  }
  function shop(p) {
    const s = p.starter;
    return `<p>Acquista una mossa e scegli uno dei quattro slot. Le mosse apprese restano disponibili.</p>${active() ? "<p>Concludi la lotta prima di modificare le mosse.</p>" : ""}<article><h2>Mosse apprese</h2>${s.knownMoves.map((id) => button("selectMove", MOVES[id].name, s.equipped.includes(id) || !!active(), `data-move="${id}"`)).join("")}${selectedMove ? `<h3>Equipaggia ${MOVES[selectedMove].name}</h3>${s.equipped.map((id, i) => button("equip", `Slot ${i + 1}: ${MOVES[id].name}`, !!active(), `data-slot="${i}"`)).join("")}` : ""}</article>${MOVE_SHOP.filter((o) => o.starters.includes(s.origin)).map((o) => `<article><h3>${MOVES[o.id].name}</h3><p>${o.description}</p><p>Livello ${o.level} \xB7 ${o.price} \u20BD</p>${button("buy", s.knownMoves.includes(o.id) ? "Appresa" : "Acquista", s.knownMoves.includes(o.id) || s.level < o.level || result.balance < o.price || !!active(), `data-move="${o.id}"`)}</article>`).join("")}`;
  }
  function inventory(p) {
    const f = p.inventory.fossil, pendingFossil = p.pendingFossil;
    return `<article><h2>Il tuo fossile</h2>${f ? `<p>${FOSSIL_ITEMS[f.species].name}</p><p>Il mercante lo acquista per ${FOSSIL_ITEMS[f.species].basePrice} \u20BD.</p>${button("quote", "Vendi al mercante", !!pendingFossil || !!active())}${confirmSale ? `<p>Confermi la vendita per ${FOSSIL_ITEMS[f.species].basePrice} \u20BD? Il fossile sar\xE0 rimosso.</p>${button("sell", "Conferma vendita")}${button("cancelSale", "Conserva")}` : ""}` : "<p>Vinci una sfida premio per ottenere un fossile.</p>"}${pendingFossil ? `<p>Hai trovato ${FOSSIL_ITEMS[pendingFossil.species].name}. Puoi conservare un solo fossile.</p>${button("resolve", "Tieni il precedente", !!active(), 'data-choice="keep"')}${button("resolve", "Sostituisci", !!active(), 'data-choice="replace"')}` : ""}</article><p>Prezzi del mercante fissi. Il mercato tra giocatori non \xE8 ancora disponibile.</p>`;
  }
  async function load() {
    busy = true;
    try {
      const data = await api.read();
      if (!isCurrent()) return;
      result = data;
      onBalance(data.balance);
    } catch (error) {
      message = error.message;
    } finally {
      busy = false;
      render();
    }
  }
  async function send(command) {
    if (busy || !result) return;
    busy = true;
    message = "Salvataggio in corso\u2026";
    render();
    const key = JSON.stringify(command);
    if (!pending || pending.key !== key) pending = { key, id: crypto.randomUUID(), revision: result.revision };
    try {
      const data = await api.command(command, pending.revision, pending.id);
      if (!isCurrent()) return;
      result = data;
      pending = null;
      message = "Progressi salvati.";
      onBalance(data.balance);
    } catch (error) {
      message = error.message;
      try {
        const data = await api.read();
        if (isCurrent()) {
          result = data;
          onBalance(data.balance);
          if (pending && data.revision !== pending.revision) pending = null;
        }
      } catch {
      }
    } finally {
      busy = false;
      render();
    }
  }
  root.addEventListener("click", async (event) => {
    const b = event.target.closest("button");
    if (!b || b.disabled || busy) return;
    const a = b.dataset.action;
    if (a === "reload") {
      await load();
      return;
    }
    if (a === "page") {
      page = b.dataset.page;
      confirmSale = false;
      render();
      return;
    }
    if (a === "difficulty") {
      difficulty = b.dataset.difficulty;
      render();
      return;
    }
    if (a === "selectMove") {
      selectedMove = b.dataset.move;
      render();
      return;
    }
    if (a === "quote" || a === "cancelSale") {
      confirmSale = a === "quote";
      render();
      return;
    }
    if (a === "close") {
      result.state.battle = null;
      render();
      return;
    }
    if (a === "choose") await send({ type: a, starter: b.dataset.starter });
    if (a === "start") await send({ type: a, opponent: b.dataset.opponent, difficulty });
    if (a === "move") await send({ type: a, slot: Number(b.dataset.slot) });
    if (a === "evolve" || a === "abandon") await send({ type: a });
    if (a === "buy") {
      selectedMove = b.dataset.move;
      await send({ type: a, move: b.dataset.move });
    }
    if (a === "equip") {
      await send({ type: a, move: selectedMove, slot: Number(b.dataset.slot) });
      selectedMove = null;
      render();
    }
    if (a === "resolve") await send({ type: a, choice: b.dataset.choice });
    if (a === "sell") {
      const f = result.state.profile.inventory.fossil;
      confirmSale = false;
      await send({ type: a, fossilId: f.id, price: FOSSIL_ITEMS[f.species].basePrice });
    }
  });
  await load();
}
async function mountCompanion(host, { client, isCurrent = () => true }) {
  try {
    const starter = await getTrainerCompanion(client);
    if (!host.isConnected || !isCurrent()) return;
    host.innerHTML = starter ? `<div style="display:flex;align-items:center;gap:12px"><span style="width:58px;flex-shrink:0">${artwork(starter.species)}</span><span>Il tuo compagno: <b>${SPECIES[starter.species].name}</b> \xB7 Lv. ${starter.level}<br><a href="#my-starter">Il mio Starter \u2192</a></span></div>` : '<a href="#my-starter">Scegli il tuo starter \u2192</a>';
    host.querySelectorAll("img,svg").forEach((el) => {
      el.style.width = "58px";
      el.style.height = "58px";
    });
  } catch {
    if (host.isConnected) host.innerHTML = '<a href="#my-starter">Il mio Starter \u2192</a>';
  }
}
export {
  mountCompanion,
  mountStarter
};
