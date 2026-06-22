import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../hooks/useLeague';
import type { League } from '../types';

export default function LeagueSelectorPage() {
  const { userLeagues, selectedLeague, setSelectedLeague, joinLeague, leaveLeague } = useLeague();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [leavingId, setLeavingId] = useState<string | null>(null);

  function selectLeague(league: League) {
    setSelectedLeague(league);
    navigate('/matches');
  }

  async function handleLeave(league: League) {
    setLeavingId(league.id);
    await leaveLeague(league.id);
    setLeavingId(null);
    // If no leagues left, stay on this page — will show empty state
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    const { league, error } = await joinLeague(joinCode.trim());
    setJoining(false);
    if (error && error !== 'כבר חבר בליגה זו') {
      setJoinError(error);
      return;
    }
    if (league) {
      setSelectedLeague(league);
      navigate('/matches');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8" style={{ background: 'var(--bg-app)' }}>
      <div style={{ maxWidth: '380px', width: '100%' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '24px', color: '#22C55E', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '6px' }}>
          MONDIAL 2026
        </div>
        <div style={{ color: '#475569', fontSize: '13px', textAlign: 'center', marginBottom: '28px', fontFamily: "'Barlow', sans-serif" }}>
          בחר ליגה להמשך
        </div>

        {/* Existing leagues */}
        {userLeagues.length > 0 && (
          <div className="space-y-2 mb-6">
            {userLeagues.map(league => {
              const isSelected = selectedLeague?.id === league.id;
              const isLeaving = leavingId === league.id;
              return (
                <div
                  key={league.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : 'var(--border-card)'}`,
                    borderRadius: '14px',
                    padding: '12px 14px',
                    direction: 'rtl',
                    transition: 'border 0.2s',
                  }}
                >
                  {/* Main clickable area */}
                  <button
                    onClick={() => selectLeague(league)}
                    className="flex-1 text-right cursor-pointer"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSelected && (
                        <span style={{ color: '#22C55E', fontSize: '12px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
                          ✓ פעיל
                        </span>
                      )}
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '17px', color: '#F1F5F9', letterSpacing: '0.03em' }}>
                        {league.name}
                      </div>
                    </div>
                    <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px', fontFamily: "'Barlow', sans-serif" }}>
                      קוד: {league.invite_code}
                    </div>
                  </button>

                  {/* Leave button */}
                  <button
                    onClick={() => handleLeave(league)}
                    disabled={isLeaving}
                    className="cursor-pointer transition-all duration-200 disabled:opacity-40 flex-shrink-0"
                    style={{
                      padding: '5px 11px',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#EF4444',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: '12px',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  >
                    {isLeaving ? '…' : 'עזוב'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Join by code */}
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-2)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: '12px' }}>
            הצטרף עם קוד הזמנה
          </div>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="קוד 8 תווים…"
              maxLength={12}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--text-1)',
                fontSize: '14px',
                fontFamily: "'Barlow Condensed', sans-serif",
                outline: 'none',
                letterSpacing: '0.08em',
                textTransform: 'lowercase',
              }}
              onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
              onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="cursor-pointer transition-all duration-200 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                color: 'white',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {joining ? '…' : 'הצטרף'}
            </button>
          </form>
          {joinError && (
            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '8px', fontFamily: "'Barlow', sans-serif" }}>
              {joinError}
            </p>
          )}
        </div>

        {userLeagues.length === 0 && (
          <p style={{ color: '#334155', fontSize: '12px', textAlign: 'center', marginTop: '16px', fontFamily: "'Barlow', sans-serif" }}>
            אין לך ליגות עדיין. בקש קוד הזמנה מהמנהל.
          </p>
        )}
      </div>
    </div>
  );
}
