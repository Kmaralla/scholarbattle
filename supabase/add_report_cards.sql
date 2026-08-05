create table if not exists public.report_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,
  subject      text not null,
  grade        integer not null,
  my_score     integer not null,
  total_questions integer not null,
  card_data    jsonb not null,
  created_at   timestamptz default now()
);

alter table public.report_cards enable row level security;

-- Anyone with the link can view
create policy "Public read report cards"
  on public.report_cards for select
  using (true);

-- Only the owner can insert
create policy "Users insert own report cards"
  on public.report_cards for insert
  with check (auth.uid() = user_id);
