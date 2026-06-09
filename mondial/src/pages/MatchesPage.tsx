import { useState } from 'react';
import { useMatches, useUserPredictions } from '../hooks/useMatches';
import { useAuth } from '../hooks/useAuth';
import MatchCard from '../components/matches/MatchCard';
import { GROUP_HE } from '../lib/i18n';
import type { Match } from '../types';

export default function MatchesPage() {
  const { matches, loading } = useMatches();
  const { profile } = useAuth();
  const { predictions, savePrediction } = useUserPredictions(profile?.id);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? m.stage;
    acc[key] = [...(acc[key] ?? []), m];
    return acc;
  }, {});

  function toggle(group: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
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
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-2 pb-8">
      {Object.entries(grouped).map(([group, groupMatches]) => {
        const isOpen = !collapsed.has(group);
        return (
          <section key={group}>
            {/* Group header — tap to collapse */}
            <button
              onClick={() => toggle(group)}
              className="w-full cursor-pointer"
              style={{ padding: '0 4px', marginBottom: isOpen ? '10px' : '0' }}
            >
              <div className="flex items-center gap-3">
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.05em',
                  color: '#22C55E',
                  margin: 0,
                }}>
                  {GROUP_HE[group] ?? group}
                </h2>
                <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
                <span style={{ color: 'var(--text-7)', fontSize: '11px', marginLeft: '2px' }}>
                  {groupMatches.length} משחקים
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isOpen ? 'rgba(34,197,94,0.12)' : 'var(--bg-input)',
                  border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-input)',
                  color: isOpen ? '#22C55E' : 'var(--text-6)',
                  fontSize: '14px',
                  lineHeight: 1,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  {isOpen ? '−' : '+'}
                </span>
              </div>
            </button>

            {/* Matches — hidden when collapsed */}
            {isOpen && (
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
            )}
          </section>
        );
      })}
      {matches.length === 0 && (
        <div className="text-center py-20">
          <p style={{ color: 'var(--text-7)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.03em' }}>
            אין משחקים עדיין
          </p>
        </div>
      )}
    </div>
  );
}
