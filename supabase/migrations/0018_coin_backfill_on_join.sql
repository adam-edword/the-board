-- anyone approved mid-season gets coin's score for every finished week of the
-- current season they have no picks in (weeks they missed before joining).
-- stored as regular score adjustments, so an admin can still overwrite them.

create function public.backfill_with_coin(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  coin constant uuid := '00000000-0000-0000-0000-00000000c014';
begin
  with season as (
    select max(season) as s from public.weeks
  ),
  done_weeks as (
    select w.id from public.weeks w, season
    where w.season = season.s
      and exists (select 1 from public.games g where g.week_id = w.id)
      and not exists (select 1 from public.games g where g.week_id = w.id and g.status not in ('post', 'void'))
  ),
  coin_picks as (
    select g.week_id,
      sum(case when p.side = g.winner or g.winner = 'tie' then case when g.featured then 2 else 1 end else 0 end) as pts,
      sum(case when (p.side = g.winner or g.winner = 'tie') and g.league = 'ncaaf' then case when g.featured then 2 else 1 end else 0 end) as cfb,
      sum(case when (p.side = g.winner or g.winner = 'tie') and g.league = 'nfl' then case when g.featured then 2 else 1 end else 0 end) as nfl,
      count(*) filter (where g.status = 'post' and g.winner is not null) as decided,
      count(*) filter (where g.status = 'post' and (p.side = g.winner or g.winner = 'tie')) as correct
    from public.picks p join public.games g on g.id = p.game_id
    where p.user_id = coin and g.week_id in (select id from done_weeks)
    group by g.week_id
  ),
  coin_adj as (
    select week_id, points, correct, decided, cfb_points, nfl_points
    from public.score_adjustments where user_id = coin
  )
  insert into public.score_adjustments (user_id, week_id, points, correct, decided, cfb_points, nfl_points, note)
  select uid, d.id,
    coalesce(cp.pts, 0) + coalesce(ca.points, 0),
    coalesce(cp.correct, 0) + coalesce(ca.correct, 0),
    coalesce(cp.decided, 0) + coalesce(ca.decided, 0),
    coalesce(cp.cfb, 0) + coalesce(ca.cfb_points, 0),
    coalesce(cp.nfl, 0) + coalesce(ca.nfl_points, 0),
    'joined after this week, gets coin''s score'
  from done_weeks d
  left join coin_picks cp on cp.week_id = d.id
  left join coin_adj ca on ca.week_id = d.id
  where not exists (
    select 1 from public.picks p join public.games g on g.id = p.game_id
    where p.user_id = uid and g.week_id = d.id
  )
  on conflict (user_id, week_id) do nothing;
end;
$$;
revoke execute on function public.backfill_with_coin(uuid) from public, anon, authenticated;

create function public.on_member_approved() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.approved and not coalesce(old.approved, false) and not new.is_bot then
    perform public.backfill_with_coin(new.id);
  end if;
  return new;
end;
$$;
revoke execute on function public.on_member_approved() from public, anon, authenticated;

create trigger on_member_approved
  after update of approved on public.profiles
  for each row execute function public.on_member_approved();
