import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Lock } from 'lucide-react';
import { isMatchLocked } from '../../utils/scoring';
import type { Match, Prediction } from '../../types';

const TEAM_FLAGS: Record<string, string> = {
  'Mexico': 'mx', 'South Korea': 'kr', 'South Africa': 'za', 'Czechia': 'cz',
  'Canada': 'ca', 'Switzerland': 'ch', 'Qatar': 'qa', 'Bosnia and Herzegovina': 'ba',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'United States': 'us',
  'Australia': 'au', 'Paraguay': 'py', 'Turkey': 'tr', 'Germany': 'de',
  'Ecuador': 'ec', 'Ivory Coast': 'ci', 'Curacao': 'cw', 'Netherlands': 'nl',
  'Japan': 'jp', 'Tunisia': 'tn', 'Sweden': 'se', 'Belgium': 'be',
  'Iran': 'ir', 'Egypt': 'eg', 'New Zealand': 'nz', 'Spain': 'es',
  'Uruguay': 'uy', 'Saudi Arabia': 'sa', 'Cape Verde': 'cv', 'France': 'fr',
  'Senegal': 'sn', 'Norway': 'no', 'Iraq': 'iq', 'Argentina': 'ar',
  'Austria': 'at', 'Algeria': 'dz', 'Jordan': 'jo', 'Portugal': 'pt',
  'Colombia': 'co', 'Uzbekistan': 'uz', 'DR Congo': 'cd', 'Croatia': 'hr',
  'Panama': 'pa', 'Ghana': 'gh', 'Scotland': 'gb-sct', 'England': 'gb-eng',
};

function getFlag(team: string, stored?: string | null): string | undefined {
  if (stored) return stored;
  const code = TEAM_FLAGS[team];
  return code ? `https://flagcdn.com/w40/${code}.png` : undefined;
}

interface Props {
  match: Match;
  prediction?: Prediction;
  onSave: (home: number, away: number) => void;
}

export default function MatchCard({ match, prediction, onSave }: Props) {
  const locked = isMatchLocked(match.match_time);
  const [home, setHome] = useState<number | ''>(prediction?.predicted_home_score ?? '');
  const [away, setAway] = useState<number | ''>(prediction?.predicted_away_score ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setTimeout(() => setSaved(false), 2000);
  }

  const homeFlag = getFlag(match.home_team, match.home_team_flag);
  const awayFlag = getFlag(match.away_team, match.away_team_flag);

  const pts = prediction?.points_earned;
  const hasPoints = pts !== undefined && pts !== null;
  const isFinished = match.status === 'finished';

  return (
    <div
      style={{
        background: locked ? '#0E1828' : '#131C2E',
        border: `1px solid ${locked ? '#182333' : '#1E2D45'}`,
        borderRadius: '16px',
        padding: '14px 16px',
        opacity: locked && !prediction ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: '#475569', fontSize: '11px', fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {format(new Date(match.match_time), 'EEE d MMM · HH:mm')}
        </span>
        <div className="flex items-center gap-2">
          {locked && !isFinished && <Lock size={11} color="#475569" />}
          {isFinished && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', color: '#94A3B8', letterSpacing: '0.02em' }}>
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
              {pts === 3 ? '+3 EXACT' : pts === 1 ? '+1 RESULT' : '0 PTS'}
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score row */}
      <div className="flex items-center gap-3">
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
            color: '#E2E8F0',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {match.home_team}
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
                background: '#1E2D45',
                border: '1px solid #2A3F5F',
                borderRadius: '10px',
                padding: '6px 2px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: '#F1F5F9',
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
                background: '#1E2D45',
                border: '1px solid #2A3F5F',
                borderRadius: '10px',
                padding: '6px 2px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: '#F1F5F9',
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
          }}>
            {match.away_team}
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
          {saved ? 'SAVED ✓' : saving ? 'SAVING…' : 'SAVE PREDICTION'}
        </button>
      )}
    </div>
  );
}
