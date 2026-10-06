-- discord ids so the bot can tag people who haven't picked. only admins set
-- or see them (through these functions); the reminder job uses the service role.
alter table public.profiles add column discord_id text check (discord_id ~ '^[0-9]{15,21}$');

create function public.admin_discord_ids() returns table (id uuid, discord_id text)
language sql stable security definer set search_path = ''
as $$ select p.id, p.discord_id from public.profiles p where public.is_admin(); $$;

create function public.set_discord_id(uid uuid, did text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.profiles set discord_id = nullif(trim(did), '') where id = uid;
end;
$$;
revoke all on function public.admin_discord_ids() from public, anon;
revoke all on function public.set_discord_id(uuid, text) from public, anon;
grant execute on function public.admin_discord_ids() to authenticated;
grant execute on function public.set_discord_id(uuid, text) to authenticated;

-- one pick reminder per game day (central time)
create table public.pick_reminders (
  day date primary key,
  posted_at timestamptz not null default now()
);
alter table public.pick_reminders enable row level security;
