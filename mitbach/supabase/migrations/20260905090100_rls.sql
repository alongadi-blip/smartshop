-- ============================================================================
-- mitbach / מטבח — row level security
--
-- Two visibility rules cover everything:
--   * you always see what you own;
--   * you additionally see a row marked shared (is_private = false) when you
--     are a member of the group it was shared with.
-- Nothing is readable by anon. Invitation codes are redeemed server-side under
-- the service role, which bypasses RLS, so anon never touches this schema.
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations   enable row level security;
alter table public.recipes       enable row level security;
alter table public.menus         enable row level security;
alter table public.menu_items    enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────

create policy "profiles are visible to yourself and your groupmates"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_group_with(id));

create policy "you may create your own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "you may edit your own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── groups ──────────────────────────────────────────────────────────────────

create policy "members see their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "anyone may start a group they own"
  on public.groups for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "admins edit the group"
  on public.groups for update to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

create policy "only the owner deletes the group"
  on public.groups for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ── group_members ───────────────────────────────────────────────────────────
-- These policies call is_group_member / is_group_admin, which are
-- security definer, so evaluating them does not re-enter this policy.

create policy "members see the roster"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "admins add members"
  on public.group_members for insert to authenticated
  with check (public.is_group_admin(group_id));

create policy "admins change roles"
  on public.group_members for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

create policy "admins remove members, and anyone may leave"
  on public.group_members for delete to authenticated
  using (public.is_group_admin(group_id) or user_id = (select auth.uid()));

-- ── invitations ─────────────────────────────────────────────────────────────
-- A code is only ever readable by the person who issued it or by an admin of
-- the group it points at. The invitee reads it through the redemption route.

create policy "issuers and group admins see invitations"
  on public.invitations for select to authenticated
  using (created_by = (select auth.uid()) or public.is_group_admin(group_id));

create policy "you may issue invitations"
  on public.invitations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (group_id is null or public.is_group_admin(group_id))
  );

create policy "issuers and group admins revoke invitations"
  on public.invitations for update to authenticated
  using (created_by = (select auth.uid()) or public.is_group_admin(group_id))
  with check (created_by = (select auth.uid()) or public.is_group_admin(group_id));

create policy "issuers and group admins delete invitations"
  on public.invitations for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_group_admin(group_id));

-- ── recipes ─────────────────────────────────────────────────────────────────

create policy "you see your own recipes and those shared with your groups"
  on public.recipes for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (not is_private and public.is_group_member(group_id))
  );

create policy "you may add recipes you own"
  on public.recipes for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (is_private or public.can_edit_group(group_id))
  );

create policy "owners and group editors edit recipes"
  on public.recipes for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (not is_private and public.can_edit_group(group_id))
  )
  with check (
    owner_id = (select auth.uid())
    or (not is_private and public.can_edit_group(group_id))
  );

create policy "owners and group admins delete recipes"
  on public.recipes for delete to authenticated
  using (
    owner_id = (select auth.uid())
    or (not is_private and public.is_group_admin(group_id))
  );

-- ── menus ───────────────────────────────────────────────────────────────────

create policy "you see your own menus and those shared with your groups"
  on public.menus for select to authenticated
  using (
    created_by = (select auth.uid())
    or (not is_private and public.is_group_member(group_id))
  );

create policy "you may create menus"
  on public.menus for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (is_private or public.can_edit_group(group_id))
  );

create policy "creators and group editors edit menus"
  on public.menus for update to authenticated
  using (
    created_by = (select auth.uid())
    or (not is_private and public.can_edit_group(group_id))
  )
  with check (
    created_by = (select auth.uid())
    or (not is_private and public.can_edit_group(group_id))
  );

create policy "creators and group admins delete menus"
  on public.menus for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (not is_private and public.is_group_admin(group_id))
  );

-- ── menu_items ──────────────────────────────────────────────────────────────
-- Access is inherited from the parent menu.

create policy "menu items follow the menu"
  on public.menu_items for select to authenticated
  using (public.can_view_menu(menu_id));

create policy "editors add menu items"
  on public.menu_items for insert to authenticated
  with check (public.can_edit_menu(menu_id));

create policy "editors change menu items"
  on public.menu_items for update to authenticated
  using (public.can_edit_menu(menu_id))
  with check (public.can_edit_menu(menu_id));

create policy "editors delete menu items"
  on public.menu_items for delete to authenticated
  using (public.can_edit_menu(menu_id));

-- ── grants ──────────────────────────────────────────────────────────────────
-- RLS decides the rows; these decide that the role may reach the table at all.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles, public.groups, public.group_members,
  public.invitations, public.recipes, public.menus, public.menu_items
  to authenticated;

revoke all on
  public.profiles, public.groups, public.group_members,
  public.invitations, public.recipes, public.menus, public.menu_items
  from anon;
