import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { TEAM_HE } from '../../lib/i18n';
import type { LeaderboardEntry, Match, Prediction } from '../../types';

interface Props {
  entry: LeaderboardEntry;
  onClose: () => void;
}

interface PredictionWithMatch extends Prediction {
  match: Match;
}

export default function PlayerDetailModal({ entry, onClose }: Props) {
  const [history, setHistory] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', entry.id)
      .not('points_earned', 'is', null)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setHistory((data ?? []) as PredictionWithMatch[]);
        setLoading(false);
      });
  }, [entry.id]);

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <div>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: '#F1F5F9',
              letterSpacing: '0.03em',
            }}>
              {entry.display_name}
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', marginTop: '2px' }}>
              <span style={{ color: '#22C55E', fontWeight: 700 }}>{entry.total_points}</span>
              {' נק׳ סה"כ · '}{entry.exact_hits} מדויק · {entry.outcome_hits} תוצאה
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors duration-200"
            style={{ color: '#334155', padding: '4px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && (
            <p style={{ textAlign: 'center', color: '#334155', padding: '32px 0', fontFamily: "'Barlow Condensed', sans-serif" }}>
              טוען…
            </p>
          )}
          {!loading && history.length === 0 && (
            <p style={{ textAlign: 'center', color: '#334155', padding: '32px 0', fontFamily: "'Barlow Condensed', sans-serif" }}>
              אין ניחושים עם ניקוד עדיין
            </p>
          )}
          {history.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #0E1828' }}>
              <div className="flex-1 min-w-0">
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: '15px',
                  color: '#94A3B8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {TEAM_HE[p.match.home_team] ?? p.match.home_team} נגד {TEAM_HE[p.match.away_team] ?? p.match.away_team}
                </p>
                <p style={{ color: '#334155', fontSize: '12px', marginTop: '2px', fontFamily: "'Barlow', sans-serif" }}>
                  {format(new Date(p.match.match_time), 'd MMM', { locale: he })} ·
                  תוצאה: <span style={{ color: '#64748B' }}>{p.match.home_score}–{p.match.away_score}</span> ·
                  ניחוש: <span style={{ color: '#64748B' }}>{p.predicted_home_score}–{p.predicted_away_score}</span>
                </p>
              </div>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                padding: '3px 10px',
                borderRadius: '999px',
                letterSpacing: '0.05em',
                ...(p.points_earned === 3
                  ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                  : p.points_earned === 1
                  ? { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }
                  : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                ),
              }}>
                {p.points_earned === 3 ? '+3' : p.points_earned === 1 ? '+1' : '0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
