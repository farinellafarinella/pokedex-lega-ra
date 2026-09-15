# Pokémon Champion League

Questa cartella contiene i file del sito pronti da caricare su GitHub Pages.

## Pubblicazione

Carica tutto il contenuto della cartella nella radice del repository, mantenendo la struttura di `features/`. Aggiorna i file esistenti. In GitHub Pages usa la cartella radice del branch pubblicato.

File necessari:

- `index.html`: Pokédex e navigazione.
- `features/starter/`: scheda starter, Arena Fossili, immagini e stili.
- `features/safari/`: nuova Zona Safari, immagini e stili.
- Immagini PNG nella radice: cornice, medaglie, allenatori e altre attività.
- `supabase-config.js`: configurazione pubblica della connessione.
- `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`: installazione e notifiche.
- `.nojekyll`: pubblicazione statica senza elaborazione Jekyll.

Il sito usa le funzioni Supabase già configurate: `bright-processor` per Starter/Arena e `safari-game` per la Safari. Caricare il sito non pubblica né modifica il database o le Edge Functions.

I nove PNG degli starter sono presenti. Test, demo, vecchi ZIP e sorgenti di sviluppo sono stati rimossi da questa cartella di pubblicazione. SQL, istruzioni e sorgenti sono conservati nell’archivio separato fornito durante la pulizia.
