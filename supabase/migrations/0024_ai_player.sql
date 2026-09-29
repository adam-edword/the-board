-- an ai player: a regular member on the board (not a bot like the coin) whose
-- picks are made by claude. picks can carry a short reason, and sync_state
-- throttles how often the pick job runs.
alter table public.profiles add column is_ai boolean not null default false;

alter table public.picks add column reason text;
alter table public.picks add constraint picks_reason_length check (char_length(reason) <= 300);

alter table public.sync_state add column ai_attempted_at timestamptz not null default 'epoch';

-- members read profiles through column grants (see 0014), so add the new one
grant select (is_ai) on public.profiles to authenticated;
