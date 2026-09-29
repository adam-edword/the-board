-- lets the admin have the ai player pick early (set it, the next run picks
-- every open game in the coming week, then clears it)
alter table public.sync_state add column ai_pick_now boolean not null default false;
