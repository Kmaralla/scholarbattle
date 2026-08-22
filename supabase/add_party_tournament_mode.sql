-- Adds a mode choice to Party Mode: 'teams' (existing lobby) or
-- 'tournament' (a single-elimination bracket of ordinary 1v1 battles —
-- reuses the existing battles table/BattleRoom/reward pipeline entirely,
-- rather than needing a new N-player synchronized game loop).

alter table public.party_rooms add column if not exists mode text not null default 'teams' check (mode in ('teams','tournament'));
alter table public.party_rooms add column if not exists team_size integer;
alter table public.party_rooms add column if not exists max_players integer;

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

alter table public.party_tournament_matches enable row level security;

create policy "Tournament matches are viewable by everyone" on public.party_tournament_matches for select using (true);

-- Only the host generates rounds (bracket creation / advancing to the next round)
create policy "Host can create tournament matches" on public.party_tournament_matches for insert with check (
  exists (select 1 from public.party_rooms where id = room_id and host_id = auth.uid())
);

-- Either player in a match can report its winner (synced from their own
-- battle's result once it completes), or the host, as a fallback.
create policy "Match participants or host can update winner" on public.party_tournament_matches for update using (
  auth.uid() = player_a_id or auth.uid() = player_b_id
  or exists (select 1 from public.party_rooms where id = room_id and host_id = auth.uid())
);

create index if not exists party_tournament_matches_room_idx on public.party_tournament_matches (room_id, round);
