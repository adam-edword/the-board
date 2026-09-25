-- first-run onboarding: pick your name, marker color and font
alter table public.profiles add column onboarded boolean not null default false;
update public.profiles set onboarded = true where is_bot;
grant update (name, marker_color, marker_font, onboarded) on public.profiles to authenticated;
