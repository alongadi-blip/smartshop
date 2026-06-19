import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { isMatchLocked } from '../../utils/scoring';
import { TEAM_HE, teamFlag as getFlag } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import type { Match, Prediction } from '../../types';

interface Props {
  match: Match;
  prediction?: Prediction;
  onSave: (home: number, away: number) => void;
}

interface UserPred {
  name: string;
  home: number;
  away: number;
  pts: number | null;
}

export default function MatchCard({ match, prediction, onSave }: Props) {
  const locked = isMatchLocked(match.match_time);
  const [home, setHome] = useState<number | ''>(prediction?.predicted_home_score ?? '');
  const [away, setAway] = useState<number | ''>(prediction?.predicted_away_score ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreds, setShowPreds] = useState(false);
  const [userPreds, setUserPreds] = useState<UserPred[]>([]);
  const [predsLoading, setPredsLoading] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHome(prediction.predicted_home_score);
      setAway(prediction.predicted_away_score);
    }
  }, [prediction]);

  async function handleSave() {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    await onSave(h, a);
    setSaving(false);
    setSaved(true);
  }

  async function togglePreds() {
    if (!showPreds && userPreds.length === 0) {
      setPredsLoading(true);
      const { data } = await supabase
        .from('predictions')
        .select('predicted_home_score, predicted_away_score, points_earned, profiles(display_name)')
        .eq('match_id', match.id);
      const loaded: UserPred[] = (data ?? []).map((p: any) => ({
        name: p.profiles?.display_name ?? '?',
        home: p.predicted_home_score,
        away: p.predicted_away_score,
        pts: p.points_earned,
      }));
      // Sort: if finished → by pts desc; otherwise alphabetically
      if (isFinished) {
        loaded.sort((a, b) => (b.pts ?? -1) - (a.pts ?? -1) || a.name.localeCompare(b.name));
      } else {
        loaded.sort((a, b) => a.name.localeCompare(b.name));
      }
      setUserPreds(loaded);
      setPredsLoading(false);
    }
    setShowPreds(v => !v);
  }

  const homeFlag = getFlag(match.home_team, match.home_team_flag);
  const awayFlag = getFlag(match.away_team, match.away_team_flag);

  const pts = prediction?.points_earned;
  const hasPoints = pts !== undefined && pts !== null;
  const isFinished = match.status === 'finished';

  return (
    <div
      style={{
        background: locked ? 'var(--bg-card2)' : 'var(--bg-card)',
        border: `1px solid ${locked ? 'var(--border-2)' : 'var(--border-card)'}`,
        borderRadius: '16px',
        padding: '14px 16px',
        opacity: locked && !prediction ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: '#475569', fontSize: '11px', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.03em' }}>
          {format(new Date(match.match_time), 'EEE d MMM · HH:mm', { locale: he })}
        </span>
        <div className="flex items-center gap-2">
          {locked && !isFinished && <Lock size={11} color="#475569" />}
          {isFinished && (
            <span dir="ltr" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', color: '#94A3B8', letterSpacing: '0.02em' }}>
              {match.home_score} – {match.away_score}
            </span>
          )}
          {hasPoints && (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
              ...(pts === 3
                ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                : pts === 1
                ? { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }
                : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
              ),
            }}>
              {pts === 3 ? '+3 מדויק' : pts === 1 ? '+1 תוצאה' : '0 נק׳'}
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score row — keep LTR so home is always on the left visually */}
      <div className="flex items-center gap-3" dir="ltr">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {homeFlag && (
            <img src={homeFlag} alt="" className="flex-shrink-0 rounded-sm shadow"
              style={{ width: '28px', height: '18px', objectFit: 'cover' }} />
          )}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--text-2)',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            direction: 'rtl',
          }}>
            {TEAM_HE[match.home_team] ?? match.home_team}
          </span>
        </div>

        {/* Score inputs or locked display */}
        {locked ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '22px',
              color: home !== '' ? '#F1F5F9' : '#334155',
              minWidth: '22px',
              textAlign: 'center',
            }}>
              {home !== '' ? home : '?'}
            </span>
            <span style={{ color: '#334155', fontWeight: 700, fontSize: '18px', marginInline: '2px' }}>–</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '22px',
              color: away !== '' ? '#F1F5F9' : '#334155',
              minWidth: '22px',
              textAlign: 'center',
            }}>
              {away !== '' ? away : '?'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <input
              type="number" min="0" max="20"
              value={home}
              onChange={(e) => setHome(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                width: '40px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                borderRadius: '10px',
                padding: '6px 2px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: 'var(--text-1)',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
            />
            <span style={{ color: '#334155', fontWeight: 700, fontSize: '16px' }}>–</span>
            <input
              type="number" min="0" max="20"
              value={away}
              onChange={(e) => setAway(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                width: '40px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                borderRadius: '10px',
                padding: '6px 2px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: 'var(--text-1)',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
            />
          </div>
        )}

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '15px',
            color: '#E2E8F0',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'right',
            direction: 'rtl',
          }}>
            {TEAM_HE[match.away_team] ?? match.away_team}
          </span>
          {awayFlag && (
            <img src={awayFlag} alt="" className="flex-shrink-0 rounded-sm shadow"
              style={{ width: '28px', height: '18px', objectFit: 'cover' }} />
          )}
        </div>
      </div>

      {/* Save button */}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || home === '' || away === ''}
          className="cursor-pointer transition-all duration-200 disabled:opacity-40"
          style={{
            marginTop: '12px',
            width: '100%',
            background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #16A34A, #22C55E)',
            color: saved ? '#22C55E' : 'white',
            border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
            borderRadius: '12px',
            padding: '10px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: saved ? 'none' : '0 4px 15px rgba(34,197,94,0.25)',
          }}
        >
          {saved ? 'נשמר ✓' : saving ? 'שומר…' : prediction ? 'ערוך ניחוש' : 'שמור ניחוש'}
        </button>
      )}

      {/* Show predictions button — visible when locked or finished */}
      {locked && (
        <button
          onClick={togglePreds}
          className="cursor-pointer w-full flex items-center justify-center gap-1.5 transition-all duration-200"
          style={{
            marginTop: '10px',
            padding: '7px',
            borderRadius: '10px',
            background: showPreds ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
            border: `1px solid ${showPreds ? 'rgba(99,102,241,0.35)' : 'var(--border-input)'}`,
            color: showPreds ? '#818CF8' : '#475569',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '13px',
            letterSpacing: '0.03em',
          }}
        >
          {showPreds ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showPreds ? 'הסתר הימורים' : `הימורים${userPreds.length > 0 ? ` (${userPreds.length})` : ''}`}
        </button>
      )}

      {/* Predictions list */}
      {locked && showPreds && (
        <div style={{
          marginTop: '8px',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid var(--border-2)',
        }}>
          {predsLoading ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif" }}>
              טוען…
            </div>
          ) : userPreds.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif" }}>
              אין הימורים עדיין
            </div>
          ) : (
            userPreds.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center justify-between"
                style={{
                  padding: '8px 12px',
                  borderBottom: i < userPreds.length - 1 ? '1px solid var(--border-2)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <span style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  flex: 1,
                }}>
                  {p.name}
                </span>
                <span dir="ltr" style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '15px',
                  color: 'var(--text-1)',
                  minWidth: '44px',
                  textAlign: 'center',
                }}>
                  {p.home ?? '?'}–{p.away ?? '?'}
                </span>
                {isFinished && p.pts !== null && (
                  <span style={{
                    marginRight: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    minWidth: '42px',
                    textAlign: 'center',
                    ...(p.pts === 3
                      ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                      : p.pts === 1
                      ? { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                    ),
                  }}>
                    {p.pts === 3 ? '+3' : p.pts === 1 ? '+1' : '0'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
