-- flat per-week point adjustments, for weeks played on the old whiteboard
-- where we know totals but not the individual picks.
create table public.score_adjustments (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  week_id     bigint not null references public.weeks (id) on delete cascade,
  points      int not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, week_id)
);

alter table public.score_adjustments enable row level security;
create policy "adjustments read" on public.score_adjustments for select to authenticated using (public.is_approved());
create policy "adjustments admin" on public.score_adjustments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.score_adjustments from anon;
grant select, insert, update, delete on public.score_adjustments to authenticated;
grant all on public.score_adjustments to service_role;
