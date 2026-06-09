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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.1em' }}>
        LOADING MATCHES…
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-6 pb-8">
      {Object.entries(grouped).map(([group, groupMatches]) => (
        <section key={group}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#22C55E',
            }}>
              {group}
            </h2>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
            <span style={{ color: '#334155', fontSize: '11px' }}>{groupMatches.length} matches</span>
          </div>
          <div className="space-y-2">
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
        <div className="text-center py-20">
          <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
            No matches loaded yet
          </p>
        </div>
      )}
    </div>
  );
}
