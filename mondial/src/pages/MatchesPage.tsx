import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useMatches, useUserPredictions } from '../hooks/useMatches';
import { useAuth } from '../hooks/useAuth';
import MatchCard from '../components/matches/MatchCard';
import type { Match } from '../types';

function dateKey(matchTime: string): string {
  return format(new Date(matchTime), 'yyyy-MM-dd');
}

function dateLabel(matchTime: string): string {
  const d = new Date(matchTime);
  const day = format(d, 'EEEE', { locale: he });
  const date = format(d, "d 'ב'MMMM", { locale: he });
  return `${day} · ${date}`;
}

export default function MatchesPage() {
  const { matches, loading } = useMatches();
  const { profile } = useAuth();
  const { predictions, savePrediction } = useUserPredictions(profile?.id);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Collapse past dates once matches load
  useEffect(() => {
    if (matches.length === 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const past = new Set(
      matches.map(m => dateKey(m.match_time)).filter(k => k < today)
    );
    setCollapsed(past);
  }, [matches.length]);

  // Sort by time, then group by date
  const sorted = [...matches].sort((a, b) =>
    new Date(a.match_time).getTime() - new Date(b.match_time).getTime()
  );

  const byDate = sorted.reduce<{ key: string; label: string; matches: Match[] }[]>((acc, m) => {
    const key = dateKey(m.match_time);
    const existing = acc.find(g => g.key === key);
    if (existing) existing.matches.push(m);
    else acc.push({ key, label: dateLabel(m.match_time), matches: [m] });
    return acc;
  }, []);

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
        טוען משחקים…
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8">
      {/* Date sections */}
      <div className="space-y-2">
        {byDate.map(({ key, label, matches: dayMatches }) => {
          const isOpen = !collapsed.has(key);
          const finished = dayMatches.filter(m => m.status === 'finished').length;
          return (
            <section key={key}>
              <button
                onClick={() => toggle(key)}
                className="w-full cursor-pointer"
                style={{ padding: '0 4px', marginBottom: isOpen ? '10px' : '4px' }}
              >
                <div className="flex items-center gap-3">
                  <h2 style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.04em',
                    color: '#22C55E',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
                  <span style={{ color: 'var(--text-7)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {finished > 0 ? `${finished}/${dayMatches.length}` : dayMatches.length} מ׳
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: isOpen ? 'rgba(34,197,94,0.12)' : 'var(--bg-input)',
                    border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-input)',
                    color: isOpen ? '#22C55E' : 'var(--text-6)',
                    fontSize: '14px', lineHeight: 1, transition: 'all 0.2s', flexShrink: 0,
                  }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-2">
                  {dayMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictions[match.id]}
                      onSave={(home, away) => savePrediction(match.id, home, away)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {matches.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: 'var(--text-7)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px' }}>
              אין משחקים עדיין
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
