import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { calculateMatchPoints } from '../utils/scoring';
import type { League, LeagueMember } from '../types';

const ADMIN_EMAIL = 'alon.gadi@gmail.com';

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: 'var(--text-1)',
  fontSize: '14px',
  fontFamily: "'Barlow', sans-serif",
  outline: 'none',
  width: '100%',
};

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: '16px',
  padding: '18px',
};

// ─── Manual score form ────────────────────────────────────────────────────────

function ManualScoreForm({ onDone }: { onDone: (msg: string) => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadMatches() {
    if (loaded) return;
    const { data } = await supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, status, stage')
      .order('match_time', { ascending: true });
    setMatches(data ?? []);
    setLoaded(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const matchId = fd.get('match_id') as string;
    const homeScore = Number(fd.get('home_score'));
    const awayScore = Number(fd.get('away_score'));

    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      updated_at: new Date().toISOString(),
    }).eq('id', matchId);

    const { data: preds } = await supabase
      .from('predictions')
      .select('id, predicted_home_score, predicted_away_score')
      .eq('match_id', matchId);

    for (const pred of preds ?? []) {
      const pts = calculateMatchPoints(
        { home_score: homeScore, away_score: awayScore } as any,
        pred as any
      );
      await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id);
    }

    e.currentTarget.reset();
    onDone(`Score set! Calculated points for ${preds?.length ?? 0} predictions.`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select
        name="match_id" required defaultValue=""
        onFocus={loadMatches}
        style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}
      >
        <option value="" disabled>בחר משחק…</option>
        {matches.map(m => (
          <option key={m.id} value={m.id}>
            [{m.stage}] {m.home_team} vs {m.away_team}
            {m.status === 'finished' ? ` [${m.home_score}-${m.away_score}]` : ''}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input name="home_score" type="number" min="0" max="20" required placeholder="שערים - בית" style={inputStyle}
          onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
          onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
        <input name="away_score" type="number" min="0" max="20" required placeholder="שערים - חוץ" style={inputStyle}
          onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
          onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
      </div>
      <button type="submit" className="w-full cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', borderRadius: '10px', padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.25)' }}>
        הגדר תוצאה + חשב נקודות
      </button>
    </form>
  );
}

// ─── League management section ───────────────────────────────────────────────

function LeagueManager() {
  const { createLeague, fetchLeagueMembers } = useLeague();
  const { user } = useAuth();
  const [allLeagues, setAllLeagues] = useState<League[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, LeagueMember[]>>({});

  useEffect(() => {
    fetchAdminLeagues();
  }, [user?.id]);

  async function fetchAdminLeagues() {
    if (!user?.id) return;
    const { data } = await supabase.from('leagues').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
    setAllLeagues(data ?? []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    const { error } = await createLeague(newName.trim());
    setCreating(false);
    if (error) { setCreateError(error); return; }
    setNewName('');
    fetchAdminLeagues();
  }

  async function toggleLeague(league: League) {
    if (expandedId === league.id) { setExpandedId(null); return; }
    setExpandedId(league.id);
    if (!members[league.id]) {
      const m = await fetchLeagueMembers(league.id);
      setMembers(prev => ({ ...prev, [league.id]: m }));
    }
  }

  async function deleteLeague(id: string) {
    await supabase.from('leagues').delete().eq('id', id);
    fetchAdminLeagues();
  }

  function copyInviteLink(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="space-y-3">
      {/* Create league */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="שם הליגה החדשה…"
          maxLength={40}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
          onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
        />
        <button type="submit" disabled={creating || !newName.trim()} className="cursor-pointer disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)', border: 'none', borderRadius: '10px', padding: '10px 14px', color: 'white', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {creating ? '…' : 'צור ליגה'}
        </button>
      </form>
      {createError && <p style={{ color: '#EF4444', fontSize: '12px' }}>{createError}</p>}

      {/* Existing leagues */}
      {allLeagues.length === 0 && (
        <p style={{ color: '#334155', fontSize: '13px', fontFamily: "'Barlow', sans-serif" }}>אין ליגות עדיין.</p>
      )}
      {allLeagues.map(league => (
        <div key={league.id} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="flex items-center gap-2 p-3">
            <button onClick={() => toggleLeague(league)} className="flex-1 text-right cursor-pointer">
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--text-1)' }}>
                {league.name}
              </div>
              <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
                קוד: <span style={{ color: '#818CF8' }}>{league.invite_code}</span>
              </div>
            </button>
            <button onClick={() => copyInviteLink(league.invite_code)} className="cursor-pointer"
              style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#818CF8', fontSize: '11px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              העתק לינק
            </button>
            <button onClick={() => deleteLeague(league.id)} className="cursor-pointer"
              style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontSize: '11px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
              מחק
            </button>
          </div>

          {expandedId === league.id && (
            <div style={{ borderTop: '1px solid var(--border-2)' }}>
              {(members[league.id] ?? []).length === 0 ? (
                <p style={{ padding: '10px 14px', color: '#334155', fontSize: '13px' }}>אין חברים עדיין.</p>
              ) : (
                (members[league.id] ?? []).map((m, idx) => (
                  <div key={m.id} style={{ padding: '8px 14px', borderBottom: idx < (members[league.id] ?? []).length - 1 ? '1px solid #0A1020' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: '#94A3B8' }}>
                      {m.profiles?.display_name ?? '?'}
                    </span>
                    <span style={{ color: '#334155', fontSize: '11px' }}>
                      {new Date(m.joined_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Users list ──────────────────────────────────────────────────────────────

function UsersList() {
  const [users, setUsers] = useState<{ id: string; display_name: string; nickname: string | null; email: string | null; created_at: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, nickname, email, created_at')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoaded(true);
  }

  return (
    <div>
      {!loaded ? (
        <button onClick={load} className="cursor-pointer w-full"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '10px', padding: '10px', color: '#94A3B8', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          טען משתמשים
        </button>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ color: '#334155', fontSize: '12px', marginBottom: '8px', fontFamily: "'Barlow', sans-serif" }}>
            {users.length} משתמשים רשומים
          </div>
          {users.map((u, idx) => (
            <div key={u.id} style={{
              display: 'flex', gap: '10px', alignItems: 'center',
              padding: '9px 0',
              borderBottom: idx < users.length - 1 ? '1px solid #0A1020' : 'none',
              direction: 'rtl',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', color: u.nickname ? '#E2E8F0' : '#EF4444' }}>
                  {u.nickname ?? '— אין כינוי —'}
                </div>
                <div style={{ color: '#475569', fontSize: '11px', fontFamily: "'Barlow', sans-serif", marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email ?? '—'}
                </div>
              </div>
              <div style={{ color: '#334155', fontSize: '10px', fontFamily: "'Barlow', sans-serif", flexShrink: 0 }}>
                {new Date(u.created_at).toLocaleDateString('he-IL')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const [status, setSyncStatus] = useState('');
  const [newMatch, setNewMatch] = useState({ home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: '' });
  const [addStatus, setAddStatus] = useState('');

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.03em' }}>
          גישה נדחתה
        </p>
      </div>
    );
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus('Adding...');
    const { error } = await supabase.from('matches').insert({
      api_match_id: newMatch.api_match_id || `manual-${Date.now()}`,
      home_team: newMatch.home_team, away_team: newMatch.away_team,
      group_name: newMatch.group_name, stage: 'group',
      match_time: newMatch.match_time, status: 'scheduled',
    });
    if (error) { setAddStatus(`Error: ${error.message}`); }
    else { setAddStatus('Match added!'); setNewMatch({ home_team: '', away_team: '', group_name: '', match_time: '', api_match_id: '' }); }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-3 mb-2 px-1">
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F1F5F9' }}>
          פאנל ניהול
        </h1>
        <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
      </div>

      {/* ── Users ── */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22C55E', marginBottom: '14px' }}>
          משתמשים
        </h2>
        <UsersList />
      </div>

      {/* ── League management ── */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#818CF8', marginBottom: '14px' }}>
          ניהול ליגות
        </h2>
        <LeagueManager />
      </div>

      {/* ── Manual score ── */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '14px' }}>
          הגדר תוצאת משחק
        </h2>
        <ManualScoreForm onDone={setSyncStatus} />
        {status && (
          <p style={{ marginTop: '10px', fontSize: '13px', color: status.startsWith('Error') ? '#EF4444' : '#22C55E' }}>{status}</p>
        )}
      </div>

      {/* ── Add match manually ── */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '14px' }}>
          הוסף משחק ידנית
        </h2>
        <form onSubmit={handleAddMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="קבוצה בית" value={newMatch.home_team}
              onChange={e => setNewMatch(m => ({ ...m, home_team: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required placeholder="קבוצה חוץ" value={newMatch.away_team}
              onChange={e => setNewMatch(m => ({ ...m, away_team: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Group A" value={newMatch.group_name}
              onChange={e => setNewMatch(m => ({ ...m, group_name: e.target.value }))} style={inputStyle}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
            <input required type="datetime-local" value={newMatch.match_time}
              onChange={e => setNewMatch(m => ({ ...m, match_time: e.target.value }))}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')} />
          </div>
          <button type="submit" className="w-full cursor-pointer"
            style={{ background: '#1E2D45', border: '1px solid #2A3F5F', color: '#94A3B8', borderRadius: '10px', padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
            הוסף משחק
          </button>
          {addStatus && <p style={{ fontSize: '13px', color: addStatus.startsWith('Error') ? '#EF4444' : '#22C55E' }}>{addStatus}</p>}
        </form>
      </div>
    </div>
  );
}
