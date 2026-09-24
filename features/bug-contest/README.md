# Gara Pigliamosche ufficiale

La Home apre `#bug-contest`. Il precedente `#test-gara-pigliamosche` rimanda alla stessa pagina; non ci sono pannelli debug, prove forzate o importazioni dei vecchi risultati di test.

## Attivazione su Supabase e GitHub

1. In **Supabase → Edge Functions**, creare/pubblicare la funzione chiamata esattamente **`swift-endpoint`**, copiando tutto `supabase/functions/bug-contest/index.ts`. Il file è completo e non richiede altri file del progetto. Disabilitare la verifica JWT del gateway per questa funzione: il codice verifica sempre il token dell’utente con `auth.getUser` prima di accedere ai dati. Non aggiungere chiavi amministrative al sito: la funzione usa le variabili standard dell’ambiente Supabase. Il sito chiama `/functions/v1/swift-endpoint`; la cartella locale dei sorgenti resta `supabase/functions/bug-contest`. La configurazione CLI esistente per `bug-contest` riguarda il nome precedente: per aggiornare la funzione attiva, usare `swift-endpoint` nel pannello Supabase.
2. Nel **SQL Editor** eseguire tutto `database/bug-contest.sql`. Crea le tabelle ufficiali, protegge le scritture, disattiva i vecchi comandi della gara, attiva `pg_cron` e programma il pagamento dei vincitori. Lo script è ripetibile e conserva saldi e storico. Se il progetto non consente di installare Cron via SQL, abilitarlo in **Integrations → Cron** e rieseguire lo script ([istruzioni Supabase](https://supabase.com/docs/guides/cron/install)).
3. Pubblicare su GitHub `index.html`, `features/bug-contest`, tutta la cartella **`bug gif`**, mantenendo le dipendenze `features/starter` e `features/fishing`. Rimuovere la vecchia cartella `features/bug-contest-test` dal repository, se ancora presente: il caricamento manuale non la cancella. `supabase`, `database`, `scripts` e `test` sono sorgenti/istruzioni, non vengono eseguiti da GitHub Pages. Non basta caricare il file SQL o TypeScript su GitHub per attivare il backend.

## Regole

- Giovedì, da mezzanotte a mezzanotte **Europe/Rome**. Una gara per account nella giornata.
- Iscrizione: **50 Pokédollari**, una sola volta; **10 Poké Ball** totali e **5 incontri** al massimo.
- Il compagno è lo Starter effettivo dell’account, con livello e mosse attuali al momento dell’iscrizione. Ogni incontro ripristina i suoi PS e PP; questo evento non modifica XP o mosse dello Starter permanente.
- Ogni lancio consuma una Ball, anche se fallisce. A zero Ball la gara termina subito e passa alla scelta finale; non avviene un altro turno avversario dopo l’ultimo lancio.
- KO e fuga completano un incontro. Un selvatico KO non può essere catturato. Dopo cinque incontri termina la fase di cattura.
- Il giocatore sceglie **un solo Pokémon** da presentare entro la fine della giornata. Nessun invio automatico del migliore. Senza catture non si entra in classifica.
- Punteggio: `round(peso × 1,1) + bonus rarità`. Spareggio: bonus rarità, peso, prima presentazione, ID gara.
- Il primo classificato alla chiusura riceve **300 Pokédollari**. Cron verifica ogni minuto le giornate concluse; eventuali esecuzioni saltate vengono recuperate anche al successivo accesso. L’accredito e lo storico movimenti sono protetti dai duplicati.

## Pokémon e GIF

Caterpie, Ledyba, Pinsir, Scyther, Venonat, Parasect, Spinarak, Kakuna, Beedrill, Butterfree e Heracross. Le immagini sono `bug gif/<specie>.gif`, tutte minuscole: usate in battaglia, nelle catture, nella selezione e in classifica. Gli Starter mantengono le GIF frontali e di spalle già installate.

## Motore e salvataggi

La Edge Function usa lo stesso `createPokemon` dello Starter e lo stesso motore dei turni della pesca. Il browser invia solo l’azione scelta: il server genera incontri/pesi, risolve i turni e le catture, applica quote e salva la gara. Stato e punteggi inviati dal browser non vengono accettati. Le RPC di scrittura sono riservate al ruolo di servizio.

Le gare sono in `bug_game_runs`, le richieste già eseguite in `bug_game_operations`, i risultati in `bug_game_results`, i vincitori in `bug_game_winners` e i movimenti in `bug_game_payments`. La ripresa funziona anche su altri dispositivi. La memoria locale conserva soltanto l’ID e l’azione di una richiesta da ritentare, con prefisso `champion:bug-game:pending:v1:`. I vecchi dati `bug_test_*` e le vecchie catture non partecipano ai nuovi premi.

## Modifiche e verifiche

`config.mjs` contiene catalogo, rarità, frequenze, mosse e pesi. `scoring.mjs` contiene la formula della giuria. `engine.mjs` gestisce incontri e catture; `commands.mjs` accetta solo azioni valide. `game.mjs` e `style.css` gestiscono l’interfaccia, `api.mjs` il trasporto.

Dopo modifiche al motore o al catalogo eseguire **`node scripts/build-bug-edge.mjs`** e ripubblicare `supabase/functions/bug-contest/index.ts` nella funzione `swift-endpoint`. Formula, costo, quota e premio hanno anche controlli in SQL: mantenerli coerenti. Il sorgente del trasporto Edge è `handler.ts`; `index.ts` è generato e autonomo.

Verifiche logiche: `node --test test/bug-contest/*.test.mjs`. La migrazione è verificata su PostgreSQL locale con utenti simulati per quote, giorno di apertura, saldo, permessi, ripetizione delle richieste, classifica e premio. La verifica locale non equivale a eseguire la migrazione sul progetto Supabase reale.
