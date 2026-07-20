# Attivazione notifiche

1. Eseguire `supabase/notifications.sql` nel SQL Editor, dopo gli script di schema, palestre e Pokédex.
2. Generare una coppia di chiavi VAPID con `npx web-push generate-vapid-keys`.
3. Copiare la chiave pubblica in `supabase-config.js`, campo `vapidPublicKey`.
4. Nei Secrets delle Edge Functions aggiungere:
   - `VAPID_SUBJECT` = `mailto:tuo-indirizzo-email`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `WEBHOOK_SECRET` = una stringa lunga casuale
5. Pubblicare la funzione `send-web-push` presente in `supabase/functions/send-web-push/index.ts`.
6. In Supabase creare un Database Webhook sulla tabella `public.notifications`, evento `INSERT`, diretto alla funzione `send-web-push`.
7. Nel webhook aggiungere l'header `x-webhook-secret` con lo stesso valore di `WEBHOOK_SECRET`.
8. Pubblicare insieme `index.html`, `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png` e `supabase-config.js`.
9. Su iPhone aggiungere il sito alla schermata Home, aprire l'app installata, entrare in Notifiche e premere `Attiva notifiche push`.
