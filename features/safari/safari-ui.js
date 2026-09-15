// supabase/functions/safari-game/core/config.mjs
var RULES = { balls: 5, steps: 10, bait: 3, help: 1, topCaptures: 3, coinsPerPoint: 1.25, openWeekday: 5, timeZone: "Europe/Rome", maxApproaches: 2, baitBonus: 0.12, approachBonus: 0.15, riskIncrease: 0.1, helpBonus: 0.2, maxCatch: 0.95, maxFlee: 0.8 };
var RARITIES = { common: { label: "Comune", points: 10 }, uncommon: { label: "Non comune", points: 25 }, rare: { label: "Raro", points: 50 }, veryRare: { label: "Molto raro", points: 100 } };
var SPECIES = {
  "nidoran-f": {
    "name": "Nidoran\u2640",
    "rarity": "common",
    "catch": 0.72,
    "flee": 0.15
  },
  "nidoran-m": {
    "name": "Nidoran\u2642",
    "rarity": "common",
    "catch": 0.72,
    "flee": 0.15
  },
  "nidorina": {
    "name": "Nidorina",
    "rarity": "uncommon",
    "catch": 0.56,
    "flee": 0.22
  },
  "nidorino": {
    "name": "Nidorino",
    "rarity": "uncommon",
    "catch": 0.56,
    "flee": 0.22
  },
  "paras": {
    "name": "Paras",
    "rarity": "common",
    "catch": 0.7,
    "flee": 0.15
  },
  "parasect": {
    "name": "Parasect",
    "rarity": "uncommon",
    "catch": 0.55,
    "flee": 0.22
  },
  "venonat": {
    "name": "Venonat",
    "rarity": "uncommon",
    "catch": 0.55,
    "flee": 0.2
  },
  "exeggcute": {
    "name": "Exeggcute",
    "rarity": "uncommon",
    "catch": 0.58,
    "flee": 0.2
  },
  "rhyhorn": {
    "name": "Rhyhorn",
    "rarity": "rare",
    "catch": 0.4,
    "flee": 0.28
  },
  "chansey": {
    "name": "Chansey",
    "rarity": "veryRare",
    "catch": 0.22,
    "flee": 0.38
  },
  "tangela": {
    "name": "Tangela",
    "rarity": "uncommon",
    "catch": 0.55,
    "flee": 0.23
  },
  "scyther": {
    "name": "Scyther",
    "rarity": "rare",
    "catch": 0.38,
    "flee": 0.3
  },
  "pinsir": {
    "name": "Pinsir",
    "rarity": "rare",
    "catch": 0.38,
    "flee": 0.28
  },
  "tauros": {
    "name": "Tauros",
    "rarity": "rare",
    "catch": 0.35,
    "flee": 0.32
  },
  "kangaskhan": {
    "name": "Kangaskhan",
    "rarity": "veryRare",
    "catch": 0.25,
    "flee": 0.35
  },
  "psyduck": {
    "name": "Psyduck",
    "rarity": "uncommon",
    "catch": 0.6,
    "flee": 0.2
  },
  "slowpoke": {
    "name": "Slowpoke",
    "rarity": "uncommon",
    "catch": 0.62,
    "flee": 0.15
  },
  "krabby": {
    "name": "Krabby",
    "rarity": "common",
    "catch": 0.72,
    "flee": 0.15
  },
  "magikarp": {
    "name": "Magikarp",
    "rarity": "common",
    "catch": 0.8,
    "flee": 0.1
  },
  "dratini": {
    "name": "Dratini",
    "rarity": "veryRare",
    "catch": 0.25,
    "flee": 0.32
  }
};
var ARCHIVED_SPECIES = {
  raticate: { name: "Raticate", rarity: "common", catch: 0.7, flee: 0.18 },
  paras: { name: "Paras", rarity: "common", catch: 0.7, flee: 0.15 },
  butterfree: { name: "Butterfree", rarity: "uncommon", catch: 0.58, flee: 0.2 },
  venonat: { name: "Venonat", rarity: "uncommon", catch: 0.55, flee: 0.2 },
  pinsir: { name: "Pinsir", rarity: "rare", catch: 0.38, flee: 0.28 },
  heracross: { name: "Heracross", rarity: "veryRare", catch: 0.25, flee: 0.35 },
  tauros: { name: "Tauros", rarity: "rare", catch: 0.35, flee: 0.32 },
  arcanine: { name: "Arcanine", rarity: "veryRare", catch: 0.22, flee: 0.38 },
  dodrio: { name: "Dodrio", rarity: "uncommon", catch: 0.55, flee: 0.24 },
  scyther: { name: "Scyther", rarity: "rare", catch: 0.38, flee: 0.3 },
  rapidash: { name: "Rapidash", rarity: "rare", catch: 0.33, flee: 0.3 },
  beedrill: { name: "Beedrill", rarity: "uncommon", catch: 0.55, flee: 0.22 }
};
var POKEMON = { ...ARCHIVED_SPECIES, ...SPECIES };
var AREAS = {
  meadow: { name: "Prateria", symbol: "\u273F", description: "Erba aperta e incontri frequenti. Il posto ideale per le prime catture.", events: { pokemon: 70, item: 10, empty: 10, fork: 10 }, pokemon: { "nidoran-f": 25, "nidoran-m": 25, nidorina: 15, nidorino: 15, paras: 15, chansey: 5 } },
  forest: { name: "Bosco", symbol: "\u2667", description: "Sentieri ombrosi, pi\xF9 bivi e Pok\xE9mon meno comuni.", events: { pokemon: 55, item: 15, empty: 10, fork: 20 }, pokemon: { paras: 20, parasect: 15, venonat: 20, exeggcute: 15, tangela: 15, scyther: 8, pinsir: 7 } },
  rocks: { name: "Zona rocciosa", symbol: "\u25C7", description: "Incontri pi\xF9 difficili, ma catture di grande valore.", events: { pokemon: 50, item: 10, empty: 20, fork: 20 }, pokemon: { rhyhorn: 40, tauros: 30, kangaskhan: 15, nidorina: 7, nidorino: 8 } },
  lake: { name: "Laghetto", symbol: "\u2248", description: "Cerca i Pok\xE9mon pescabili del Safari: Psyduck, Slowpoke, Krabby, Magikarp e il rarissimo Dratini.", events: { pokemon: 65, item: 10, empty: 10, fork: 15 }, pokemon: { psyduck: 20, slowpoke: 20, krabby: 25, magikarp: 30, dratini: 5 } }
};
var COMPANIONS = {
  bulbasaur: { name: "Bulbasaur", family: "vines", description: "Le liane chiudono il percorso: il Pok\xE9mon resta qui per il prossimo lancio." },
  charmander: { name: "Charmander", family: "light", description: "Una luce calda distrae il Pok\xE9mon: resta qui per il prossimo lancio." },
  squirtle: { name: "Squirtle", family: "water", description: "Una barriera d\u2019acqua ferma il Pok\xE9mon: resta qui per il prossimo lancio." }
};

