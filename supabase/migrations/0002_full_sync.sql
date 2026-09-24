-- tracks the every-few-hours refresh of upcoming kickoff times (replaces the vercel cron)
alter table public.sync_state add column last_full_sync_at timestamptz not null default 'epoch';
