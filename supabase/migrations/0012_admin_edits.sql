-- admins can fix anyone's picks at any time (late picks texted in, typos, etc).
-- anything an admin changes gets flagged so the board can show an asterisk.
alter table public.picks add column edited boolean not null default false;
alter table public.score_adjustments add column edited boolean not null default false;

create policy "picks admin" on public.picks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
