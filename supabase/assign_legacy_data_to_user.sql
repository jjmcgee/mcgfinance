-- One-time migration: attach pre-login legacy rows to one local app user.
-- Usage:
-- 1) Run schema.sql first.
-- 2) Sign up once in the app with your email/password (creates row in app_users).
-- 3) Set target_email below and run this script.

do $$
declare
  target_email text := 'john@mcg.scot';
  target_user_id uuid;
begin
  select id into target_user_id
  from public.app_users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No app_users row found for email: %', target_email;
  end if;

  insert into public.accounts (user_id, code, bank_name, created_at)
  select target_user_id, code, bank_name, created_at
  from public.accounts
  where user_id is null
  on conflict (user_id, code) do update
    set bank_name = excluded.bank_name;

  update public.month_summaries
  set user_id = target_user_id
  where user_id is null;

  update public.expense_items
  set user_id = target_user_id
  where user_id is null;

  update public.transfer_items
  set user_id = target_user_id
  where user_id is null;
end;
$$;
