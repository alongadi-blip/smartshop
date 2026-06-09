import { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../hooks/useAuth';
import PlayerDetailModal from '../components/leaderboard/PlayerDetailModal';
import type { LeaderboardEntry } from '../types';

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { profile } = useAuth();
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading leaderboard…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Leaderboard</h1>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {entries.map((entry, idx) => (
          <button
            key={entry.id}
            onClick={() => setSelected(entry)}
            className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left border-b last:border-b-0 ${
              entry.id === profile?.id ? 'bg-green-50' : ''
            }`}
          >
            <span className={`w-7 text-center font-bold text-sm ${
              idx === 0 ? 'text-yellow-500' :
              idx === 1 ? 'text-gray-400' :
              idx === 2 ? 'text-amber-600' : 'text-gray-400'
            }`}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {entry.display_name}
                {entry.id === profile?.id && <span className="text-green-600 text-xs ml-2">(you)</span>}
              </p>
              <p className="text-xs text-gray-400">
                {entry.games_scored} games · {entry.exact_hits} exact · {entry.outcome_hits} result
              </p>
            </div>

            <span className="text-lg font-bold text-gray-800">{entry.total_points}</span>
          </button>
        ))}

        {entries.length === 0 && (
          <p className="text-center text-gray-400 py-12">No scores yet.</p>
        )}
      </div>

      {selected && (
        <PlayerDetailModal
          entry={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
