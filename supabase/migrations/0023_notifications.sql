-- discord posts the cron job has already sent, so each reminder / report goes
-- out once per week no matter how often the job runs. the job claims a row
-- before posting and deletes it again if the post fails.
create table public.notifications (
  week_id  bigint not null references public.weeks (id) on delete cascade,
  kind     text not null check (kind in ('remind_24h', 'remind_1h', 'report')),
  sent_at  timestamptz not null default now(),
  primary key (week_id, kind)
);

-- only the server's secret key touches this (bypasses rls)
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant all on public.notifications to service_role;
