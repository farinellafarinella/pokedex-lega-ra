export function mountGameBoy(host){
 host.innerHTML='<section class="panel pad"><span class="eyebrow">UN’AVVENTURA CLASSICA</span><h1>Game Boy · Pokémon Rosso</h1><p>Gioca con mGBA e i comandi touch.</p><p><a class="btn primary" data-mgba>Riprendi Game Boy</a></p><p><a class="btn secondary" data-menu>Avvia da zero · menu gioco</a></p><p class="muted">Salva dal menu di Pokémon prima di uscire. I salvataggi restano in questo browser. “Avvia da zero” apre il menu iniziale: scegli Continua per riprendere la partita salvata.</p><p><a class="btn secondary" href="#gameboy-rewards">Ricompense delle medaglie</a></p><p><a href="#dashboard">← Torna alla Home</a></p></section>';
 host.querySelector('[data-menu]').href=new URL('../../mgba-web-main/dist/index.html?boot=menu',import.meta.url).href;
 host.querySelector('[data-mgba]').href=new URL('../../mgba-web-main/dist/index.html',import.meta.url).href;
}
