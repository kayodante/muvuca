-- Shared primitives used by every domain table: the item type enum and the
-- updated_at trigger function.

create type public.item_type as enum ('link', 'prompt');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
