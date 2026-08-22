-- Party Mode (Phase 1 — lobby only, no live battle loop yet): a host
-- creates a room with a shareable code, sets subject/grade/time/team
-- count/ranked, and others join and pick a team. Starting the actual
-- synchronized battle is a separate, later phase.

create table if not exists public.party_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  grade_level integer not null,
  seconds_per_question integer not null default 15,
  team_count integer not null default 2,
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

alter table public.party_rooms enable row level security;
alter table public.party_participants enable row level security;

create policy "Party rooms are viewable by everyone" on public.party_rooms for select using (true);
create policy "Hosts can create their own room" on public.party_rooms for insert with check (auth.uid() = host_id);
create policy "Hosts can update their own room" on public.party_rooms for update using (auth.uid() = host_id);

create policy "Party participants are viewable by everyone" on public.party_participants for select using (true);
create policy "Users can join as themselves" on public.party_participants for insert with check (auth.uid() = user_id);
create policy "Users can update their own team" on public.party_participants for update using (auth.uid() = user_id);
create policy "Users can leave a room" on public.party_participants for delete using (auth.uid() = user_id);

create index if not exists party_participants_room_idx on public.party_participants (room_id);
create index if not exists party_rooms_code_idx on public.party_rooms (code);
