# the board

weekly football picks for the group. replaces the whiteboard.

live at https://theboard.eddtv.org (self-hosted on coolify, auto-deploys from `main`).

## what it does

- **the board:** one tile per game. tap a side to write your name under it in your own marker color + font. picks lock at kickoff. names are hand-drawn-ish and never overlap.
- **scoring:** 1 point per correct pick, 2 for the week's featured game. a tie counts as right for everyone who picked the game. scores and results come from espn automatically.
- **coin:** a bot player that flips a random side on every game. it shows up as a coin in the corner of the side it took. miss a pick and at kickoff you get coin's side (marked with a little coin next to your name). people who join mid-season get coin's score for the weeks they missed.
- **standings:** points, record, week wins, weeks beating the coin, and a "contra" stat. past seasons stay viewable, with a champion banner.
- **player pages:** tap a name for their season: points by week, featured record, picking style.
- **weekly recap:** once a week is final: winner, last place, featured game, upset of the week, who the coin beat.
- **discord:** optional webhook posts. a reminder 24h and 1h before each week's first kickoff (with who still needs picks), and the recap + standings once the week is final.
- **onboarding:** new people pick a name, marker color and font on first visit. the admin approves them before they can see the board.
- **admin:** pick each week's games from espn, star the featured game, fix picks (shown with an asterisk), approve people, start a new season.

## stack

next.js 16 (app router) · supabase (postgres, google sign-in, row level security) · shadcn/ui · espn's public scoreboard api · docker on coolify.

## env vars (all runtime)

see `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SITE_URL`, optional `CRON_SECRET` and `DISCORD_WEBHOOK_URL`.

## discord reminders + reports

set `CRON_SECRET` and `DISCORD_WEBHOOK_URL`, then add a coolify scheduled task (app > scheduled tasks) that runs every 15 minutes (`*/15 * * * *`):

```sh
wget -qO- --header="Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron
```

each run syncs scores and posts whatever is due. `public.notifications` remembers what went out, so every reminder / report posts once per week.

## database

migrations live in `supabase/migrations/` and are already applied to the "the board" supabase project. new ones get applied in order.

to make someone admin by hand:

```sql
update public.profiles set is_admin = true, approved = true
where id = (select id from auth.users where email = 'someone@gmail.com');
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

### local dev with local supabase

no secrets or google oauth needed, just docker.

#### prerequisites

- **node 20.9+** (what next 16 needs) and npm
- **[docker desktop](https://docs.docker.com/desktop/)**, installed and running. on windows, use the wsl 2 backend.
- **free ports:** 3000 (next), 54321–54324 and 54327 (supabase api, db, studio, mail, logs)
- the supabase cli is **not** needed globally, the `db:*` scripts run it through `npx`

the first `npm run db:start` downloads the supabase images, so it takes a few minutes. after that it starts in seconds.

#### run it

```bash
npm install
npm run db:start   # local supabase: applies every migration + supabase/seed.sql
npm run dev
```

`db:start` also writes `.env.development.local` with the local url + keys. it overrides `.env.local` during `next dev` only, so you don't need `.env.local` at all. delete it to point `npm run dev` back at the real project.

the login page gets dev-only buttons to sign in as the seed users (password `password`):

- **admin**: admin@local.test, approved admin
- **player**: player@local.test, approved player
- **new sign-up**: new@local.test, goes through onboarding and waits for approval

studio is at http://127.0.0.1:54323. `npm run db:reset` wipes the local db back to migrations + seed, `npm run db:stop` shuts it down. score sync works too, since the local secret key is in that file.
