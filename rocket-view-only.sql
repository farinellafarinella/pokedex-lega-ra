-- Disabilita definitivamente gli acquisti Rocket dal sito/API.
-- La Lista Rocket rimane esclusivamente informativa.
revoke execute on function public.purchase_rocket_pokemon(uuid,uuid) from anon,authenticated;
revoke execute on function public.purchase_rocket_item(uuid,integer,text,uuid) from anon,authenticated;
