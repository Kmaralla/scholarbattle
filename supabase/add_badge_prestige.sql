-- Add badge_prestige to track bronze/silver/gold level per badge
-- badges array stays as-is (list of earned badge IDs)
-- badge_prestige stores { "badge_id": 1 } where 1=silver, 2=gold (bronze is the default earned state)
alter table public.users add column if not exists badge_prestige jsonb not null default '{}';
