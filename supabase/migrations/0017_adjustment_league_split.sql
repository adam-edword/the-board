-- optional college / nfl split for flat point adjustments, so the weekly
-- breakdown in standings can show them in the right column. adjustments
-- without a split (admin bonus/penalty) only count toward the total.
alter table public.score_adjustments
  add column cfb_points int,
  add column nfl_points int;

-- the remaining whiteboard back-fills, split per the whiteboard totals
update public.score_adjustments a set cfb_points = v.cfb, nfl_points = v.nfl
from (values
  ('00000000-0000-0000-0000-00000000c014'::uuid, 'week 0', 1, 0),
  ('a7cdf99e-8600-4a11-906a-da95af2be31a'::uuid, 'week 0', 1, 0),
  ('a7cdf99e-8600-4a11-906a-da95af2be31a'::uuid, 'week 1', 2, 2),
  ('a7cdf99e-8600-4a11-906a-da95af2be31a'::uuid, 'week 2', 4, 0)
) as v(user_id, label, cfb, nfl), public.weeks w
where a.user_id = v.user_id and w.id = a.week_id and w.label = v.label and w.season = 2026 and a.edited = false;
