-- Season-end rewards now go only to the top 3 (previously top 10, with
-- ranks 4-10 getting a flat 50 coins). Re-defines the existing function.
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
    limit 3
  loop
    rnk := rnk + 1;
    reward := case
      when rnk = 1 then 200
      when rnk = 2 then 150
      when rnk = 3 then 100
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
