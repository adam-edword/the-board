-- commissioner weeks are locked at the database level: nobody (admins
-- included) can add, remove, or re-star games on them. the one way to change
-- one is a swap every admin approves, applied by apply_slate_swap.
-- the commissioner and score sync use the service role and aren't affected.

create table public.slate_swaps (
  id bigint generated always as identity primary key,
  week_id bigint not null references public.weeks(id) on delete cascade,
  out_game_id bigint not null references public.games(id) on delete cascade,
  in_espn_id text not null,
  in_league text not null check (in_league in ('nfl', 'ncaaf')),
  in_label text not null,
  in_kickoff timestamptz not null,
  espn_week int not null,
  espn_season_type int not null,
  proposed_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected', 'expired')),
  created_at timestamptz not null default now()
);
create unique index slate_swaps_one_pending on public.slate_swaps (out_game_id) where status = 'pending';

create table public.slate_swap_votes (
  swap_id bigint not null references public.slate_swaps(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  approve boolean not null,
  created_at timestamptz not null default now(),
  primary key (swap_id, admin_id)
);

alter table public.slate_swaps enable row level security;
alter table public.slate_swap_votes enable row level security;
create policy "slate swaps admin" on public.slate_swaps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- admins can see every vote but only cast their own
create policy "swap votes read" on public.slate_swap_votes for select to authenticated using (public.is_admin());
create policy "swap votes own" on public.slate_swap_votes for insert to authenticated
  with check (public.is_admin() and admin_id = auth.uid());
create policy "swap votes change own" on public.slate_swap_votes for update to authenticated
  using (public.is_admin() and admin_id = auth.uid()) with check (admin_id = auth.uid());
grant select, insert, update on public.slate_swaps to authenticated;
grant select, insert, update on public.slate_swap_votes to authenticated;

-- the lock
create function public.guard_locked_slate() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  wid bigint := case when tg_op = 'DELETE' then old.week_id else new.week_id end;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or coalesce(current_setting('board.slate_swap', true), '') = 'on'
     or not exists (select 1 from public.weeks w where w.id = wid and w.auto_slate) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE' and new.featured = old.featured and new.week_id = old.week_id and new.espn_id = old.espn_id then
    return new;
  end if;
  raise exception 'this week''s games were picked by the commissioner and are locked' using errcode = '42501';
end;
$$;
create trigger games_locked_slate before insert or update or delete on public.games
  for each row execute function public.guard_locked_slate();

-- swaps a game once every admin has approved. the new game's details come
-- from the app (fresh from espn) and must match what was proposed.
create function public.apply_slate_swap(sid bigint, game jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.slate_swaps;
  o public.games;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into s from public.slate_swaps where id = sid for update;
  if s.id is null or s.status <> 'pending' then raise exception 'that swap is not pending'; end if;
  if game ->> 'espn_id' is distinct from s.in_espn_id then raise exception 'wrong game for this swap'; end if;
  if exists (
    select 1 from public.profiles p
    where p.is_admin and not exists (
      select 1 from public.slate_swap_votes v where v.swap_id = s.id and v.admin_id = p.id and v.approve
    )
  ) then
    raise exception 'not every admin has approved';
  end if;
  select * into o from public.games where id = s.out_game_id;
  if o.kickoff <= now() or o.status <> 'pre' or (game ->> 'kickoff')::timestamptz <= now() then
    update public.slate_swaps set status = 'expired' where id = s.id;
    return;
  end if;

  perform set_config('board.slate_swap', 'on', true);
  delete from public.games where id = o.id;
  insert into public.games (
    week_id, league, espn_id, kickoff, home_name, home_abbr, home_logo, home_rank,
    away_name, away_abbr, away_logo, away_rank, home_score, away_score, status,
    status_detail, network, winner, featured, slate_reason
  ) values (
    s.week_id, game ->> 'league', game ->> 'espn_id', (game ->> 'kickoff')::timestamptz,
    game ->> 'home_name', game ->> 'home_abbr', game ->> 'home_logo', (game ->> 'home_rank')::int,
    game ->> 'away_name', game ->> 'away_abbr', game ->> 'away_logo', (game ->> 'away_rank')::int,
    (game ->> 'home_score')::int, (game ->> 'away_score')::int, game ->> 'status',
    game ->> 'status_detail', game ->> 'network', game ->> 'winner', o.featured,
    'swapped in for ' || o.away_abbr || ' @ ' || o.home_abbr || ', every admin signed off.'
  );
  perform set_config('board.slate_swap', '', true);
  update public.slate_swaps set status = 'done' where id = s.id;
end;
$$;
revoke all on function public.apply_slate_swap(bigint, jsonb) from public, anon;
grant execute on function public.apply_slate_swap(bigint, jsonb) to authenticated;

-- keep the swap record after its old game is deleted by the swap itself
alter table public.slate_swaps drop constraint slate_swaps_out_game_id_fkey;
alter table public.slate_swaps alter column out_game_id drop not null;
alter table public.slate_swaps add constraint slate_swaps_out_game_id_fkey
  foreign key (out_game_id) references public.games(id) on delete set null;
alter table public.slate_swaps add column out_label text not null default '';
