import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMatches } from '../hooks/useMatches';
import { isTournamentStarted } from '../utils/scoring';
import type { Player, OutrightPrediction } from '../types';

export default function OutrightPage() {
  const { profile } = useAuth();
  const { matches } = useMatches();
  const [teams, setTeams] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [outright, setOutright] = useState<Partial<OutrightPrediction>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isTournamentStarted(matches);

  useEffect(() => {
    supabase.from('matches').select('home_team, away_team').then(({ data }) => {
      const all = new Set<string>();
      (data ?? []).forEach((m) => { all.add(m.home_team); all.add(m.away_team); });
      setTeams([...all].sort());
    });

    supabase.from('players').select('*').order('goals', { ascending: false }).then(({ data }) => {
      setPlayers(data ?? []);
    });

    if (profile?.id) {
      supabase.from('outright_predictions').select('*').eq('user_id', profile.id).single()
        .then(({ data }) => { if (data) setOutright(data); });
    }
  }, [profile?.id]);

  async function handleSave() {
    if (!profile?.id || locked) return;
    setSaving(true);
    await supabase.from('outright_predictions').upsert({
      user_id: profile.id,
      predicted_winner_team: outright.predicted_winner_team,
      predicted_top_scorer_id: outright.predicted_top_scorer_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const selectStyle = {
    width: '100%',
    background: locked ? 'rgba(14,24,40,0.5)' : '#1E2D45',
    border: '1px solid #2A3F5F',
    borderRadius: '12px',
    padding: '12px 14px',
    color: locked ? '#475569' : '#F1F5F9',
    fontSize: '15px',
    fontFamily: "'Barlow', sans-serif",
    outline: 'none',
    cursor: locked ? 'not-allowed' : 'pointer',
    appearance: 'none' as const,
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8">
      <div className="flex items-center gap-3 mb-2 px-1">
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#F1F5F9',
        }}>
          Tournament Picks
        </h1>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      <p style={{ color: locked ? '#EF4444' : '#475569', fontSize: '13px', marginBottom: '20px', paddingInline: '4px' }}>
        {locked
          ? 'Locked — tournament has started.'
          : '+10 pts each if correct · Lock at first kickoff'}
      </p>

      <div className="space-y-3">
        {/* Winner */}
        <div style={{ background: '#131C2E', border: '1px solid #1E2D45', borderRadius: '16px', padding: '16px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#F59E0B',
            marginBottom: '12px',
          }}>
            World Cup Winner
          </label>
          <div style={{ position: 'relative' }}>
            <select
              disabled={locked}
              value={outright.predicted_winner_team ?? ''}
              onChange={(e) => setOutright((o) => ({ ...o, predicted_winner_team: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select a team…</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Top Scorer */}
        <div style={{ background: '#131C2E', border: '1px solid #1E2D45', borderRadius: '16px', padding: '16px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#3B82F6',
            marginBottom: '12px',
          }}>
            Golden Boot
          </label>
          <select
            disabled={locked}
            value={outright.predicted_top_scorer_id ?? ''}
            onChange={(e) => setOutright((o) => ({ ...o, predicted_top_scorer_id: e.target.value }))}
            style={selectStyle}
          >
            <option value="">Select a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
            ))}
          </select>
          {players.length === 0 && (
            <p style={{ color: '#334155', fontSize: '12px', marginTop: '8px', fontFamily: "'Barlow', sans-serif" }}>
              Players will be added before the tournament starts.
            </p>
          )}
        </div>

        {/* Points info */}
        <div style={{ background: '#0E1828', border: '1px solid #182333', borderRadius: '14px', padding: '14px 16px' }}>
          <div className="flex gap-4">
            {[
              { label: 'Correct Winner', pts: '+10 PTS', color: '#F59E0B' },
              { label: 'Correct Scorer', pts: '+10 PTS', color: '#3B82F6' },
            ].map(({ label, pts, color }) => (
              <div key={label} className="flex-1 text-center">
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '20px',
                  color,
                }}>
                  {pts}
                </div>
                <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {!locked && (
          <button
            onClick={handleSave}
            disabled={saving || (!outright.predicted_winner_team && !outright.predicted_top_scorer_id)}
            className="w-full cursor-pointer transition-all duration-200 disabled:opacity-40"
            style={{
              background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #16A34A, #22C55E)',
              color: saved ? '#22C55E' : 'white',
              border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
              borderRadius: '14px',
              padding: '14px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: saved ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
            }}
          >
            {saved ? 'SAVED ✓' : saving ? 'SAVING…' : 'SAVE TOURNAMENT PICKS'}
          </button>
        )}
      </div>
    </div>
  );
}
