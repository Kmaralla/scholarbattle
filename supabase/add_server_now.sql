-- Lets clients measure their own clock's offset from the DB server's
-- clock, so time-based sync (like the team battle countdown/schedule)
-- isn't thrown off by one device's system clock running a few seconds
-- fast or slow relative to another's.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now(); $$;

grant execute on function public.server_now() to authenticated;
