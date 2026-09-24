# the board

weekly football picks for the group. replaces the whiteboard.

- admin picks which nfl / college games count each week (pulled from espn)
- everyone signs in with google and picks winners straight up on their phone
- picks lock at each game's kickoff, and nobody can see anyone else's pick until then
- scores and results fill in automatically, 1 point per correct pick
- "the board" tab is the whiteboard grid, plus season standings

built with next.js + supabase, hosted on vercel. all free at this size.

## setup

### 1. supabase (done)
the schema in `supabase/migrations/0001_init.sql` is already applied to the "the board" project.

### 2. google sign-in
1. go to [google cloud console](https://console.cloud.google.com/) → create a project
2. apis & services → oauth consent screen → external, fill in app name + your email, publish it
3. credentials → create credentials → oauth client id → web application
   - authorized redirect uri: `https://sdryfdrwpnzxqaajahdu.supabase.co/auth/v1/callback`
4. copy the client id + secret into supabase → authentication → sign in / providers → google, enable it

### 3. deploy on vercel
1. import this repo at [vercel.com/new](https://vercel.com/new)
2. add the env vars from `.env.example` (the secret key is in supabase → project settings → api keys)
3. deploy, then in supabase → authentication → url configuration:
   - site url: your vercel url (e.g. `https://the-board.vercel.app`)
   - redirect urls: add `https://the-board.vercel.app/**` (and `http://localhost:3000/**` for local dev)

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
4. scores update on their own whenever someone has the board open (and once a day via cron)

## local dev
```bash
cp .env.example .env.local   # fill in the secret key
npm install
npm run dev
```
