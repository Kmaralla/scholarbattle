-- ScholarBattle Database Schema
-- Run this once in your Supabase SQL Editor for a fresh project.
-- This is the consolidated, current-state schema — it replaces the old
-- fragmented migration files (fix_missing_schema.sql, add_coins.sql, etc.)
-- that used to live in this directory.

-- ── Users (extends Supabase auth.users) ─────────────────────────
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  equipped_frame text,
  unlocked_frames text[] not null default '{}',
  elo_rating integer not null default 1000,
  rank_tier text not null default 'bronze',
  grade_level integer not null default 5,
  total_wins integer not null default 0,
  total_battles integer not null default 0,
  season_wins integer not null default 0,
  coins integer not null default 0,
  last_puzzle_reward_date date,
  badges text[] not null default '{}',
  unlocked_games text[] not null default '{}',
  created_at timestamptz default now()
);

-- ── Questions (reserved for future AI-generated question banks —
-- the app currently serves questions from a static bank in code) ──
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('math','science','history','english')),
  grade_level integer not null,
  question_text text not null,
  type text not null check (type in ('multiple_choice','typed')),
  options jsonb,
  correct_answer text not null,
  difficulty integer default 2,
  source text default 'curated',
  created_at timestamptz default now()
);

-- ── Battles ──────────────────────────────────────────────────────
-- question_ids stores integer indices into the static question bank in code,
-- not references to the (currently unused) questions table above.
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references public.users(id) not null,
  opponent_id uuid references public.users(id) not null,
  subject text not null,
  grade_level integer not null,
  status text not null default 'pending' check (status in ('pending','accepted','in_progress','completed','declined')),
  winner_id uuid references public.users(id),
  challenger_score integer default 0,
  opponent_score integer default 0,
  question_ids integer[] default '{}',
  challenger_rewarded boolean not null default false,
  opponent_rewarded boolean not null default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ── Friendships ──────────────────────────────────────────────────
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  friend_id uuid references public.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- ── Battle answers ───────────────────────────────────────────────
create table if not exists public.battle_answers (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references public.battles(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  question_id text not null,
  answer text not null,
  is_correct boolean not null,
  time_ms integer not null,
  created_at timestamptz default now()
);

-- ── ELO history (reserved for a future rating-over-time graph —
-- nothing currently writes to this table) ───────────────────────
create table if not exists public.elo_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  battle_id uuid references public.battles(id) on delete cascade,
  old_elo integer not null,
  new_elo integer not null,
  delta integer not null,
  created_at timestamptz default now()
);

-- ── Friend chat messages ─────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ── AI report cards ──────────────────────────────────────────────
create table if not exists public.report_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  subject text not null,
  grade integer not null,
  my_score integer not null,
  total_questions integer not null,
  card_data jsonb not null,
  created_at timestamptz default now()
);

-- ── Seasons (monthly leaderboard resets) ────────────────────────
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

