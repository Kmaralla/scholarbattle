-- ============================================================
-- ScholarBattle — Comprehensive Schema Fix
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── 1. Add missing columns to users ─────────────────────────
alter table public.users add column if not exists coins integer not null default 0;
alter table public.users add column if not exists badges text[] not null default '{}';
alter table public.users add column if not exists badge_prestige jsonb not null default '{}';
alter table public.users add column if not exists unlocked_games text[] not null default '{}';
alter table public.users add column if not exists diamond_since timestamptz;
alter table public.users add column if not exists diamond_wins integer not null default 0;

-- ── 2. Messages table (for friend chat) ─────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'Users can view their own messages'
  ) then
    create policy "Users can view their own messages" on public.messages
      for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'Users can send messages'
  ) then
    create policy "Users can send messages" on public.messages
      for insert with check (auth.uid() = sender_id);
  end if;
end $$;

create index if not exists messages_conversation_idx
  on public.messages(sender_id, receiver_id, created_at);

-- ── 3. Fix missing friendships policies ─────────────────────
-- DELETE (for declining/removing friends)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'friendships' and policyname = 'Users can delete their own friendships'
  ) then
    create policy "Users can delete their own friendships" on public.friendships
      for delete using (auth.uid() = user_id or auth.uid() = friend_id);
  end if;
end $$;

-- UPDATE (for accepting requests)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'friendships' and policyname = 'Users can update friendships they are part of'
  ) then
    create policy "Users can update friendships they are part of" on public.friendships
      for update using (auth.uid() = user_id or auth.uid() = friend_id);
  end if;
end $$;

-- ── 4. accept_friend function ────────────────────────────────
-- Called when user accepts a friend request
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
  -- Mark the original request as accepted
  update public.friendships
  set status = 'accepted'
  where id = request_id
    and user_id = requester
    and friend_id = accepter;

  -- Create the reverse direction so both users can query "where user_id = me"
  insert into public.friendships (user_id, friend_id, status)
  values (accepter, requester, 'accepted')
  on conflict (user_id, friend_id) do update set status = 'accepted';
end;
$$;

-- ── 5. remove_friend function ────────────────────────────────
-- Called when user removes a friend (deletes both directions)
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

-- ============================================================
-- Done! All missing pieces are now in place.
-- ============================================================
