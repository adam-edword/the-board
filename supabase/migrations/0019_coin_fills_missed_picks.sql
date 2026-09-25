-- once a game kicks off, anyone who didn't pick it gets coin's side, flagged
-- `auto` so the board can show the coin picked for them.
alter table public.picks add column auto boolean not null default false;

-- run by the score sync (secret key) every minute or so. only fills games that
-- have started, only for approved people who signed up before kickoff, and
-- skips weeks already covered by a flat score (e.g. joined mid-season).
create function public.fill_missed_picks() returns int
language plpgsql security definer set search_path = '' as $$
declare
  coin constant uuid := '00000000-0000-0000-0000-00000000c014';
  filled int;
begin
  insert into public.picks (user_id, game_id, side, auto, updated_at)
  select m.id, g.id, cp.side, true, g.kickoff
  from public.games g
  join public.picks cp on cp.game_id = g.id and cp.user_id = coin
  cross join public.profiles m
  where (g.kickoff <= now() or g.status <> 'pre')
    and g.status <> 'void'
    and m.approved and not m.is_bot
    and m.created_at <= g.kickoff
    and not exists (select 1 from public.picks p where p.game_id = g.id and p.user_id = m.id)
    and not exists (select 1 from public.score_adjustments a where a.user_id = m.id and a.week_id = g.week_id)
  on conflict (user_id, game_id) do nothing;
  get diagnostics filled = row_count;
  return filled;
end;
$$;
revoke execute on function public.fill_missed_picks() from public, anon, authenticated;
grant execute on function public.fill_missed_picks() to service_role;
