import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ADMIN_EMAIL = 'alon.gadi@gmail.com';

export default function AdminPage() {
  const { profile, user } = useAuth();
  const [syncStatus, setSyncStatus] = useState('');
  const [match, setMatch] = useState({
    home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: ''
  });
  const [addStatus, setAddStatus] = useState('');

  if (user?.email !== ADMIN_EMAIL) {
    return <div className="p-8 text-center text-gray-400">Access denied.</div>;
  }

  async function handleSync() {
    setSyncStatus('Fetching from API-Football...');
    try {
      const res = await fetch(
        'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
        { headers: { 'x-apisports-key': import.meta.env.VITE_APISPORTS_KEY } }
      );
      const data = await res.json();
      const fixtures = data.response ?? [];

      if (fixtures.length === 0) {
        setSyncStatus('API returned 0 fixtures — data not available yet. Try again on June 11.');
        return;
      }

      const statusMap: Record<string, string> = {
        'NS': 'scheduled', 'TBD': 'scheduled',
        '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
        'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
        'PST': 'postponed', 'CANC': 'postponed',
      };

      let upserted = 0;
      for (const fixture of fixtures) {
        const f = fixture.fixture;
        const teams = fixture.teams;
        const goals = fixture.goals;
        const league = fixture.league;
        await supabase.from('matches').upsert({
          api_match_id: String(f.id),
          home_team: teams.home.name,
          away_team: teams.away.name,
          home_team_flag: teams.home.logo,
          away_team_flag: teams.away.logo,
          group_name: league.round,
          stage: 'group',
          match_time: f.date,
          home_score: goals.home,
          away_score: goals.away,
          status: statusMap[f.status?.short] ?? 'scheduled',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'api_match_id' });
        upserted++;
      }

      setSyncStatus(`Done! Synced ${upserted} matches.`);
    } catch (e: any) {
      setSyncStatus(`Error: ${e.message}`);
    }
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus('Adding...');
    const { error } = await supabase.from('matches').insert({
      api_match_id: match.api_match_id || `manual-${Date.now()}`,
      home_team: match.home_team,
      away_team: match.away_team,
      group_name: match.group_name,
      stage: 'group',
      match_time: match.match_time,
      status: 'scheduled',
    });
    if (error) {
      setAddStatus(`Error: ${error.message}`);
    } else {
      setAddStatus('Match added!');
      setMatch({ home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: '' });
    }
  }

  async function handleScoreUpdate() {
    setSyncStatus('Updating scores for finished matches...');
    try {
      const { data: scheduled } = await supabase
        .from('matches')
        .select('api_match_id, id')
        .neq('status', 'finished')
        .not('api_match_id', 'like', 'manual-%');

      let updated = 0;
      for (const m of scheduled ?? []) {
        const res = await fetch(
          `https://v3.football.api-sports.io/fixtures?id=${m.api_match_id}`,
          { headers: { 'x-apisports-key': import.meta.env.VITE_APISPORTS_KEY } }
        );
        const data = await res.json();
        const fixture = data.response?.[0];
        if (!fixture) continue;

        const statusMap: Record<string, string> = {
          'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
          '1H': 'live', 'HT': 'live', '2H': 'live',
        };
        const newStatus = statusMap[fixture.fixture.status?.short];
        if (newStatus) {
          await supabase.from('matches').update({
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', m.id);
          updated++;
        }
      }
      setSyncStatus(`Score update done. Updated ${updated} matches.`);
    } catch (e: any) {
      setSyncStatus(`Error: ${e.message}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>

      {/* API Sync */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">API-Football Sync</h2>
        <p className="text-sm text-gray-500">
          Pulls all WC 2026 fixtures from api-sports.io. Works once they upload the data (around June 11).
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
          >
            Sync Matches from API
          </button>
          <button
            onClick={handleScoreUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
          >
            Update Scores
          </button>
        </div>
        {syncStatus && (
          <p className={`text-sm font-medium ${syncStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
            {syncStatus}
          </p>
        )}
      </div>

      {/* Manual match add */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Add Match Manually</h2>
        <form onSubmit={handleAddMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Home team" value={match.home_team}
              onChange={e => setMatch(m => ({ ...m, home_team: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input required placeholder="Away team" value={match.away_team}
              onChange={e => setMatch(m => ({ ...m, away_team: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Group (e.g. Group A)" value={match.group_name}
              onChange={e => setMatch(m => ({ ...m, group_name: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input required type="datetime-local" value={match.match_time}
              onChange={e => setMatch(m => ({ ...m, match_time: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <button type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2 text-sm font-semibold transition">
            Add Match
          </button>
          {addStatus && <p className="text-sm text-green-700 font-medium">{addStatus}</p>}
        </form>
      </div>
    </div>
  );
}
