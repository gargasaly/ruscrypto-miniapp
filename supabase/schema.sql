-- Run this SQL manually in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique not null,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create table if not exists public.check_balances (
  telegram_user_id bigint primary key references public.app_users(telegram_user_id) on delete cascade,
  checks_available integer not null default 0,
  checks_used integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.check_history (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint references public.app_users(telegram_user_id) on delete cascade,
  symbol text not null,
  token_id text,
  access_type text not null check (
    access_type in ('free', 'paid_balance', 'admin', 'locked', 'error_no_charge')
  ),
  checks_delta integer not null default 0,
  data_quality text,
  verdict_title text,
  verdict_risk_level text,
  provider_status text,
  created_at timestamptz default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint references public.app_users(telegram_user_id) on delete cascade,
  provider text default 'telegram_stars',
  invoice_payload text,
  telegram_payment_charge_id text,
  stars_amount integer,
  checks_added integer,
  status text check (status in ('created', 'paid', 'failed', 'refunded', 'granted')),
  raw_event jsonb,
  created_at timestamptz default now()
);

alter table public.payment_events
  drop constraint if exists payment_events_status_check;

alter table public.payment_events
  add constraint payment_events_status_check check (
    status in (
      'created',
      'paid',
      'failed',
      'failed_or_unknown_payload',
      'refunded',
      'granted'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_events_invoice_payload_unique'
  ) then
    alter table public.payment_events
      add constraint payment_events_invoice_payload_unique unique (invoice_payload);
  end if;
end;
$$;

create index if not exists app_users_username_idx on public.app_users(username);
create index if not exists check_history_user_created_idx
  on public.check_history(telegram_user_id, created_at desc);
create index if not exists payment_events_user_created_idx
  on public.payment_events(telegram_user_id, created_at desc);
create unique index if not exists payment_events_charge_id_unique_idx
  on public.payment_events(telegram_payment_charge_id)
  where telegram_payment_charge_id is not null;

create or replace function public.consume_check(p_telegram_user_id bigint)
returns public.check_balances
language plpgsql
security definer
as $$
declare
  v_balance public.check_balances;
begin
  update public.check_balances
  set
    checks_available = checks_available - 1,
    checks_used = checks_used + 1,
    updated_at = now()
  where telegram_user_id = p_telegram_user_id
    and checks_available > 0
  returning * into v_balance;

  if not found then
    raise exception 'no-checks-available' using errcode = 'P0001';
  end if;

  return v_balance;
end;
$$;

create or replace function public.add_checks(p_telegram_user_id bigint, p_checks integer)
returns public.check_balances
language plpgsql
security definer
as $$
declare
  v_balance public.check_balances;
begin
  insert into public.check_balances (telegram_user_id, checks_available, checks_used, updated_at)
  values (p_telegram_user_id, greatest(p_checks, 0), 0, now())
  on conflict (telegram_user_id) do update
  set
    checks_available = public.check_balances.checks_available + greatest(p_checks, 0),
    updated_at = now()
  returning * into v_balance;

  return v_balance;
end;
$$;
