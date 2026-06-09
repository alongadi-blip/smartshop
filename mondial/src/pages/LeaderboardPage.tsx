import { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../hooks/useAuth';
import PlayerDetailModal from '../components/leaderboard/PlayerDetailModal';
import PredictionsMatrix from '../components/leaderboard/PredictionsMatrix';
import type { LeaderboardEntry } from '../types';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#CD7F32'];
const RANK_LABELS = ['1', '2', '3'];

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { profile } = useAuth();
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [tab, setTab] = useState<'rankings' | 'predictions'>('rankings');

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
        טוען…
      </span>
    </div>
  );

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8">
      {/* Header + Tabs */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', letterSpacing: '0.03em', color: '#F1F5F9' }}>
          טבלת ניקוד
        </h1>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      {/* Tab switcher */}
      <div className="flex mb-5" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '12px', padding: '4px' }}>
        {(['rankings', 'predictions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 cursor-pointer transition-all duration-200"
            style={{
              padding: '8px',
              borderRadius: '9px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: 'none',
              background: tab === t ? 'var(--bg-input)' : 'transparent',
              color: tab === t ? 'var(--text-1)' : 'var(--text-7)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {t === 'rankings' ? 'דירוג' : 'כל הניחושים'}
          </button>
        ))}
      </div>

      {tab === 'rankings' && (
        <>
          {entries.length === 0 ? (
            <div className="text-center py-20">
              <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px' }}>אין ניקוד עדיין</p>
            </div>
          ) : (
            <div className="space-y-2">
              {top3.map((entry, idx) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="w-full text-left cursor-pointer transition-all duration-200"
                  style={{
                    background: entry.id === profile?.id
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06))'
                      : 'linear-gradient(135deg, rgba(30,45,69,0.8), rgba(19,28,46,0.8))',
                    border: entry.id === profile?.id
                      ? '1px solid rgba(34,197,94,0.3)'
                      : `1px solid ${idx === 0 ? 'rgba(245,158,11,0.3)' : '#1E2D45'}`,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: idx === 0 ? '0 4px 20px rgba(245,158,11,0.1)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center"
                      style={{ width: '40px', height: '40px', borderRadius: '12px',
                        background: `rgba(${idx === 0 ? '245,158,11' : idx === 1 ? '148,163,184' : '205,127,50'},0.15)`,
                        border: `1px solid rgba(${idx === 0 ? '245,158,11' : idx === 1 ? '148,163,184' : '205,127,50'},0.3)` }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '13px', color: MEDAL_COLORS[idx], letterSpacing: '0.05em' }}>
                        {RANK_LABELS[idx]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '16px', color: '#E2E8F0', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.display_name}
                        {entry.id === profile?.id && <span style={{ color: '#22C55E', fontSize: '12px', marginRight: '8px', fontWeight: 600 }}>אתה</span>}
                      </p>
                      <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>
                        {entry.games_scored} עם ניקוד · {entry.exact_hits} מדויק · {entry.outcome_hits} תוצאה
                      </p>
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '28px', color: MEDAL_COLORS[idx], letterSpacing: '0.02em', lineHeight: 1, flexShrink: 0 }}>
                      {entry.total_points}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginRight: '2px' }}>נק׳</span>
                    </div>
                  </div>
                </button>
              ))}

              {rest.length > 0 && (
                <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '16px', overflow: 'hidden', marginTop: '8px' }}>
                  {rest.map((entry, idx) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelected(entry)}
                      className="w-full text-left cursor-pointer transition-colors duration-200"
                      style={{ padding: '12px 16px', borderBottom: idx < rest.length - 1 ? '1px solid #182333' : 'none', background: entry.id === profile?.id ? 'rgba(34,197,94,0.08)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', color: '#334155', width: '28px', textAlign: 'center' }}>
                          {idx + 4}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '15px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.display_name}
                            {entry.id === profile?.id && <span style={{ color: '#22C55E', fontSize: '11px', marginRight: '6px' }}>אתה</span>}
                          </p>
                        </div>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', color: '#64748B', flexShrink: 0 }}>
                          {entry.total_points}<span style={{ fontSize: '12px', marginRight: '2px' }}>נק׳</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'predictions' && <PredictionsMatrix />}

      {selected && (
        <PlayerDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
