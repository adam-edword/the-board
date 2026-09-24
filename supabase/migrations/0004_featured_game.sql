-- one featured game per week, worth 2 points instead of 1
alter table public.games add column featured boolean not null default false;
create unique index games_one_featured_per_week on public.games (week_id) where featured;