-- ── Party Mode (Phase 1 — lobby only, no live battle loop yet) ──
-- A host creates a room with a shareable code, sets subject/grade/time/team
-- count/ranked, and others join and pick a team.
-- mode: 'teams' (team-based lobby) or 'tournament' (single-elimination
-- bracket of ordinary 1v1 battles — reuses the existing battles table /
-- BattleRoom / reward pipeline, not a new N-player game loop).
create table if not exists public.party_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  grade_level integer not null,
  seconds_per_question integer not null default 15,
  mode text not null default 'teams' check (mode in ('teams','tournament')),
  team_count integer not null default 2,
  team_size integer,
  max_players integer,
  ranked boolean not null default false,
  status text not null default 'lobby' check (status in ('lobby','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.party_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.party_rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  team_number integer not null,
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

create table if not exists public.party_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.party_rooms(id) on delete cascade not null,
  round integer not null,
  slot integer not null,
  player_a_id uuid references public.users(id),
  player_b_id uuid references public.users(id),
  battle_id uuid references public.battles(id),
  winner_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique(room_id, round, slot)
);

create index if not exists party_participants_room_idx on public.party_participants (room_id);
create index if not exists party_rooms_code_idx on public.party_rooms (code);
create index if not exists party_tournament_matches_room_idx on public.party_tournament_matches (room_id, round);

-- ── Row Level Security ───────────────────────────────────────────
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.battles enable row level security;
alter table public.friendships enable row level security;
alter table public.battle_answers enable row level security;
alter table public.elo_history enable row level security;
alter table public.messages enable row level security;
alter table public.report_cards enable row level security;
alter table public.seasons enable row level security;
alter table public.season_results enable row level security;
alter table public.party_rooms enable row level security;
alter table public.party_participants enable row level security;
alter table public.party_tournament_matches enable row level security;

-- Users
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Questions
create policy "Questions are viewable by authenticated users" on public.questions for select using (auth.role() = 'authenticated');

-- Battles
create policy "Battles viewable by participants" on public.battles for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);
create policy "Authenticated users can create battles" on public.battles for insert with check (auth.uid() = challenger_id);
create policy "Participants can update battles" on public.battles for update using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Friendships
create policy "Friendships viewable by owner" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can create friendships" on public.friendships for insert with check (auth.uid() = user_id);
create policy "Users can delete their own friendships" on public.friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can update friendships they are part of" on public.friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);

-- Battle answers
create policy "Battle answers viewable by participants" on public.battle_answers for select using (true);
create policy "Users can insert own answers" on public.battle_answers for insert with check (auth.uid() = user_id);

-- ELO history
create policy "ELO history viewable by owner" on public.elo_history for select using (auth.uid() = user_id);
create policy "ELO history insertable by authenticated" on public.elo_history for insert with check (auth.role() = 'authenticated');

-- Messages
create policy "Users can view their own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Report cards — public read (shareable links), owner-only insert
create policy "Public read report cards" on public.report_cards for select using (true);
create policy "Users insert own report cards" on public.report_cards for insert with check (auth.uid() = user_id);

-- Seasons — public read only; all writes happen via rollover_season_if_due()
create policy "Seasons are viewable by everyone" on public.seasons for select using (true);
create policy "Season results are viewable by everyone" on public.season_results for select using (true);

-- Party Mode
create policy "Party rooms are viewable by everyone" on public.party_rooms for select using (true);
create policy "Hosts can create their own room" on public.party_rooms for insert with check (auth.uid() = host_id);
create policy "Hosts can update their own room" on public.party_rooms for update using (auth.uid() = host_id);
create policy "Party participants are viewable by everyone" on public.party_participants for select using (true);
create policy "Users can join as themselves" on public.party_participants for insert with check (auth.uid() = user_id);
create policy "Users can update their own team" on public.party_participants for update using (auth.uid() = user_id);
create policy "Users can leave a room" on public.party_participants for delete using (auth.uid() = user_id);

create policy "Tournament matches are viewable by everyone" on public.party_tournament_matches for select using (true);
create policy "Host can create tournament matches" on public.party_tournament_matches for insert with check (
  exists (select 1 from public.party_rooms where id = room_id and host_id = auth.uid())
);
create policy "Match participants or host can update winner" on public.party_tournament_matches for update using (
  auth.uid() = player_a_id or auth.uid() = player_b_id
  or exists (select 1 from public.party_rooms where id = room_id and host_id = auth.uid())
);

-- ── Indexes ──────────────────────────────────────────────────────
create index if not exists users_elo_rating_idx on public.users (elo_rating desc);
create index if not exists battles_challenger_status_idx on public.battles (challenger_id, status);
create index if not exists battles_opponent_status_idx on public.battles (opponent_id, status);
create index if not exists friendships_user_status_idx on public.friendships (user_id, status);
create index if not exists questions_subject_grade_idx on public.questions (subject, grade_level);
create index if not exists messages_conversation_idx on public.messages (sender_id, receiver_id, created_at);

-- ── Helper functions ─────────────────────────────────────────────

-- Increment helper for wins/battles
create or replace function increment(x integer)
returns integer language sql as $$
  select x + 1;
$$;

