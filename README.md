# the board

weekly football picks for the group. replaces the whiteboard.

live at https://theboard.eddtv.org (self-hosted on coolify, auto-deploys from `main`).

## what it does

- **the board:** one tile per game. tap a side to write your name under it in your own marker color + font. picks lock at kickoff. names are hand-drawn-ish and never overlap.
- **scoring:** 1 point per correct pick, 2 for the week's featured game. a tie counts as right for everyone who picked the game. scores and results come from espn automatically.
- **coin:** a bot player that flips a random side on every game. it shows up as a coin in the corner of the side it took.
- **standings:** points, record, week wins, weeks beating the coin, and a "contra" stat. past seasons stay viewable, with a champion banner.
- **player pages:** tap a name for their season: points by week, featured record, picking style.
- **weekly recap:** once a week is final: winner, last place, featured game, upset of the week, who the coin beat.
- **onboarding:** new people pick a name, marker color and font on first visit. the admin approves them before they can see the board.
- **admin:** pick each week's games from espn, star the featured game, fix picks (shown with an asterisk), approve people, start a new season.

## stack

next.js 16 (app router) · supabase (postgres, google sign-in, row level security) · shadcn/ui · espn's public scoreboard api · docker on coolify.

## env vars (all runtime)

see `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SITE_URL`, optional `CRON_SECRET`.

## database

migrations live in `supabase/migrations/` and are already applied to the "the board" supabase project. new ones get applied in order.

to make someone admin by hand:

```sql
update public.profiles set is_admin = true, approved = true where email = 'someone@gmail.com';
```

## google sign-in

google identity services button + `supabase.auth.signInWithIdToken`. the oauth client needs `https://theboard.eddtv.org` (and `http://localhost:3000` for dev) under authorized javascript origins, and the client id/secret in supabase's google provider.

## weekly flow

1. admin → new week (or it's already there)
2. games tab: add games from espn, star the featured one
3. send the link. scores and results fill in on their own.

## local dev

```bash
cp .env.example .env.local   # fill in the secret key
npm install
npm run dev
```
