# Pokémon Champion League

Web app statica responsive collegata a Supabase per gestire allenatori, Pokédex QR, Pokédollari, palestre ed eventi Team Rocket.

## Avvio locale

Servi la cartella con un server HTTP statico e apri `http://localhost:8080`.

```bash
ruby -run -e httpd . -p 8080
```

In alternativa usa qualsiasi server statico disponibile sul computer. Non aprire `index.html` tramite `file://`, perché autenticazione e moduli JavaScript richiedono HTTP.

## File principali

```text
index.html                         applicazione completa
supabase-config.js                URL e publishable key Supabase
SUPABASE_SETUP.md                 guida alla configurazione
supabase/schema.sql               profili, medaglie e transazioni
supabase/commerce.sql             palestre, biglietti e operazioni
supabase/pokedex.sql              dispositivi QR e attivazione
supabase/trainer-customization.sql classi e personalizzazione allenatore
supabase/safari-zone.sql          Zona Safari del venerdì
supabase/registration-gifts.sql   codici regalo, scorte e QR di consegna
supabase/rocket-events.sql        eventi Team Rocket mensili
supabase/essential-data.sql       otto medaglie iniziali
supabase/create-first-admin.sql   profilo del primo amministratore
```

## Cornice grafica Pokédex

L'app è contenuta in una cornice proporzionale `1080 × 1920 px`. Inserisci l'immagine definitiva nella cartella principale con il nome:

```text
sfondo.png
```

L'area interattiva segue il rettangolo bianco reale della cornice: circa `45 px` da sinistra e `320 px` dall'alto, con dimensione `990 × 1555 px` sulla base logica `1080 × 1920`. Il contenuto scorre solamente dentro questa area e la cornice viene scalata proporzionalmente su smartphone e desktop.

## File delle medaglie

Le immagini delle medaglie vanno salvate accanto a `index.html`. Per ogni tipo servono la versione conquistata e quella bloccata:

```text
Mroccia.png       Mroccia block.png
Macqua.png        Macqua block.png
Melettro.png      Melettro block.png
Merba.png         Merba block.png
Mveleno.png       Mveleno block.png
Mpsico.png        Mpsico block.png
Mfuoco.png        Mfuoco block.png
Mterra.png        Mterra block.png
```

## Funzioni

- autenticazione email/password con Supabase;
- schede allenatore pubbliche e private;
- scelta della Classe Allenatore, modificabile dal profilo;
- attivazione del Pokédex tramite QR monouso;
- trasferimenti atomici di Pokédollari;
- Zona Palestra con biglietti e check-in;
- Lista Rocket mensile riservata ai Pokémon;
- classifica, medaglie e storico movimenti;
- area amministrativa protetta dal ruolo Supabase.
- QR premio evento da 100 Pokédollari, riscattabile una volta per account.
- scanner unico per QR premio e QR medaglia palestra.
- Zona Safari del venerdì con una spedizione, catture a rischio e bottino raddoppiato.
- regalo di benvenuto riscattabile entro 7 giorni, con sei Pokémon a scorte limitate e QR personale.

## Calendario eventi online

- Lunedì: Caccia ai Fossili
- Martedì: Gara di Pesca
- Mercoledì: nessun evento settimanale
- Giovedì: Gara Pigliamosche
- Venerdì: Zona Safari
- Sabato: Pokéathlon
- Domenica: nessun evento settimanale

Fuori dal giorno previsto gli eventi vengono nascosti agli Allenatori. Gli account
amministratore possono continuare ad accedervi per i test.

## Sicurezza

La publishable key può essere utilizzata nel browser perché l'accesso ai dati è limitato da RLS. Non inserire mai nell'app statica password del database, secret key o `service_role` key.

I Pokédollari sono punti virtuali interni, non convertibili e privi di valore monetario reale.

## Il mio Starter e Arena Fossili

Le Azioni rapide della Home includono **Il mio Starter** (`#my-starter`) e **Arena Fossili** (`#fossil-arena`). La Caccia ai Fossili classica resta su `#fossil-hunt` con le regole e il database precedenti.

Per attivare il salvataggio reale segui [SUPABASE_STARTER_SETUP.md](SUPABASE_STARTER_SETUP.md): migrazione SQL e funzione server sono pronte ma vanno pubblicate nel progetto Supabase. Codice UI in `features/starter/`, motore server in `supabase/functions/starter-game/`. La demo `/starter-demo/` rimane separata e i suoi dati non vengono importati.
