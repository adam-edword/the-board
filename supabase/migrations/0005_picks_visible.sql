-- picks are visible to every approved member right away, like the old whiteboard.
-- they still lock at kickoff (insert/update/delete policies unchanged).
drop policy "picks read" on public.picks;
create policy "picks read" on public.picks for select to authenticated
  using (public.is_approved());
