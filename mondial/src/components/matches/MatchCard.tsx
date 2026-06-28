import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { isMatchLocked, isKnockoutStage, STAGE_HE } from '../../utils/scoring';
import { TEAM_HE, teamFlag as getFlag } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import type { Match, Prediction } from '../../types';

interface Props {
  match: Match;
  prediction?: Prediction;
  leagueId?: string | null;
  onSave: (
    home: number,
    away: number,
    etHome?: number,
    etAway?: number,
    penaltyWinner?: string
  ) => void;
}

interface UserPred {
  name: string;
  home: number;
  away: number;
  etHome: number | null;
  etAway: number | null;
  penWinner: string | null;
  pts: number | null;
}

const inputStyle: React.CSSProperties = {
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
};

const etInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: '16px',
  width: '34px',
  padding: '4px 2px',
  border: '1px solid rgba(99,102,241,0.4)',
};

export default function MatchCard({ match, prediction, leagueId, onSave }: Props) {
  const locked = isMatchLocked(match.match_time);
  const isKnockout = isKnockoutStage(match.stage);

  const [home, setHome] = useState<number | ''>(prediction?.predicted_home_score ?? '');
  const [away, setAway] = useState<number | ''>(prediction?.predicted_away_score ?? '');
  const [etHome, setEtHome] = useState<number | ''>(prediction?.predicted_et_home_score ?? '');
  const [etAway, setEtAway] = useState<number | ''>(prediction?.predicted_et_away_score ?? '');
  const [penWinner, setPenWinner] = useState<string>(prediction?.predicted_penalty_winner ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showPreds, setShowPreds] = useState(false);
  const [userPreds, setUserPreds] = useState<UserPred[]>([]);
  const [predsLoading, setPredsLoading] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHome(prediction.predicted_home_score);
      setAway(prediction.predicted_away_score);
      setEtHome(prediction.predicted_et_home_score ?? '');
      setEtAway(prediction.predicted_et_away_score ?? '');
      setPenWinner(prediction.predicted_penalty_winner ?? '');
    }
  }, [prediction]);

  async function handleSave() {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(
        h,
        a,
        isKnockout && etHome !== '' ? Number(etHome) : undefined,
        isKnockout && etAway !== '' ? Number(etAway) : undefined,
        isKnockout ? penWinner || undefined : undefined
      );
      setSaved(true);
    } catch (err) {
      console.error('Failed to save prediction', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function togglePreds() {
    if (!showPreds && userPreds.length === 0) {
      setPredsLoading(true);
      let q = supabase
        .from('predictions')
        .select('predicted_home_score, predicted_away_score, predicted_et_home_score, predicted_et_away_score, predicted_penalty_winner, points_earned, et_points_earned, penalty_points_earned, profiles(display_name)')
        .eq('match_id', match.id);
      if (match.stage === 'group') {
        q = q.is('league_id', null);
      } else if (leagueId) {
        q = q.eq('league_id', leagueId);
      }

      const { data } = await q;
      const loaded: UserPred[] = (data ?? []).map((p: any) => ({
        name: p.profiles?.display_name ?? '?',
        home: p.predicted_home_score,
        away: p.predicted_away_score,
        etHome: p.predicted_et_home_score ?? null,
        etAway: p.predicted_et_away_score ?? null,
        penWinner: p.predicted_penalty_winner ?? null,
        pts: isFinished
          ? (p.points_earned ?? 0) + (p.et_points_earned ?? 0) + (p.penalty_points_earned ?? 0)
          : null,
      }));
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
  const pts = prediction ? (prediction.points_earned ?? 0) + (prediction.et_points_earned ?? 0) + (prediction.penalty_points_earned ?? 0) : null;
  const hasPoints = pts !== null && prediction?.points_earned !== undefined && prediction.points_earned !== null;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  // Badge color for total knockout points
  function ptsColor(n: number) {
    if (n >= 3) return { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' };
    if (n === 1 || n === 2) return { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' };
    return { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' };
  }

  const canSave = home !== '' && away !== '';

  return (
    <div style={{
      background: locked ? 'var(--bg-card2)' : 'var(--bg-card)',
      border: `1px solid ${isLive ? 'rgba(34,197,94,0.4)' : locked ? 'var(--border-2)' : 'var(--border-card)'}`,
      borderRadius: '16px',
      padding: '14px 16px',
      opacity: locked && !prediction ? 0.7 : 1,
      transition: 'all 0.2s',
    }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: '#475569', fontSize: '11px', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.03em' }}>
          {isKnockout && (
            <span style={{ color: '#818CF8', marginLeft: '6px', fontWeight: 600 }}>
              {STAGE_HE[match.stage]}
            </span>
          )}
          {format(new Date(match.match_time), 'EEE d MMM · HH:mm', { locale: he })}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: 'rgba(34,197,94,0.2)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.4)', letterSpacing: '0.05em', fontFamily: "'Barlow Condensed', sans-serif" }}>
              LIVE
            </span>
          )}
          {locked && !isLive && !isFinished && <Lock size={11} color="#475569" />}
          {isFinished && (
            <span dir="ltr" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', color: '#94A3B8', letterSpacing: '0.02em' }}>
              {match.home_score} – {match.away_score}
              {match.went_to_et && match.et_home_score !== undefined && (
                <span style={{ fontSize: '11px', color: '#6366F1', marginRight: '4px' }}>
                  {' '}({match.et_home_score}–{match.et_away_score} AET)
                </span>
              )}
              {match.penalty_winner && (
                <span style={{ fontSize: '11px', color: '#F59E0B', marginRight: '4px' }}>
                  {' '}PEN: {TEAM_HE[match.penalty_winner] ?? match.penalty_winner}
                </span>
              )}
            </span>
          )}
          {hasPoints && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em',
              ...ptsColor(pts!),
            }}>
              +{pts}
            </span>
          )}
        </div>
      </div>

      {/* Teams + 90-min score row — LTR so home is always visually left */}
      <div className="flex items-center gap-3" dir="ltr">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {homeFlag && (
            <img src={homeFlag} alt="" className="flex-shrink-0 rounded-sm shadow"
              style={{ width: '28px', height: '18px', objectFit: 'cover' }} />
          )}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '15px', color: 'var(--text-2)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl' }}>
            {TEAM_HE[match.home_team] ?? match.home_team}
          </span>
        </div>

        {/* 90-min score inputs / display */}
        {locked ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '22px', color: home !== '' ? '#F1F5F9' : '#334155', minWidth: '22px', textAlign: 'center' }}>
              {home !== '' ? home : '?'}
            </span>
            <span style={{ color: '#334155', fontWeight: 700, fontSize: '18px', marginInline: '2px' }}>–</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '22px', color: away !== '' ? '#F1F5F9' : '#334155', minWidth: '22px', textAlign: 'center' }}>
              {away !== '' ? away : '?'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <input type="number" min="0" max="20" value={home}
              onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <span style={{ color: '#334155', fontWeight: 700, fontSize: '16px' }}>–</span>
            <input type="number" min="0" max="20" value={away}
              onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
        )}

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '15px', color: '#E2E8F0', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', direction: 'rtl' }}>
            {TEAM_HE[match.away_team] ?? match.away_team}
          </span>
          {awayFlag && (
            <img src={awayFlag} alt="" className="flex-shrink-0 rounded-sm shadow"
              style={{ width: '28px', height: '18px', objectFit: 'cover' }} />
          )}
        </div>
      </div>

      {/* Knockout extra fields: ET + Penalty */}
      {isKnockout && (
        <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
          {/* ET row */}
          <div className="flex items-center gap-3" dir="ltr">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '11px', color: '#818CF8', letterSpacing: '0.08em', textTransform: 'uppercase', minWidth: '60px' }}>
              הארכה
            </span>
            {locked ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '17px', color: etHome !== '' ? '#C7D2FE' : '#334155', minWidth: '18px', textAlign: 'center' }}>
                  {etHome !== '' ? etHome : '?'}
                </span>
                <span style={{ color: '#334155', fontWeight: 700, fontSize: '14px', marginInline: '2px' }}>–</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '17px', color: etAway !== '' ? '#C7D2FE' : '#334155', minWidth: '18px', textAlign: 'center' }}>
                  {etAway !== '' ? etAway : '?'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input type="number" min="0" max="20" value={etHome}
                  onChange={e => setEtHome(e.target.value === '' ? '' : Number(e.target.value))}
                  style={etInputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid #818CF8')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(99,102,241,0.4)')} />
                <span style={{ color: '#334155', fontWeight: 700, fontSize: '13px' }}>–</span>
                <input type="number" min="0" max="20" value={etAway}
                  onChange={e => setEtAway(e.target.value === '' ? '' : Number(e.target.value))}
                  style={etInputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid #818CF8')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(99,102,241,0.4)')} />
              </div>
            )}
            <span style={{ color: '#475569', fontSize: '10px', marginRight: 'auto' }}>
              {!locked && 'אם יגיע להארכה'}
            </span>
          </div>

          {/* Penalty row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ direction: 'rtl' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '11px', color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: '4px' }}>
              פנדלים
            </span>
            {locked ? (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', color: penWinner ? '#FCD34D' : '#334155' }}>
                {penWinner ? (TEAM_HE[penWinner] ?? penWinner) : '?'}
              </span>
            ) : (
              <div className="flex items-center gap-2" dir="ltr">
                {[match.home_team, '', match.away_team].map((team, idx) => {
                  if (!team) return (
                    <span key="sep" style={{ color: '#334155', fontSize: '12px' }}>/</span>
                  );
                  const isSelected = penWinner === team;
                  return (
                    <button
                      key={idx}
                      onClick={() => setPenWinner(isSelected ? '' : team)}
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${isSelected ? 'rgba(245,158,11,0.6)' : 'var(--border-input)'}`,
                        background: isSelected ? 'rgba(245,158,11,0.15)' : 'var(--bg-input)',
                        color: isSelected ? '#FCD34D' : '#475569',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {TEAM_HE[team] ?? team}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="cursor-pointer transition-all duration-200 disabled:opacity-40"
          style={{
            marginTop: '12px',
            width: '100%',
            background: saveError ? 'rgba(239,68,68,0.15)' : saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #16A34A, #22C55E)',
            color: saveError ? '#EF4444' : saved ? '#22C55E' : 'white',
            border: saveError ? '1px solid rgba(239,68,68,0.4)' : saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
            borderRadius: '12px',
            padding: '10px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: saveError || saved ? 'none' : '0 4px 15px rgba(34,197,94,0.25)',
          }}
        >
          {saveError ? 'שמירה נכשלה — נסה שוב' : saved ? 'נשמר ✓' : saving ? 'שומר…' : prediction ? 'ערוך ניחוש' : 'שמור ניחוש'}
        </button>
      )}

      {/* View predictions button — visible when locked */}
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
        <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-2)' }}>
          {predsLoading ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif" }}>
              טוען…
            </div>
          ) : userPreds.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif" }}>
              אין הימורים
            </div>
          ) : (
            userPreds.map((p, i) => (
              <div key={p.name} style={{ padding: '8px 12px', borderBottom: i < userPreds.length - 1 ? '1px solid var(--border-2)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--text-2)', flex: 1 }}>
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span dir="ltr" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--text-1)', minWidth: '44px', textAlign: 'center' }}>
                      {p.home ?? '?'}–{p.away ?? '?'}
                    </span>
                    {isKnockout && (p.etHome !== null || p.etAway !== null) && (
                      <span dir="ltr" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: '#818CF8' }}>
                        AET: {p.etHome ?? '?'}–{p.etAway ?? '?'}
                      </span>
                    )}
                    {isKnockout && p.penWinner && (
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: '#FCD34D' }}>
                        PEN: {TEAM_HE[p.penWinner] ?? p.penWinner}
                      </span>
                    )}
                    {isFinished && p.pts !== null && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px',
                        fontFamily: "'Barlow Condensed', sans-serif", minWidth: '36px', textAlign: 'center',
                        ...(p.pts! >= 3
                          ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                          : p.pts! > 0
                          ? { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }
                          : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                        ),
                      }}>
                        +{p.pts}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
