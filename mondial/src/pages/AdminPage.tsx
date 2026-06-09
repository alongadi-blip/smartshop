import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { calculateMatchPoints } from '../utils/scoring';

const ADMIN_EMAIL = 'alon.gadi@gmail.com';

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: 'var(--text-1)',
  fontSize: '14px',
  fontFamily: "'Barlow', sans-serif",
  outline: 'none',
  width: '100%',
};

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: '16px',
  padding: '18px',
};

function ManualScoreForm({ onDone }: { onDone: (msg: string) => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadMatches() {
    if (loaded) return;
    const { data } = await supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, status')
      .order('match_time', { ascending: true });
    setMatches(data ?? []);
    setLoaded(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const matchId = fd.get('match_id') as string;
    const homeScore = Number(fd.get('home_score'));
    const awayScore = Number(fd.get('away_score'));

    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      updated_at: new Date().toISOString(),
    }).eq('id', matchId);

    const { data: preds } = await supabase
      .from('predictions')
      .select('id, predicted_home_score, predicted_away_score')
      .eq('match_id', matchId);

    for (const pred of preds ?? []) {
      const pts = calculateMatchPoints(
        { home_score: homeScore, away_score: awayScore } as any,
        pred as any
      );
      await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id);
    }

    e.currentTarget.reset();
    onDone(`Score set! Calculated points for ${preds?.length ?? 0} predictions.`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select
        name="match_id"
        required
        defaultValue=""
        onFocus={loadMatches}
        style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}
      >
        <option value="" disabled>בחר משחק…</option>
        {matches.map(m => (
          <option key={m.id} value={m.id}>
            {m.home_team} vs {m.away_team}
            {m.status === 'finished' ? ` [${m.home_score}-${m.away_score}]` : ''}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input name="home_score" type="number" min="0" max="20" required placeholder="שערים - בית"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
          onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
        <input name="away_score" type="number" min="0" max="20" required placeholder="שערים - חוץ"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
          onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
      </div>
      <button type="submit" className="w-full cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', borderRadius: '10px', padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.25)' }}>
        הגדר תוצאה + חשב נקודות
      </button>
    </form>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState('');
  const [newMatch, setNewMatch] = useState({ home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: '' });
  const [addStatus, setAddStatus] = useState('');

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.03em' }}>
          גישה נדחתה
        </p>
      </div>
    );
  }

  async function handleSync() {
    setSyncStatus('Fetching from API-Football...');
    try {
      const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026',
        { headers: { 'x-apisports-key': import.meta.env.VITE_APISPORTS_KEY } });
      const data = await res.json();
      const fixtures = data.response ?? [];
      if (fixtures.length === 0) { setSyncStatus('API returned 0 fixtures.'); return; }

      const statusMap: Record<string, string> = {
        'NS': 'scheduled', 'TBD': 'scheduled', '1H': 'live', 'HT': 'live', '2H': 'live',
        'ET': 'live', 'P': 'live', 'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
        'PST': 'postponed', 'CANC': 'postponed',
      };

      let upserted = 0;
      for (const fixture of fixtures) {
        const { fixture: f, teams, goals, league } = fixture;
        await supabase.from('matches').upsert({
          api_match_id: String(f.id), home_team: teams.home.name, away_team: teams.away.name,
          home_team_flag: teams.home.logo, away_team_flag: teams.away.logo,
          group_name: league.round, stage: 'group', match_time: f.date,
          home_score: goals.home, away_score: goals.away,
          status: statusMap[f.status?.short] ?? 'scheduled', updated_at: new Date().toISOString(),
        }, { onConflict: 'api_match_id' });
        upserted++;
      }
      setSyncStatus(`Done! Synced ${upserted} matches.`);
    } catch (e: any) { setSyncStatus(`Error: ${e.message}`); }
  }

  async function handleScoreUpdate() {
    setSyncStatus('Updating scores and calculating points...');
    try {
      const { data: notFinished } = await supabase
        .from('matches').select('api_match_id, id')
        .neq('status', 'finished').not('api_match_id', 'like', 'manual-%');

      let matchesUpdated = 0, pointsUpdated = 0;

      for (const m of notFinished ?? []) {
        const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${m.api_match_id}`,
          { headers: { 'x-apisports-key': import.meta.env.VITE_APISPORTS_KEY } });
        const data = await res.json();
        const fixture = data.response?.[0];
        if (!fixture) continue;

        const statusMap: Record<string, string> = {
          'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
          '1H': 'live', 'HT': 'live', '2H': 'live',
        };
        const newStatus = statusMap[fixture.fixture.status?.short];
        if (!newStatus) continue;

        const homeScore = fixture.goals.home;
        const awayScore = fixture.goals.away;

        await supabase.from('matches').update({
          home_score: homeScore, away_score: awayScore,
          status: newStatus, updated_at: new Date().toISOString(),
        }).eq('id', m.id);
        matchesUpdated++;

        if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
          const { data: preds } = await supabase
            .from('predictions').select('id, predicted_home_score, predicted_away_score')
            .eq('match_id', m.id);

          for (const pred of preds ?? []) {
            const pts = calculateMatchPoints({ home_score: homeScore, away_score: awayScore } as any, pred as any);
            await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id);
            pointsUpdated++;
          }
        }
      }
      setSyncStatus(`Done! ${matchesUpdated} matches updated, ${pointsUpdated} predictions scored.`);
    } catch (e: any) { setSyncStatus(`Error: ${e.message}`); }
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus('Adding...');
    const { error } = await supabase.from('matches').insert({
      api_match_id: newMatch.api_match_id || `manual-${Date.now()}`,
      home_team: newMatch.home_team, away_team: newMatch.away_team,
      group_name: newMatch.group_name, stage: 'group',
      match_time: newMatch.match_time, status: 'scheduled',
    });
    if (error) { setAddStatus(`Error: ${error.message}`); }
    else { setAddStatus('Match added!'); setNewMatch({ home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: '' }); }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-3 mb-2 px-1">
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F1F5F9' }}>
          פאנל ניהול
        </h1>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '12px' }}>
          סנכרון API
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSync} className="cursor-pointer"
            style={{ background: '#1E3A2F', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: '10px', padding: '9px 16px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
            סנכרן משחקים
          </button>
          <button onClick={handleScoreUpdate} className="cursor-pointer"
            style={{ background: '#1A2A45', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: '10px', padding: '9px 16px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
            עדכן תוצאות + נקודות
          </button>
        </div>
        {syncStatus && (
          <p style={{ marginTop: '12px', fontSize: '13px', color: syncStatus.startsWith('Error') ? '#EF4444' : '#22C55E' }}>{syncStatus}</p>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '14px' }}>
          הגדר תוצאת משחק
        </h2>
        <ManualScoreForm onDone={setSyncStatus} />
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '14px' }}>
          הוסף משחק ידנית
        </h2>
        <form onSubmit={handleAddMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="קבוצה בית" value={newMatch.home_team}
              onChange={e => setNewMatch(m => ({ ...m, home_team: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required placeholder="קבוצה חוץ" value={newMatch.away_team}
              onChange={e => setNewMatch(m => ({ ...m, away_team: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="קבוצה (לדוגמה: Group A)" value={newMatch.group_name}
              onChange={e => setNewMatch(m => ({ ...m, group_name: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required type="datetime-local" value={newMatch.match_time}
              onChange={e => setNewMatch(m => ({ ...m, match_time: e.target.value }))}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <button type="submit" className="w-full cursor-pointer"
            style={{ background: '#1E2D45', border: '1px solid #2A3F5F', color: '#94A3B8', borderRadius: '10px', padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
            הוסף משחק
          </button>
          {addStatus && <p style={{ fontSize: '13px', color: addStatus.startsWith('Error') ? '#EF4444' : '#22C55E' }}>{addStatus}</p>}
        </form>
      </div>
    </div>
  );
}
