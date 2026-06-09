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
  const [home, setHome] = useState(prediction?.predicted_home_score ?? '');
  const [away, setAway] = useState(prediction?.predicted_away_score ?? '');
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

  const pointsBadge = prediction?.points_earned !== undefined && prediction.points_earned !== null ? (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      prediction.points_earned === 3 ? 'bg-green-100 text-green-700' :
      prediction.points_earned === 1 ? 'bg-yellow-100 text-yellow-700' :
      'bg-red-100 text-red-600'
    }`}>
      {prediction.points_earned === 3 ? '+3 Exact!' :
       prediction.points_earned === 1 ? '+1 Result' : '0 pts'}
    </span>
  ) : null;

  const homeFlag = getFlag(match.home_team, match.home_team_flag);
  const awayFlag = getFlag(match.away_team, match.away_team_flag);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-4 ${locked ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{format(new Date(match.match_time), 'EEE d MMM · HH:mm')}</span>
        <div className="flex items-center gap-2">
          {locked && <Lock size={13} className="text-gray-400" />}
          {pointsBadge}
          {match.status === 'finished' && (
            <span className="text-xs font-bold text-gray-700">
              {match.home_score} – {match.away_score}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-2 flex-1">
          {homeFlag && <img src={homeFlag} alt="" className="w-8 h-5 object-cover rounded shadow-sm" />}
          <span className="font-semibold text-gray-800 text-sm">{match.home_team}</span>
        </div>

        {locked ? (
          <div className="flex items-center gap-1 text-lg font-bold text-gray-400">
            <span>{home !== '' ? home : '?'}</span>
            <span className="text-gray-300">–</span>
            <span>{away !== '' ? away : '?'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="20"
              value={home}
              onChange={(e) => setHome(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-10 text-center border border-gray-200 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <span className="text-gray-400 font-bold">–</span>
            <input
              type="number" min="0" max="20"
              value={away}
              onChange={(e) => setAway(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-10 text-center border border-gray-200 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-semibold text-gray-800 text-sm text-right">{match.away_team}</span>
          {awayFlag && <img src={awayFlag} alt="" className="w-8 h-5 object-cover rounded shadow-sm" />}
        </div>
      </div>

      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || home === '' || away === ''}
          className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-2 transition"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Prediction'}
        </button>
      )}
    </div>
  );
}
