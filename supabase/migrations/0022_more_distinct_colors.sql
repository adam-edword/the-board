-- swap the colors that looked too close to their neighbors for more distinct
-- ones: sky -> cyan, indigo -> lavender, fuchsia -> magenta, tan -> gray.
-- nobody had any of the old ones, but move them just in case.
alter table public.profiles drop constraint profiles_marker_color_check;

update public.profiles set marker_color = case marker_color
  when 'sky' then 'cyan'
  when 'indigo' then 'lavender'
  when 'fuchsia' then 'magenta'
  when 'tan' then 'gray'
end
where marker_color in ('sky', 'indigo', 'fuchsia', 'tan');

alter table public.profiles add constraint profiles_marker_color_check
  check (marker_color in (
    'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
    'teal', 'lime', 'cyan', 'lavender', 'magenta', 'gray'
  ));
