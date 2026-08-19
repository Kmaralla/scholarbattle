-- Server-side tracking for the daily Puzzle training reward, replacing a
-- client-only (localStorage) gate that could be bypassed by clearing
-- browser storage or switching browsers.
alter table public.users add column if not exists last_puzzle_reward_date date;
