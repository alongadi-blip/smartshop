import { useMatches } from '../hooks/useMatches';
import GroupStandings from '../components/matches/GroupStandings';

export default function GroupsPage() {
  const { matches, loading } = useMatches();

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
        טוען…
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8">
      <GroupStandings matches={matches} defaultOpen />
    </div>
  );
}
