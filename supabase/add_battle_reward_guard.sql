-- Guards against a battle's ELO/coin/badge reward being claimed more than
-- once (e.g. by calling /api/battle/complete repeatedly for the same
-- battle). Each side of a battle claims independently.
alter table public.battles add column if not exists challenger_rewarded boolean not null default false;
alter table public.battles add column if not exists opponent_rewarded boolean not null default false;
