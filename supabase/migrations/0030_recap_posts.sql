-- the bot posts each week's recap card to discord once (lib/recap-poster.ts)
alter table public.weeks add column recap_posted_at timestamptz;
-- weeks that wrapped before the bot existed don't post
update public.weeks set recap_posted_at = now() where id in (3, 5, 6, 7);
