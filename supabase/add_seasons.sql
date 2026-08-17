-- Seasonal leaderboard resets: monthly competitive periods with a coin reward
-- for top finishers. A season is rolled over by the rollover_season_if_due()
-- function below, invoked on a schedule by src/app/api/cron/season-rollover.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  season_number integer not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','completed')),
  created_at timestamptz not null default now()
);

-- Only one season can be active at a time
create unique index if not exists seasons_one_active_idx on public.seasons (status) where status = 'active';

create table if not exists public.season_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  rank integer not null,
  season_wins integer not null,
  coins_awarded integer not null,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists season_wins integer not null default 0;

alter table public.seasons enable row level security;
alter table public.season_results enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'seasons' and policyname = 'Seasons are viewable by everyone'
  ) then
    create policy "Seasons are viewable by everyone" on public.seasons for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'season_results' and policyname = 'Season results are viewable by everyone'
  ) then
    create policy "Season results are viewable by everyone" on public.season_results for select using (true);
  end if;
end $$;

-- Seed the first season if none exists yet
insert into public.seasons (season_number, starts_at, ends_at, status)
select 1, now(), now() + interval '1 month', 'active'
where not exists (select 1 from public.seasons);

-- Closes out the active season once it's past its end date: snapshots the
-- top 10 by season_wins into season_results, pays out coins, resets everyone's
-- season_wins to 0, and starts the next season. Safe to call repeatedly —
-- it only acts when an active season exists and is actually overdue, and the
-- row lock below means concurrent cron invocations can't double-fire it.
create or replace function public.rollover_season_if_due()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur record;
  r record;
  rnk integer := 0;
  reward integer;
begin
  select * into cur from public.seasons where status = 'active' order by starts_at desc limit 1 for update;

  if cur is null then
    insert into public.seasons (season_number, starts_at, ends_at, status)
    values (1, now(), now() + interval '1 month', 'active');
    return;
  end if;

  if now() < cur.ends_at then
    return;
  end if;

  for r in
    select id, season_wins
    from public.users
    where season_wins > 0
    order by season_wins desc, elo_rating desc
    limit 10
  loop
    rnk := rnk + 1;
    reward := case
      when rnk = 1 then 200
      when rnk = 2 then 150
      when rnk = 3 then 100
      else 50
    end;

    insert into public.season_results (season_id, user_id, rank, season_wins, coins_awarded)
    values (cur.id, r.id, rnk, r.season_wins, reward);

    update public.users set coins = coins + reward where id = r.id;
  end loop;

  update public.seasons set status = 'completed' where id = cur.id;
  update public.users set season_wins = 0;

  insert into public.seasons (season_number, starts_at, ends_at, status)
  values (cur.season_number + 1, now(), now() + interval '1 month', 'active');
end;
$$;