// supabase/functions/safari-game/core/model.mjs
function chances(encounter) {
  const p = POKEMON[encounter.species];
  return { catch: Math.min(RULES.maxCatch, p.catch + (encounter.baitUsed ? RULES.baitBonus : 0) + encounter.approaches * RULES.approachBonus + (encounter.helpActive ? RULES.helpBonus : 0)), flee: encounter.helpActive ? 0 : Math.min(RULES.maxFlee, p.flee + (encounter.baitUsed ? RULES.riskIncrease : 0) + encounter.approaches * RULES.riskIncrease) };
}
function bestCaptures(captures) {
  return [...captures].sort((a, b) => b.points - a.points).slice(0, RULES.topCaptures);
}

// features/safari/api.mjs
var SAFARI_FUNCTION = "safari-game";
function validateResponse(data) {
  if (!data || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Number.isFinite(data.balance) || data.balance < 0 || !data.state || !Array.isArray(data.state.playedDates) || !data.state.collection || !Array.isArray(data.ranking) || typeof data.access?.allowed !== "boolean" || typeof data.testMode !== "boolean") throw Error("Risposta Safari non valida. Riprova pi\xF9 tardi.");
  return data;
}
function createSafariAPI(client) {
  async function request(body) {
    const { data, error } = await client.functions.invoke(SAFARI_FUNCTION, { body });
    if (error) {
      let payload;
      try {
        payload = await error.context?.json();
      } catch {
      }
      const e = Error(payload?.error || "Zona Safari non raggiungibile. Controlla la connessione e riprova.");
      e.status = error.context?.status || 0;
      throw e;
    }
    if (data?.error) throw Error(data.error);
    return validateResponse(data);
  }
  return { read: (mode = "live") => request({ type: "read", mode }), command: (body, revision, operationId, mode = "live") => request({ ...body, revision, operationId, mode }) };
}

