import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../hooks/useLeague';
import type { League } from '../types';

export default function JoinLeaguePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { joinLeague, fetchLeagueByCode, userLeagues } = useLeague();

  const [league, setLeague] = useState<League | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetchLeagueByCode(code).then(found => {
      if (!found) { setNotFound(true); return; }
      setLeague(found);
      const member = userLeagues.some(l => l.id === found.id);
      if (member) {
        // Already a member — go straight to matches
        navigate('/matches', { replace: true });
        return;
      }
      setAlreadyMember(false);
    });
  }, [code, userLeagues.length]);

  async function handleJoin() {
    if (!code) return;
    setJoining(true);
    const { error: err } = await joinLeague(code);
    setJoining(false);
    if (err && err !== 'כבר חבר בליגה זו') {
      setError(err);
      return;
    }
    navigate('/matches');
  }

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4" style={{ background: 'var(--bg-app)' }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', color: '#EF4444', letterSpacing: '0.05em' }}>
        קוד הזמנה לא נמצא
      </div>
      <button onClick={() => navigate('/matches')} className="cursor-pointer" style={{ color: '#475569', fontSize: '14px', fontFamily: "'Barlow', sans-serif" }}>
        חזור למשחקים
      </button>
    </div>
  );

  if (!league) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <span style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', letterSpacing: '0.05em' }}>
        טוען…
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg-app)' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '20px',
        padding: '32px 28px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Trophy icon */}
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏆</div>

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#F1F5F9', marginBottom: '6px', letterSpacing: '0.05em' }}>
          {league.name}
        </div>
        <div style={{ color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif", marginBottom: '28px' }}>
          {alreadyMember ? 'אתה כבר חבר בליגה זו' : 'הוזמנת להצטרף לליגה'}
        </div>

        {alreadyMember ? (
          <button
            onClick={() => navigate('/matches')}
            className="w-full cursor-pointer"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '12px',
              color: '#94A3B8',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            כבר חבר — חזור למשחקים
          </button>
        ) : (
          <>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full cursor-pointer transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                color: 'white',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                marginBottom: '10px',
              }}
            >
              {joining ? 'מצטרף…' : 'הצטרף לליגה'}
            </button>
            <button
              onClick={() => navigate('/matches')}
              className="w-full cursor-pointer"
              style={{ color: '#475569', fontSize: '13px', fontFamily: "'Barlow', sans-serif", background: 'none', border: 'none', padding: '6px' }}
            >
              ביטול
            </button>
          </>
        )}

        {error && (
          <p style={{ color: '#EF4444', fontSize: '13px', marginTop: '10px', fontFamily: "'Barlow', sans-serif" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
