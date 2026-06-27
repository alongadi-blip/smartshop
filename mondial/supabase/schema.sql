-- ============================================================
-- MONDIAL — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  display_name  text not null,
  avatar_url    text,
  nickname      text,
  created_at    timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- MATCHES
-- ============================================================
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed');
create type match_stage as enum ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');

create table public.matches (
  id              uuid default uuid_generate_v4() primary key,
  api_match_id    text unique not null,
  home_team       text not null,
  away_team       text not null,
  home_team_flag  text,
  away_team_flag  text,
  group_name      text,
  stage           match_stage default 'group' not null,
  match_time      timestamptz not null,
  home_score      int,
  away_score      int,
  status          match_status default 'scheduled' not null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- Index for fast upcoming-match queries
create index matches_match_time_idx on public.matches (match_time);
create index matches_status_idx on public.matches (status);

-- ============================================================
-- PLAYERS (for top scorer outright bet)
-- ============================================================
create table public.players (
  id          uuid default uuid_generate_v4() primary key,
  api_player_id text unique not null,
  name        text not null,
  team        text not null,
  photo_url   text,
  goals       int default 0
);

-- ============================================================
-- MATCH PREDICTIONS
-- ============================================================
create table public.predictions (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references public.profiles on delete cascade not null,
  match_id              uuid references public.matches on delete cascade not null,
  predicted_home_score  int not null check (predicted_home_score >= 0),
  predicted_away_score  int not null check (predicted_away_score >= 0),
  points_earned         int,
  submitted_at          timestamptz default now() not null,
  updated_at            timestamptz default now() not null,
  unique (user_id, match_id)
);

create index predictions_user_id_idx on public.predictions (user_id);
create index predictions_match_id_idx on public.predictions (match_id);

-- ============================================================
-- OUTRIGHT PREDICTIONS (tournament winner + top scorer)
-- ============================================================
create table public.outright_predictions (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references public.profiles on delete cascade unique not null,
  predicted_winner_team   text,
  predicted_top_scorer_id uuid references public.players,
  winner_points           int default 0,
  scorer_points           int default 0,
  submitted_at            timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

-- ============================================================
-- SCORING CONFIG (editable without code changes)
-- ============================================================
create table public.scoring_config (
  key    text primary key,
  value  int not null,
  label  text
);

insert into public.scoring_config (key, value, label) values
  ('exact_score',        3,  'Exact score match'),
  ('correct_outcome',    1,  'Correct winner/draw only'),
  ('wrong_prediction',   0,  'Wrong prediction'),
  ('tournament_winner',  10, 'Correct tournament winner'),
  ('top_scorer',         10, 'Correct top scorer');

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
create or replace view public.leaderboard as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.nickname,
  coalesce(sum(pr.points_earned), 0) +
  coalesce(op.winner_points, 0) +
  coalesce(op.scorer_points, 0) as total_points,
  coalesce(count(pr.id) filter (where pr.points_earned = 3), 0) as exact_hits,
  coalesce(count(pr.id) filter (where pr.points_earned = 1), 0) as outcome_hits,
  coalesce(count(pr.id) filter (where pr.points_earned = 0), 0) as misses,
  coalesce(count(pr.id) filter (where pr.points_earned is not null), 0) as games_scored
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
left join public.outright_predictions op on op.user_id = p.id
group by p.id, p.display_name, p.avatar_url, p.nickname, op.winner_points, op.scorer_points
order by total_points desc;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.predictions enable row level security;
alter table public.outright_predictions enable row level security;

-- Profiles: everyone can read, only own row writable
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Matches: public read
create policy "Matches are viewable by everyone" on public.matches for select using (true);

-- Players: public read
create policy "Players are viewable by everyone" on public.players for select using (true);

-- Predictions: own row writable; only read locked-match predictions
create policy "Users can manage own predictions" on public.predictions
  for all using (auth.uid() = user_id);

create policy "Locked match predictions are visible to all" on public.predictions
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and m.match_time <= now() - interval '5 minutes'
    )
  );

-- Outright predictions: own row writable; read after tournament start
create policy "Users can manage own outright prediction" on public.outright_predictions
  for all using (auth.uid() = user_id);

create policy "Outright predictions visible after tournament starts" on public.outright_predictions
  for select using (
    exists (
      select 1 from public.matches m
      where m.match_time <= now()
      limit 1
    )
  );
