import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMatches } from '../hooks/useMatches';
import { useLeagueContext } from '../contexts/LeagueContext';
import { isOutrightLocked } from '../utils/scoring';
import { TEAM_HE } from '../lib/i18n';
import type { Player, OutrightPrediction } from '../types';

export default function OutrightPage() {
  const { profile } = useAuth();
  const { matches } = useMatches();
  const { selectedLeague } = useLeagueContext();
  const [teams, setTeams] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [outright, setOutright] = useState<Partial<OutrightPrediction>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isOutrightLocked(matches);

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
      let q = supabase.from('outright_predictions').select('*').eq('user_id', profile.id);
      if (selectedLeague) q = q.eq('league_id', selectedLeague.id);
      // When no league: fetch all (group stage has no league_id column yet)
      q.limit(1).single().then(({ data }) => { if (data) setOutright(data); });
    }
  }, [profile?.id, selectedLeague?.id]);

  async function handleSave() {
    if (!profile?.id || locked) return;
    setSaving(true);
    const payload: any = {
      user_id: profile.id,
      predicted_winner_team: outright.predicted_winner_team,
      predicted_top_scorer_id: outright.predicted_top_scorer_id ?? null,
      predicted_top_scorer_name: outright.predicted_top_scorer_name ?? null,
      updated_at: new Date().toISOString(),
    };
    if (selectedLeague) payload.league_id = selectedLeague.id;

    const conflictCol = selectedLeague ? 'user_id,league_id' : 'user_id';
    await supabase.from('outright_predictions').upsert(payload, { onConflict: conflictCol });
    setSaving(false);
    setSaved(true);
  }

  const selectStyle = {
    width: '100%',
    background: locked ? 'var(--bg-card2)' : 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: '12px',
    padding: '12px 14px',
    color: locked ? 'var(--text-6)' : 'var(--text-1)',
    fontSize: '15px',
    fontFamily: "'Barlow', sans-serif",
    outline: 'none',
    cursor: locked ? 'not-allowed' : 'pointer',
    appearance: 'none' as const,
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8">
      <div className="flex items-center gap-3 mb-2 px-1">
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F1F5F9', margin: 0 }}>
            בחירות טורניר
          </h1>
          {selectedLeague && (
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: '#22C55E', marginTop: '2px', letterSpacing: '0.05em' }}>
              {selectedLeague.name}
            </div>
          )}
        </div>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      <p style={{ color: locked ? '#EF4444' : '#475569', fontSize: '13px', marginBottom: '20px', paddingInline: '4px' }}>
        {locked
          ? 'נעול — שלב הנוקאוט התחיל.'
          : '+10 נקודות לכל ניחוש נכון · ניתן לשנות עד 5 דקות לפני המשחק הראשון בנוקאוט'}
      </p>

      <div className="space-y-3">
        {/* Winner */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '16px' }}>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#F59E0B', marginBottom: '12px' }}>
            מנצח הגביע
          </label>
          <div style={{ position: 'relative' }}>
            <select
              disabled={locked}
              value={outright.predicted_winner_team ?? ''}
              onChange={(e) => setOutright((o) => ({ ...o, predicted_winner_team: e.target.value }))}
              style={selectStyle}
            >
              <option value="">בחר קבוצה…</option>
              {teams.map((t) => <option key={t} value={t}>{TEAM_HE[t] ?? t}</option>)}
            </select>
          </div>
        </div>

        {/* Top Scorer */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '16px' }}>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3B82F6', marginBottom: '12px' }}>
            מלך השערים
          </label>
          {players.length > 0 ? (
            <select
              disabled={locked}
              value={outright.predicted_top_scorer_id ?? ''}
              onChange={(e) => setOutright((o) => ({ ...o, predicted_top_scorer_id: e.target.value, predicted_top_scorer_name: undefined }))}
              style={selectStyle}
            >
              <option value="">בחר שחקן…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({TEAM_HE[p.team] ?? p.team})</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              disabled={locked}
              placeholder="הכנס שם שחקן (לדוגמה: Mbappé)"
              value={outright.predicted_top_scorer_name ?? ''}
              onChange={(e) => setOutright((o) => ({ ...o, predicted_top_scorer_name: e.target.value, predicted_top_scorer_id: undefined }))}
              style={{ ...selectStyle, cursor: locked ? 'not-allowed' : 'text' }}
              onFocus={e => { if (!locked) e.currentTarget.style.border = '1px solid #3B82F6'; }}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
            />
          )}
        </div>

        {/* Points info */}
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '14px', padding: '14px 16px' }}>
          <div className="flex gap-4">
            {[
              { label: 'מנצח נכון', pts: '+10 נק׳', color: '#F59E0B' },
              { label: 'מלך שערים נכון', pts: '+10 נק׳', color: '#3B82F6' },
            ].map(({ label, pts, color }) => (
              <div key={label} className="flex-1 text-center">
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', color }}>
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
            disabled={saving || (!outright.predicted_winner_team && !outright.predicted_top_scorer_id && !outright.predicted_top_scorer_name)}
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
            {saved ? 'נשמר ✓' : saving ? 'שומר…' : 'שמור בחירות טורניר'}
          </button>
        )}
      </div>
    </div>
  );
}