// features/starter/art.mjs
var files = { bulbasaur: ["bulbasaur.png"], ivysaur: ["ivysaur.png"], venusaur: ["venusaur.png"], charmander: ["charmander.png"], charmeleon: ["charmeleon.png"], charizard: ["charizard.png"], squirtle: ["squirtle.png", "squirtle-back.png"], wartortle: ["wartortle.png"], blastoise: ["blastoise.png"], kabuto: ["kabuto.png"] };
function artwork(id, back = false, assetBase = new URL("./assets/", import.meta.url)) {
  const backFile = back && files[id]?.[1], file = backFile || files[id]?.[0];
  return file ? `<img class="pokemon" src="${new URL(file, assetBase)}" alt="${id}${backFile ? " di spalle" : ""}" width="160" height="160">` : '<svg class="pokemon placeholder" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="32"/><path d="M18 50h64"/><circle cx="50" cy="50" r="10"/></svg>';
}

// features/safari/view.mjs
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var pokemon = (id) => `<img class="pokemon" src="${new URL("./assets/" + id + ".png", import.meta.url)}" alt="${esc(POKEMON[id]?.name || id)}" width="220" height="220">`;
var starterName = (s) => s ? s.species[0].toUpperCase() + s.species.slice(1) + " \xB7 Lv. " + s.level : "Starter non scelto";
var companion = (s) => s ? artwork(s.species, false, new URL("../starter/assets/", import.meta.url)) : "";
var btn = (action, label, disabled = false, extra = "") => `<button type="button" data-action="${action}" ${disabled ? "disabled" : ""} ${extra}>${label}</button>`;
async function mountSafari(host, { client, isCurrent = () => true, onBalance = () => {
} }) {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  root.innerHTML = `<link rel="stylesheet" href="${new URL("./style.css", import.meta.url)}"><main><div class="eyebrow">ESPLORA \xB7 SCEGLI \xB7 CATTURA</div><h1>Zona Safari</h1><p>Una spedizione ogni venerd\xEC. Le tue tre catture migliori diventano Pok\xE9dollari.</p><div id="controls"></div><p id="mode-notice" role="status"></p><p id="notice" role="status" aria-live="polite">Caricamento della spedizione\u2026</p><div id="app"></div></main>`;
  const app = root.querySelector("#app"), notice = root.querySelector("#notice"), controls = root.querySelector("#controls"), modeNotice = root.querySelector("#mode-notice");
  const api = createSafariAPI(client), active = () => host.isConnected && isCurrent();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state = null, snapshot = null, busy = false, view = "session", mode = "live", selecting = false, pending = null;
  function accept(data) {
    snapshot = data;
    state = data.state;
    onBalance(data.balance);
  }
  function render() {
    if (!state) return;
    const s = state.session;
    controls.innerHTML = snapshot.isAdmin ? btn("mode", mode === "test" ? "Torna alla Safari del venerd\xEC" : "Prova libera amministratore") : "";
    modeNotice.textContent = mode === "test" ? "Prova libera amministratore \xB7 Catture e premi separati dall\u2019account." : "";
    app.innerHTML = `<nav>${btn("tab", "Esplorazione", false, 'data-tab="session" aria-pressed="' + (view === "session") + '"')}${btn("tab", "Le mie catture", false, 'data-tab="collection" aria-pressed="' + (view === "collection") + '"')}${btn("tab", "Classifica", false, 'data-tab="ranking" aria-pressed="' + (view === "ranking") + '"')}</nav><div id="content"></div>`;
    const content = app.querySelector("#content");
    if (view === "collection") {
      content.innerHTML = collection();
      return;
    }
    if (view === "ranking") {
      content.innerHTML = ranking();
      return;
    }
    if (selecting || !s) {
      content.innerHTML = selection();
      return;
    }
    if (s.phase === "done") {
      content.innerHTML = summary(s);
      return;
    }
    content.innerHTML = `<div class="resources"><div><strong>${s.balls}</strong><span>Safari Ball</span></div><div><strong>${s.steps}</strong><span>Passi</span></div><div><strong>${s.bait}</strong><span>Esche</span></div><div><strong>${s.help}</strong><span>Aiuto starter</span></div></div><div class="session-grid"><section><article class="landscape ${s.area}"><div class="eyebrow">${AREAS[s.area].name.toUpperCase()}</div><p class="event-message" role="status">${esc(s.message)}</p>${s.phase === "encounter" ? encounter(s) : s.phase === "fork" ? fork(s) : explore(s)}<div id="animation" aria-live="polite"></div></article><div class="end-session">${btn("end", "Concludi esplorazione")}<span>Conservi le catture e i premi ottenuti finora.</span></div></section><aside><article class="helper ${COMPANIONS[s.companion].family}">${companion(s.starter)}<div><small>IL TUO STARTER</small><h2>${esc(starterName(s.starter))}</h2><p>${s.help ? "Un aiuto per sessione: +" + Math.round(RULES.helpBonus * 100) + " punti percentuali alla cattura e protezione dalla fuga fino al prossimo lancio." : "Aiuto utilizzato. Il tuo compagno continua ad accompagnarti."}</p></div></article><article><h2>Le tue catture <span class="count">${s.captures.length}</span></h2>${captures(s.captures)}<p class="score">Migliori ${RULES.topCaptures}: <strong>${bestCaptures(s.captures).reduce((n, c) => n + c.points, 0)} punti</strong></p></article><article><h3>Oggetti trovati</h3><p>${s.items.length ? s.items.map(esc).join(" \xB7 ") : "La sacca dei ritrovamenti \xE8 ancora vuota."}</p></article></aside></div>`;
  }
  function accessNotice() {
    const a = snapshot.access;
    return '<p class="isolation">' + (mode === "test" ? "Prova libera: nessun limite di calendario e nessun premio reale." : a.allowed ? "Safari aperta \xB7 Una sola partenza. Il tentativo si consuma anche se concludi prima." : esc(a.message) + " Prossima apertura: " + (/* @__PURE__ */ new Date(a.nextDate + "T12:00:00Z")).toLocaleDateString("it-IT", { timeZone: RULES.timeZone }) + ".") + "</p>";
  }
  function selection() {
    return `<article class="welcome"><h2>Scegli dove comincia il viaggio</h2>${accessNotice()}<p>5 Safari Ball \xB7 10 passi \xB7 3 esche \xB7 1 aiuto starter</p>${snapshot.starter ? "<h3>" + esc(starterName(snapshot.starter)) + "</h3><p>Il tuo starter ti aiuta una volta durante la spedizione.</p>" : '<p>Scegli il tuo compagno per partire.</p><a href="#my-starter">Scegli il mio Starter</a>'}${snapshot.legacyPending ? "<p>Hai una spedizione della Safari precedente da concludere.</p>" + btn("legacy", "Incassa il vecchio bottino: " + snapshot.legacyPending.bounty + " \u20BD") : ""}</article><div class="areas">${Object.entries(AREAS).map(([id, a]) => `<article class="area ${id}"><span class="area-symbol" aria-hidden="true">${a.symbol}</span><h2>${a.name}</h2><p>${a.description}</p><div class="area-pokemon">${Object.entries(a.pokemon).map(([species, weight]) => `<span>${SPECIES[species].name} <small>${weight}%</small></span>`).join("")}</div><p class="chance">Incontro a ogni passo: ${a.events.pokemon}%</p>${btn("start", "Esplora " + a.name, !snapshot.access.allowed || !snapshot.starter || !!snapshot.legacyPending, `data-area="${id}"`)}</article>`).join("")}</div><article><h2>Le regole del Safari</h2><p>Nessuna lotta: scegli se lanciare una Ball, usare un\u2019esca, avvicinarti, chiedere aiuto o fuggire. La spedizione finisce a Ball o passi esauriti; puoi risolvere l\u2019incontro dell\u2019ultimo passo.</p><p>Comune: 10 punti \xB7 Non comune: 25 \xB7 Raro: 50 \xB7 Molto raro: 100. Sommiamo le tre catture migliori e moltiplichiamo per 1,25, arrotondando il totale.</p><p>Tutte le catture restano nel tuo Pok\xE9dex. Puoi riprendere la spedizione anche su un altro dispositivo.</p></article>`;
  }
  function ranking() {
    return `<article><h2>Classifica Safari</h2><p>Le migliori 100 spedizioni personali. Per ogni allenatore conta il suo miglior punteggio.</p><p>Il tuo record${mode === "test" ? " di prova" : ""}: <b>${state.bestScore} punti</b></p>${snapshot.ranking.length ? '<ol class="ranking">' + snapshot.ranking.map((row) => "<li><span>" + esc(row.trainer_name) + "</span><b>" + row.score + " punti</b></li>").join("") + "</ol>" : "<p>Nessuna spedizione a premio conclusa: la classifica aspetta le prime catture.</p>"}</article>`;
  }
  function explore(s) {
    return `<div class="trail-art" aria-hidden="true"><span>${AREAS[s.area].symbol}</span><i></i><i></i><i></i></div><h2>Il sentiero ti aspetta</h2><p>Resta in quest\u2019area oppure segui un nuovo percorso quando incontri un bivio.</p>${btn("step", "Esplora \xB7 1 passo", false, 'class="primary"')}`;
  }
  function fork(s) {
    return `<div class="fork-icon" aria-hidden="true">\u2442</div><h2>Quale sentiero scegli?</h2><div class="paths">${s.paths.map((id) => `<button data-action="route" data-area="${id}"><strong>${AREAS[id].symbol} ${AREAS[id].name}</strong><span>${AREAS[id].description}</span></button>`).join("")}</div>`;
  }
  function encounter(s) {
    const e = s.encounter, p = POKEMON[e.species], chance = chances(e);
    return `<div class="wild">${pokemon(e.species)}</div><div class="encounter-name"><h2>${p.name}</h2><span class="rarity ${p.rarity}">${RARITIES[p.rarity].label} \xB7 ${RARITIES[p.rarity].points} punti</span></div><div class="odds"><span>Cattura <b>${Math.round(chance.catch * 100)}%</b></span><span>Fuga <b>${Math.round(chance.flee * 100)}%</b></span></div><p class="risk">La fuga pu\xF2 avvenire dopo esca, avvicinamento o un lancio fallito.${e.helpActive ? " Protezione starter attiva fino al prossimo lancio." : ""}</p><div class="encounter-actions">${btn("throw", "\u25D3 Lancia Safari Ball", !s.balls, 'class="primary"')}${btn("bait", e.baitUsed ? "Esca gi\xE0 usata" : "Usa un\u2019esca", !s.bait || e.baitUsed)}${btn("approach", `Avvicinati (${e.approaches}/${RULES.maxApproaches})`, e.approaches >= RULES.maxApproaches)}${btn("help", "Chiedi aiuto allo starter", !s.help)}${btn("run", "Scappa", false, 'class="quiet"')}</div>`;
  }
  function captures(list, best = []) {
    return list.length ? `<ul class="captures">${list.map((c) => `<li>${pokemon(c.species)}<span><strong>${POKEMON[c.species].name}</strong><small>${RARITIES[POKEMON[c.species].rarity].label}${best.includes(c.id) ? " \xB7 Tra le migliori 3" : ""}</small></span><b>${c.points}</b></li>`).join("")}</ul>` : "<p>Ancora nessuna cattura. Ogni incontro \xE8 una nuova occasione.</p>";
  }
  function summary(s) {
    return `<article class="result"><div class="eyebrow">ESPLORAZIONE CONCLUSA</div><h2>${esc(s.result.reason)}</h2><p>${s.captures.length} catture \xB7 ${RULES.steps - s.steps} passi percorsi</p><div class="totals"><div><strong>${s.result.score}</strong><span>Punti delle migliori ${RULES.topCaptures}</span></div><div><strong>+${s.result.coins} \u20BD</strong><span>${mode === "test" ? "Premio simulato" : "Accreditati nel saldo"}</span></div></div><p>Saldo: <b>${snapshot.balance} \u20BD</b></p><p>${mode === "test" ? "Prova conclusa: nessun accredito reale." : "Premio salvato sul tuo account."}</p>${accessNotice()}${btn("new", "Nuova esplorazione", !snapshot.access.allowed, 'class="primary"')}</article><article><h2>Il diario delle catture</h2>${captures(s.captures, s.result.best.map((c) => c.id))}<p>Tutte le catture sono nel tuo Pok\xE9dex, anche quelle escluse dal punteggio. Lo starter resta il tuo compagno principale.</p></article>`;
  }
  function collection() {
    const ids = Object.keys(SPECIES), owned = ids.filter((id) => state.collection[id]);
    return `<article><h2>Le mie catture Safari</h2><p>${owned.length} / ${ids.length} specie registrate. Le catture non sostituiscono lo starter e non diventano aiutanti nei minigiochi.</p></article><div class="collection">${ids.map((id) => `<article class="${state.collection[id] ? "owned" : "unseen"}">${pokemon(id)}<h3>${SPECIES[id].name}</h3><small>${state.collection[id] ? `Registrato \xB7 ${state.collection[id]} catture` : "Da scoprire"}</small></article>`).join("")}</div>`;
  }
  function lock() {
    root.querySelectorAll("button").forEach((b) => b.disabled = true);
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    lock();
    try {
      const data = await api.read(mode);
      if (!active()) return;
      accept(data);
      notice.textContent = "";
      render();
    } catch (error) {
      if (active()) {
        notice.textContent = error.message;
        app.innerHTML = btn("refresh", "Riprova");
      }
    } finally {
      busy = false;
    }
  }
  async function send() {
    busy = true;
    lock();
    const request = pending;
    try {
      const previous = state.session;
      const data = await api.command(request.body, request.revision, request.id, mode);
      pending = null;
      if (!active()) return;
      accept(data);
      selecting = false;
      notice.textContent = "Progressi salvati.";
      if (["throw", "help"].includes(request.body.type)) {
        const animation = app.querySelector("#animation");
        if (animation) {
          animation.innerHTML = request.body.type === "throw" ? '<div class="throw-animation"><div class="safari-ball"><i></i><b></b></div><span>Tentativo di cattura\u2026</span></div>' : `<div class="help-animation ${COMPANIONS[previous.companion].family}"><i></i><i></i><i></i><strong>${esc(starterName(previous.starter))} ti aiuta!</strong></div>`;
          await new Promise((resolve) => setTimeout(resolve, reduced ? 20 : 1e3));
        }
      }
      if (active()) render();
    } catch (error) {
      if (!active()) return;
      if (error.status && error.status < 500) {
        pending = null;
        try {
          accept(await api.read(mode));
        } catch {
        }
        if (!active()) return;
        render();
      } else {
        app.innerHTML = "<article><p>Verifica la connessione e riprova la stessa azione.</p>" + btn("retry", "Riprova azione") + "</article>";
      }
      notice.textContent = error.message;
    } finally {
      busy = false;
    }
  }
  async function action(button) {
    if (busy || !active()) return;
    const type = button.dataset.action;
    if (type === "refresh") return refresh();
    if (type === "retry") return pending && send();
    if (type === "tab") {
      view = button.dataset.tab;
      render();
      return;
    }
    if (type === "new") {
      selecting = true;
      view = "session";
      render();
      return;
    }
    if (type === "mode") {
      if (pending) return;
      mode = mode === "test" ? "live" : "test";
      selecting = false;
      view = "session";
      return refresh();
    }
    if (type === "legacy") {
      busy = true;
      lock();
      try {
        const { error } = await client.rpc("escape_safari", { p_expedition_id: snapshot.legacyPending.id });
        if (error) throw error;
      } catch (error) {
        notice.textContent = error.message;
      } finally {
        busy = false;
      }
      return refresh();
    }
    pending = { body: { type, area: button.dataset.area, sessionId: state.session?.id }, revision: snapshot.revision, id: crypto.randomUUID() };
    return send();
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button && !button.disabled) action(button);
  });
  await refresh();
}
export {
  createSafariAPI,
  mountSafari
};
