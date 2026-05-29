create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  product text not null,
  status text not null default 'active',
  starts_at timestamptz default now(),
  expires_at timestamptz not null,
  payment_event_id uuid null,
  source text default 'telegram_stars',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_entitlements
  add column if not exists telegram_user_id bigint,
  add column if not exists product text,
  add column if not exists status text default 'active',
  add column if not exists starts_at timestamptz default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists payment_event_id uuid null,
  add column if not exists source text default 'telegram_stars',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists user_entitlements_telegram_user_id_idx
  on public.user_entitlements (telegram_user_id);

create index if not exists user_entitlements_product_idx
  on public.user_entitlements (product);

create index if not exists user_entitlements_expires_at_idx
  on public.user_entitlements (expires_at);

create index if not exists user_entitlements_active_lookup_idx
  on public.user_entitlements (telegram_user_id, product, status, expires_at desc);

create index if not exists user_entitlements_payment_event_id_idx
  on public.user_entitlements (payment_event_id);
