# Champion League — pubblicazione

Questa cartella contiene il sito da caricare su GitHub Pages: mantenere la struttura delle cartelle e caricare tutte le immagini, `features`, `index.html`, `supabase-config.js`, `sw.js`, il manifest e `.nojekyll`. Non servono build o dipendenze npm.

## Attivare la nuova Gara di Pesca

1. Nel progetto Supabase già collegato all’app, aprire **SQL Editor** ed eseguire tutto `database/fishing.sql`.
2. Caricare su GitHub il contenuto aggiornato di questa cartella. Rimuovere dal repository anche le vecchie cartelle `features/fishing-test`, `test` e `test-gara-pesca`, se presenti: un caricamento dal browser non elimina automaticamente i vecchi file.
3. Ricaricare il sito e aprire **Gara di Pesca** dalla Home (`#fishing`).

Lo script SQL va eseguito su Supabase: caricarlo su GitHub non attiva il database. È ripetibile e non elimina dati della gara precedente. Nessuna credenziale amministrativa va aggiunta al sito; `supabase-config.js` contiene solo la chiave pubblicabile esistente.

## Regole integrate

- Martedì, secondo l’ora di Roma; massimo 3 Pokémon **catturati** per account nella giornata.
- 50 Pokédollari per lancio, anche in caso di fuga o KO. Ripetere una richiesta dopo un errore di rete non crea un nuovo addebito. Gli addebiti compaiono nello storico movimenti.
- Scena centrata, punto esclamativo e 8,5 secondi per premere; poi battaglia con lo Starter.
- Specie e dimensioni generate dal server; classifica giornaliera condivisa ordinata per lunghezza, una miglior cattura per allenatore. Pari lunghezza = pari posizione.
- Nessun pannello debug, risultato forzato o dato delle vecchie prove viene importato. Nessun premio automatico o modifica al Pokédex/Starter è aggiunto da questa integrazione.

Il database usa le tabelle già esistenti `auth.users` e `public.profiles` (`user_id`, `id`, `trainer_name`, `is_active`, `balance`). Le nuove tabelle `fishing_game_species` e `fishing_game_entries` mantengono incontri, quota, classifica e ricevute degli addebiti separati dalla vecchia gara. Lo storico dell’app unisce le nuove ricevute ai movimenti già esistenti.

La simulazione dei turni resta nel browser; il server convalida account, costo, giornata, incontro e quota e genera le dimensioni, ma non ricalcola i turni. I valori base di peso e lunghezza sono valori di bilanciamento del gioco. Per un futuro torneo con premi competitivi, portare sul backend anche la simulazione dei turni.

## Verifiche eseguite

Flusso completo in Chrome desktop/mobile con account e richieste simulate; recupero dopo errori di rete; limite dopo ricarica; collegamento ufficiale e assenza di debug. Script SQL verificato su PostgreSQL locale con schema equivalente per permessi, addebiti, idempotenza, classifica, quota e fuso orario. Nessuna migrazione è stata eseguita sul progetto Supabase reale.
