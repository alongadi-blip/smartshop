import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { TEAM_HE } from '../../lib/i18n';
import { STAGE_HE } from '../../utils/scoring';

interface PlayerRow {
  id: string;
  display_name: string;
}

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_time: string;
  group_name: string | null;
  status: string;
  stage: string;
}

interface PredRow {
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
}

export default function PredictionsMatrix({ leagueId }: { leagueId?: string }) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [preds, setPreds] = useState<Map<string, PredRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    async function load() {
      // Fetch players: league members if leagueId, otherwise all profiles.
      // league_members.user_id references auth.users, not public.profiles,
      // so PostgREST can't embed profiles directly — fetch ids then profiles separately.
      const playersQ = leagueId
        ? supabase.from('league_members').select('user_id').eq('league_id', leagueId)
        : supabase.from('profiles').select('id, display_name').order('display_name');

      let predsQ = supabase.from('predictions').select('user_id, match_id, predicted_home_score, predicted_away_score, points_earned');
      if (leagueId) {
        predsQ = predsQ.or(`league_id.is.null,league_id.eq.${leagueId}`);
      }

      const [{ data: playersRaw }, { data: matchData }, { data: predData }] = await Promise.all([
        playersQ,
        supabase.from('matches').select('id, home_team, away_team, home_score, away_score, match_time, group_name, status, stage')
          .order('match_time', { ascending: true }),
        predsQ,
      ]);

      // Normalize to same shape regardless of query type
      let profiles: PlayerRow[];
      if (leagueId) {
        const userIds = (playersRaw ?? []).map((m: any) => m.user_id);
        const { data: profilesData } = userIds.length
          ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
          : { data: [] as PlayerRow[] };
        profiles = profilesData ?? [];
      } else {
        profiles = (playersRaw ?? []) as PlayerRow[];
      }

      setPlayers(profiles);
      // Only show locked/finished knockout matches — group stage is excluded from the table
      const locked = (matchData ?? []).filter(m =>
        m.stage !== 'group' && new Date(m.match_time) <= new Date(Date.now() + 5 * 60 * 1000)
      );
      setMatches(locked);

      const map = new Map<string, PredRow>();
      (predData ?? []).forEach(p => map.set(`${p.user_id}:${p.match_id}`, p));
      setPreds(map);
      setLoading(false);
    }
    load();
  }, [leagueId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', letterSpacing: '0.05em' }}>טוען…</span>
    </div>
  );

  if (matches.length === 0) return (
    <div className="py-16 text-center">
      <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px' }}>
        אין משחקים נעולים עדיין — הניחושים יופיעו כאן לאחר הקיקאוף
      </p>
    </div>
  );

  // Group matches by knockout stage
  const grouped = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    const key = m.stage;
    acc[key] = [...(acc[key] ?? []), m];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([group, groupMatches]) => (
        <section key={group}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', color: '#22C55E' }}>
              {STAGE_HE[group] ?? group}
            </h3>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
          </div>

          <div className="space-y-2">
            {groupMatches.map(match => (
              <MatchPredRow key={match.id} match={match} players={players} preds={preds} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchPredRow({ match, players, preds }: {
  match: MatchRow;
  players: PlayerRow[];
  preds: Map<string, PredRow>;
}) {
  const [open, setOpen] = useState(false);
  const isFinished = match.status === 'finished';

  const playerPreds = players.map(p => ({
    player: p,
    pred: preds.get(`${p.id}:${match.id}`),
  }));

  const totalBets = playerPreds.filter(x => x.pred).length;

  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Match header — tap to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left cursor-pointer"
        style={{ padding: '12px 14px' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', color: '#CBD5E1', letterSpacing: '0.02em' }}>
                {TEAM_HE[match.home_team] ?? match.home_team}
              </span>
              {isFinished ? (
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: '#F1F5F9', letterSpacing: '0.05em', flexShrink: 0 }}>
                  {match.home_score} – {match.away_score}
                </span>
              ) : (
                <span style={{ color: '#334155', fontSize: '13px', flexShrink: 0 }}>נגד</span>
              )}
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', color: '#CBD5E1', letterSpacing: '0.02em' }}>
                {TEAM_HE[match.away_team] ?? match.away_team}
              </span>
            </div>
            <div style={{ color: '#334155', fontSize: '11px', marginTop: '2px' }}>
              {format(new Date(match.match_time), 'd MMM · HH:mm', { locale: he })} · {totalBets}/{players.length} ניחושים
            </div>
          </div>
          <span style={{ color: '#334155', fontSize: '14px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</span>
        </div>
      </button>

      {/* Expanded predictions */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-2)' }}>
          {playerPreds.map(({ player, pred }, idx) => (
            <div
              key={player.id}
              className="flex items-center gap-3"
              style={{
                padding: '9px 14px',
                borderBottom: idx < playerPreds.length - 1 ? '1px solid #0A1020' : 'none',
                background: pred && pred.points_earned === 3 ? 'rgba(34,197,94,0.05)' : 'transparent',
              }}
            >
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: '#64748B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.display_name}
              </span>

              {pred ? (
                <>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '16px', color: '#E2E8F0', letterSpacing: '0.05em', minWidth: '52px', textAlign: 'center' }}>
                    {pred.predicted_home_score} – {pred.predicted_away_score}
                  </span>

                  {pred.points_earned !== null && pred.points_earned !== undefined ? (
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      letterSpacing: '0.05em',
                      minWidth: '52px',
                      textAlign: 'center',
                      ...(pred.points_earned === 3
                        ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                        : pred.points_earned === 1
                        ? { background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                      ),
                    }}>
                      {pred.points_earned === 3 ? '+3' : pred.points_earned === 1 ? '+1' : '0'}
                    </span>
                  ) : (
                    <span style={{ minWidth: '52px', textAlign: 'center', color: '#1E2D45', fontSize: '12px' }}>–</span>
                  )}
                </>
              ) : (
                <>
                  <span style={{ minWidth: '52px', textAlign: 'center', color: '#1E2D45', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px' }}>–</span>
                  <span style={{ minWidth: '52px', textAlign: 'center', color: '#1E2D45', fontSize: '12px', fontFamily: "'Barlow Condensed', sans-serif" }}>לא הגיש</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
