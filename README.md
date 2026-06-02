# Press Play Media Productions Platform V2

This is the multi-file Supabase version of the Claude prototype.

## Files
- `index.html` — app layout
- `style.css` — visual design
- `config.js` — Supabase URL/key
- `app.js` — app logic, auth, database calls
- `original.html` — original Claude single-file prototype for backup/reference

## Setup
1. Open `config.js`.
2. Replace `PASTE_YOUR_ANON_KEY_HERE` with your Supabase anon/public key.
3. Upload the folder to Vercel as a static site, or test locally.

## Important
This version expects the Supabase tables you created: `content`, `announcements`, `merch`, `comments`, and `profiles`.

The current comments code uses a `section` column. If you have not added it yet, run this in Supabase SQL Editor:

```sql
alter table public.comments add column if not exists section text default 'music';

create policy "authenticated users insert comments"
on comments
for insert
to authenticated
with check (true);

create policy "authenticated users update comments"
on comments
for update
to authenticated
using (true);
```

Admin-only upload/update/delete requires your profile role to be `admin`.
