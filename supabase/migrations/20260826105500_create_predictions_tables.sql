create table if not exists public.user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null,
  created_at timestamptz not null default now(),
  unique(user_id, stock_code)
);

create or replace function public.check_watchlist_limit()
returns trigger
language plpgsql
as $$
declare
  stock_count int;
begin
  select count(*) into stock_count from public.user_watchlists where user_id = new.user_id;
  if stock_count >= 10 then
    raise exception 'Maximum watchlist limit (10) reached for user.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_watchlist_limit_trigger on public.user_watchlists;
create trigger check_watchlist_limit_trigger
before insert on public.user_watchlists
for each row execute function public.check_watchlist_limit();

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  stock_code text not null,
  target_date date not null,
  predicted_price numeric not null,
  created_at timestamptz not null default now(),
  unique(stock_code, target_date)
);

alter table public.user_watchlists enable row level security;

create policy "Users can read their own watchlists"
on public.user_watchlists for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own watchlists"
on public.user_watchlists for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own watchlists"
on public.user_watchlists for delete to authenticated
using ((select auth.uid()) = user_id);


alter table public.predictions enable row level security;

create policy "Anyone can read predictions"
on public.predictions for select to authenticated
using (true);
