-- Consente di leggere lo storico personale; la RLS limita ogni utente ai propri movimenti.
grant select on public.transactions to authenticated;

drop policy if exists transactions_participant_read on public.transactions;
create policy transactions_participant_read
on public.transactions
for select
to authenticated
using (
  sender_id = public.my_profile_id()
  or receiver_id = public.my_profile_id()
  or public.is_admin()
);
