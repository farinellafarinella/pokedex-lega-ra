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
supabase/rocket-events.sql        eventi Team Rocket mensili
supabase/essential-data.sql       otto medaglie iniziali
supabase/create-first-admin.sql   profilo del primo amministratore
```

## Funzioni

- autenticazione email/password con Supabase;
- schede allenatore pubbliche e private;
- attivazione del Pokédex tramite QR monouso;
- trasferimenti atomici di Pokédollari;
- Zona Palestra con biglietti e check-in;
- Lista Rocket mensile riservata ai Pokémon;
- classifica, medaglie e storico movimenti;
- area amministrativa protetta dal ruolo Supabase.

## Sicurezza

La publishable key può essere utilizzata nel browser perché l'accesso ai dati è limitato da RLS. Non inserire mai nell'app statica password del database, secret key o `service_role` key.

I Pokédollari sono punti virtuali interni, non convertibili e privi di valore monetario reale.
