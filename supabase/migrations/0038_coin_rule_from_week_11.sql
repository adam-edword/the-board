-- the one-coin-week rule applies to week 12 too: missing all of week 11 now counts.
create or replace function public.fill_missed_picks() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  filled int;
begin
  with week_first as (
    select w.id, w.season, min(g2.kickoff) as first_kick
    from public.weeks w join public.games g2 on g2.week_id = w.id
    group by w.id
  ),
  week_prev as (
    select id,
      lag(id) over (partition by season order by first_kick) as prev_id,
      lag(first_kick) over (partition by season order by first_kick) as prev_first
    from week_first
  )
  insert into public.picks (user_id, game_id, side, auto, updated_at)
  select m.id, g.id, case when random() < 0.5 then 'home' else 'away' end, true, g.kickoff
  from public.games g
  join week_prev wp on wp.id = g.week_id
  cross join public.profiles m
  where (g.kickoff <= now() or g.status <> 'pre')
    and g.status <> 'void'
    and m.approved and not m.is_bot
    and m.created_at <= g.kickoff
    and not exists (select 1 from public.picks p where p.game_id = g.id and p.user_id = m.id)
    and not exists (select 1 from public.score_adjustments a where a.user_id = m.id and a.week_id = g.week_id)
    -- the coin only covers you if you picked something yourself last week
    and (
      wp.prev_id is null
      -- misses from week 11 on count (week 11 started nov 21, 2026)
      or wp.prev_first < '2026-11-18 00:00+00'
      or m.created_at > wp.prev_first
      or exists (
        select 1 from public.picks p join public.games pg on pg.id = p.game_id
        where pg.week_id = wp.prev_id and p.user_id = m.id and not p.auto
      )
      or exists (select 1 from public.score_adjustments a where a.user_id = m.id and a.week_id = wp.prev_id)
    )
  on conflict (user_id, game_id) do nothing;
  get diagnostics filled = row_count;
  return filled;
end;
$$;
