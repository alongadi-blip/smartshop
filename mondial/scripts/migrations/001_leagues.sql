-- ============================================================
-- MONDIAL 2026 — LEAGUES MIGRATION
-- Run this once in Supabase SQL Editor before June 29.
-- ============================================================

-- 1. leagues
CREATE TABLE IF NOT EXISTS leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL
    DEFAULT lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leagues_read"   ON leagues FOR SELECT USING (true);
CREATE POLICY "leagues_insert" ON leagues FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 2. league_members
CREATE TABLE IF NOT EXISTS league_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, user_id)
);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_read"   ON league_members FOR SELECT USING (true);
CREATE POLICY "lm_insert" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lm_delete" ON league_members FOR DELETE USING (auth.uid() = user_id);

-- 3. predictions — add league + knockout fields
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS league_id              UUID REFERENCES leagues(id);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS predicted_et_home_score INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS predicted_et_away_score INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS predicted_penalty_winner TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS et_points_earned        INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS penalty_points_earned   INT;

-- Drop old unique constraint and replace with partial indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'predictions'
      AND constraint_name = 'predictions_user_id_match_id_key'
  ) THEN
    ALTER TABLE predictions DROP CONSTRAINT predictions_user_id_match_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_group_unique
  ON predictions (user_id, match_id)
  WHERE league_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_league_unique
  ON predictions (user_id, match_id, league_id)
  WHERE league_id IS NOT NULL;

-- 4. outright_predictions — add league_id
ALTER TABLE outright_predictions ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'outright_predictions'
      AND constraint_name = 'outright_predictions_user_id_key'
  ) THEN
    ALTER TABLE outright_predictions DROP CONSTRAINT outright_predictions_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS outright_predictions_group_unique
  ON outright_predictions (user_id)
  WHERE league_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outright_predictions_league_unique
  ON outright_predictions (user_id, league_id)
  WHERE league_id IS NOT NULL;

-- 5. matches — add knockout fields
ALTER TABLE matches ADD COLUMN IF NOT EXISTS went_to_et     BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS et_home_score  INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS et_away_score  INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner TEXT;
