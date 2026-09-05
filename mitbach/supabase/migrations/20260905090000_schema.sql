-- ============================================================================
-- mitbach / מטבח — core schema
-- Recipes, invite-only access, groups with roles, and standalone event menus.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── enums ───────────────────────────────────────────────────────────────────

create type public.group_role        as enum ('admin', 'editor', 'viewer');
create type public.invitation_status as enum ('pending', 'used', 'revoked');
create type public.recipe_source     as enum ('manual', 'url', 'instagram', 'facebook', 'tiktok', 'text');

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per auth.users row, created by trigger on signup.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── groups ──────────────────────────────────────────────────────────────────

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text,
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.group_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- The creator of a group is always its first admin.
create function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- An admin must never be able to demote or evict the group owner.
create function public.protect_group_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select g.owner_id into owner from public.groups g where g.id = old.group_id;
  if old.user_id = owner and (tg_op = 'DELETE' or new.role is distinct from 'admin') then
    raise exception 'the group owner cannot be removed or demoted';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger protect_group_owner_on_update
  before update on public.group_members
  for each row execute function public.protect_group_owner();

create trigger protect_group_owner_on_delete
  before delete on public.group_members
  for each row execute function public.protect_group_owner();

-- ── membership helpers ──────────────────────────────────────────────────────
-- security definer so that RLS policies on group_members can consult
-- group_members without recursing into their own policy.

create function public.group_role_of(gid uuid)
returns public.group_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.group_members m
  where m.group_id = gid and m.user_id = auth.uid();
$$;

create function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select gid is not null and public.group_role_of(gid) is not null;
$$;

create function public.can_edit_group(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.group_role_of(gid) in ('admin', 'editor');
$$;

create function public.is_group_admin(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.group_role_of(gid) = 'admin';
$$;

create function public.shares_group_with(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = uid
  );
$$;

-- ── invitations ─────────────────────────────────────────────────────────────
-- Signup is closed: an account can only be created by redeeming a pending code.
-- Redemption runs server-side under the service role, so no anon policy exists.

create table public.invitations (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (char_length(code) between 6 and 64),
  created_by uuid references public.profiles (id) on delete set null,
  used_by    uuid references public.profiles (id) on delete set null,
  status     public.invitation_status not null default 'pending',
  group_id   uuid references public.groups (id) on delete cascade,
  role       public.group_role not null default 'viewer',
  email      text,
  note       text,
  expires_at timestamptz not null default now() + interval '14 days',
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_created_by_idx on public.invitations (created_by);
create index invitations_group_id_idx   on public.invitations (group_id);

-- ── recipes ─────────────────────────────────────────────────────────────────

create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  group_id     uuid references public.groups (id) on delete set null,
  is_private   boolean not null default true,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text,
  image_url    text,
  source_url   text,
  source_type  public.recipe_source not null default 'manual',
  source_name  text,
  servings     text,
  prep_minutes int check (prep_minutes >= 0),
  cook_minutes int check (cook_minutes >= 0),
  -- [{ "quantity": "2", "unit": "כוסות", "item": "קמח", "note": null }, ...]
  ingredients  jsonb not null default '[]'::jsonb,
  -- ["ערבבו את החומרים היבשים", ...]
  instructions jsonb not null default '[]'::jsonb,
  tags         text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint shared_recipe_needs_group check (is_private or group_id is not null)
);

create index recipes_owner_id_idx on public.recipes (owner_id);
create index recipes_group_id_idx on public.recipes (group_id) where group_id is not null;
create index recipes_tags_idx     on public.recipes using gin (tags);

-- ── menus ───────────────────────────────────────────────────────────────────
-- A menu stands on its own: it never requires a saved recipe to exist.

create table public.menus (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  group_id   uuid references public.groups (id) on delete set null,
  is_private boolean not null default true,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  event_date date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shared_menu_needs_group check (is_private or group_id is not null)
);

create index menus_created_by_idx on public.menus (created_by);
create index menus_group_id_idx   on public.menus (group_id) where group_id is not null;

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid not null references public.menus (id) on delete cascade,
  category      text not null default 'מנות עיקריות',
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  notes         text,
  -- An assignee may be a member (assigned_to) or just a name (assigned_name),
  -- because the person bringing the dish often has no account.
  assigned_to   uuid references public.profiles (id) on delete set null,
  assigned_name text,
  -- Optional link to a saved recipe; a menu item is valid without one.
  recipe_id     uuid references public.recipes (id) on delete set null,
  position      int not null default 0,
  is_done       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index menu_items_menu_id_idx on public.menu_items (menu_id, position);

create function public.can_view_menu(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.menus m
    where m.id = mid
      and (m.created_by = auth.uid()
           or (not m.is_private and public.is_group_member(m.group_id)))
  );
$$;

create function public.can_edit_menu(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.menus m
    where m.id = mid
      and (m.created_by = auth.uid()
           or (not m.is_private and public.can_edit_group(m.group_id)))
  );
$$;

-- ── updated_at ──────────────────────────────────────────────────────────────

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();

create trigger menus_touch_updated_at
  before update on public.menus
  for each row execute function public.touch_updated_at();
