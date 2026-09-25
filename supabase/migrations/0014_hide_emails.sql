-- review fixes, part 2: members can read each other's profiles, but not emails.
-- apply only after the app stops selecting profiles.* (it would error on email).
revoke select on public.profiles from authenticated;
grant select (id, name, avatar_url, is_admin, approved, is_bot, onboarded, marker_color, marker_font, created_at)
  on public.profiles to authenticated;
