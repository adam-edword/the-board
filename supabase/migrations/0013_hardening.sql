-- review fixes, part 1 (safe to apply before the app code changes)

-- the server decides whether a pick counts as an admin edit and when it was
-- made. players can't set `edited` or backdate `updated_at` themselves.
-- rows written without a session (sql editor, back-fills) and rows written by
-- other triggers (the coin flip) keep whatever they were given.
create function public.picks_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  new.updated_at := now();
  new.edited := public.is_admin() and (new.user_id <> auth.uid() or public.game_started(new.game_id));
  return new;
end;
$$;
revoke execute on function public.picks_stamp() from public, anon, authenticated;

create trigger picks_stamp
  before insert or update on public.picks
  for each row execute function public.picks_stamp();

-- names are capped in the app; cap them in the database too
alter table public.profiles add constraint profiles_name_length check (char_length(name) between 1 and 40);

-- emails are admin-only (see 0014). the admin people list reads them through this.
create function public.admin_people() returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.email from public.profiles p where public.is_admin();
$$;
revoke execute on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;