-- Called when a user accepts a friend request — marks the original request
-- accepted and creates the reverse-direction row so both users can query
-- "where user_id = me".
create or replace function public.accept_friend(
  request_id uuid,
  requester uuid,
  accepter uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friendships
  set status = 'accepted'
  where id = request_id
    and user_id = requester
    and friend_id = accepter;

  insert into public.friendships (user_id, friend_id, status)
  values (accepter, requester, 'accepted')
  on conflict (user_id, friend_id) do update set status = 'accepted';
end;
$$;

-- Called when a user removes a friend — deletes both directions.
create or replace function public.remove_friend(
  user_a uuid,
  user_b uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (user_id = user_a and friend_id = user_b)
     or (user_id = user_b and friend_id = user_a);
end;
$$;

-- Closes out the active season once it's past its end date: snapshots the
-- top 10 by season_wins into season_results, pays out coins, resets everyone's
-- season_wins to 0, and starts the next season. Safe to call repeatedly —
-- it only acts when an active season exists and is actually overdue, and the
-- row lock below means concurrent cron invocations can't double-fire it.
-- Invoked on a schedule by src/app/api/cron/season-rollover.
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

-- ── Locking down competitive columns ─────────────────────────────
-- coins/ELO/rank/badges/unlocks are not directly writable by clients —
-- only through the SECURITY DEFINER functions below, which validate real
-- prices/ownership/reward amounts instead of trusting client-supplied
-- values. See supabase/lock_down_competitive_columns.sql for the full
-- rationale.

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

-- Buys (or, if already owned, just equips) a frame. Price is looked up
-- here, not trusted from the client.
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

-- Unlocks a mini-game. Price is looked up here, not trusted from the client.
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

-- Claims the daily Puzzle training reward. Amount is hardcoded here, not
-- trusted from the client. Returns true if awarded, false if already
-- claimed today.
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

-- Bracket generation needs the HOST to create battles between two OTHER
-- paired players, but the battles table's insert policy only allows
-- auth.uid() = challenger_id. This bypasses that for the host specifically,
-- checking host-ness explicitly instead. p_pairings is a JSON array of
-- { slot, player_a, player_b, question_ids, bye_winner }.
create or replace function public.create_tournament_matches(
  p_room_id uuid,
  p_round integer,
  p_pairings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room record;
  pairing jsonb;
  v_battle_id uuid;
  v_player_a uuid;
  v_player_b uuid;
  v_bye_winner uuid;
  v_qids integer[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_room from public.party_rooms where id = p_room_id;
  if v_room is null then
    raise exception 'room not found';
  end if;
  if v_room.host_id != v_uid then
    raise exception 'only the host can generate bracket rounds';
  end if;

  for pairing in select * from jsonb_array_elements(p_pairings)
  loop
    v_player_a := nullif(pairing->>'player_a', '')::uuid;
    v_player_b := nullif(pairing->>'player_b', '')::uuid;
    v_bye_winner := nullif(pairing->>'bye_winner', '')::uuid;
    v_battle_id := null;

    if v_player_a is not null and v_player_b is not null then
      select coalesce(array_agg(x::integer), '{}') into v_qids
      from jsonb_array_elements_text(coalesce(pairing->'question_ids', '[]'::jsonb)) as x;

      insert into public.battles (challenger_id, opponent_id, subject, grade_level, status, challenger_score, opponent_score, question_ids)
      values (v_player_a, v_player_b, v_room.subject, v_room.grade_level, 'in_progress', 0, 0, v_qids)
      returning id into v_battle_id;
    end if;

    insert into public.party_tournament_matches (room_id, round, slot, player_a_id, player_b_id, battle_id, winner_id)
    values (p_room_id, p_round, (pairing->>'slot')::integer, v_player_a, v_player_b, v_battle_id, v_bye_winner);
  end loop;
end;
$$;

-- ── Seed data ────────────────────────────────────────────────────

-- Start the first season
insert into public.seasons (season_number, starts_at, ends_at, status)
select 1, now(), now() + interval '1 month', 'active'
where not exists (select 1 from public.seasons);
