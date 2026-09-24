-- the board: schema, security, and helpers.
-- run this once in the supabase sql editor (or with `supabase db push`).

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text not null default '',
  avatar_url  text,
  is_admin    boolean not null default false,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.weeks (
  id          bigint generated always as identity primary key,
  season      int not null,
  label       text not null,
  created_at  timestamptz not null default now()
);

create table public.games (
  id             bigint generated always as identity primary key,
  week_id        bigint not null references public.weeks (id) on delete cascade,
  league         text not null check (league in ('nfl', 'ncaaf')),
  espn_id        text not null,
  kickoff        timestamptz not null,
  home_name      text not null,
  home_abbr      text not null,
  home_logo      text,
  home_rank      int,
  away_name      text not null,
  away_abbr      text not null,
  away_logo      text,
  away_rank      int,
  home_score     int,
  away_score     int,
  -- pre = not started, in = live, post = final, void = canceled/postponed
  status         text not null default 'pre' check (status in ('pre', 'in', 'post', 'void')),
  status_detail  text,
  winner         text check (winner in ('home', 'away', 'tie')),
  created_at     timestamptz not null default now(),
  unique (week_id, espn_id)
);
create index games_week_idx on public.games (week_id);
create index games_open_idx on public.games (status, kickoff);

create table public.picks (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  game_id     bigint not null references public.games (id) on delete cascade,
  side        text not null check (side in ('home', 'away')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, game_id)
);
create index picks_game_idx on public.picks (game_id);

-- single row tracking when scores were last pulled from espn
create table public.sync_state (
  id              int primary key default 1 check (id = 1),
  last_synced_at  timestamptz not null default 'epoch'
);
insert into public.sync_state (id) values (1);

-- ---------------------------------------------------------------------------
-- helpers (security definer so they can be used inside rls policies)
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create function public.game_started(gid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select kickoff <= now() or status <> 'pre' from public.games where id = gid), true);
$$;

-- who has picked which games in a week, without revealing the side.
-- lets the board show "picked" checkmarks before kickoff.
create function public.pick_status(wid bigint)
returns table (user_id uuid, game_id bigint)
language sql stable security definer set search_path = '' as $$
  select p.user_id, p.game_id
  from public.picks p
  join public.games g on g.id = p.game_id
  where g.week_id = wid and public.is_approved();
$$;

-- create a profile whenever someone signs in for the first time
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.weeks      enable row level security;
alter table public.games      enable row level security;
alter table public.picks      enable row level security;
alter table public.sync_state enable row level security;

-- profiles: you always see yourself, approved members see everyone.
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_approved());
-- members can only change their own display name (see column grants below)
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;  -- only the name column, granted next
grant update (name) on public.profiles to authenticated;
-- admins flip approved / is_admin through the security definer function below
create function public.admin_set_member(uid uuid, make_approved boolean, make_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if uid = auth.uid() and not make_admin then
    raise exception 'you cannot remove your own admin';
  end if;
  update public.profiles set approved = make_approved, is_admin = make_admin where id = uid;
end;
$$;

-- weeks + games: approved members read, admins write.
create policy "weeks read" on public.weeks for select to authenticated using (public.is_approved());
create policy "weeks admin" on public.weeks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "games read" on public.games for select to authenticated using (public.is_approved());
create policy "games admin" on public.games for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- picks: you see your own anytime, everyone else's only once the game kicks off.
create policy "picks read" on public.picks for select to authenticated
  using (
    public.is_approved()
    and (user_id = auth.uid() or public.game_started(game_id))
  );
-- you can only make/change/remove your own pick, and only before kickoff.
create policy "picks insert" on public.picks for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved() and not public.game_started(game_id));
create policy "picks update" on public.picks for update to authenticated
  using (user_id = auth.uid() and not public.game_started(game_id))
  with check (user_id = auth.uid() and public.is_approved() and not public.game_started(game_id));
create policy "picks delete" on public.picks for delete to authenticated
  using (user_id = auth.uid() and not public.game_started(game_id));

-- sync_state is only touched by the server with the secret key (bypasses rls).

-- ---------------------------------------------------------------------------
-- explicit grants (don't rely on project default privileges)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.weeks, public.games, public.picks, public.sync_state from anon;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.weeks, public.games, public.picks to authenticated;
revoke all on public.sync_state from authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin(), public.is_approved(), public.game_started(bigint),
  public.pick_status(bigint), public.admin_set_member(uuid, boolean, boolean) from public, anon;
grant execute on function public.is_admin(), public.is_approved(), public.game_started(bigint),
  public.pick_status(bigint), public.admin_set_member(uuid, boolean, boolean) to authenticated;

-- the server's secret key (score syncing) needs full access
grant all on public.profiles, public.weeks, public.games, public.picks, public.sync_state to service_role;
