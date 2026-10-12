export function mountGameBoy(host){
 host.innerHTML='<section class="panel pad"><span class="eyebrow">UN’AVVENTURA CLASSICA</span><h1>Game Boy · Pokémon</h1><p><a class="btn primary" href="#gameboy-trades">Scambi Pokémon delle ROM</a></p><p>Scegli la tua avventura e gioca con mGBA e i comandi touch.</p><div data-games></div><p class="muted">Salva dal menu di Pokémon prima di uscire. I salvataggi restano in questo browser e sono separati per gioco. Il menu iniziale permette di scegliere Continua o Nuovo gioco.</p><p><a href="#dashboard">← Torna alla Home</a></p></section>';
 for(const [game,title] of [['red','Rosso'],['gold','Oro']]){
  const card=document.createElement('section');card.className='panel pad';
  card.innerHTML='<h2>Pokémon '+title+'</h2><p><a class="btn primary" data-mgba>Riprendi '+title+'</a></p><p><a class="btn secondary" data-menu>Apri menu gioco</a></p><p><a class="btn secondary" href="#gameboy-rewards/'+game+'">Ricompense delle medaglie</a></p>';
  for(const [selector,menu] of [['[data-mgba]',false],['[data-menu]',true]]){const url=new URL('../../mgba-web-main/dist/index.html',import.meta.url);url.searchParams.set('game',game);if(menu)url.searchParams.set('boot','menu');card.querySelector(selector).href=url.href;}
  host.querySelector('[data-games]').append(card);
 }
}
