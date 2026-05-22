-- Run this SQL manually in Supabase SQL Editor.
-- Adds lightweight Mini App analytics without removing existing data.

alter table app_users
  add column if not exists first_seen_at timestamptz,
  add column if not exists visit_count integer not null default 0,
  add column if not exists last_route text,
  add column if not exists last_platform text;

alter table app_users
  alter column first_seen_at set default now();

update app_users
set
  first_seen_at = coalesce(first_seen_at, created_at, now()),
  visit_count = coalesce(visit_count, 0),
  updated_at = coalesce(updated_at, now())
where first_seen_at is null
   or visit_count is null
   or updated_at is null;

create table if not exists user_activity_log (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint,
  username text,
  event_type text not null,
  event_target text,
  route text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists user_activity_log_user_idx
  on user_activity_log(telegram_user_id);

create index if not exists user_activity_log_event_type_idx
  on user_activity_log(event_type);

create index if not exists user_activity_log_created_at_idx
  on user_activity_log(created_at desc);

create index if not exists user_activity_log_route_idx
  on user_activity_log(route);

create index if not exists app_users_last_seen_idx
  on app_users(last_seen_at desc);
