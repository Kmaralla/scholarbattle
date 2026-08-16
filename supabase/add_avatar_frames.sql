-- Avatar frame cosmetics: coin-unlockable, purely visual borders around the avatar
alter table public.users add column if not exists unlocked_frames text[] not null default '{}';
alter table public.users add column if not exists equipped_frame text;
