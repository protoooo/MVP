-- Device seat licensing
create extension if not exists "pgcrypto";

create table if not exists public.device_seats (
  id uuid primary key default gen_random_uuid(),
  purchaser_user_id uuid not null,
  invite_code_hash text not null,
  invite_code_last4 text,
  status text not null default 'available' check (status in ('available','claimed')),
  claimed_user_id uuid,
  claimed_at timestamptz,
  revoked_at timestamptz,
  device_fingerprint text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.device_seats
  add constraint device_seats_last4_check
  check (invite_code_last4 is null or char_length(invite_code_last4) = 4);

create index if not exists device_seats_purchaser_idx on public.device_seats(purchaser_user_id);
create index if not exists device_seats_claimer_idx on public.device_seats(claimed_user_id);
create index if not exists device_seats_hash_idx on public.device_seats(invite_code_hash);

create table if not exists public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  purchaser_user_id uuid not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  quantity integer not null default 1,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_seats_set_updated on public.device_seats;
create trigger device_seats_set_updated
before update on public.device_seats
for each row
execute function public.set_updated_at();

drop trigger if exists stripe_subscriptions_set_updated on public.stripe_subscriptions;
create trigger stripe_subscriptions_set_updated
before update on public.stripe_subscriptions
for each row
execute function public.set_updated_at();

alter table public.device_seats enable row level security;
alter table public.stripe_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'device_seats' and policyname = 'purchaser_manage_seats'
  ) then
    create policy purchaser_manage_seats
      on public.device_seats
      for all
      using (auth.uid() = purchaser_user_id)
      with check (auth.uid() = purchaser_user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'device_seats' and policyname = 'claimer_read_seat'
  ) then
    create policy claimer_read_seat
      on public.device_seats
      for select
      using (auth.uid() = claimed_user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'stripe_subscriptions' and policyname = 'purchaser_read_subscription'
  ) then
    create policy purchaser_read_subscription
      on public.stripe_subscriptions
      for select
      using (auth.uid() = purchaser_user_id);
  end if;
end $$;
