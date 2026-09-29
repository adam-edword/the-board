-- the ai player writes one short summary per week instead of a reason per pick
create table public.ai_summaries (
  week_id bigint primary key references public.weeks(id) on delete cascade,
  summary text not null check (char_length(summary) <= 500),
  created_at timestamptz not null default now()
);
alter table public.ai_summaries enable row level security;
create policy "ai summaries read" on public.ai_summaries for select to authenticated using (public.is_approved());
grant select on public.ai_summaries to authenticated;
