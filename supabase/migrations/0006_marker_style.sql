-- per-person marker color + handwriting font for their name on the board
alter table public.profiles
  add column marker_color text not null default 'white'
    check (marker_color in ('white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink')),
  add column marker_font text not null default 'kalam'
    check (marker_font in ('kalam', 'permanent-marker', 'caveat', 'rock-salt', 'gochi-hand', 'sedgwick-ave'));

grant update (name, marker_color, marker_font) on public.profiles to authenticated;
