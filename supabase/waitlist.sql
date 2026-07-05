-- Run this once in your waitlist Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New query). Creates the table the
-- /waitlist landing page writes to via app/routes/api.waitlist.ts.

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;

-- Anonymous signups can only insert their own row — never read, update, or
-- delete existing rows. View signups from the Supabase Table Editor instead.
create policy "Anyone can join the waitlist"
  on waitlist
  for insert
  to anon
  with check (true);
