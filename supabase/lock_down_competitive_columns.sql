-- Closes the client-side trust gap: coins, ELO, rank, badges, and unlocks
-- were previously writable to ANY value by a logged-in user's own browser
-- (e.g. `supabase.from('users').update({ coins: 999999 })` in devtools —
-- RLS only checked `auth.uid() = id`, not what values were being set).
--
-- Column-level GRANT/REVOKE is a separate privilege layer from RLS: even a
-- row-level-authorized request gets rejected outright if it touches a
-- revoked column. Legitimate changes go through the SECURITY DEFINER
-- functions below instead, which run with elevated privileges (bypassing
-- this REVOKE, same mechanism already used by accept_friend/remove_friend)
-- and validate real prices/ownership/reward amounts server-side rather
-- than trusting whatever the client sends.
--
-- Note: this does not make battle scores themselves server-verified — a
-- client can still misreport what score it got in a battle. What this DOES
-- close is a client setting coins/ELO/etc. directly, independent of any
-- reported outcome at all. Full battle-authoritative scoring (verifying
-- answers server-side) is a separate, larger project.

revoke update (
  coins,
  elo_rating,
  rank_tier,
  total_wins,
  total_battles,
  season_wins,
  badges,
  unlocked_games,
  unlocked_frames,
  equipped_frame,
  last_puzzle_reward_date
) on public.users from authenticated;

-- ── Avatar frames ────────────────────────────────────────────────

-- Buys (or, if already owned, just equips) a frame. Price is looked up
-- here, not trusted from the client, so a client can't pass a fake cost.
create or replace function public.purchase_frame(p_frame_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_price integer;
  v_coins integer;
  v_owned text[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_price := case p_frame_id
    when 'bronze'  then 75
    when 'silver'  then 150
    when 'gold'    then 300
    when 'diamond' then 500
    when 'prism'   then 800
    else null
  end;

  if v_price is null then
    raise exception 'unknown frame: %', p_frame_id;
  end if;

  select coins, unlocked_frames into v_coins, v_owned from public.users where id = v_uid for update;

  if p_frame_id = any(v_owned) then
    update public.users set equipped_frame = p_frame_id where id = v_uid;
    return;
  end if;

  if v_coins < v_price then
    raise exception 'insufficient coins';
  end if;

  update public.users
  set coins = coins - v_price,
      unlocked_frames = array_append(unlocked_frames, p_frame_id),
      equipped_frame = p_frame_id
  where id = v_uid;
end;
$$;

-- Equips an already-owned frame, or pass null to revert to the default look.
create or replace function public.equip_frame(p_frame_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owned text[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_frame_id is null then
    update public.users set equipped_frame = null where id = v_uid;
    return;
  end if;

  select unlocked_frames into v_owned from public.users where id = v_uid;

  if not (p_frame_id = any(v_owned)) then
    raise exception 'frame not owned: %', p_frame_id;
  end if;

  update public.users set equipped_frame = p_frame_id where id = v_uid;
end;
$$;

-- ── Mini-game unlocks ────────────────────────────────────────────

-- Price is looked up here, not trusted from the client.
create or replace function public.unlock_game(p_game_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_price integer;
  v_coins integer;
  v_owned text[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_price := case p_game_id
    when 'speed-quiz' then 400
    else null
  end;

  if v_price is null then
    raise exception 'unknown or free game: %', p_game_id;
  end if;

  select coins, unlocked_games into v_coins, v_owned from public.users where id = v_uid for update;

  if p_game_id = any(v_owned) then
    return;
  end if;

  if v_coins < v_price then
    raise exception 'insufficient coins';
  end if;

  update public.users
  set coins = coins - v_price,
      unlocked_games = array_append(unlocked_games, p_game_id)
  where id = v_uid;
end;
$$;

-- ── Daily puzzle reward ──────────────────────────────────────────

-- Reward amount is hardcoded here, not trusted from the client. Returns
-- true if the reward was actually awarded, false if already claimed today.
create or replace function public.claim_daily_puzzle_reward()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reward constant integer := 25;
  v_updated integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set coins = coins + v_reward,
      last_puzzle_reward_date = current_date
  where id = v_uid
    and (last_puzzle_reward_date is null or last_puzzle_reward_date < current_date);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
