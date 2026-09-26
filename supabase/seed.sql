-- local dev only: `supabase start` / `supabase db reset` run this after the
-- migrations. three email + password users (password is "password" for all):
--   admin@local.test   admin, approved, onboarded
--   player@local.test  approved, onboarded
--   new@local.test     fresh sign-up: goes through onboarding + waits for approval

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('name', u.name), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000a001'::uuid, 'admin@local.test', 'admin'),
  ('00000000-0000-0000-0000-00000000a002'::uuid, 'player@local.test', 'player'),
  ('00000000-0000-0000-0000-00000000a003'::uuid, 'new@local.test', 'new')
) as u (id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users
where email like '%@local.test';

-- handle_new_user already made their profiles, just set them up
update public.profiles set is_admin = true, approved = true, onboarded = true, marker_color = 'blue', marker_font = 'pangolin'
where id = (select id from auth.users where email = 'admin@local.test');
update public.profiles set approved = true, onboarded = true, marker_color = 'red', marker_font = 'gaegu'
where id = (select id from auth.users where email = 'player@local.test');
