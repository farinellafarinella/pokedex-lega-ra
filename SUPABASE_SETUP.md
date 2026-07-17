# Configurazione Supabase — Champion League

Progetto configurato nell'app:

```text
https://dnlwznuawgnfyhsvfjmr.supabase.co
```

## 1. Crea le tabelle

Apri il progetto Supabase, quindi **SQL Editor → New query**. Esegui i file uno alla volta e in questo ordine:

1. `supabase/schema.sql`
2. `supabase/commerce.sql`
3. `supabase/pokedex.sql`
4. `supabase/rocket-events.sql`
5. `supabase/essential-data.sql`
6. `supabase/event-rewards.sql`
7. `supabase/gym-badge-qr.sql`

Non vengono inseriti allenatori dimostrativi. Le Schede Allenatore reali vengono create soltanto con l'attivazione del Pokédex.

Per ogni file:

1. aprilo nel progetto locale;
2. copia tutto il contenuto;
3. incollalo in una nuova query del SQL Editor;
4. premi **Run**;
5. controlla che compaia `Success. No rows returned` o un risultato equivalente prima di continuare.

## 2. Configura Authentication

In **Authentication → Sign In / Providers → Email**:

- abilita Email;
- abilita l'accesso con password;
- per le prime prove puoi disabilitare `Confirm email`;
- riattiva la conferma email e configura SMTP prima del lancio pubblico.

In **Authentication → URL Configuration** imposta temporaneamente:

```text
Site URL: http://localhost:8080
Redirect URLs: http://localhost:8080/**
```

## 3. Primo amministratore

L'utente deve essere creato in **Authentication → Users**. Il profilo con ruolo amministratore viene creato eseguendo `supabase/create-first-admin.sql`. L'accesso amministrativo è verificato da Supabase Auth e dalle policy RLS.

## 4. Verifica dal sito

Avvia:

```bash
ruby -run -e httpd . -p 8080
```

Apri `http://localhost:8080`. In basso a destra comparirà:

- `Supabase: connesso` se lo schema base è disponibile;
- `Supabase: schema da installare` se devi ancora eseguire gli SQL;
- `Supabase: connessione non riuscita` se URL, chiave o rete non sono corretti.

## Sicurezza

La publishable key presente in `supabase-config.js` è progettata per il browser. La sicurezza dipende dalle policy RLS. Non aggiungere mai al progetto statico:

- secret key;
- `service_role` key;
- password del database.
