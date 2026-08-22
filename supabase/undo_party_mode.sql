-- Party Mode was reverted in code. Run this if you already applied any of
-- add_party_mode.sql / add_party_tournament_mode.sql / add_tournament_rpc.sql
-- against your database, to remove the now-unused tables and function.
-- Safe to run even if some or all of these were never created.

drop function if exists public.create_tournament_matches(uuid, integer, jsonb);

drop table if exists public.party_tournament_matches cascade;
drop table if exists public.party_participants cascade;
drop table if exists public.party_rooms cascade;
