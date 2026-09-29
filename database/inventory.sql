-- Zaino per tutti gli allenatori. Richiede profiles e starter_games.
begin;
create table if not exists public.inventory_items (
 id text primary key,
 name text not null,
 description text not null default '',
 category text not null check(category in ('fossils','items'))
);
create table if not exists public.trainer_inventory (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.inventory_items(id),
 quantity integer not null check(quantity > 0),
 primary key(user_id,item_id)
);
alter table public.inventory_items enable row level security;
alter table public.trainer_inventory enable row level security;
revoke all on public.inventory_items,public.trainer_inventory from public,anon,authenticated;
-- Solo i servizi del gioco possono assegnare o consumare oggetti.
grant select,insert,update,delete on public.inventory_items,public.trainer_inventory to service_role;

create or replace function public.get_trainer_inventory()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); items jsonb; game jsonb;
begin
 if not exists(select 1 from public.profiles where user_id=uid and is_active) then
  raise exception 'NOT_AUTHORIZED';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',i.id,'name',i.name,'description',i.description,'category',i.category,'quantity',t.quantity
 ) order by i.name),'[]'::jsonb) into items
 from public.trainer_inventory t join public.inventory_items i on i.id=t.item_id
 where t.user_id=uid;
 select state into game from public.starter_games where user_id=uid;
 -- Leggiamo i fossili esistenti senza duplicarli: vendite e sostituzioni restano sincronizzate.
 return jsonb_build_object('items',items,
  'fossil',game#>'{profile,inventory,fossil}',
  'pendingFossil',game#>'{profile,pendingFossil}');
end;
$$;
revoke all on function public.get_trainer_inventory() from public,anon,authenticated;
grant execute on function public.get_trainer_inventory() to authenticated;
notify pgrst, 'reload schema';
commit;
