-- a second kind of swap: moving the 2x to another game already on the board.
-- same rule as game swaps, every admin has to approve.
alter table public.slate_swaps add column kind text not null default 'game' check (kind in ('game', 'feature'));
alter table public.slate_swaps add column feature_game_id bigint references public.games(id) on delete set null;
alter table public.slate_swaps alter column in_espn_id drop not null;
alter table public.slate_swaps alter column in_league drop not null;
alter table public.slate_swaps alter column in_kickoff drop not null;
alter table public.slate_swaps alter column espn_week drop not null;
alter table public.slate_swaps alter column espn_season_type drop not null;

create or replace function public.apply_slate_swap(sid bigint, game jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.slate_swaps;
  o public.games;
  f public.games;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into s from public.slate_swaps where id = sid for update;
  if s.id is null or s.status <> 'pending' then raise exception 'that swap is not pending'; end if;
  if exists (
    select 1 from public.profiles p
    where p.is_admin and not exists (
      select 1 from public.slate_swap_votes v where v.swap_id = s.id and v.admin_id = p.id and v.approve
    )
  ) then
    raise exception 'not every admin has approved';
  end if;
  select * into o from public.games where id = s.out_game_id;

  if s.kind = 'feature' then
    -- move the 2x from out_game_id to feature_game_id, both still unplayed
    select * into f from public.games where id = s.feature_game_id;
    if f.id is null or f.week_id <> s.week_id or f.kickoff <= now() or f.status <> 'pre'
       or (o.id is not null and (o.kickoff <= now() or o.status <> 'pre')) then
      update public.slate_swaps set status = 'expired' where id = s.id;
      return;
    end if;
    perform set_config('board.slate_swap', 'on', true);
    update public.games set featured = false where week_id = s.week_id and featured;
    update public.games set featured = true where id = f.id;
    perform set_config('board.slate_swap', '', true);
    update public.slate_swaps set status = 'done' where id = s.id;
    return;
  end if;

  if game ->> 'espn_id' is distinct from s.in_espn_id then raise exception 'wrong game for this swap'; end if;
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
