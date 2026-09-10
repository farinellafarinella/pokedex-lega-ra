-- Personalizzazione del profilo: sesso e Classe Allenatore.
-- Eseguire dopo schema.sql e trainer-registration.sql.

alter table public.profiles
add column if not exists trainer_gender text not null default 'male';

alter table public.profiles
add column if not exists trainer_class text not null default 'Allenatore';

-- Normalizza le vecchie personalizzazioni prima di applicare i nuovi vincoli.
update public.profiles set trainer_gender='female'
where trainer_class in (
  'Bulla','Scienziata','Fantallenatrice','Campeggiatrice',
  'Modella','Nuotatrice','Allenatrice'
);

update public.profiles set trainer_gender='male'
where trainer_gender not in ('male','female');

update public.profiles
set trainer_class=case when trainer_gender='female' then 'Allenatrice' else 'Allenatore' end
where trainer_class not in (
  'Bullo','Bulla','Scienziato','Scienziata','Artista',
  'Fantallenatore','Fantallenatrice','Nobile',
  'Campeggiatore','Campeggiatrice','Modello','Modella',
  'Medium','Karateka','Allenatore','Allenatrice'
);

update public.profiles
set trainer_class=case when trainer_gender='female' then 'Allenatrice' else 'Allenatore' end
where not (
  (trainer_gender='male' and trainer_class in (
    'Bullo','Scienziato','Artista','Fantallenatore','Nobile',
    'Campeggiatore','Modello','Medium','Karateka','Allenatore'
  ))
  or
  (trainer_gender='female' and trainer_class in (
    'Bulla','Scienziata','Artista','Fantallenatrice','Nobile',
    'Campeggiatrice','Modella','Medium','Karateka','Allenatrice'
  ))
);

alter table public.profiles drop constraint if exists profiles_trainer_gender_check;
alter table public.profiles drop constraint if exists profiles_trainer_class_check;
alter table public.profiles drop constraint if exists profiles_trainer_identity_check;

alter table public.profiles add constraint profiles_trainer_gender_check
check (trainer_gender in ('male','female'));

alter table public.profiles add constraint profiles_trainer_class_check
check (trainer_class in (
  'Bullo','Bulla','Scienziato','Scienziata','Artista',
  'Fantallenatore','Fantallenatrice','Nobile',
  'Campeggiatore','Campeggiatrice','Modello','Modella',
  'Medium','Karateka','Allenatore','Allenatrice'
));

alter table public.profiles add constraint profiles_trainer_identity_check check (
  (trainer_gender='male' and trainer_class in (
    'Bullo','Scienziato','Artista','Fantallenatore','Nobile',
    'Campeggiatore','Modello','Medium','Karateka','Allenatore'
  ))
  or
  (trainer_gender='female' and trainer_class in (
    'Bulla','Scienziata','Artista','Fantallenatrice','Nobile',
    'Campeggiatrice','Modella','Medium','Karateka','Allenatrice'
  ))
);

create or replace function public.update_my_trainer_identity(
  p_trainer_gender text,
  p_trainer_class text
)
returns table(trainer_gender text,trainer_class text,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_gender text:=trim(coalesce(p_trainer_gender,''));
  v_class text:=trim(coalesce(p_trainer_class,''));
  v_profile public.profiles;
begin
  if v_gender not in ('male','female') then raise exception 'INVALID_TRAINER_GENDER'; end if;
  if not (
    (v_gender='male' and v_class in (
      'Bullo','Scienziato','Artista','Fantallenatore','Nobile',
      'Campeggiatore','Modello','Medium','Karateka','Allenatore'
    ))
    or
    (v_gender='female' and v_class in (
      'Bulla','Scienziata','Artista','Fantallenatrice','Nobile',
      'Campeggiatrice','Modella','Medium','Karateka','Allenatrice'
    ))
  ) then raise exception 'INVALID_TRAINER_CLASS'; end if;

  update public.profiles
  set trainer_gender=v_gender,trainer_class=v_class,updated_at=now()
  where user_id=auth.uid() and is_active
  returning * into v_profile;
  if not found then raise exception 'TRAINER_NOT_FOUND_OR_INACTIVE'; end if;

  trainer_gender:=v_profile.trainer_gender;
  trainer_class:=v_profile.trainer_class;
  updated_at:=v_profile.updated_at;
  return next;
end $$;

drop function if exists public.get_trainer_classes();
create function public.get_trainer_classes()
returns table(id uuid,trainer_gender text,trainer_class text)
language sql stable security definer set search_path=public as $$
  select p.id,p.trainer_gender,p.trainer_class
  from public.profiles p
  where p.is_active
$$;

drop function if exists public.update_my_trainer_class(text);
revoke all on function public.update_my_trainer_identity(text,text) from public;
revoke all on function public.get_trainer_classes() from public;
grant execute on function public.update_my_trainer_identity(text,text) to authenticated;
grant execute on function public.get_trainer_classes() to anon,authenticated;
grant select(trainer_gender,trainer_class) on public.profiles to authenticated;
