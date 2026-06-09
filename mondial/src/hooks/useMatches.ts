import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, Prediction } from '../types';

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();

    // Live updates via Supabase Realtime
    const channel = supabase
      .channel('matches')
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

export function useUserPredictions(userId: string | undefined) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        const map: Record<string, Prediction> = {};
        (data ?? []).forEach((p) => { map[p.match_id] = p; });
        setPredictions(map);
      });
  }, [userId]);

  async function savePrediction(matchId: string, home: number, away: number) {
    if (!userId) return;
    const { data } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        match_id: matchId,
        predicted_home_score: home,
        predicted_away_score: away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,match_id' })
      .select()
      .single();
    if (data) setPredictions((prev) => ({ ...prev, [matchId]: data }));
  }

  return { predictions, savePrediction };
}
