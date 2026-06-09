import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ADMIN_EMAIL = 'alon.gadi@gmail.com';

export default function AdminPage() {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState('');
  const [match, setMatch] = useState({
    home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: ''
  });
  const [addStatus, setAddStatus] = useState('');

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
          ACCESS DENIED
        </p>
      </div>
    );
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
        setSyncStatus('API returned 0 fixtures — data not available yet.');
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

  async function handleScoreUpdate() {
    setSyncStatus('Updating scores...');
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

  const inputStyle = {
    background: '#1E2D45',
    border: '1px solid #2A3F5F',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#F1F5F9',
    fontSize: '14px',
    fontFamily: "'Barlow', sans-serif",
    outline: 'none',
    width: '100%',
  };

  const cardStyle = {
    background: '#131C2E',
    border: '1px solid #1E2D45',
    borderRadius: '16px',
    padding: '18px',
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-3 mb-2 px-1">
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#F1F5F9',
        }}>
          Admin Panel
        </h1>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      {/* API Sync */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '12px' }}>
          API Sync
        </h2>
        <p style={{ color: '#475569', fontSize: '13px', marginBottom: '14px', fontFamily: "'Barlow', sans-serif" }}>
          Pull WC 2026 fixtures and scores from api-sports.io.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            className="cursor-pointer transition-colors duration-200"
            style={{
              background: '#1E3A2F',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22C55E',
              borderRadius: '10px',
              padding: '9px 16px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Sync Matches
          </button>
          <button
            onClick={handleScoreUpdate}
            className="cursor-pointer transition-colors duration-200"
            style={{
              background: '#1A2A45',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#3B82F6',
              borderRadius: '10px',
              padding: '9px 16px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Update Scores
          </button>
        </div>
        {syncStatus && (
          <p style={{
            marginTop: '12px',
            fontSize: '13px',
            fontFamily: "'Barlow', sans-serif",
            color: syncStatus.startsWith('Error') ? '#EF4444' : '#22C55E',
          }}>
            {syncStatus}
          </p>
        )}
      </div>

      {/* Manual match add */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '14px' }}>
          Add Match Manually
        </h2>
        <form onSubmit={handleAddMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Home team" value={match.home_team}
              onChange={e => setMatch(m => ({ ...m, home_team: e.target.value }))}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required placeholder="Away team" value={match.away_team}
              onChange={e => setMatch(m => ({ ...m, away_team: e.target.value }))}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Group (e.g. Group A)" value={match.group_name}
              onChange={e => setMatch(m => ({ ...m, group_name: e.target.value }))}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required type="datetime-local" value={match.match_time}
              onChange={e => setMatch(m => ({ ...m, match_time: e.target.value }))}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <button
            type="submit"
            className="w-full cursor-pointer transition-all duration-200"
            style={{
              background: '#1E2D45',
              border: '1px solid #2A3F5F',
              color: '#94A3B8',
              borderRadius: '10px',
              padding: '10px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Add Match
          </button>
          {addStatus && (
            <p style={{
              fontSize: '13px',
              color: addStatus.startsWith('Error') ? '#EF4444' : '#22C55E',
              fontFamily: "'Barlow', sans-serif",
            }}>
              {addStatus}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
