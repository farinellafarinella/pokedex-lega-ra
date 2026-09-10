# Attivazione di Il mio Starter e Arena Fossili

Il codice è integrato in `index.html`. Prima dell’uso con account reali servono i due passaggi Supabase qui sotto. Nessun salvataggio demo viene importato. La vecchia Caccia ai Fossili (`#fossil-hunt`, SQL `supabase/fossil-hunt.sql`) è conservata.

## 1. Database

Nel progetto già configurato nell’app, apri **SQL Editor**, crea una query e incolla tutto il contenuto di:

`supabase/starter-game.sql`

Esegui la query. È una migrazione additiva e ripetibile: crea `starter_games`, `starter_operations`, una funzione di commit riservata al server e un tipo di movimento dedicato. Non cancella tabelle, utenti, saldi o partite esistenti. Richiede lo schema base dell’app già installato.

## 2. Funzione server

Nel pannello **Edge Functions**, crea una funzione chiamata esattamente **starter-game** e sostituisci il contenuto di `index.ts` con:

`supabase/starter-game-edge.ts`

È il file completo già compilato, senza altri moduli locali da aggiungere. Pubblica la funzione. Mantieni abilitata la verifica JWT. L’handler verifica comunque l’utente con `auth.getUser` e associa le operazioni al suo account: il client non può indicare un altro allenatore né assegnare premi.

Usa le variabili standard del runtime Supabase `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, disponibili alle Edge Functions. La chiave amministrativa non va copiata nel sito o in `supabase-config.js`.

Alternativa con CLI già autenticata, dalla cartella del progetto:

```sh
supabase functions deploy starter-game --project-ref dnlwznuawgnfyhsvfjmr
```

La CLI utilizza `supabase/functions/starter-game/index.ts` e `core/`; il file singolo è destinato all’editor del pannello. Rigenerarlo dopo modifiche con `node test/starter-integration/build-edge.mjs` (richiede esbuild nel percorso indicato dallo script).

## 3. App

Distribuisci `index.html`, l’intera cartella `features/starter/` e i moduli pubblici `supabase/functions/starter-game/core/*.mjs` insieme agli asset già presenti. Questi moduli contengono regole/nomi/specie, nessuna credenziale. Nessun file di `test/` o `starter-demo/` è necessario all’integrazione reale.

Per una prova locale usa `node starter-demo/serve.mjs`, poi apri:

- `http://127.0.0.1:8081/#my-starter`
- `http://127.0.0.1:8081/#fossil-arena`
- `http://127.0.0.1:8081/#fossil-hunt` — versione classica conservata.

Accedi con il tuo account. I pulsanti nuovi sono nelle Azioni rapide della Home.

## Comportamento reale

- Scelta unica per account: Bulbasaur, Charmander o Squirtle. Nessun reset utente né trasferimento dei dati demo.
- Livello iniziale 5, nessun accredito iniziale di Pokédollari: si usa il saldo esistente.
- Scelta, XP, forma, livello, statistiche, mosse apprese/equipaggiate, quota premi, inventario e lotta in corso sono salvati in Supabase.
- Le evoluzioni si confermano nella scheda dopo aver raggiunto le soglie in `core/config.mjs`. Le soglie rapide della demo sono sostituite dalle soglie 16/32, 16/36, 16/36; la curva XP e il limite 50 sono quelli del laboratorio fossili. XP totali e obiettivi aggiuntivi sono configurabili.
- Il server risolve ogni turno. Al refresh si riprende la stessa lotta. La scelta della difficoltà determina livello e ricompense dell’avversario.
- Prime tre sfide avviate al giorno (Europe/Rome): Pokédollari, più fossile in caso di vittoria. Dalla quarta: XP. L’abbandono consuma la quota e non dà premi.
- Acquisto/equipaggiamento mosse e vendita dei fossili usano il saldo reale. Saldo e movimento contabile vengono aggiornati nella stessa transazione dello stato del gioco.
- Si può conservare un solo fossile. Il mercante compra a prezzi configurati, con conferma di vendita. Il mercato tra giocatori e gli scenari economici simulati del laboratorio non sono attivati come mercato reale.
- Pesca, Caccia classica, Pigliamosche, Safari e Pokéathlon mostrano il compagno letto dallo stesso account. Le loro regole, costi e ricompense esistenti non cambiano; non assegnano ancora XP allo starter. Le lotte 1 contro 1 restano future.
- Asset Squirtle frontale/di spalle e Kabuto copiati in `features/starter/assets/`; simboli neutri per artwork mancanti.

## Controlli prima dell’apertura agli allenatori

Dopo la pubblicazione verifica con due account di prova: scelta, refresh, turno/refresh, fine lotta, saldo e Movimenti, acquisto mossa, vendita, cambio account e Caccia classica. Controlla i log della funzione se appare un errore di attivazione.

I test locali eseguiti simulano Supabase Auth e l’API nel browser e usano PostgreSQL in memoria per migrazione e permessi. Non equivalgono a una verifica sul progetto remoto, che richiede la pubblicazione dei due file e un account di prova.

Riferimenti ufficiali: https://supabase.com/docs/guides/functions/auth-legacy-jwt e https://supabase.com/docs/guides/database/functions
