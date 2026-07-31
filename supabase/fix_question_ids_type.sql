-- Fix question_ids column type: uuid[] → integer[]
-- The app stores integer indices into the embedded question bank, not UUIDs.
-- Existing rows are reset to empty (the battle page regenerates indices on load anyway).

alter table public.battles
  alter column question_ids type integer[]
  using '{}'::integer[];

alter table public.battles alter column question_ids set default '{}';
