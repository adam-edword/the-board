-- one-off messages for the bot to post in discord (lib/outbox.ts). "{everyone}"
-- in the text becomes a tag for every player with a discord id.
create table public.bot_messages (
  id bigint generated always as identity primary key,
  content text not null check (char_length(content) <= 1800),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.bot_messages enable row level security;
