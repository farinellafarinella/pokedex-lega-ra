export function mountGameBoy(host){
 host.innerHTML='<section class="panel pad"><span class="eyebrow">UN’AVVENTURA CLASSICA</span><h1>Game Boy · Pokémon Rosso</h1><p>Gioca con mGBA e i comandi touch. Pokémon Rosso viene caricato automaticamente.</p><p><a class="btn primary" data-mgba>Riprendi Game Boy</a> <a class="btn secondary" data-menu>Avvia da zero · menu gioco</a></p><p class="muted">Al primo accesso la pagina si ricarica una volta per preparare il gioco. Salva nel menu di Pokémon prima di uscire. “Avvia da zero” riparte dalla schermata iniziale: scegli Continua per usare il salvataggio del gioco. I salvataggi restano in questo browser.</p><p><a href="#dashboard">← Torna alla Home</a></p></section>';
 host.querySelector('[data-menu]').href=new URL('../../mgba-web-main/dist/index.html?boot=menu',import.meta.url).href;
 host.querySelector('[data-mgba]').href=new URL('../../mgba-web-main/dist/index.html',import.meta.url).href;
}

