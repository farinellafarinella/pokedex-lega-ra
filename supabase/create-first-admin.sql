insert into public.profiles (
  user_id,
  trainer_code,
  trainer_name,
  registration_date,
  ranking_points,
  balance,
  role,
  is_active
) values (
  '32c174f0-60c7-4290-9be6-04f8e12215dd',
  'AD-0001',
  'Amministratore Lega',
  current_date,
  0,
  0,
  'admin',
  true
)
on conflict (user_id) do update set
  role = 'admin',
  is_active = true,
  updated_at = now();
