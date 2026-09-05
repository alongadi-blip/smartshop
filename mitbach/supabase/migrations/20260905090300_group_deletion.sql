-- ============================================================================
-- Deleting a group must not take its content down with it.
--
-- recipes.group_id and menus.group_id are ON DELETE SET NULL, but a shared row
-- (is_private = false) also carries `check (is_private or group_id is not null)`.
-- Setting group_id to NULL on such a row violates that check, so without this
-- trigger deleting a group fails outright once anything has been shared to it.
--
-- The rows fall back to private, owned by whoever created them — which is what
-- the delete confirmation in the UI promises.
-- ============================================================================

create function public.unshare_group_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recipes
     set is_private = true, group_id = null
   where group_id = old.id;

  update public.menus
     set is_private = true, group_id = null
   where group_id = old.id;

  return old;
end;
$$;

create trigger unshare_content_before_group_delete
  before delete on public.groups
  for each row execute function public.unshare_group_content();
