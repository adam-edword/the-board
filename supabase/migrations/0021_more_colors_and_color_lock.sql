-- six more marker colors, and each color can only belong to one person.
-- people who already share a color keep it; the lock applies to new choices.
alter table public.profiles drop constraint profiles_marker_color_check;
alter table public.profiles add constraint profiles_marker_color_check
  check (marker_color in (
    'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
    'teal', 'lime', 'sky', 'indigo', 'fuchsia', 'tan'
  ));

-- colors other people already have. names are only shown to approved
-- members (people waiting for approval just see that it's taken).
create function public.taken_colors() returns table (color text, name text)
language sql stable security definer set search_path = '' as $$
  select p.marker_color, case when public.is_approved() then p.name end
  from public.profiles p
  where p.onboarded and not p.is_bot and p.id <> auth.uid();
$$;
revoke execute on function public.taken_colors() from public, anon;
grant execute on function public.taken_colors() to authenticated;

-- block picking a color someone else has (on a change, or when finishing
-- onboarding with the default). keeping the color you already have is fine.
create function public.profiles_color_lock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_bot and new.onboarded
     and (new.marker_color is distinct from old.marker_color or not old.onboarded)
     and exists (
       select 1 from public.profiles p
       where p.id <> new.id and p.onboarded and not p.is_bot and p.marker_color = new.marker_color
     ) then
    raise exception 'marker color % is taken', new.marker_color using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_color_lock() from public, anon, authenticated;

create trigger profiles_color_lock
  before update of marker_color, onboarded on public.profiles
  for each row execute function public.profiles_color_lock();
