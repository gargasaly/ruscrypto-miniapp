create table if not exists portfolio_positions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  symbol text not null,
  amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (telegram_user_id, symbol)
);

create table if not exists portfolio_cash (
  telegram_user_id bigint primary key,
  cash_usd numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table portfolio_positions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists telegram_user_id bigint,
  add column if not exists symbol text,
  add column if not exists amount numeric default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table portfolio_cash
  add column if not exists telegram_user_id bigint,
  add column if not exists cash_usd numeric default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists portfolio_positions_telegram_user_id_symbol_uidx
  on portfolio_positions (telegram_user_id, symbol);

create unique index if not exists portfolio_cash_telegram_user_id_uidx
  on portfolio_cash (telegram_user_id);

create index if not exists portfolio_positions_telegram_user_id_idx
  on portfolio_positions (telegram_user_id);

create index if not exists portfolio_positions_symbol_idx
  on portfolio_positions (symbol);
