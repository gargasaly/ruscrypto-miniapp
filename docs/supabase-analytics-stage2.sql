-- Optional indexes for Admin Analytics stage 2.
-- Run manually in Supabase SQL Editor if analytics lists become slow.

create index if not exists user_activity_log_created_event_idx
  on user_activity_log(created_at desc, event_type);

create index if not exists user_activity_log_target_idx
  on user_activity_log(event_target);

create index if not exists user_activity_log_user_created_idx
  on user_activity_log(telegram_user_id, created_at desc);

create index if not exists check_history_symbol_created_idx
  on check_history(symbol, created_at desc);

create index if not exists payment_events_status_created_idx
  on payment_events(status, created_at desc);
