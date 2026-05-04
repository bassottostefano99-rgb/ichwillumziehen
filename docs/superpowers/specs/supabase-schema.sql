-- Supabase schema for ichwillumziehen.com
-- Apply via Supabase SQL Editor on first project setup.

-- profiles: 1 row per user
create table profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  income            integer,
  kv                text check (kv in ('g','p')),
  kv_betrag         integer default 0,
  auto              text check (auto in ('ja','nein')),
  auto_rate         integer default 0,
  auto_benzin       integer default 0,
  auto_versicherung integer default 0,
  auto_oepnv        integer default 0,
  city              text,
  lebenshaltung     jsonb default '{}'::jsonb,
  updated_at        timestamptz default now()
);

create table wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  price_cents integer not null,
  image_url   text,
  link_url    text,
  note        text,
  created_at  timestamptz default now()
);
create index wishlist_items_user_created on wishlist_items(user_id, created_at desc);

-- Row Level Security: every user sees only their own data
alter table profiles enable row level security;
create policy "own profile select" on profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table wishlist_items enable row level security;
create policy "own items select"    on wishlist_items for select using (auth.uid() = user_id);
create policy "own items insert"    on wishlist_items for insert with check (auth.uid() = user_id);
create policy "own items update"    on wishlist_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items delete"    on wishlist_items for delete using (auth.uid() = user_id);
