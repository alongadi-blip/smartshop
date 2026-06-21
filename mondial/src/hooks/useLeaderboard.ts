import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard(leagueId?: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard-watch-${leagueId ?? 'global'}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'predictions' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leagueId]);

  async function fetchLeaderboard() {
    setLoading(true);
    if (leagueId) {
      await fetchLeagueLeaderboard(leagueId);
    } else {
      const { data } = await supabase.from('leaderboard').select('*');
      setEntries(data ?? []);
    }
    setLoading(false);
  }

  async function fetchLeagueLeaderboard(lId: string) {
    // Fetch league members with profiles
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, profiles(id, display_name, avatar_url)')
      .eq('league_id', lId);

    if (!members) { setEntries([]); return; }

    // Fetch all predictions for this league that have been scored
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, points_earned, et_points_earned, penalty_points_earned')
      .eq('league_id', lId);

    // Build per-user totals
    const map: Record<string, LeaderboardEntry> = {};
    for (const m of members) {
      const profile = (m as any).profiles;
      map[m.user_id] = {
        id: m.user_id,
        display_name: profile?.display_name ?? '?',
        avatar_url: profile?.avatar_url,
        total_points: 0,
        exact_hits: 0,
        outcome_hits: 0,
        misses: 0,
        games_scored: 0,
      };
    }

    for (const pred of preds ?? []) {
      const entry = map[pred.user_id];
      if (!entry || pred.points_earned === null || pred.points_earned === undefined) continue;
      const total =
        (pred.points_earned ?? 0) +
        (pred.et_points_earned ?? 0) +
        (pred.penalty_points_earned ?? 0);
      entry.total_points += total;
      entry.games_scored++;
      if (pred.points_earned === 3) entry.exact_hits++;
      else if (pred.points_earned === 1) entry.outcome_hits++;
      else entry.misses++;
    }

    const sorted = Object.values(map).sort(
      (a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name)
    );
    setEntries(sorted);
  }

  return { entries, loading };
}
