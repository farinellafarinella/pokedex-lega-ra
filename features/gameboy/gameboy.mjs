export function mountGameBoy(host){
 host.innerHTML='<section class="panel pad"><span class="eyebrow">UN’AVVENTURA CLASSICA</span><h1>Game Boy · Pokémon Rosso</h1><p class="muted">Attendi il caricamento di Pokémon Rosso e premi Avvia gioco. I salvataggi restano in questo browser e non sono sincronizzati con la Scheda Allenatore.</p><iframe title="Emulatore Game Boy" allow="autoplay; fullscreen; gamepad" allowfullscreen style="display:block;width:100%;height:780px;height:min(900px,calc(100dvh - 100px));min-height:640px;border:0;border-radius:16px;background:#17191f"></iframe><p><a href="#dashboard">← Torna alla Home</a></p></section>';
 host.querySelector('iframe').src=new URL('./player.html?v=2',import.meta.url).href;
}
