import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { League } from '../types';

interface LeagueContextType {
  selectedLeague: League | null;
  userLeagues: League[];
  leaguesLoading: boolean;
  setSelectedLeague: (league: League | null) => void;
  refreshLeagues: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType>({
  selectedLeague: null,
  userLeagues: [],
  leaguesLoading: true,
  setSelectedLeague: () => {},
  refreshLeagues: async () => {},
});

export function LeagueProvider({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeagueState] = useState<League | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUserLeagues([]);
      setSelectedLeagueState(null);
      setLeaguesLoading(false);
      return;
    }
    refreshLeagues();
  }, [userId]);

  async function refreshLeagues() {
    if (!userId) return;
    setLeaguesLoading(true);
    const { data } = await supabase
      .from('league_members')
      .select('leagues(*)')
      .eq('user_id', userId);

    const list: League[] = (data ?? [])
      .map((m: any) => m.leagues)
      .filter(Boolean);

    setUserLeagues(list);

    // Auto-select: restore from localStorage, or pick first league
    const stored = localStorage.getItem('selectedLeagueId');
    const found = stored ? list.find(l => l.id === stored) : null;
    setSelectedLeagueState(found ?? list[0] ?? null);
    setLeaguesLoading(false);
  }

  function setSelectedLeague(league: League | null) {
    setSelectedLeagueState(league);
    if (league) localStorage.setItem('selectedLeagueId', league.id);
    else localStorage.removeItem('selectedLeagueId');
  }

  return (
    <LeagueContext.Provider value={{ selectedLeague, userLeagues, leaguesLoading, setSelectedLeague, refreshLeagues }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeagueContext() {
  return useContext(LeagueContext);
}
