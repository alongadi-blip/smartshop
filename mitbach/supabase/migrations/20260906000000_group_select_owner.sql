-- ============================================================================
-- Let a group's owner read the group directly, not only via membership.
--
-- The select policy was `using (is_group_member(id))`. Membership is granted by
-- an AFTER INSERT trigger, which fires at the end of the statement — but the
-- RETURNING clause of that same INSERT is checked against the select policy
-- while the trigger has not run yet. So `insert(...).select('id')`, which is
-- exactly what the create-group dialog issues, failed with
--   new row violates row-level security policy for table "groups"
-- even though the row itself was inserted successfully.
--
-- Naming the owner directly closes that window. It grants nothing new: the
-- owner is always an admin member, and a trigger prevents that from changing.
-- ============================================================================

drop policy "members see their groups" on public.groups;

create policy "owners and members see their groups"
  on public.groups for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_group_member(id));
