export function mountGameBoy(host){
 host.innerHTML='<section class="panel pad"><span class="eyebrow">UN’AVVENTURA CLASSICA</span><h1>Game Boy · Pokémon Rosso</h1><p>Gioca con mGBA e i comandi touch. Pokémon Rosso viene caricato automaticamente.</p><p><a class="btn primary" data-mgba>Apri Game Boy</a></p><p class="muted">Al primo accesso la pagina si ricarica una volta per preparare il gioco. Salva nel menu di Pokémon prima di uscire. I salvataggi restano in questo browser.</p><p><a data-previous>Apri l’emulatore precedente e i suoi salvataggi</a></p><p><a href="#dashboard">← Torna alla Home</a></p></section>';
 host.querySelector('[data-mgba]').href=new URL('../../mgba-web-main/dist/index.html',import.meta.url).href;
 host.querySelector('[data-previous]').href=new URL('./player.html?v=2',import.meta.url).href;
}
