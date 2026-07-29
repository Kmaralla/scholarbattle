-- Track when user first reached Diamond (for the 7-day Legend condition)
alter table public.users add column if not exists diamond_since timestamptz;

-- Wins accumulated while at Diamond or Legend rank
alter table public.users add column if not exists diamond_wins integer not null default 0;
