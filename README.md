# the board

weekly football picks for the group. replaces the whiteboard.

- admin picks which nfl / college games count each week (pulled from espn)
- everyone signs in with google and picks winners straight up on their phone
- picks lock at each game's kickoff, and nobody can see anyone else's pick until then
- scores and results fill in automatically, 1 point per correct pick
- "the board" tab is the whiteboard grid, plus season standings

built with next.js + supabase, self-hosted with docker on coolify.

## setup

### 1. supabase (done)
the schema in `supabase/migrations/0001_init.sql` is already applied to the "the board" project.

### 2. google sign-in (google identity services + supabase id token)
1. go to [google cloud console](https://console.cloud.google.com/) → create a project
2. apis & services → oauth consent screen → external, fill in app name + your email, publish it
3. credentials → create credentials → oauth client id → web application
   - authorized javascript origins: `https://theboard.eddtv.org` (and `http://localhost:3000` for dev)
   - no redirect uri needed, the button hands the id token straight to supabase
4. copy the client id + secret into supabase → authentication → sign in / providers → google, enable it

### 3. deploy on coolify
1. coolify → new resource → public/private repo → this repo, branch you want
2. build pack: **dockerfile** (uses the `Dockerfile` in the repo), port **3000**
3. set a domain (e.g. `https://board.example.com`), coolify handles https
4. env vars (all runtime, none need "build variable" checked):
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (values in `.env.example`)
   - `SUPABASE_SECRET_KEY` from supabase → project settings → api keys
   - `SITE_URL` = your domain from step 3
5. deploy, then in supabase → authentication → url configuration:
   - site url: your domain
   - redirect urls: add `https://board.example.com/**` (and `http://localhost:3000/**` for local dev)

no cron needed. scores sync whenever someone has the board open, and upcoming kickoff times get re-checked every 6 hours the same way.

### 4. make yourself admin
sign in once, then run this in the supabase sql editor:

```sql
update public.profiles set is_admin = true, approved = true where email = 'you@gmail.com';
```

after that, approve everyone else from the admin page.

## weekly flow
1. admin → "new week"
2. flip between nfl / college, pick the week, hit "add" on the games you want
3. send the link to the group
4. scores update on their own whenever someone has the board open

## local dev
```bash
cp .env.example .env.local   # fill in the secret key
npm install
npm run dev
```
