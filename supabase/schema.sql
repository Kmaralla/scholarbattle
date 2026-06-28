-- ScholarBattle Database Schema
-- Run this in your Supabase SQL Editor

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  elo_rating integer not null default 1000,
  rank_tier text not null default 'bronze',
  grade_level integer not null default 5,
  total_wins integer not null default 0,
  total_battles integer not null default 0,
  created_at timestamptz default now()
);

-- Questions
create table public.questions (
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

-- Battles
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references public.users(id) not null,
  opponent_id uuid references public.users(id) not null,
  subject text not null,
  grade_level integer not null,
  status text not null default 'pending' check (status in ('pending','accepted','in_progress','completed','declined')),
  winner_id uuid references public.users(id),
  challenger_score integer default 0,
  opponent_score integer default 0,
  question_ids uuid[] default '{}',
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  friend_id uuid references public.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- Battle answers
create table public.battle_answers (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references public.battles(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  question_id text not null,
  answer text not null,
  is_correct boolean not null,
  time_ms integer not null,
  created_at timestamptz default now()
);

-- ELO history
create table public.elo_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  battle_id uuid references public.battles(id) on delete cascade,
  old_elo integer not null,
  new_elo integer not null,
  delta integer not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.battles enable row level security;
alter table public.friendships enable row level security;
alter table public.battle_answers enable row level security;
alter table public.elo_history enable row level security;

-- RLS Policies
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

create policy "Questions are viewable by authenticated users" on public.questions for select using (auth.role() = 'authenticated');

create policy "Battles viewable by participants" on public.battles for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);
create policy "Authenticated users can create battles" on public.battles for insert with check (auth.uid() = challenger_id);
create policy "Participants can update battles" on public.battles for update using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "Friendships viewable by owner" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can create friendships" on public.friendships for insert with check (auth.uid() = user_id);

create policy "Battle answers viewable by participants" on public.battle_answers for select using (true);
create policy "Users can insert own answers" on public.battle_answers for insert with check (auth.uid() = user_id);

create policy "ELO history viewable by owner" on public.elo_history for select using (auth.uid() = user_id);
create policy "ELO history insertable by authenticated" on public.elo_history for insert with check (auth.role() = 'authenticated');

-- Indexes
create index on public.users (elo_rating desc);
create index on public.battles (challenger_id, status);
create index on public.battles (opponent_id, status);
create index on public.friendships (user_id, status);
create index on public.questions (subject, grade_level);

-- Helper: increment function for wins/battles
create or replace function increment(x integer)
returns integer language sql as $$
  select x + 1;
$$;
