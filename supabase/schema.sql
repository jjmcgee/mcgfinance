create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists app_users_email_unique
on public.app_users (lower(email));

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx on public.app_sessions(user_id);
create index if not exists app_sessions_expires_at_idx on public.app_sessions(expires_at);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  code text not null,
  bank_name text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'expense_items_account_code_fkey'
  ) then
    alter table public.expense_items drop constraint expense_items_account_code_fkey;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'transfer_items_to_account_code_fkey'
  ) then
    alter table public.transfer_items drop constraint transfer_items_to_account_code_fkey;
  end if;
end;
$$;

alter table public.accounts add column if not exists id uuid default gen_random_uuid();
alter table public.accounts add column if not exists user_id uuid references public.app_users(id) on delete cascade;
alter table public.accounts add column if not exists code text;
alter table public.accounts add column if not exists bank_name text;
alter table public.accounts add column if not exists created_at timestamptz not null default now();
update public.accounts set id = gen_random_uuid() where id is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'accounts_pkey'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts drop constraint accounts_pkey;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_pkey'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts add constraint accounts_pkey primary key (id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_user_code_key'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts add constraint accounts_user_code_key unique (user_id, code);
  end if;
end;
$$;

create table if not exists public.month_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  month_label text not null,
  wage numeric(10,2) not null default 0,
  float_amount numeric(10,2) not null default 0,
  starting_point numeric(10,2) generated always as (wage - float_amount) stored,
  created_at timestamptz not null default now()
);

alter table public.month_summaries add column if not exists user_id uuid references public.app_users(id) on delete cascade;

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  month_id uuid not null references public.month_summaries(id) on delete cascade,
  name text not null,
  due_day int not null check (due_day between 1 and 31),
  account_code text not null,
  amount numeric(10,2) not null default 0,
  is_recurring boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.expense_items add column if not exists user_id uuid references public.app_users(id) on delete cascade;

create table if not exists public.transfer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  month_id uuid not null references public.month_summaries(id) on delete cascade,
  to_account_code text not null,
  amount numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

alter table public.transfer_items add column if not exists user_id uuid references public.app_users(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'accounts_code_check'
  ) then
    alter table public.accounts drop constraint accounts_code_check;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'expense_items_account_code_check'
  ) then
    alter table public.expense_items drop constraint expense_items_account_code_check;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'transfer_items_to_account_code_check'
  ) then
    alter table public.transfer_items drop constraint transfer_items_to_account_code_check;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expense_items_user_account_fkey'
  ) then
    alter table public.expense_items
      add constraint expense_items_user_account_fkey
      foreign key (user_id, account_code) references public.accounts(user_id, code);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transfer_items_user_account_fkey'
  ) then
    alter table public.transfer_items
      add constraint transfer_items_user_account_fkey
      foreign key (user_id, to_account_code) references public.accounts(user_id, code);
  end if;
end;
$$;

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists month_summaries_user_id_idx on public.month_summaries(user_id);
create index if not exists expense_items_user_id_idx on public.expense_items(user_id);
create index if not exists expense_items_month_id_idx on public.expense_items(month_id);
create index if not exists transfer_items_user_id_idx on public.transfer_items(user_id);
create index if not exists transfer_items_month_id_idx on public.transfer_items(month_id);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.accounts enable row level security;
alter table public.month_summaries enable row level security;
alter table public.expense_items enable row level security;
alter table public.transfer_items enable row level security;

drop policy if exists "Allow anon+authenticated read/write accounts" on public.accounts;
drop policy if exists "Allow authenticated read/write month_summaries" on public.month_summaries;
drop policy if exists "Allow authenticated read/write expense_items" on public.expense_items;
drop policy if exists "Allow anon+authenticated read/write month_summaries" on public.month_summaries;
drop policy if exists "Allow anon+authenticated read/write expense_items" on public.expense_items;
drop policy if exists "Allow anon+authenticated read/write transfer_items" on public.transfer_items;
drop policy if exists "Accounts are private per user" on public.accounts;
drop policy if exists "Months are private per user" on public.month_summaries;
drop policy if exists "Expenses are private per user" on public.expense_items;
drop policy if exists "Transfers are private per user" on public.transfer_items;
