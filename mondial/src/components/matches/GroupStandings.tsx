import { useState } from 'react';
import { TEAM_HE, GROUP_HE } from '../../lib/i18n';
import type { Match } from '../../types';

interface TeamStat {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
}

function buildStandings(matches: Match[]): Record<string, TeamStat[]> {
  const groups: Record<string, Record<string, TeamStat>> = {};

  for (const m of matches.filter(m => m.stage === 'group' && m.group_name)) {
    const g = m.group_name!;
    if (!groups[g]) groups[g] = {};

    for (const team of [m.home_team, m.away_team]) {
      if (!groups[g][team]) {
        groups[g][team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
      }
    }

    if (m.status === 'finished' && m.home_score !== null && m.home_score !== undefined
      && m.away_score !== null && m.away_score !== undefined) {
      const hs = m.home_score, as_ = m.away_score;
      const home = groups[g][m.home_team];
      const away = groups[g][m.away_team];

      home.played++; home.gf += hs; home.ga += as_;
      away.played++; away.gf += as_; away.ga += hs;

      if (hs > as_) { home.won++; home.pts += 3; away.lost++; }
      else if (hs < as_) { away.won++; away.pts += 3; home.lost++; }
      else { home.drawn++; home.pts++; away.drawn++; away.pts++; }
    }
  }

  const result: Record<string, TeamStat[]> = {};
  for (const [g, teams] of Object.entries(groups)) {
    result[g] = Object.values(teams).sort(
      (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
    );
  }
  return result;
}

const COL: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: '13px',
  textAlign: 'center' as const,
  width: '28px',
  flexShrink: 0,
};

const HDR: React.CSSProperties = {
  ...COL,
  color: 'var(--text-7)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
};

export default function GroupStandings({ matches }: { matches: Match[] }) {
  const standings = buildStandings(matches);
  const groups = Object.keys(standings).sort();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(groups)); // all collapsed by default

  if (groups.length === 0) return null;

  function toggle(g: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }

  return (
    <div style={{ marginTop: '28px' }}>
      {/* Section header */}
      <div className="flex items-center gap-3 px-1 mb-3">
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '15px',
          letterSpacing: '0.05em',
          color: 'var(--text-1)',
          margin: 0,
        }}>
          טבלאות הבתים
        </h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const teams = standings[group];
          const isOpen = !collapsed.has(group);
          const played = teams.reduce((s, t) => s + t.played, 0);

          return (
            <div key={group} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}>
              {/* Group header */}
              <button
                onClick={() => toggle(group)}
                className="w-full cursor-pointer"
                style={{ padding: '11px 14px' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    color: '#22C55E',
                  }}>
                    {GROUP_HE[group] ?? group}
                  </span>
                  {played > 0 && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-7)',
                      background: 'var(--bg-card2)',
                      border: '1px solid var(--border-2)',
                      borderRadius: '999px',
                      padding: '1px 7px',
                    }}>
                      {played} מ׳ שוחקו
                    </span>
                  )}
                  <div className="flex-1" />
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
                <div style={{ borderTop: '1px solid var(--border-2)' }}>
                  {/* Column headers */}
                  <div className="flex items-center" style={{ padding: '6px 14px', borderBottom: '1px solid var(--border-2)' }}>
                    <span style={{ ...HDR, width: '18px', textAlign: 'right' }}>#</span>
                    <span style={{ flex: 1, paddingRight: '8px', paddingLeft: '4px', color: 'var(--text-7)', fontSize: '11px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}>קבוצה</span>
                    <span style={HDR}>מש</span>
                    <span style={HDR}>נ</span>
                    <span style={HDR}>ת</span>
                    <span style={HDR}>ה</span>
                    <span style={{ ...HDR, width: '36px' }}>הש</span>
                    <span style={{ ...HDR, color: '#22C55E' }}>נק</span>
                  </div>

                  {/* Team rows */}
                  {teams.map((t, i) => {
                    const gd = t.gf - t.ga;
                    const isTop2 = i < 2;
                    return (
                      <div
                        key={t.team}
                        className="flex items-center"
                        style={{
                          padding: '9px 14px',
                          borderBottom: i < teams.length - 1 ? '1px solid var(--border-2)' : 'none',
                          background: isTop2 ? 'rgba(34,197,94,0.04)' : 'transparent',
                        }}
                      >
                        <span style={{
                          width: '18px',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: '13px',
                          color: isTop2 ? '#22C55E' : 'var(--text-7)',
                          textAlign: 'right',
                          flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{
                          flex: 1,
                          paddingRight: '8px',
                          paddingLeft: '4px',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--text-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {TEAM_HE[t.team] ?? t.team}
                        </span>
                        <span style={{ ...COL, color: 'var(--text-5)' }}>{t.played}</span>
                        <span style={{ ...COL, color: t.won > 0 ? '#22C55E' : 'var(--text-6)' }}>{t.won}</span>
                        <span style={{ ...COL, color: t.drawn > 0 ? '#EAB308' : 'var(--text-6)' }}>{t.drawn}</span>
                        <span style={{ ...COL, color: t.lost > 0 ? '#EF4444' : 'var(--text-6)' }}>{t.lost}</span>
                        <span style={{
                          ...COL, width: '36px',
                          color: gd > 0 ? '#22C55E' : gd < 0 ? '#EF4444' : 'var(--text-5)',
                          fontWeight: 700,
                        }}>
                          {gd > 0 ? `+${gd}` : gd}
                        </span>
                        <span style={{
                          ...COL,
                          fontWeight: 800,
                          fontSize: '15px',
                          color: t.pts > 0 ? 'var(--text-1)' : 'var(--text-7)',
                        }}>
                          {t.pts}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
