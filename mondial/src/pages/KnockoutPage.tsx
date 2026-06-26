import { useState, useEffect } from 'react';
import { useMatches, useUserPredictions } from '../hooks/useMatches';
import { useAuth } from '../hooks/useAuth';
import { useLeagueContext } from '../contexts/LeagueContext';
import { isKnockoutStage, STAGE_HE } from '../utils/scoring';
import MatchCard from '../components/matches/MatchCard';
import type { Match } from '../types';

const STAGE_ORDER: Match['stage'][] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

export default function KnockoutPage() {
  const { matches, loading } = useMatches();
  const { profile } = useAuth();
  const { selectedLeague } = useLeagueContext();
  const { predictions, savePrediction } = useUserPredictions(profile?.id, selectedLeague?.id);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const knockoutMatches = matches.filter(m => isKnockoutStage(m.stage));

  const byStage = STAGE_ORDER.map(stage => ({
    stage,
    matches: knockoutMatches
      .filter(m => m.stage === stage)
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime()),
  })).filter(g => g.matches.length > 0);

  // Collapse finished rounds once matches load
  useEffect(() => {
    if (byStage.length === 0) return;
    const done = new Set(
      byStage.filter(g => g.matches.every(m => m.status === 'finished')).map(g => g.stage)
    );
    setCollapsed(done);
  }, [knockoutMatches.length]);

  function toggle(stage: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
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
      <div className="space-y-2">
        {byStage.map(({ stage, matches: stageMatches }) => {
          const isOpen = !collapsed.has(stage);
          const finished = stageMatches.filter(m => m.status === 'finished').length;
          return (
            <section key={stage}>
              <button
                onClick={() => toggle(stage)}
                className="w-full cursor-pointer"
                style={{ padding: '0 4px', marginBottom: isOpen ? '10px' : '4px' }}
              >
                <div className="flex items-center gap-3">
                  <h2 style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.04em',
                    color: '#818CF8',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {STAGE_HE[stage]}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
                  <span style={{ color: 'var(--text-7)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {finished > 0 ? `${finished}/${stageMatches.length}` : stageMatches.length} מ׳
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: isOpen ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
                    border: isOpen ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-input)',
                    color: isOpen ? '#818CF8' : 'var(--text-6)',
                    fontSize: '14px', lineHeight: 1, transition: 'all 0.2s', flexShrink: 0,
                  }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-2">
                  {stageMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictions[match.id]}
                      leagueId={selectedLeague?.id}
                      onSave={(home, away, etHome, etAway, penWinner) =>
                        savePrediction(match.id, home, away, etHome, etAway, penWinner)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {knockoutMatches.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: 'var(--text-7)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px' }}>
              שלב הנוקאוט עדיין לא נקבע
            </p>
            <p style={{ color: 'var(--text-7)', fontSize: '13px', marginTop: '6px' }}>
              המשחקים יתעדכנו אוטומטית כשהבתים יסתיימו
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
