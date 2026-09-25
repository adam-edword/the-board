-- swap the marker font lineup. anyone on a retired font moves to the new default.
alter table public.profiles drop constraint profiles_marker_font_check;
update public.profiles set marker_font = 'pangolin'
  where marker_font not in ('protest-revolution', 'lacquer', 'pangolin', 'fuzzy-bubbles', 'gaegu', 'covered-by-your-grace');
alter table public.profiles alter column marker_font set default 'pangolin';
alter table public.profiles add constraint profiles_marker_font_check
  check (marker_font in ('protest-revolution', 'lacquer', 'pangolin', 'fuzzy-bubbles', 'gaegu', 'covered-by-your-grace'));
