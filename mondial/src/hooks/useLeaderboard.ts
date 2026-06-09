import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'predictions' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLeaderboard() {
    const { data } = await supabase.from('leaderboard').select('*');
    setEntries(data ?? []);
    setLoading(false);
  }

  return { entries, loading };
}
