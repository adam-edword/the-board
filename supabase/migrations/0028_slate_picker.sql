-- an agent picks each week's games (src/lib/slate-picker.ts). its weeks are
-- locked in admin, each game keeps a line on why it made the board.
alter table public.weeks add column auto_slate boolean not null default false;
alter table public.games add column slate_reason text check (char_length(slate_reason) <= 300);
alter table public.sync_state add column slate_attempted_at timestamptz not null default 'epoch';
