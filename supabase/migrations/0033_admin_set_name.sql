-- admins can rename anyone (members can only rename themselves through rls)
create function public.admin_set_name(uid uuid, new_name text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if char_length(trim(new_name)) not between 1 and 40 then raise exception 'name must be 1 to 40 characters'; end if;
  update public.profiles set name = trim(new_name) where id = uid;
end;
$$;
revoke all on function public.admin_set_name(uuid, text) from public, anon;
grant execute on function public.admin_set_name(uuid, text) to authenticated;
