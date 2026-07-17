-- Aggiorna le otto medaglie mantenendo invariati ID e assegnazioni esistenti.
insert into public.badges(name,position,icon_name) values
('Roccia',1,'roccia'),('Acqua',2,'acqua'),('Elettro',3,'elettro'),('Erba',4,'erba'),
('Veleno',5,'veleno'),('Psico',6,'psico'),('Fuoco',7,'fuoco'),('Terra',8,'terra')
on conflict(position) do update set name=excluded.name,icon_name=excluded.icon_name;
