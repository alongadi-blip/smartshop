import { useMatches, useUserPredictions } from '../hooks/useMatches';
import { useAuth } from '../hooks/useAuth';
import MatchCard from '../components/matches/MatchCard';
import type { Match } from '../types';

export default function MatchesPage() {
  const { matches, loading } = useMatches();
  const { profile } = useAuth();
  const { predictions, savePrediction } = useUserPredictions(profile?.id);

  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? m.stage;
    acc[key] = [...(acc[key] ?? []), m];
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center text-gray-400">Loading matches…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      {Object.entries(grouped).map(([group, groupMatches]) => (
        <section key={group}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">{group}</h2>
          <div className="space-y-3">
            {groupMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id]}
                onSave={(home, away) => savePrediction(match.id, home, away)}
              />
            ))}
          </div>
        </section>
      ))}
      {matches.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No matches loaded yet. Admin needs to sync from API-Football.
        </p>
      )}
    </div>
  );
}
