-- Team Battle: challenge multiple friends at once (from the Friends page),
-- optionally split into 2 teams, same question set for everyone. Each
-- client independently computes the current question from elapsed time
-- since start_at — no live broadcast coordination needed. A team scores a
-- question's point only if EVERY member answered it correctly; among
-- teams that cleared that bar, the fastest combined answer time wins the
-- point. First team to points_to_win wins the battle. Unranked — no
-- effect on ELO/coins/season standing.

create table if not exists public.team_battles (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  grade_level integer not null,
  seconds_per_question integer not null default 15,
  teams_enabled boolean not null default true,
  question_ids integer[] not null default '{}',
  points_to_win integer not null default 5,
  start_at timestamptz not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  winning_team integer,
  created_at timestamptz not null default now()
);

create table if not exists public.team_battle_participants (
  id uuid primary key default gen_random_uuid(),
  team_battle_id uuid references public.team_battles(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  team_number integer not null,
  status text not null default 'invited' check (status in ('invited','accepted','declined')),
  unique(team_battle_id, user_id)
);

create table if not exists public.team_battle_answers (
  id uuid primary key default gen_random_uuid(),
  team_battle_id uuid references public.team_battles(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  question_index integer not null,
  is_correct boolean not null,
  time_ms integer not null,
  created_at timestamptz not null default now(),
  unique(team_battle_id, user_id, question_index)
);

alter table public.team_battles enable row level security;
alter table public.team_battle_participants enable row level security;
alter table public.team_battle_answers enable row level security;

create policy "Team battles are viewable by everyone" on public.team_battles for select using (true);
create policy "Host can update their own team battle" on public.team_battles for update using (auth.uid() = host_id);

create policy "Team battle participants are viewable by everyone" on public.team_battle_participants for select using (true);
create policy "Users can update their own invite status" on public.team_battle_participants for update using (auth.uid() = user_id);

create policy "Team battle answers are viewable by everyone" on public.team_battle_answers for select using (true);
create policy "Users can insert their own answers" on public.team_battle_answers for insert with check (auth.uid() = user_id);

create index if not exists team_battle_participants_battle_idx on public.team_battle_participants (team_battle_id);
create index if not exists team_battle_answers_battle_idx on public.team_battle_answers (team_battle_id);

-- Creates the battle + invites in one shot. The host needs to create invite
-- rows for OTHER users (the selected friends), which the normal
-- auth.uid() = user_id row policy would block — so this runs as
-- SECURITY DEFINER and checks nothing beyond "caller is authenticated"
-- (inviting friends to a quiz isn't a privileged action, unlike e.g.
-- awarding coins).
create or replace function public.create_team_battle(
  p_subject text,
  p_grade_level integer,
  p_seconds_per_question integer,
  p_teams_enabled boolean,
  p_friend_ids uuid[],
  p_question_ids integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_battle_id uuid;
  v_all_ids uuid[];
  i integer;
  v_team integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.team_battles (host_id, subject, grade_level, seconds_per_question, teams_enabled, question_ids, start_at)
  values (v_uid, p_subject, p_grade_level, p_seconds_per_question, p_teams_enabled, p_question_ids, now() + interval '10 seconds')
  returning id into v_battle_id;

  v_all_ids := array_prepend(v_uid, p_friend_ids);

  for i in 1 .. array_length(v_all_ids, 1) loop
    v_team := case when p_teams_enabled then ((i - 1) % 2) + 1 else i end;
    insert into public.team_battle_participants (team_battle_id, user_id, team_number, status)
    values (v_battle_id, v_all_ids[i], v_team, case when v_all_ids[i] = v_uid then 'accepted' else 'invited' end);
  end loop;

  return v_battle_id;
end;
$$;
