import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">{entry.display_name}</h2>
            <p className="text-sm text-gray-500">{entry.total_points} pts total</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
          {!loading && history.length === 0 && (
            <p className="text-center text-gray-400 py-8">No scored predictions yet.</p>
          )}
          {history.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {p.match.home_team} vs {p.match.away_team}
                </p>
                <p className="text-xs text-gray-400">
                  {format(new Date(p.match.match_time), 'd MMM')} ·
                  Actual: {p.match.home_score}–{p.match.away_score} ·
                  Bet: {p.predicted_home_score}–{p.predicted_away_score}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                p.points_earned === 3 ? 'bg-green-100 text-green-700' :
                p.points_earned === 1 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-600'
              }`}>
                {p.points_earned === 3 ? '+3' : p.points_earned === 1 ? '+1' : '0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
