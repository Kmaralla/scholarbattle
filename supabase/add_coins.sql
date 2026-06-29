-- Add coins to users table
alter table public.users add column if not exists coins integer not null default 0;

-- Add unlocked_games array to track which games each user has unlocked
alter table public.users add column if not exists unlocked_games text[] not null default '{}';
