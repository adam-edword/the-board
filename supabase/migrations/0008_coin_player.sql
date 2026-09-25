-- "coin": a bot player that flips a random side on every game and competes
-- like everyone else. bots don't have a login, so profiles no longer require
-- a matching auth user (deleting a real user still removes their profile).

alter table public.profiles add column is_bot boolean not null default false;
alter table public.profiles drop constraint profiles_id_fkey;

create function public.handle_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;
revoke execute on function public.handle_deleted_user() from public, anon, authenticated;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_deleted_user();

insert into public.profiles (id, email, name, approved, is_bot, marker_color, marker_font)
values ('00000000-0000-0000-0000-00000000c014', null, 'coin', true, true, 'yellow', 'pangolin');

-- every new game gets a coin flip
create function public.coin_flip() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.picks (user_id, game_id, side)
  values ('00000000-0000-0000-0000-00000000c014', new.id, case when random() < 0.5 then 'home' else 'away' end)
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.coin_flip() from public, anon, authenticated;

create trigger on_game_created
  after insert on public.games
  for each row execute function public.coin_flip();
