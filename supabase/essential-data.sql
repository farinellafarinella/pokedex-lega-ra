-- Dati strutturali indispensabili. Non crea allenatori demo.
insert into public.badges(name,position,icon_name) values
('Scintilla',1,'zap'),('Quarzo',2,'gem'),('Marea',3,'waves'),('Vortice',4,'wind'),
('Radice',5,'sprout'),('Eclissi',6,'moon'),('Aurora',7,'sunrise'),('Vertice',8,'mountain')
on conflict(position) do update set name=excluded.name,icon_name=excluded.icon_name;
