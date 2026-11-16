-- missed picks get their own coin flip per person instead of copying the
-- coin player's pick, so a lucky (or unlucky) coin doesn't land on everyone
-- who missed. still marked auto, so the coin icon shows next to their name.
create or replace function public.fill_missed_picks() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  filled int;
begin
  insert into public.picks (user_id, game_id, side, auto, updated_at)
  select m.id, g.id, case when random() < 0.5 then 'home' else 'away' end, true, g.kickoff
  from public.games g
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
