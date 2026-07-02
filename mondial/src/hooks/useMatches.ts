import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, Prediction } from '../types';

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`matches-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true });
    setMatches(data ?? []);
    setLoading(false);
  }

  return { matches, loading };
}

export function useUserPredictions(userId: string | undefined, leagueId?: string | null) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});

  useEffect(() => {
    if (!userId) return;
    let q = supabase.from('predictions').select('*').eq('user_id', userId);
    if (leagueId) {
      // Group stage predictions (league_id IS NULL) + league-specific knockout predictions
      q = q.or(`league_id.is.null,league_id.eq.${leagueId}`);
    }
    q.then(({ data, error }) => {
      if (error) { console.error('[useUserPredictions] fetch failed:', error); return; }
      const map: Record<string, Prediction> = {};
      (data ?? []).forEach((p) => { map[p.match_id] = p; });
      setPredictions(map);
    });
  }, [userId, leagueId]);

  async function savePrediction(
    matchId: string,
    home: number,
    away: number,
    etHome?: number,
    etAway?: number,
    penaltyWinner?: string
  ) {
    if (!userId) return;

    const payload: any = {
      user_id: userId,
      match_id: matchId,
      predicted_home_score: home,
      predicted_away_score: away,
      updated_at: new Date().toISOString(),
    };

    if (leagueId) {
      payload.league_id = leagueId;
      if (etHome !== undefined && etAway !== undefined) {
        payload.predicted_et_home_score = etHome;
        payload.predicted_et_away_score = etAway;
      }
      if (penaltyWinner !== undefined) {
        payload.predicted_penalty_winner = penaltyWinner || null;
      }
    }

    // predictions only has PARTIAL unique indexes (one for league_id IS NULL,
    // one for league_id = X), which Postgres can't use as a bare ON CONFLICT
    // arbiter — upsert() fails with 42P10 every time. Check-then-write instead.
    // Also reuse any existing null-league row (saved before the GRANT fix) to
    // avoid duplicates that would double-count in the leaderboard.
    const { data: existingRows } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .order('league_id', { ascending: false, nullsFirst: false }) // prefer league-specific over null
      .limit(1);
    const existingRow = existingRows?.[0] ?? null;

    const { data, error } = existingRow
      ? await supabase.from('predictions').update(payload).eq('id', existingRow.id).select().single()
      : await supabase.from('predictions').insert(payload).select().single();

    if (error) throw error;
    if (data) setPredictions((prev) => ({ ...prev, [matchId]: data }));
  }

  return { predictions, savePrediction };
}
