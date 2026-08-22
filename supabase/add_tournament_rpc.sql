-- Bracket generation needs the HOST to create battles between two OTHER
-- paired players, but the battles table's insert policy only allows
-- auth.uid() = challenger_id (you can only create a battle where you're
-- the challenger). This SECURITY DEFINER function bypasses that for the
-- host specifically, checking host-ness explicitly instead.
--
-- p_pairings is a JSON array of:
--   { "slot": 0, "player_a": "<uuid>"|null, "player_b": "<uuid>"|null,
--     "question_ids": [1,2,3,...], "bye_winner": "<uuid>"|null }
create or replace function public.create_tournament_matches(
  p_room_id uuid,
  p_round integer,
  p_pairings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room record;
  pairing jsonb;
  v_battle_id uuid;
  v_player_a uuid;
  v_player_b uuid;
  v_bye_winner uuid;
  v_qids integer[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_room from public.party_rooms where id = p_room_id;
  if v_room is null then
    raise exception 'room not found';
  end if;
  if v_room.host_id != v_uid then
    raise exception 'only the host can generate bracket rounds';
  end if;

  for pairing in select * from jsonb_array_elements(p_pairings)
  loop
    v_player_a := nullif(pairing->>'player_a', '')::uuid;
    v_player_b := nullif(pairing->>'player_b', '')::uuid;
    v_bye_winner := nullif(pairing->>'bye_winner', '')::uuid;
    v_battle_id := null;

    if v_player_a is not null and v_player_b is not null then
      select coalesce(array_agg(x::integer), '{}') into v_qids
      from jsonb_array_elements_text(coalesce(pairing->'question_ids', '[]'::jsonb)) as x;

      insert into public.battles (challenger_id, opponent_id, subject, grade_level, status, challenger_score, opponent_score, question_ids)
      values (v_player_a, v_player_b, v_room.subject, v_room.grade_level, 'in_progress', 0, 0, v_qids)
      returning id into v_battle_id;
    end if;

    insert into public.party_tournament_matches (room_id, round, slot, player_a_id, player_b_id, battle_id, winner_id)
    values (p_room_id, p_round, (pairing->>'slot')::integer, v_player_a, v_player_b, v_battle_id, v_bye_winner);
  end loop;
end;
$$;
