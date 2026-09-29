-- claude joins as the ai player (see src/lib/ai-player.ts), with a marker
-- color and font of his own that nobody else can pick.
alter table public.profiles drop constraint profiles_marker_color_check;
alter table public.profiles add constraint profiles_marker_color_check
  check (marker_color in (
    'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
    'teal', 'lime', 'cyan', 'lavender', 'magenta', 'gray', 'clay'
  ));

alter table public.profiles drop constraint profiles_marker_font_check;
alter table public.profiles add constraint profiles_marker_font_check
  check (marker_font in (
    'protest-revolution', 'lacquer', 'pangolin', 'fuzzy-bubbles', 'gaegu', 'covered-by-your-grace', 'claude-serif'
  ));

insert into public.profiles (id, name, is_ai, onboarded, marker_color, marker_font)
values ('00000000-0000-0000-0000-00000000c1ad', 'Claude', true, true, 'clay', 'claude-serif');

-- approving him like any new member gives him the coin's score for the weeks
-- he missed (on_member_approved)
update public.profiles set approved = true where id = '00000000-0000-0000-0000-00000000c1ad';
