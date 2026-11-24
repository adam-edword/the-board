-- lets an admin have the commissioner make the coming week's board early,
-- before its usual tuesday 9am. cleared once the board exists.
alter table public.sync_state add column slate_now boolean not null default false;
